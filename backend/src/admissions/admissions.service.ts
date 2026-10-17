import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdmissionStatus, AdmissionType, BedStatus, NotificationType } from '@prisma/client';

export interface CreateAdmissionDto {
  patientId: string;
  bedId: string;
  attendingDoctorId: string;
  admissionType?: AdmissionType;
  reasonForAdmission: string;
  diagnosisAtAdmission?: string;
  expectedDischargeDate?: string;
}

export interface DischargePatientDto {
  dischargeSummary: string;
  dischargeCondition?: string;
}

@Injectable()
export class AdmissionsService {
  constructor(private prisma: PrismaService) {}

  // List all wards with rooms and bed statuses
  async getBedBoard() {
    return this.prisma.ward.findMany({
      include: {
        rooms: {
          include: {
            beds: {
              include: {
                admissions: {
                  where: { status: AdmissionStatus.ADMITTED },
                  include: {
                    patient: true,
                    attendingDoctor: { include: { user: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { floor: 'asc' },
    });
  }

  // Admit patient with occupied bed prevention
  async admitPatient(dto: CreateAdmissionDto) {
    const bed = await this.prisma.bed.findUnique({
      where: { id: dto.bedId },
      include: { room: { include: { ward: true } } },
    });

    if (!bed) {
      throw new NotFoundException(`Bed #${dto.bedId} not found`);
    }

    if (bed.status !== BedStatus.AVAILABLE) {
      throw new BadRequestException(
        `Bed ${bed.bedNumber} is not available (Current status: ${bed.status}). Please choose an available bed.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const count = await tx.admission.count();
      const admissionNumber = `ADM-2026-${String(count + 1).padStart(4, '0')}`;

      // 1. Mark bed as OCCUPIED
      await tx.bed.update({
        where: { id: dto.bedId },
        data: { status: BedStatus.OCCUPIED },
      });

      // 2. Create Admission record
      const admission = await tx.admission.create({
        data: {
          admissionNumber,
          patientId: dto.patientId,
          bedId: dto.bedId,
          attendingDoctorId: dto.attendingDoctorId,
          admissionType: dto.admissionType || AdmissionType.PLANNED,
          reasonForAdmission: dto.reasonForAdmission,
          diagnosisAtAdmission: dto.diagnosisAtAdmission,
          expectedDischargeDate: dto.expectedDischargeDate ? new Date(dto.expectedDischargeDate) : null,
          status: AdmissionStatus.ADMITTED,
        },
        include: {
          patient: true,
          bed: { include: { room: { include: { ward: true } } } },
          attendingDoctor: { include: { user: true } },
        },
      });

      // 3. Add to Medical Records
      const emrCount = await tx.medicalRecord.count();
      await tx.medicalRecord.create({
        data: {
          recordNumber: `EMR-2026-${String(emrCount + 1).padStart(4, '0')}`,
          patientId: dto.patientId,
          doctorId: dto.attendingDoctorId,
          recordType: 'ADMISSION',
          title: `Inpatient Hospital Admission - ${bed.room.ward.name}`,
          description: `Bed ${bed.bedNumber} (${bed.room.roomNumber}) - Reason: ${dto.reasonForAdmission}`,
          recordDate: new Date(),
        },
      });

      // 4. Send notification
      const doctor = await tx.doctor.findUnique({
        where: { id: dto.attendingDoctorId },
        include: { user: true },
      });

      if (doctor?.userId) {
        await tx.notification.create({
          data: {
            userId: doctor.userId,
            title: 'Inpatient Assigned',
            message: `Patient ${admission.patient.firstName} ${admission.patient.lastName} admitted to ${bed.room.ward.name} Bed ${bed.bedNumber}.`,
            type: NotificationType.INFO,
            link: '/admissions',
          },
        });
      }

      return admission;
    });
  }

  // Discharge patient and free up bed
  async dischargePatient(admissionId: string, dto: DischargePatientDto) {
    const admission = await this.prisma.admission.findUnique({
      where: { id: admissionId },
      include: { bed: true, patient: true },
    });

    if (!admission) {
      throw new NotFoundException(`Admission #${admissionId} not found`);
    }

    if (admission.status === AdmissionStatus.DISCHARGED) {
      throw new BadRequestException('Patient has already been discharged');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Free bed back to AVAILABLE
      await tx.bed.update({
        where: { id: admission.bedId },
        data: { status: BedStatus.AVAILABLE },
      });

      // 2. Mark admission as DISCHARGED
      const updated = await tx.admission.update({
        where: { id: admissionId },
        data: {
          status: AdmissionStatus.DISCHARGED,
          actualDischargeDate: new Date(),
          dischargeSummary: dto.dischargeSummary,
          dischargeCondition: dto.dischargeCondition || 'Stable',
        },
        include: {
          patient: true,
          bed: { include: { room: { include: { ward: true } } } },
        },
      });

      // 3. EMR note for discharge
      const emrCount = await tx.medicalRecord.count();
      await tx.medicalRecord.create({
        data: {
          recordNumber: `EMR-2026-${String(emrCount + 1).padStart(4, '0')}`,
          patientId: admission.patientId,
          doctorId: admission.attendingDoctorId,
          recordType: 'ADMISSION',
          title: `Discharge Summary - Admission #${admission.admissionNumber}`,
          description: dto.dischargeSummary,
          recordDate: new Date(),
        },
      });

      return updated;
    });
  }

  // List admissions
  async findAllAdmissions(status?: AdmissionStatus) {
    const where: any = {};
    if (status) where.status = status;

    return this.prisma.admission.findMany({
      where,
      include: {
        patient: true,
        bed: { include: { room: { include: { ward: true } } } },
        attendingDoctor: { include: { user: true } },
      },
      orderBy: { admissionDate: 'desc' },
    });
  }

  // Get admission by ID
  async findOneAdmission(id: string) {
    const admission = await this.prisma.admission.findUnique({
      where: { id },
      include: {
        patient: true,
        bed: { include: { room: { include: { ward: true } } } },
        attendingDoctor: { include: { user: true, department: true } },
        invoices: true,
      },
    });

    if (!admission) {
      throw new NotFoundException(`Admission #${id} not found`);
    }

    return admission;
  }
}
