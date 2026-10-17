import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MedicalRecordsService {
  constructor(private prisma: PrismaService) {}

  async findByPatient(
    patientId: string,
    filters?: {
      recordType?: string;
      doctorId?: string;
      departmentId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const where: any = { patientId };

    if (filters?.recordType) {
      where.recordType = filters.recordType;
    }

    if (filters?.doctorId) {
      where.doctorId = filters.doctorId;
    }

    if (filters?.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.recordDate = {};
      if (filters.startDate) {
        where.recordDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.recordDate.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.medicalRecord.findMany({
      where,
      include: {
        doctor: { include: { user: true } },
        department: true,
      },
      orderBy: { recordDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { include: { user: true } },
        department: true,
      },
    });

    if (!record) {
      throw new NotFoundException(`Medical record #${id} not found`);
    }

    return record;
  }
}
