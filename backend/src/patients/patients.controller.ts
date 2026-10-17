import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('patients')
@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new patient record' })
  create(@Body() createPatientDto: CreatePatientDto) {
    return this.patientsService.create(createPatientDto);
  }

  @Get()
  @ApiOperation({ summary: 'List patients with pagination and search' })
  findAll(@Query() pagination: PaginationDto) {
    return this.patientsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get comprehensive patient 360 profile with all history' })
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get consolidated chronological medical timeline for patient' })
  getTimeline(@Param('id') id: string) {
    return this.patientsService.getTimeline(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update patient information' })
  update(@Param('id') id: string, @Body() updatePatientDto: UpdatePatientDto) {
    return this.patientsService.update(id, updatePatientDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete / deactivate patient record' })
  remove(@Param('id') id: string) {
    return this.patientsService.remove(id);
  }
}
