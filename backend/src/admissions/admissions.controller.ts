import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdmissionsService, CreateAdmissionDto, DischargePatientDto } from './admissions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdmissionStatus, UserRole } from '@prisma/client';

@ApiTags('admissions')
@Controller('admissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdmissionsController {
  constructor(private admissionsService: AdmissionsService) {}

  @Get('bed-board')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Get visual inpatient bed board with real-time occupancy across wards' })
  getBedBoard() {
    return this.admissionsService.getBedBoard();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Admit a patient to a ward bed (prevents occupied bed conflicts)' })
  admitPatient(@Body() dto: CreateAdmissionDto) {
    return this.admissionsService.admitPatient(dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'List admissions with status filter' })
  @ApiQuery({ name: 'status', required: false, enum: AdmissionStatus })
  findAllAdmissions(@Query('status') status?: AdmissionStatus) {
    return this.admissionsService.findAllAdmissions(status);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Get admission details' })
  findOneAdmission(@Param('id') id: string) {
    return this.admissionsService.findOneAdmission(id);
  }

  @Patch(':id/discharge')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'Discharge inpatient and free bed back to available status' })
  dischargePatient(@Param('id') id: string, @Body() dto: DischargePatientDto) {
    return this.admissionsService.dischargePatient(id, dto);
  }
}

