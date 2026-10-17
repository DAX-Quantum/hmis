import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BillingService, CreateInvoiceDto, ProcessPaymentDto } from './billing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InvoiceStatus } from '@prisma/client';

@ApiTags('billing')
@Controller('billing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Post('invoices')
  @ApiOperation({ summary: 'Generate a new invoice' })
  createInvoice(@Body() dto: CreateInvoiceDto) {
    return this.billingService.createInvoice(dto);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List all invoices with status/patient filters' })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  @ApiQuery({ name: 'patientId', required: false })
  findAllInvoices(@Query('status') status?: InvoiceStatus, @Query('patientId') patientId?: string) {
    return this.billingService.findAllInvoices({ status, patientId });
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice details with items and payment history' })
  findOneInvoice(@Param('id') id: string) {
    return this.billingService.findOneInvoice(id);
  }

  @Post('payments')
  @ApiOperation({ summary: 'Process a payment against an invoice (supports Mock / Gateway integration)' })
  processPayment(@Body() dto: ProcessPaymentDto, @CurrentUser('id') userId: string) {
    return this.billingService.processPayment(dto, userId);
  }
}
