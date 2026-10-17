import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MedicalRecordsService } from './medical-records.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('medical-records')
@Controller('medical-records')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MedicalRecordsController {
  constructor(private medicalRecordsService: MedicalRecordsService) {}

  @Get('patient/:patientId')
  @ApiOperation({ summary: 'Get aggregated EMR records for a patient with filtering' })
  @ApiQuery({ name: 'recordType', required: false })
  @ApiQuery({ name: 'doctorId', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  findByPatient(
    @Param('patientId') patientId: string,
    @Query('recordType') recordType?: string,
    @Query('doctorId') doctorId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.medicalRecordsService.findByPatient(patientId, {
      recordType,
      doctorId,
      departmentId,
      startDate,
      endDate,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single medical record' })
  findOne(@Param('id') id: string) {
    return this.medicalRecordsService.findOne(id);
  }
}
