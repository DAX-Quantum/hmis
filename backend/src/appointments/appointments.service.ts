import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-status.dto';
import { AppointmentStatus, NotificationType } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async create(createAppointmentDto: CreateAppointmentDto) {
    const aptDate = new Date(createAppointmentDto.appointmentDate);

    // Check double-booking
    const existing = await this.prisma.appointment.findFirst({
      where: {
        doctorId: createAppointmentDto.doctorId,
        appointmentDate: aptDate,
        startTime: createAppointmentDto.startTime,
        status: { notIn: [AppointmentStatus.CANCELLED] },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Doctor is already booked for ${createAppointmentDto.startTime} on ${createAppointmentDto.appointmentDate}. Please choose another time slot.`,
      );
    }

    // Determine queue number for that doctor on that day
    const dayAppointmentsCount = await this.prisma.appointment.count({
      where: {
        doctorId: createAppointmentDto.doctorId,
        appointmentDate: aptDate,
      },
    });

    const totalCount = await this.prisma.appointment.count();
    const appointmentNumber = `APT-2026-${String(totalCount + 1).padStart(4, '0')}`;

    const appointment = await this.prisma.appointment.create({
      data: {
        appointmentNumber,
        patientId: createAppointmentDto.patientId,
        doctorId: createAppointmentDto.doctorId,
        departmentId: createAppointmentDto.departmentId,
        appointmentDate: aptDate,
        startTime: createAppointmentDto.startTime,
        endTime: createAppointmentDto.endTime,
        type: createAppointmentDto.type,
        status: AppointmentStatus.CONFIRMED,
        reason: createAppointmentDto.reason,
        notes: createAppointmentDto.notes,
        queueNumber: dayAppointmentsCount + 1,
      },
      include: {
        patient: true,
        doctor: { include: { user: true } },
        department: true,
      },
    });

    // Notify doctor
    if (appointment.doctor.user) {
      await this.prisma.notification.create({
        data: {
          userId: appointment.doctor.userId,
          title: 'New Appointment Scheduled',
          message: `Appointment #${appointmentNumber} booked with patient ${appointment.patient.firstName} ${appointment.patient.lastName} on ${createAppointmentDto.appointmentDate} at ${createAppointmentDto.startTime}.`,
          type: NotificationType.INFO,
          link: '/appointments',
        },
      });
    }

    return appointment;
  }

  async findAll(query: {
    date?: string;
    doctorId?: string;
    patientId?: string;
    departmentId?: string;
    status?: AppointmentStatus;
  }) {
    const where: any = {};

    if (query.date) {
      const searchDate = new Date(query.date);
      where.appointmentDate = searchDate;
    }

    if (query.doctorId) {
      where.doctorId = query.doctorId;
    }

    if (query.patientId) {
      where.patientId = query.patientId;
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.status) {
      where.status = query.status;
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        patient: true,
        doctor: { include: { user: true, department: true } },
        department: true,
        consultation: { select: { id: true, status: true } },
      },
      orderBy: [
        { appointmentDate: 'desc' },
        { startTime: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { include: { user: true, department: true } },
        department: true,
        consultation: {
          include: {
            vitals: true,
            diagnoses: true,
            prescriptions: { include: { items: true } },
          },
        },
        invoices: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment #${id} not found`);
    }

    return appointment;
  }

  async getAvailableSlots(doctorId: string, dateString: string) {
    const targetDate = new Date(dateString);
    if (isNaN(targetDate.getTime())) {
      throw new BadRequestException('Invalid date string');
    }

    const dayOfWeek = targetDate.getDay();

    const schedule = await this.prisma.doctorSchedule.findUnique({
      where: {
        doctorId_dayOfWeek: {
          doctorId,
          dayOfWeek,
        },
      },
    });

    if (!schedule || !schedule.isAvailable) {
      return {
        isAvailable: false,
        message: 'Doctor has no scheduled clinics on this day of the week.',
        slots: [],
      };
    }

    // Get all existing appointments for that doctor on that date
    const bookedAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: targetDate,
        status: { notIn: [AppointmentStatus.CANCELLED] },
      },
      select: { startTime: true, endTime: true },
    });

    const bookedTimes = new Set(bookedAppointments.map(a => a.startTime));

    // Generate slots
    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
    const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
    const duration = schedule.slotDurationMinutes || 30;

    const slots: Array<{ startTime: string; endTime: string; isBooked: boolean }> = [];
    let currentTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    while (currentTotalMinutes + duration <= endTotalMinutes) {
      const sh = Math.floor(currentTotalMinutes / 60);
      const sm = currentTotalMinutes % 60;
      const eh = Math.floor((currentTotalMinutes + duration) / 60);
      const em = (currentTotalMinutes + duration) % 60;

      const slotStart = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
      const slotEnd = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;

      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        isBooked: bookedTimes.has(slotStart),
      });

      currentTotalMinutes += duration;
    }

    return {
      isAvailable: true,
      dayOfWeek,
      schedule: {
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        slotDurationMinutes: duration,
      },
      slots,
    };
  }

  async updateStatus(id: string, updateDto: UpdateAppointmentStatusDto) {
    const apt = await this.findOne(id);

    // Business rules & transition validation
    if (apt.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot modify status of an appointment that is already COMPLETED.');
    }

    if (apt.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Cannot modify a CANCELLED appointment. Please schedule a new appointment.');
    }

    if (updateDto.status === AppointmentStatus.CANCELLED && !updateDto.cancellationReason?.trim()) {
      throw new BadRequestException('A cancellation reason is required when cancelling an appointment.');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: updateDto.status,
        cancellationReason: updateDto.cancellationReason || apt.cancellationReason,
        notes: updateDto.notes
          ? apt.notes
            ? `${apt.notes}\n[${new Date().toISOString()}]: ${updateDto.notes}`
            : updateDto.notes
          : apt.notes,
      },
      include: {
        patient: true,
        doctor: { include: { user: true } },
        department: true,
      },
    });

    // 1. Patient checked in -> Notify doctor
    if (updateDto.status === AppointmentStatus.CHECKED_IN && updated.doctor?.user) {
      await this.prisma.notification.create({
        data: {
          userId: updated.doctor.userId,
          title: 'Patient Checked In',
          message: `Patient ${updated.patient.firstName} ${updated.patient.lastName} (Queue #${updated.queueNumber || 1}) has arrived and checked in for their ${updated.startTime} appointment.`,
          type: NotificationType.INFO,
          link: '/appointments',
        },
      });
    }

    // 2. Appointment cancelled -> Notify doctor and patient
    if (updateDto.status === AppointmentStatus.CANCELLED) {
      if (updated.doctor?.user) {
        await this.prisma.notification.create({
          data: {
            userId: updated.doctor.userId,
            title: 'Appointment Cancelled',
            message: `Appointment #${updated.appointmentNumber} for ${updated.patient.firstName} ${updated.patient.lastName} on ${new Date(updated.appointmentDate).toLocaleDateString()} at ${updated.startTime} was cancelled. Reason: ${updateDto.cancellationReason}`,
            type: NotificationType.WARNING,
            link: '/appointments',
          },
        });
      }

      if (updated.patient?.userId) {
        await this.prisma.notification.create({
          data: {
            userId: updated.patient.userId,
            title: 'Appointment Cancelled',
            message: `Your appointment #${updated.appointmentNumber} on ${new Date(updated.appointmentDate).toLocaleDateString()} at ${updated.startTime} was cancelled. Reason: ${updateDto.cancellationReason}`,
            type: NotificationType.WARNING,
            link: '/appointments',
          },
        });
      }
    }

    return updated;
  }
}
