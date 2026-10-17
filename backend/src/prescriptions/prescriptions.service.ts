import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrescriptionStatus } from '@prisma/client';

export interface CreatePrescriptionDto {
  patientId: string;
  doctorId: string;
  consultationId?: string;
  notes?: string;
  items: Array<{
    medicineId?: string;
    medicineName: string;
    dosage: string;
    frequency: string;
    route?: string;
    durationDays: number;
    instructions?: string;
  }>;
}

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePrescriptionDto) {
    const count = await this.prisma.prescription.count();
    const prescriptionNumber = `RX-2026-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.prescription.create({
      data: {
        prescriptionNumber,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        consultationId: dto.consultationId,
        issuedDate: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: PrescriptionStatus.ACTIVE,
        notes: dto.notes,
        items: {
          create: dto.items.map((item) => ({
            medicineId: item.medicineId || null,
            medicineName: item.medicineName,
            dosage: item.dosage,
            frequency: item.frequency,
            route: item.route || 'Oral',
            durationDays: item.durationDays,
            instructions: item.instructions,
          })),
        },
      },
      include: {
        patient: true,
        doctor: { include: { user: true, department: true } },
        items: { include: { medicine: true } },
      },
    });
  }

  async findAll(query?: { patientId?: string; doctorId?: string; status?: PrescriptionStatus }) {
    const where: any = {};
    if (query?.patientId) where.patientId = query.patientId;
    if (query?.doctorId) where.doctorId = query.doctorId;
    if (query?.status) where.status = query.status;

    return this.prisma.prescription.findMany({
      where,
      include: {
        patient: true,
        doctor: { include: { user: true, department: true } },
        items: { include: { medicine: true } },
      },
      orderBy: { issuedDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { include: { user: true, department: true } },
        items: { include: { medicine: true } },
      },
    });

    if (!prescription) {
      throw new NotFoundException(`Prescription #${id} not found`);
    }

    return prescription;
  }

  async markDispensed(id: string) {
    const rx = await this.findOne(id);
    return this.prisma.prescription.update({
      where: { id },
      data: { status: PrescriptionStatus.DISPENSED },
    });
  }
}
