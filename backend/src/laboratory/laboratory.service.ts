import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LabOrderStatus, LabPriority, NotificationType, ResultFlag } from '@prisma/client';

export interface CreateLabOrderDto {
  patientId: string;
  doctorId: string;
  consultationId?: string;
  priority?: LabPriority;
  clinicalNotes?: string;
  testIds: string[];
}

export interface EnterResultDto {
  labTestId: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag?: ResultFlag;
  remarks?: string;
}

@Injectable()
export class LaboratoryService {
  constructor(private prisma: PrismaService) {}

  // List test catalog
  async findAllTests() {
    return this.prisma.labTest.findMany({
      where: { isActive: true },
      orderBy: { category: 'asc' },
    });
  }

  // Create Lab Order
  async createOrder(dto: CreateLabOrderDto) {
    const count = await this.prisma.labOrder.count();
    const orderNumber = `LAB-2026-${String(count + 1).padStart(4, '0')}`;

    const order = await this.prisma.labOrder.create({
      data: {
        orderNumber,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        consultationId: dto.consultationId,
        priority: dto.priority || LabPriority.NORMAL,
        status: LabOrderStatus.ORDERED,
        clinicalNotes: dto.clinicalNotes,
        orderedAt: new Date(),
      },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });

    return order;
  }

  // List all orders with filters
  async findAllOrders(query?: { status?: LabOrderStatus; patientId?: string }) {
    const where: any = {};
    if (query?.status) where.status = query.status;
    if (query?.patientId) where.patientId = query.patientId;

    return this.prisma.labOrder.findMany({
      where,
      include: {
        patient: true,
        doctor: { include: { user: true } },
        results: { include: { labTest: true, technician: true } },
        verifiedBy: true,
      },
      orderBy: { orderedAt: 'desc' },
    });
  }

  // Get order by ID
  async findOneOrder(id: string) {
    const order = await this.prisma.labOrder.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { include: { user: true, department: true } },
        consultation: true,
        results: { include: { labTest: true, technician: true } },
        verifiedBy: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Lab order #${id} not found`);
    }

    return order;
  }

  // Transition: Sample Collected
  async markSampleCollected(id: string) {
    await this.findOneOrder(id);
    return this.prisma.labOrder.update({
      where: { id },
      data: {
        status: LabOrderStatus.SAMPLE_COLLECTED,
        sampleCollectedAt: new Date(),
      },
    });
  }

  // Transition: Processing
  async markProcessing(id: string) {
    await this.findOneOrder(id);
    return this.prisma.labOrder.update({
      where: { id },
      data: { status: LabOrderStatus.PROCESSING },
    });
  }

  // Enter results
  async enterResults(orderId: string, results: EnterResultDto[], technicianUserId: string) {
    const order = await this.findOneOrder(orderId);

    // Create results
    for (const r of results) {
      const test = await this.prisma.labTest.findUnique({ where: { id: r.labTestId } });
      await this.prisma.labResult.create({
        data: {
          labOrderId: order.id,
          labTestId: r.labTestId,
          value: r.value,
          unit: r.unit || test?.unit,
          referenceRange: r.referenceRange || test?.normalRange,
          flag: r.flag || ResultFlag.NORMAL,
          remarks: r.remarks,
          technicianId: technicianUserId,
        },
      });
    }

    return this.prisma.labOrder.update({
      where: { id: orderId },
      data: {
        status: LabOrderStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: { results: { include: { labTest: true } } },
    });
  }

  // Verify results
  async verifyOrder(orderId: string, verifierUserId: string) {
    const order = await this.findOneOrder(orderId);

    const updated = await this.prisma.labOrder.update({
      where: { id: orderId },
      data: {
        status: LabOrderStatus.VERIFIED,
        verifiedAt: new Date(),
        verifiedById: verifierUserId,
      },
      include: {
        doctor: { include: { user: true } },
        patient: true,
      },
    });

    // Notify doctor
    if (updated.doctor?.userId) {
      await this.prisma.notification.create({
        data: {
          userId: updated.doctor.userId,
          title: 'Lab Results Verified',
          message: `Lab order #${updated.orderNumber} for patient ${updated.patient.firstName} ${updated.patient.lastName} is now verified.`,
          type: NotificationType.SUCCESS,
          link: `/laboratory`,
        },
      });
    }

    // Add to Medical Records
    const emrCount = await this.prisma.medicalRecord.count();
    await this.prisma.medicalRecord.create({
      data: {
        recordNumber: `EMR-2026-${String(emrCount + 1).padStart(4, '0')}`,
        patientId: updated.patientId,
        doctorId: updated.doctorId,
        recordType: 'LAB_RESULT',
        title: `Diagnostic Lab Report - #${updated.orderNumber}`,
        description: `Verified laboratory order consisting of ${order.results.length} test parameter(s)`,
        recordDate: new Date(),
      },
    });

    return updated;
  }
}
