import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('doctors')
@Controller('doctors')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DoctorsController {
  constructor(private doctorsService: DoctorsService) {}

  @Get()
  @ApiOperation({ summary: 'List all doctors, optionally filtered by department' })
  @ApiQuery({ name: 'departmentId', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query('departmentId') departmentId?: string, @Query('search') search?: string) {
    return this.doctorsService.findAll(departmentId, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get doctor profile and schedule' })
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }

  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Get doctor dashboard metrics and appointment queue' })
  getDoctorDashboard(@Param('id') id: string) {
    return this.doctorsService.getDoctorDashboard(id);
  }
}
