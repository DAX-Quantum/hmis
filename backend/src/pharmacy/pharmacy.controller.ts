import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PharmacyService, DispenseMedicineDto, RestockMedicineDto } from './pharmacy.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('pharmacy')
@Controller('pharmacy')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PharmacyController {
  constructor(private pharmacyService: PharmacyService) {}

  @Get('medicines')
  @ApiOperation({ summary: 'List all medicines with current stock and low-stock flags' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  findAllMedicines(@Query('search') search?: string, @Query('category') category?: string) {
    return this.pharmacyService.findAllMedicines(search, category);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get list of medicines currently below reorder levels' })
  getLowStockAlerts() {
    return this.pharmacyService.getLowStockAlerts();
  }

  @Post('dispense')
  @ApiOperation({ summary: 'Dispense medicine and deduct from inventory using FEFO' })
  dispense(@Body() dto: DispenseMedicineDto, @CurrentUser('id') userId: string) {
    return this.pharmacyService.dispenseMedicine(dto, userId);
  }

  @Post('restock')
  @ApiOperation({ summary: 'Receive shipment / restock batch into pharmacy inventory' })
  restock(@Body() dto: RestockMedicineDto, @CurrentUser('id') userId: string) {
    return this.pharmacyService.restockMedicine(dto, userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get inventory transaction audit ledger' })
  @ApiQuery({ name: 'medicineId', required: false })
  getTransactions(@Query('medicineId') medicineId?: string) {
    return this.pharmacyService.getTransactions(medicineId);
  }
}
