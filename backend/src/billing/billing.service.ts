import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceItemType, InvoiceStatus, PaymentMethod, PaymentStatus, NotificationType } from '@prisma/client';

export interface CreateInvoiceDto {
  patientId: string;
  appointmentId?: string;
  admissionId?: string;
  dueDate?: string;
  notes?: string;
  discountAmount?: number;
  items: Array<{
    itemType: InvoiceItemType;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface ProcessPaymentDto {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
}

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async createInvoice(dto: CreateInvoiceDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('An invoice must have at least one line item');
    }

    for (const item of dto.items) {
      if (!item.quantity || item.quantity <= 0) {
        throw new BadRequestException(`Invalid quantity for line item "${item.description}"`);
      }
      if (item.unitPrice < 0) {
        throw new BadRequestException(`Unit price cannot be negative for line item "${item.description}"`);
      }
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient #${dto.patientId} not found`);
    }

    const count = await this.prisma.invoice.count();
    const invoiceNumber = `INV-2026-${String(count + 1).padStart(4, '0')}`;

    let subtotal = 0;
    const itemsData = dto.items.map((item) => {
      const lineTotal = Number((item.quantity * item.unitPrice).toFixed(2));
      subtotal += lineTotal;
      return {
        itemType: item.itemType,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: lineTotal,
      };
    });

    const discount = Number(dto.discountAmount || 0);
    const taxableAmount = Math.max(0, subtotal - discount);
    const taxAmount = Number((taxableAmount * 0.05).toFixed(2)); // 5% healthcare tax
    const payableAmount = Number((taxableAmount + taxAmount).toFixed(2));

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        admissionId: dto.admissionId,
        totalAmount: subtotal,
        discountAmount: discount,
        taxAmount,
        payableAmount,
        paidAmount: 0,
        status: InvoiceStatus.PENDING,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notes: dto.notes,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
        patient: true,
      },
    });

    // Notify patient if patient user account exists
    if (patient.userId) {
      await this.prisma.notification.create({
        data: {
          userId: patient.userId,
          title: 'New Medical Invoice Issued',
          message: `Invoice #${invoiceNumber} for $${payableAmount.toFixed(2)} has been issued. Due date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon receipt'}.`,
          type: NotificationType.INFO,
          link: '/billing',
        },
      });
    }

    return invoice;
  }

  async findAllInvoices(query?: { status?: InvoiceStatus; patientId?: string }) {
    const where: any = {};
    if (query?.status) where.status = query.status;
    if (query?.patientId) where.patientId = query.patientId;

    return this.prisma.invoice.findMany({
      where,
      include: {
        patient: true,
        items: true,
        payments: true,
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async findOneInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: true,
        items: true,
        payments: {
          include: { receivedBy: { select: { firstName: true, lastName: true } } },
        },
        appointment: { include: { doctor: { include: { user: true } } } },
        admission: { include: { bed: { include: { room: true } } } },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice #${id} not found`);
    }

    return invoice;
  }

  async processPayment(dto: ProcessPaymentDto, userId: string) {
    const invoice = await this.findOneInvoice(dto.invoiceId);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('This invoice has already been fully paid');
    }

    const remainingDue = Number(invoice.payableAmount) - Number(invoice.paidAmount);
    if (dto.amount <= 0 || dto.amount > remainingDue + 0.01) {
      throw new BadRequestException(
        `Payment amount must be between 0.01 and remaining balance (${remainingDue.toFixed(2)})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const payCount = await tx.payment.count();
      const paymentNumber = `PAY-2026-${String(payCount + 1).padStart(4, '0')}`;

      // Mock transaction reference if not provided (e.g. Razorpay/Card gateway ref)
      const txnRef = dto.transactionReference || `TXN-GATEWAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          invoiceId: dto.invoiceId,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          status: PaymentStatus.SUCCESS,
          transactionReference: txnRef,
          notes: dto.notes,
          receivedById: userId,
        },
      });

      const newPaidAmount = Number(invoice.paidAmount) + dto.amount;
      const isFullyPaid = Math.abs(newPaidAmount - Number(invoice.payableAmount)) < 0.01;

      const updatedInvoice = await tx.invoice.update({
        where: { id: dto.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID,
        },
        include: { payments: true, items: true, patient: true },
      });

      if (updatedInvoice.patient?.userId) {
        await tx.notification.create({
          data: {
            userId: updatedInvoice.patient.userId,
            title: isFullyPaid ? 'Invoice Settled in Full' : 'Payment Received',
            message: `Receipt #${paymentNumber}: Payment of $${dto.amount.toFixed(2)} via ${dto.paymentMethod} processed for Invoice #${updatedInvoice.invoiceNumber}. Remaining balance: $${Math.max(0, Number(updatedInvoice.payableAmount) - newPaidAmount).toFixed(2)}.`,
            type: NotificationType.SUCCESS,
            link: '/billing',
          },
        });
      }

      return {
        payment,
        invoice: updatedInvoice,
      };
    });
  }
}
