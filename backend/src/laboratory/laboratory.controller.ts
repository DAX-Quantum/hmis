import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LaboratoryService, CreateLabOrderDto, EnterResultDto } from './laboratory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LabOrderStatus } from '@prisma/client';

@ApiTags('laboratory')
@Controller('laboratory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LaboratoryController {
  constructor(private laboratoryService: LaboratoryService) {}

  @Get('tests')
  @ApiOperation({ summary: 'List available diagnostic test catalog' })
  findAllTests() {
    return this.laboratoryService.findAllTests();
  }

  @Post('orders')
  @ApiOperation({ summary: 'Create new diagnostic laboratory order' })
  createOrder(@Body() dto: CreateLabOrderDto) {
    return this.laboratoryService.createOrder(dto);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List laboratory orders queue with status filter' })
  @ApiQuery({ name: 'status', required: false, enum: LabOrderStatus })
  @ApiQuery({ name: 'patientId', required: false })
  findAllOrders(@Query('status') status?: LabOrderStatus, @Query('patientId') patientId?: string) {
    return this.laboratoryService.findAllOrders({ status, patientId });
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get full lab order details with results' })
  findOneOrder(@Param('id') id: string) {
    return this.laboratoryService.findOneOrder(id);
  }

  @Patch('orders/:id/sample-collected')
  @ApiOperation({ summary: 'Mark specimen sample collected' })
  markSampleCollected(@Param('id') id: string) {
    return this.laboratoryService.markSampleCollected(id);
  }

  @Patch('orders/:id/processing')
  @ApiOperation({ summary: 'Mark order in processing state' })
  markProcessing(@Param('id') id: string) {
    return this.laboratoryService.markProcessing(id);
  }

  @Post('orders/:id/results')
  @ApiOperation({ summary: 'Enter laboratory test results' })
  enterResults(
    @Param('id') id: string,
    @Body() results: EnterResultDto[],
    @CurrentUser('id') userId: string,
  ) {
    return this.laboratoryService.enterResults(id, results, userId);
  }

  @Patch('orders/:id/verify')
  @ApiOperation({ summary: 'Verify laboratory results and publish report' })
  verifyOrder(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.laboratoryService.verifyOrder(id, userId);
  }
}
