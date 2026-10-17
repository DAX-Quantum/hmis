import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import {
  AppointmentStatus,
  ConsultationStatus,
  InvoiceItemType,
  InvoiceStatus,
  PrescriptionStatus,
} from '@prisma/client';

@Injectable()
export class ConsultationsService {
  constructor(private prisma: PrismaService) {}

  async create(createConsultationDto: CreateConsultationDto, doctorUserId?: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: createConsultationDto.appointmentId },
      include: {
        doctor: { include: { user: true } },
        patient: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment #${createConsultationDto.appointmentId} not found`);
    }

    const doctorId = appointment.doctorId;
    const patientId = appointment.patientId;

    // Use transaction for consistency across consultation, vitals, diagnosis, prescriptions, and EMR record
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create Consultation
      const consultation = await tx.consultation.create({
        data: {
          appointmentId: appointment.id,
          patientId,
          doctorId,
          consultationDate: new Date(),
          symptoms: createConsultationDto.symptoms || [],
          clinicalNotes: createConsultationDto.clinicalNotes,
          diagnosisText: createConsultationDto.diagnosisText,
          treatmentPlan: createConsultationDto.treatmentPlan,
          doctorNotes: createConsultationDto.doctorNotes,
          followUpDate: createConsultationDto.followUpDate ? new Date(createConsultationDto.followUpDate) : null,
          status: ConsultationStatus.COMPLETED,
        },
      });

      // 2. Vitals (if provided)
      let vitalsRecord = null;
      if (createConsultationDto.vitals) {
        const v = createConsultationDto.vitals;
        let bmi: number | null = null;
        if (v.weightKg && v.heightCm && v.heightCm > 0) {
          const heightM = v.heightCm / 100;
          bmi = Number((v.weightKg / (heightM * heightM)).toFixed(1));
        }

        vitalsRecord = await tx.vital.create({
          data: {
            patientId,
            consultationId: consultation.id,
            recordedAt: new Date(),
            bloodPressureSystolic: v.bloodPressureSystolic,
            bloodPressureDiastolic: v.bloodPressureDiastolic,
            heartRate: v.heartRate,
            temperature: v.temperature,
            respiratoryRate: v.respiratoryRate,
            oxygenSaturation: v.oxygenSaturation,
            weightKg: v.weightKg,
            heightCm: v.heightCm,
            bmi,
            notes: v.notes,
          },
        });
      }

      // 3. Diagnosis entry
      await tx.diagnosis.create({
        data: {
          patientId,
          consultationId: consultation.id,
          conditionName: createConsultationDto.diagnosisText,
          diagnosisType: 'PRIMARY',
          diagnosedAt: new Date(),
        },
      });

      // 4. Create Medical Record (EMR)
      const emrCount = await tx.medicalRecord.count();
      const recordNumber = `EMR-2026-${String(emrCount + 1).padStart(4, '0')}`;

      await tx.medicalRecord.create({
        data: {
          recordNumber,
          patientId,
          doctorId,
          departmentId: appointment.departmentId,
          recordType: 'CONSULTATION',
          title: `Consultation with Dr. ${appointment.doctor.user?.lastName || ''}`,
          description: createConsultationDto.diagnosisText,
          recordDate: new Date(),
          metadata: {
            symptoms: createConsultationDto.symptoms,
            treatmentPlan: createConsultationDto.treatmentPlan,
            bp: vitalsRecord ? `${vitalsRecord.bloodPressureSystolic}/${vitalsRecord.bloodPressureDiastolic}` : null,
          },
        },
      });

      // 5. Prescriptions (if provided)
      let prescriptionRecord = null;
      if (createConsultationDto.prescriptionItems && createConsultationDto.prescriptionItems.length > 0) {
        const rxCount = await tx.prescription.count();
        const rxNumber = `RX-2026-${String(rxCount + 1).padStart(4, '0')}`;

        prescriptionRecord = await tx.prescription.create({
          data: {
            prescriptionNumber: rxNumber,
            patientId,
            doctorId,
            consultationId: consultation.id,
            issuedDate: new Date(),
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: PrescriptionStatus.ACTIVE,
            notes: createConsultationDto.doctorNotes,
            items: {
              create: createConsultationDto.prescriptionItems.map((item) => ({
                medicineId: item.medicineId || null,
                medicineName: item.medicineName,
                dosage: item.dosage,
                frequency: item.frequency,
                route: item.route || 'Oral',
                durationDays: item.durationDays || 3,
                instructions: item.instructions,
              })),
            },
          },
          include: { items: true },
        });
      }

      // 6. Update Appointment Status to COMPLETED
      await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: AppointmentStatus.COMPLETED },
      });

      // 7. Generate Invoice if not exists
      const existingInvoice = await tx.invoice.findFirst({
        where: { appointmentId: appointment.id },
      });

      if (!existingInvoice) {
        const invCount = await tx.invoice.count();
        const invoiceNumber = `INV-2026-${String(invCount + 1).padStart(4, '0')}`;
        const fee = Number(appointment.doctor.consultationFee);
        const tax = fee * 0.05;
        const total = fee + tax;

        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            patientId,
            appointmentId: appointment.id,
            totalAmount: total,
            discountAmount: 0,
            taxAmount: tax,
            payableAmount: total,
            paidAmount: 0,
            status: InvoiceStatus.PENDING,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            itemType: InvoiceItemType.CONSULTATION,
            description: `Doctor Consultation - ${appointment.doctor.specialization}`,
            quantity: 1,
            unitPrice: fee,
            totalPrice: fee,
          },
        });
      }

      // 8. Audit Log
      await tx.auditLog.create({
        data: {
          userId: doctorUserId || appointment.doctor.userId,
          action: 'DOCTOR_COMPLETED_CONSULTATION',
          resource: 'CONSULTATION',
          resourceId: consultation.id,
          metadata: {
            patientId,
            appointmentId: appointment.id,
            diagnosis: createConsultationDto.diagnosisText,
          },
        },
      });

      return {
        consultation,
        vitals: vitalsRecord,
        prescription: prescriptionRecord,
      };
    });

    return result;
  }

  async findByAppointment(appointmentId: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { appointmentId },
      include: {
        doctor: { include: { user: true, department: true } },
        patient: true,
        vitals: true,
        diagnoses: true,
        prescriptions: { include: { items: true } },
        labOrders: { include: { results: true } },
      },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation for appointment #${appointmentId} not found`);
    }

    return consultation;
  }

  async findOne(id: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id },
      include: {
        doctor: { include: { user: true, department: true } },
        patient: true,
        vitals: true,
        diagnoses: true,
        prescriptions: { include: { items: true } },
        labOrders: { include: { results: true } },
      },
    });

    if (!consultation) {
      throw new NotFoundException(`Consultation #${id} not found`);
    }

    return consultation;
  }
}
