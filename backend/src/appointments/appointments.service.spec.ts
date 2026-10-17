import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import { AppointmentStatus, AppointmentType } from '@prisma/client';

describe('AppointmentsService - Double Booking & Availability', () => {
  let service: AppointmentsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      appointment: {
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      doctorSchedule: {
        findUnique: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  it('should prevent double booking for the same doctor, date and time slot', async () => {
    // Mock that an existing appointment already exists
    prisma.appointment.findFirst.mockResolvedValue({
      id: 'existing-apt-123',
      doctorId: 'doc-1',
      appointmentDate: new Date('2026-10-15'),
      startTime: '10:00',
      status: AppointmentStatus.CONFIRMED,
    });

    await expect(
      service.create({
        patientId: 'pat-1',
        doctorId: 'doc-1',
        departmentId: 'dept-1',
        appointmentDate: '2026-10-15',
        startTime: '10:00',
        endTime: '10:30',
        type: AppointmentType.CONSULTATION,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should allow booking when time slot is available', async () => {
    prisma.appointment.findFirst.mockResolvedValue(null);
    prisma.appointment.count.mockResolvedValue(5);
    prisma.appointment.create.mockResolvedValue({
      id: 'new-apt-456',
      appointmentNumber: 'APT-2026-0006',
      status: AppointmentStatus.CONFIRMED,
      patient: { firstName: 'Alice', lastName: 'Smith' },
      doctor: { user: { firstName: 'Dr. Gregory', lastName: 'Carter' } },
      department: { name: 'Cardiology' },
    });

    const result = await service.create({
      patientId: 'pat-1',
      doctorId: 'doc-1',
      departmentId: 'dept-1',
      appointmentDate: '2026-10-15',
      startTime: '11:00',
      endTime: '11:30',
      type: AppointmentType.CONSULTATION,
    });

    expect(result.appointmentNumber).toBe('APT-2026-0006');
    expect(prisma.appointment.create).toHaveBeenCalled();
  });

  describe('updateStatus - Lifecycle transitions', () => {
    it('should throw BadRequestException if appointment is already COMPLETED', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: 'apt-completed',
        status: AppointmentStatus.COMPLETED,
      });

      await expect(
        service.updateStatus('apt-completed', { status: AppointmentStatus.CANCELLED, cancellationReason: 'Patient request' }),
      ).rejects.toThrow('Cannot modify status of an appointment that is already COMPLETED.');
    });

    it('should throw BadRequestException if appointment is already CANCELLED', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: 'apt-cancelled',
        status: AppointmentStatus.CANCELLED,
      });

      await expect(
        service.updateStatus('apt-cancelled', { status: AppointmentStatus.CONFIRMED }),
      ).rejects.toThrow('Cannot modify a CANCELLED appointment. Please schedule a new appointment.');
    });

    it('should throw BadRequestException if transitioning to CANCELLED without a reason', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: 'apt-1',
        status: AppointmentStatus.CONFIRMED,
      });

      await expect(
        service.updateStatus('apt-1', { status: AppointmentStatus.CANCELLED }),
      ).rejects.toThrow('A cancellation reason is required when cancelling an appointment.');
    });

    it('should successfully check in a patient and notify the doctor', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: 'apt-1',
        status: AppointmentStatus.CONFIRMED,
        patient: { firstName: 'John', lastName: 'Doe' },
        doctor: { userId: 'user-doc-1', user: { id: 'user-doc-1' } },
        department: { name: 'Cardiology' },
      });

      prisma.appointment.update.mockResolvedValue({
        id: 'apt-1',
        status: AppointmentStatus.CHECKED_IN,
        startTime: '10:00',
        queueNumber: 3,
        patient: { firstName: 'John', lastName: 'Doe' },
        doctor: { userId: 'user-doc-1', user: { id: 'user-doc-1' } },
        department: { name: 'Cardiology' },
      });

      const result = await service.updateStatus('apt-1', { status: AppointmentStatus.CHECKED_IN });

      expect(result.status).toBe(AppointmentStatus.CHECKED_IN);
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-doc-1',
            title: 'Patient Checked In',
          }),
        }),
      );
    });

    it('should successfully cancel an appointment with reason and notify participants', async () => {
      prisma.appointment.findUnique.mockResolvedValue({
        id: 'apt-2',
        status: AppointmentStatus.CONFIRMED,
        appointmentNumber: 'APT-2026-0002',
        appointmentDate: new Date('2026-10-20'),
        startTime: '14:00',
        patient: { userId: 'user-pat-1', firstName: 'Alice', lastName: 'Smith' },
        doctor: { userId: 'user-doc-1', user: { id: 'user-doc-1' } },
        department: { name: 'Neurology' },
      });

      prisma.appointment.update.mockResolvedValue({
        id: 'apt-2',
        status: AppointmentStatus.CANCELLED,
        cancellationReason: 'Emergency specialist surgery conflict',
        appointmentNumber: 'APT-2026-0002',
        appointmentDate: new Date('2026-10-20'),
        startTime: '14:00',
        patient: { userId: 'user-pat-1', firstName: 'Alice', lastName: 'Smith' },
        doctor: { userId: 'user-doc-1', user: { id: 'user-doc-1' } },
        department: { name: 'Neurology' },
      });

      const result = await service.updateStatus('apt-2', {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: 'Emergency specialist surgery conflict',
      });

      expect(result.status).toBe(AppointmentStatus.CANCELLED);
      expect(prisma.notification.create).toHaveBeenCalledTimes(2); // doctor and patient
    });
  });
});
