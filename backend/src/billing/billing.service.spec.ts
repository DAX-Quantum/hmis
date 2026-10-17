import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceItemType, InvoiceStatus, PaymentMethod } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('BillingService - Tax, Payments & Settlements', () => {
  let service: BillingService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      patient: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pat-1',
          userId: 'user-pat-1',
          firstName: 'James',
          lastName: 'Wilson',
        }),
      },
      invoice: {
        count: jest.fn().mockResolvedValue(10),
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'inv-1', ...args.data })),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        count: jest.fn().mockResolvedValue(5),
        create: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  describe('createInvoice', () => {
    it('should calculate 5% tax and total payable correctly', async () => {
      const result = await service.createInvoice({
        patientId: 'pat-1',
        discountAmount: 10,
        items: [
          { itemType: InvoiceItemType.CONSULTATION, description: 'Consultation', quantity: 1, unitPrice: 150 },
          { itemType: InvoiceItemType.LAB_TEST, description: 'CBC Test', quantity: 1, unitPrice: 50 },
        ],
      });

      // Subtotal: 150 + 50 = 200
      // Discount: 10 => Taxable: 190
      // Tax (5% of 190): 9.50
      // Payable: 199.50
      expect(result.totalAmount).toBe(200);
      expect(result.discountAmount).toBe(10);
      expect(result.taxAmount).toBe(9.50);
      expect(result.payableAmount).toBe(199.50);
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-pat-1',
            title: 'New Medical Invoice Issued',
          }),
        }),
      );
    });

    it('should reject invoice creation without items', async () => {
      await expect(
        service.createInvoice({
          patientId: 'pat-1',
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invoice creation if patient does not exist', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);

      await expect(
        service.createInvoice({
          patientId: 'pat-unknown',
          items: [{ itemType: InvoiceItemType.CONSULTATION, description: 'Visit', quantity: 1, unitPrice: 50 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('processPayment', () => {
    it('should reject payment if invoice is already fully PAID', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        payableAmount: 100,
        paidAmount: 100,
        status: InvoiceStatus.PAID,
      });

      await expect(
        service.processPayment({ invoiceId: 'inv-1', amount: 50, paymentMethod: PaymentMethod.CREDIT_CARD }, 'staff-1'),
      ).rejects.toThrow('This invoice has already been fully paid');
    });

    it('should reject payment if amount exceeds remaining balance', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        payableAmount: 100,
        paidAmount: 80,
        status: InvoiceStatus.PARTIALLY_PAID,
      });

      await expect(
        service.processPayment({ invoiceId: 'inv-1', amount: 50, paymentMethod: PaymentMethod.CREDIT_CARD }, 'staff-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should process partial payment and mark invoice PARTIALLY_PAID', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-2026-0001',
        payableAmount: 200,
        paidAmount: 0,
        status: InvoiceStatus.PENDING,
        patient: { userId: 'user-pat-1' },
      });

      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        paymentNumber: 'PAY-2026-0006',
        amount: 80,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      });

      prisma.invoice.update.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-2026-0001',
        payableAmount: 200,
        paidAmount: 80,
        status: InvoiceStatus.PARTIALLY_PAID,
        patient: { userId: 'user-pat-1' },
      });

      const result = await service.processPayment(
        { invoiceId: 'inv-1', amount: 80, paymentMethod: PaymentMethod.CREDIT_CARD },
        'staff-1',
      );

      expect(result.invoice.status).toBe(InvoiceStatus.PARTIALLY_PAID);
      expect(prisma.payment.create).toHaveBeenCalled();
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-pat-1',
            title: 'Payment Received',
          }),
        }),
      );
    });

    it('should process full settlement and mark invoice PAID', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-2026-0001',
        payableAmount: 200,
        paidAmount: 80,
        status: InvoiceStatus.PARTIALLY_PAID,
        patient: { userId: 'user-pat-1' },
      });

      prisma.payment.create.mockResolvedValue({
        id: 'pay-2',
        paymentNumber: 'PAY-2026-0007',
        amount: 120,
        paymentMethod: PaymentMethod.UPI,
      });

      prisma.invoice.update.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-2026-0001',
        payableAmount: 200,
        paidAmount: 200,
        status: InvoiceStatus.PAID,
        patient: { userId: 'user-pat-1' },
      });

      const result = await service.processPayment(
        { invoiceId: 'inv-1', amount: 120, paymentMethod: PaymentMethod.UPI },
        'staff-1',
      );

      expect(result.invoice.status).toBe(InvoiceStatus.PAID);
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-pat-1',
            title: 'Invoice Settled in Full',
          }),
        }),
      );
    });
  });
});
