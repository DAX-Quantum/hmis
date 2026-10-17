import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PharmacyService, DispenseMedicineDto, RestockMedicineDto } from './pharmacy.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('pharmacy')
@Controller('pharmacy')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PharmacyController {
  constructor(private pharmacyService: PharmacyService) {}

  @Get('medicines')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PHARMACIST, UserRole.DOCTOR, UserRole.NURSE)
  @ApiOperation({ summary: 'List all medicines with current stock and low-stock flags' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  findAllMedicines(@Query('search') search?: string, @Query('category') category?: string) {
    return this.pharmacyService.findAllMedicines(search, category);
  }

  @Get('alerts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Get list of medicines currently below reorder levels' })
  getLowStockAlerts() {
    return this.pharmacyService.getLowStockAlerts();
  }

  @Post('dispense')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Dispense medicine and deduct from inventory using FEFO' })
  dispense(@Body() dto: DispenseMedicineDto, @CurrentUser('id') userId: string) {
    return this.pharmacyService.dispenseMedicine(dto, userId);
  }

  @Post('restock')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Receive shipment / restock batch into pharmacy inventory' })
  restock(@Body() dto: RestockMedicineDto, @CurrentUser('id') userId: string) {
    return this.pharmacyService.restockMedicine(dto, userId);
  }

  @Get('transactions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Get inventory transaction audit ledger' })
  @ApiQuery({ name: 'medicineId', required: false })
  getTransactions(@Query('medicineId') medicineId?: string) {
    return this.pharmacyService.getTransactions(medicineId);
  }
}

