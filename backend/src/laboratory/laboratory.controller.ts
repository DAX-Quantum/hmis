import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LaboratoryService, CreateLabOrderDto, EnterResultDto } from './laboratory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LabOrderStatus, UserRole } from '@prisma/client';

@ApiTags('laboratory')
@Controller('laboratory')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LaboratoryController {
  constructor(private laboratoryService: LaboratoryService) {}

  @Get('tests')
  @ApiOperation({ summary: 'List available diagnostic test catalog' })
  findAllTests() {
    return this.laboratoryService.findAllTests();
  }

  @Post('orders')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'Create new diagnostic laboratory order' })
  createOrder(@Body() dto: CreateLabOrderDto) {
    return this.laboratoryService.createOrder(dto);
  }

  @Get('orders')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.LAB_TECHNICIAN, UserRole.PATIENT)
  @ApiOperation({ summary: 'List laboratory orders queue with status filter' })
  @ApiQuery({ name: 'status', required: false, enum: LabOrderStatus })
  @ApiQuery({ name: 'patientId', required: false })
  findAllOrders(@Query('status') status?: LabOrderStatus, @Query('patientId') patientId?: string) {
    return this.laboratoryService.findAllOrders({ status, patientId });
  }

  @Get('orders/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR, UserRole.NURSE, UserRole.LAB_TECHNICIAN, UserRole.PATIENT)
  @ApiOperation({ summary: 'Get full lab order details with results' })
  findOneOrder(@Param('id') id: string) {
    return this.laboratoryService.findOneOrder(id);
  }

  @Patch('orders/:id/sample-collected')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.NURSE, UserRole.LAB_TECHNICIAN)
  @ApiOperation({ summary: 'Mark specimen sample collected' })
  markSampleCollected(@Param('id') id: string) {
    return this.laboratoryService.markSampleCollected(id);
  }

  @Patch('orders/:id/processing')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.LAB_TECHNICIAN)
  @ApiOperation({ summary: 'Mark order in processing state' })
  markProcessing(@Param('id') id: string) {
    return this.laboratoryService.markProcessing(id);
  }

  @Post('orders/:id/results')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.LAB_TECHNICIAN)
  @ApiOperation({ summary: 'Enter laboratory test results' })
  enterResults(
    @Param('id') id: string,
    @Body() results: EnterResultDto[],
    @CurrentUser('id') userId: string,
  ) {
    return this.laboratoryService.enterResults(id, results, userId);
  }

  @Patch('orders/:id/verify')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.LAB_TECHNICIAN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Verify laboratory results and publish report' })
  verifyOrder(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.laboratoryService.verifyOrder(id, userId);
  }
}

