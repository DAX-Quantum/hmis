import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async create(createPatientDto: CreatePatientDto) {
    const count = await this.prisma.patient.count();
    const mrn = `MRN-2026-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.patient.create({
      data: {
        mrn,
        firstName: createPatientDto.firstName,
        lastName: createPatientDto.lastName,
        dateOfBirth: new Date(createPatientDto.dateOfBirth),
        gender: createPatientDto.gender,
        bloodGroup: createPatientDto.bloodGroup,
        email: createPatientDto.email,
        phone: createPatientDto.phone,
        address: createPatientDto.address,
        city: createPatientDto.city,
        state: createPatientDto.state,
        postalCode: createPatientDto.postalCode,
        emergencyContactName: createPatientDto.emergencyContactName,
        emergencyContactPhone: createPatientDto.emergencyContactPhone,
        emergencyContactRelation: createPatientDto.emergencyContactRelation,
        allergies: createPatientDto.allergies || [],
        chronicConditions: createPatientDto.chronicConditions || [],
        insuranceProvider: createPatientDto.insuranceProvider,
        insurancePolicyNumber: createPatientDto.insurancePolicyNumber,
      },
    });
  }

  async findAll(pagination: PaginationDto) {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { mrn: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, patients] = await Promise.all([
      this.prisma.patient.count({ where }),
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          appointments: {
            take: 1,
            orderBy: { appointmentDate: 'desc' },
            select: { appointmentDate: true, status: true },
          },
        },
      }),
    ]);

    return {
      data: patients,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, avatar: true } },
        appointments: {
          orderBy: { appointmentDate: 'desc' },
          include: {
            doctor: { include: { user: true, department: true } },
            department: true,
          },
        },
        consultations: {
          orderBy: { consultationDate: 'desc' },
          include: {
            doctor: { include: { user: true } },
            vitals: true,
            diagnoses: true,
          },
        },
        vitals: {
          orderBy: { recordedAt: 'desc' },
        },
        diagnoses: {
          orderBy: { diagnosedAt: 'desc' },
        },
        medicalRecords: {
          orderBy: { recordDate: 'desc' },
          include: { doctor: { include: { user: true } }, department: true },
        },
        prescriptions: {
          orderBy: { issuedDate: 'desc' },
          include: {
            doctor: { include: { user: true } },
            items: { include: { medicine: true } },
          },
        },
        labOrders: {
          orderBy: { orderedAt: 'desc' },
          include: {
            doctor: { include: { user: true } },
            results: { include: { labTest: true } },
          },
        },
        invoices: {
          orderBy: { issuedAt: 'desc' },
          include: { items: true, payments: true },
        },
        admissions: {
          orderBy: { admissionDate: 'desc' },
          include: {
            bed: { include: { room: { include: { ward: true } } } },
            attendingDoctor: { include: { user: true } },
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedBy: { select: { firstName: true, lastName: true, role: true } },
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    return patient;
  }

  async getTimeline(id: string) {
    const patient = await this.findOne(id);

    const timelineEvents: Array<{
      id: string;
      date: Date;
      type: 'CONSULTATION' | 'LAB_ORDER' | 'PRESCRIPTION' | 'ADMISSION' | 'VITAL';
      title: string;
      description: string;
      status?: string;
      details?: any;
    }> = [];

    // Consultations
    patient.consultations.forEach(c => {
      timelineEvents.push({
        id: c.id,
        date: c.consultationDate,
        type: 'CONSULTATION',
        title: `Clinical Consultation - Dr. ${c.doctor?.user?.lastName || 'Doctor'}`,
        description: c.diagnosisText || c.clinicalNotes || 'General consultation review',
        status: c.status,
        details: {
          symptoms: c.symptoms,
          notes: c.clinicalNotes,
          treatmentPlan: c.treatmentPlan,
        },
      });
    });

    // Prescriptions
    patient.prescriptions.forEach(p => {
      timelineEvents.push({
        id: p.id,
        date: p.issuedDate,
        type: 'PRESCRIPTION',
        title: `Prescription #${p.prescriptionNumber}`,
        description: `${p.items.length} medication(s) prescribed by Dr. ${p.doctor?.user?.lastName}`,
        status: p.status,
        details: p.items,
      });
    });

    // Lab Orders
    patient.labOrders.forEach(l => {
      timelineEvents.push({
        id: l.id,
        date: l.orderedAt,
        type: 'LAB_ORDER',
        title: `Laboratory Diagnostics #${l.orderNumber}`,
        description: `Status: ${l.status} (${l.results.length} result(s))`,
        status: l.status,
        details: l.results,
      });
    });

    // Admissions
    patient.admissions.forEach(a => {
      timelineEvents.push({
        id: a.id,
        date: a.admissionDate,
        type: 'ADMISSION',
        title: `Hospital Admission #${a.admissionNumber}`,
        description: `Admitted to ${a.bed?.room?.ward?.name} (Bed ${a.bed?.bedNumber}) - ${a.reasonForAdmission}`,
        status: a.status,
        details: {
          dischargeDate: a.actualDischargeDate,
          dischargeSummary: a.dischargeSummary,
        },
      });
    });

    // Sort descending by date
    timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return timelineEvents;
  }

  async update(id: string, updatePatientDto: UpdatePatientDto) {
    await this.findOne(id);
    return this.prisma.patient.update({
      where: { id },
      data: {
        ...updatePatientDto,
        dateOfBirth: updatePatientDto.dateOfBirth ? new Date(updatePatientDto.dateOfBirth) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.patient.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
