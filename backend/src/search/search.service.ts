import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async globalSearch(query: string, role: string) {
    if (!query || query.trim().length === 0) {
      return { patients: [], doctors: [], appointments: [], medicines: [], invoices: [] };
    }

    const trimmed = query.trim();

    // 1. Search Patients
    const patients = await this.prisma.patient.findMany({
      where: {
        isActive: true,
        OR: [
          { firstName: { contains: trimmed, mode: 'insensitive' } },
          { lastName: { contains: trimmed, mode: 'insensitive' } },
          { mrn: { contains: trimmed, mode: 'insensitive' } },
          { phone: { contains: trimmed } },
        ],
      },
      take: 5,
      select: {
        id: true,
        mrn: true,
        firstName: true,
        lastName: true,
        phone: true,
        bloodGroup: true,
      },
    });

    // 2. Search Doctors
    const doctors = await this.prisma.doctor.findMany({
      where: {
        isActive: true,
        OR: [
          { specialization: { contains: trimmed, mode: 'insensitive' } },
          { user: { firstName: { contains: trimmed, mode: 'insensitive' } } },
          { user: { lastName: { contains: trimmed, mode: 'insensitive' } } },
        ],
      },
      take: 5,
      include: {
        user: { select: { firstName: true, lastName: true, avatar: true } },
        department: { select: { name: true } },
      },
    });

    // 3. Search Medicines
    const medicines = await this.prisma.medicine.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: trimmed, mode: 'insensitive' } },
          { genericName: { contains: trimmed, mode: 'insensitive' } },
          { code: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      take: 5,
      include: { inventories: true },
    });

    // 4. Appointments (Only if authorized staff)
    let appointments: any[] = [];
    if (['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(role)) {
      appointments = await this.prisma.appointment.findMany({
        where: {
          OR: [
            { appointmentNumber: { contains: trimmed, mode: 'insensitive' } },
            { patient: { firstName: { contains: trimmed, mode: 'insensitive' } } },
            { patient: { lastName: { contains: trimmed, mode: 'insensitive' } } },
          ],
        },
        take: 5,
        include: {
          patient: { select: { firstName: true, lastName: true, mrn: true } },
          doctor: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      });
    }

    // 5. Invoices (Only if accountant / admin / receptionist)
    let invoices: any[] = [];
    if (['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'].includes(role)) {
      invoices = await this.prisma.invoice.findMany({
        where: {
          OR: [
            { invoiceNumber: { contains: trimmed, mode: 'insensitive' } },
            { patient: { firstName: { contains: trimmed, mode: 'insensitive' } } },
            { patient: { lastName: { contains: trimmed, mode: 'insensitive' } } },
          ],
        },
        take: 5,
        include: {
          patient: { select: { firstName: true, lastName: true, mrn: true } },
        },
      });
    }

    return {
      patients,
      doctors,
      appointments,
      medicines: medicines.map((m) => ({
        ...m,
        totalStock: m.inventories.reduce((sum, inv) => sum + inv.quantityInStock, 0),
      })),
      invoices,
    };
  }
}
