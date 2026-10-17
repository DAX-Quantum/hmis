import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('consultations')
@Controller('consultations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConsultationsController {
  constructor(private consultationsService: ConsultationsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit clinical consultation findings, vitals, diagnosis, and prescription' })
  create(@Body() createDto: CreateConsultationDto, @CurrentUser('id') userId: string) {
    return this.consultationsService.create(createDto, userId);
  }

  @Get('appointment/:appointmentId')
  @ApiOperation({ summary: 'Get consultation details for a specific appointment' })
  findByAppointment(@Param('appointmentId') appointmentId: string) {
    return this.consultationsService.findByAppointment(appointmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get consultation details by ID' })
  findOne(@Param('id') id: string) {
    return this.consultationsService.findOne(id);
  }
}
