import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryTransactionType, NotificationType } from '@prisma/client';

export interface DispenseMedicineDto {
  medicineId: string;
  quantity: number;
  prescriptionId?: string;
  notes?: string;
}

export interface RestockMedicineDto {
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchaseCost: number;
  location?: string;
}

@Injectable()
export class PharmacyService {
  constructor(private prisma: PrismaService) {}

  // List all medicines with current stock level and low stock indicator
  async findAllMedicines(search?: string, category?: string) {
    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { genericName: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    const medicines = await this.prisma.medicine.findMany({
      where,
      include: {
        inventories: true,
      },
      orderBy: { name: 'asc' },
    });

    return medicines.map((m) => {
      const totalStock = m.inventories.reduce((acc, inv) => acc + inv.quantityInStock, 0);
      const isLowStock = totalStock <= m.reorderLevel;

      return {
        ...m,
        totalStock,
        isLowStock,
      };
    });
  }

  // Get low-stock medicines
  async getLowStockAlerts() {
    const medicines = await this.findAllMedicines();
    return medicines.filter((m) => m.isLowStock);
  }

  // Dispense medicine and prevent negative stock
  async dispenseMedicine(dto: DispenseMedicineDto, userId: string) {
    if (dto.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      // Find active inventory batches with stock ordered by earliest expiry (FEFO: First Expired, First Out)
      const inventories = await tx.inventory.findMany({
        where: {
          medicineId: dto.medicineId,
          quantityInStock: { gt: 0 },
        },
        orderBy: { expiryDate: 'asc' },
      });

      const totalAvailable = inventories.reduce((sum, i) => sum + i.quantityInStock, 0);
      if (totalAvailable < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock! Requested: ${dto.quantity}, Available: ${totalAvailable}`,
        );
      }

      let remainingToDeduct = dto.quantity;
      for (const inv of inventories) {
        if (remainingToDeduct === 0) break;

        const deduct = Math.min(inv.quantityInStock, remainingToDeduct);
        await tx.inventory.update({
          where: { id: inv.id },
          data: { quantityInStock: inv.quantityInStock - deduct },
        });
        remainingToDeduct -= deduct;
      }

      const medicine = await tx.medicine.findUnique({ where: { id: dto.medicineId } });

      // Record Inventory Transaction
      const transaction = await tx.inventoryTransaction.create({
        data: {
          medicineId: dto.medicineId,
          transactionType: InventoryTransactionType.DISPENSED,
          quantity: dto.quantity,
          previousStock: totalAvailable,
          newStock: totalAvailable - dto.quantity,
          referenceId: dto.prescriptionId,
          notes: dto.notes || 'Dispensed to patient',
          performedById: userId,
        },
      });

      // Check if stock has now dropped below reorder level
      const updatedTotalStock = totalAvailable - dto.quantity;
      if (medicine && updatedTotalStock <= medicine.reorderLevel) {
        // Trigger low stock notification
        const adminUsers = await tx.user.findMany({
          where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'PHARMACIST'] } },
        });

        for (const admin of adminUsers) {
          await tx.notification.create({
            data: {
              userId: admin.id,
              title: 'Low Stock Alert',
              message: `${medicine.name} inventory has fallen to ${updatedTotalStock} (Reorder level: ${medicine.reorderLevel}).`,
              type: NotificationType.WARNING,
              link: '/pharmacy',
            },
          });
        }
      }

      return {
        success: true,
        transaction,
        remainingStock: updatedTotalStock,
      };
    });
  }

  // Restock inventory batch
  async restockMedicine(dto: RestockMedicineDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existingBatch = await tx.inventory.findUnique({
        where: {
          medicineId_batchNumber: {
            medicineId: dto.medicineId,
            batchNumber: dto.batchNumber,
          },
        },
      });

      const previousStock = await tx.inventory
        .aggregate({
          where: { medicineId: dto.medicineId },
          _sum: { quantityInStock: true },
        })
        .then((res) => res._sum.quantityInStock || 0);

      let inventory;
      if (existingBatch) {
        inventory = await tx.inventory.update({
          where: { id: existingBatch.id },
          data: {
            quantityInStock: existingBatch.quantityInStock + dto.quantity,
            purchaseCost: dto.purchaseCost,
          },
        });
      } else {
        inventory = await tx.inventory.create({
          data: {
            medicineId: dto.medicineId,
            batchNumber: dto.batchNumber,
            expiryDate: new Date(dto.expiryDate),
            quantityInStock: dto.quantity,
            location: dto.location || 'Central Pharmacy Shelf A',
            purchaseCost: dto.purchaseCost,
          },
        });
      }

      const newStock = previousStock + dto.quantity;

      await tx.inventoryTransaction.create({
        data: {
          medicineId: dto.medicineId,
          transactionType: InventoryTransactionType.PURCHASE,
          quantity: dto.quantity,
          previousStock,
          newStock,
          notes: `Restock batch ${dto.batchNumber}`,
          performedById: userId,
        },
      });

      return inventory;
    });
  }

  // Inventory transaction history
  async getTransactions(medicineId?: string) {
    const where: any = {};
    if (medicineId) where.medicineId = medicineId;

    return this.prisma.inventoryTransaction.findMany({
      where,
      include: {
        medicine: true,
        performedBy: { select: { firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
