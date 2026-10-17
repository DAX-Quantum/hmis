import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PrescriptionsService, CreatePrescriptionDto } from './prescriptions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PrescriptionStatus } from '@prisma/client';

@ApiTags('prescriptions')
@Controller('prescriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PrescriptionsController {
  constructor(private prescriptionsService: PrescriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Issue a new prescription' })
  create(@Body() dto: CreatePrescriptionDto) {
    return this.prescriptionsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List prescriptions with filters' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'doctorId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: PrescriptionStatus })
  findAll(
    @Query('patientId') patientId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('status') status?: PrescriptionStatus,
  ) {
    return this.prescriptionsService.findAll({ patientId, doctorId, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get prescription details by ID (including printable format)' })
  findOne(@Param('id') id: string) {
    return this.prescriptionsService.findOne(id);
  }

  @Patch(':id/dispense')
  @ApiOperation({ summary: 'Mark prescription as dispensed by pharmacy' })
  markDispensed(@Param('id') id: string) {
    return this.prescriptionsService.markDispensed(id);
  }
}
