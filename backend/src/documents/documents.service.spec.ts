import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService, CreateDocumentDto } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentCategory, NotificationType } from '@prisma/client';

describe('DocumentsService - Clinical EMR Document Management', () => {
  let service: DocumentsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      patient: {
        findUnique: jest.fn(),
      },
      document: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  describe('create', () => {
    it('should throw BadRequestException if title is missing or empty', async () => {
      await expect(
        service.create(
          {
            title: '   ',
            fileType: 'application/pdf',
            fileUrl: 'https://storage.hmis.local/doc1.pdf',
            fileSize: 1024,
            category: DocumentCategory.LAB_REPORT,
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if fileUrl is missing or empty', async () => {
      await expect(
        service.create(
          {
            title: 'Blood Panel Lab Results',
            fileType: 'application/pdf',
            fileUrl: '  ',
            fileSize: 1024,
            category: DocumentCategory.LAB_REPORT,
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if fileSize is zero or negative', async () => {
      await expect(
        service.create(
          {
            title: 'Blood Panel Lab Results',
            fileType: 'application/pdf',
            fileUrl: 'https://storage.hmis.local/doc1.pdf',
            fileSize: 0,
            category: DocumentCategory.LAB_REPORT,
          },
          'user-1',
        ),
      ).rejects.toThrow('File size must be greater than zero bytes');
    });

    it('should throw NotFoundException if patientId is provided but patient does not exist', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            patientId: 'patient-999',
            title: 'Chest X-Ray',
            fileType: 'image/png',
            fileUrl: 'https://storage.hmis.local/xray.png',
            fileSize: 2048576,
            category: DocumentCategory.OTHER,
          },
          'user-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully create document and dispatch notification if patient has linked portal user', async () => {
      prisma.patient.findUnique.mockResolvedValue({
        id: 'patient-1',
        userId: 'user-portal-10',
        firstName: 'Sarah',
        lastName: 'Connor',
      });

      const mockDoc = {
        id: 'doc-1',
        patientId: 'patient-1',
        title: 'Complete Blood Count (CBC)',
        fileType: 'application/pdf',
        fileUrl: 'https://storage.hmis.local/cbc.pdf',
        fileSize: 524288,
        category: DocumentCategory.LAB_REPORT,
        uploadedById: 'doctor-1',
      };
      prisma.document.create.mockResolvedValue(mockDoc);

      const result = await service.create(
        {
          patientId: 'patient-1',
          title: '  Complete Blood Count (CBC)  ',
          fileType: 'application/pdf',
          fileUrl: 'https://storage.hmis.local/cbc.pdf',
          fileSize: 524288,
          category: DocumentCategory.LAB_REPORT,
        },
        'doctor-1',
      );

      expect(result.id).toBe('doc-1');
      expect(prisma.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Complete Blood Count (CBC)',
            category: DocumentCategory.LAB_REPORT,
            uploadedById: 'doctor-1',
          }),
        }),
      );
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-portal-10',
            title: 'New Clinical Document Uploaded',
            type: NotificationType.INFO,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should pass search and category filters to prisma.document.findMany', async () => {
      prisma.document.findMany.mockResolvedValue([
        { id: 'doc-1', title: 'Chest Radiograph', category: DocumentCategory.OTHER },
      ]);

      const result = await service.findAll({
        category: DocumentCategory.OTHER,
        search: 'Radiograph',
        patientId: 'pat-1',
      });

      expect(result).toHaveLength(1);
      expect(prisma.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            category: DocumentCategory.OTHER,
            patientId: 'pat-1',
            OR: [
              { title: { contains: 'Radiograph', mode: 'insensitive' } },
              { fileType: { contains: 'Radiograph', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });
  });

  describe('findByPatient', () => {
    it('should throw NotFoundException if patient does not exist', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(service.findByPatient('patient-404')).rejects.toThrow(NotFoundException);
    });

    it('should return patient clinical documents if patient exists', async () => {
      prisma.patient.findUnique.mockResolvedValue({ id: 'pat-1' });
      prisma.document.findMany.mockResolvedValue([
        { id: 'doc-1', title: 'Discharge Summary', category: DocumentCategory.DISCHARGE_SUMMARY },
      ]);

      const docs = await service.findByPatient('pat-1');
      expect(docs).toHaveLength(1);
      expect(docs[0].id).toBe('doc-1');
    });
  });

  describe('findOne & update & delete', () => {
    it('should throw NotFoundException when finding non-existent document', async () => {
      prisma.document.findUnique.mockResolvedValue(null);
      await expect(service.findOne('invalid-doc')).rejects.toThrow(NotFoundException);
    });

    it('should update document metadata successfully', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc-1', title: 'Old Title' });
      prisma.document.update.mockResolvedValue({
        id: 'doc-1',
        title: 'Updated Title',
        category: DocumentCategory.INSURANCE,
      });

      const updated = await service.update('doc-1', {
        title: '  Updated Title  ',
        category: DocumentCategory.INSURANCE,
      });

      expect(updated.title).toBe('Updated Title');
      expect(prisma.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doc-1' },
          data: {
            title: 'Updated Title',
            category: DocumentCategory.INSURANCE,
          },
        }),
      );
    });

    it('should delete existing document', async () => {
      prisma.document.findUnique.mockResolvedValue({ id: 'doc-1', title: 'Doc to delete' });
      prisma.document.delete.mockResolvedValue({ id: 'doc-1' });

      const res = await service.delete('doc-1');
      expect(res.id).toBe('doc-1');
      expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
    });
  });
});
