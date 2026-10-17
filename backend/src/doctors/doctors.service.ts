import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus, ConsultationStatus } from '@prisma/client';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  async findAll(departmentId?: string, search?: string) {
    const where: any = { isActive: true };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (search) {
      where.OR = [
        { specialization: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.doctor.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, email: true, avatar: true, phone: true } },
        department: true,
        schedules: { orderBy: { dayOfWeek: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, avatar: true, phone: true } },
        department: true,
        schedules: { orderBy: { dayOfWeek: 'asc' } },
        appointments: {
          take: 10,
          orderBy: { appointmentDate: 'desc' },
          include: { patient: true },
        },
      },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor #${id} not found`);
    }

    return doctor;
  }

  async getDoctorDashboard(doctorId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayAppointments, upcomingAppointments, completedConsultations, pendingConsultations, recentPatients] = await Promise.all([
      // Today's appointments
      this.prisma.appointment.findMany({
        where: {
          doctorId,
          appointmentDate: { gte: today, lt: tomorrow },
        },
        include: { patient: true },
        orderBy: { startTime: 'asc' },
      }),
      // Upcoming appointments
      this.prisma.appointment.findMany({
        where: {
          doctorId,
          appointmentDate: { gte: tomorrow },
          status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
        },
        take: 5,
        include: { patient: true },
        orderBy: { appointmentDate: 'asc' },
      }),
      // Completed consultations count
      this.prisma.consultation.count({
        where: { doctorId, status: ConsultationStatus.COMPLETED },
      }),
      // Pending consultations count
      this.prisma.consultation.count({
        where: { doctorId, status: ConsultationStatus.IN_PROGRESS },
      }),
      // Distinct recent patients
      this.prisma.patient.findMany({
        where: {
          appointments: { some: { doctorId } },
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return {
      todayAppointments,
      upcomingAppointments,
      stats: {
        todayCount: todayAppointments.length,
        completedConsultations,
        pendingConsultations,
        totalPatientsTreated: recentPatients.length,
      },
      recentPatients,
    };
  }
}
