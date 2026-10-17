import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentCategory, NotificationType } from '@prisma/client';

export interface CreateDocumentDto {
  patientId?: string;
  title: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
  category: DocumentCategory;
}

export interface UpdateDocumentDto {
  title?: string;
  category?: DocumentCategory;
}

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDocumentDto, uploadedById: string) {
    if (!dto.title?.trim()) {
      throw new BadRequestException('Document title is required');
    }
    if (!dto.fileUrl?.trim()) {
      throw new BadRequestException('File URL or storage reference is required');
    }
    if (!dto.fileSize || dto.fileSize <= 0) {
      throw new BadRequestException('File size must be greater than zero bytes');
    }

    let patient = null;
    if (dto.patientId) {
      patient = await this.prisma.patient.findUnique({
        where: { id: dto.patientId },
      });
      if (!patient) {
        throw new NotFoundException(`Patient #${dto.patientId} not found`);
      }
    }

    const document = await this.prisma.document.create({
      data: {
        patientId: dto.patientId,
        title: dto.title.trim(),
        fileType: dto.fileType,
        fileUrl: dto.fileUrl,
        fileSize: dto.fileSize,
        category: dto.category || DocumentCategory.OTHER,
        uploadedById,
      },
      include: {
        patient: true,
        uploadedBy: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    // Notify patient if portal account exists
    if (patient?.userId) {
      await this.prisma.notification.create({
        data: {
          userId: patient.userId,
          title: 'New Clinical Document Uploaded',
          message: `A new document "${document.title}" (${document.category}) has been attached to your medical record.`,
          type: NotificationType.INFO,
          link: '/medical-records',
        },
      });
    }

    return document;
  }

  async findAll(query?: { category?: DocumentCategory; search?: string; patientId?: string }) {
    const where: any = {};
    if (query?.category) where.category = query.category;
    if (query?.patientId) where.patientId = query.patientId;
    if (query?.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { fileType: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.document.findMany({
      where,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        uploadedBy: { select: { firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByPatient(patientId: string) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      throw new NotFoundException(`Patient #${patientId} not found`);
    }

    return this.prisma.document.findMany({
      where: { patientId },
      include: {
        uploadedBy: { select: { firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        patient: true,
        uploadedBy: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document #${id} not found`);
    }

    return doc;
  }

  async update(id: string, dto: UpdateDocumentDto) {
    await this.findOne(id);

    return this.prisma.document.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        category: dto.category,
      },
      include: {
        patient: true,
        uploadedBy: { select: { firstName: true, lastName: true, role: true } },
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.document.delete({
      where: { id },
    });
  }
}

