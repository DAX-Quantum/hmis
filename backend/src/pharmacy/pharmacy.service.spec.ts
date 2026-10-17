import { Test, TestingModule } from '@nestjs/testing';
import { PharmacyService } from './pharmacy.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { InventoryTransactionType, NotificationType } from '@prisma/client';

describe('PharmacyService - FEFO Dispensing & Inventory Control', () => {
  let service: PharmacyService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      medicine: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      inventory: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _sum: { quantityInStock: 50 } }),
      },
      inventoryTransaction: {
        create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'tx-1', ...args.data })),
        findMany: jest.fn(),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'admin-1', role: 'ADMIN' },
          { id: 'pharm-1', role: 'PHARMACIST' },
        ]),
      },
      notification: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PharmacyService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PharmacyService>(PharmacyService);
  });

  describe('findAllMedicines', () => {
    it('should aggregate batch stocks and correctly identify low stock items', async () => {
      prisma.medicine.findMany.mockResolvedValue([
        {
          id: 'med-1',
          name: 'Amoxicillin 500mg',
          reorderLevel: 30,
          inventories: [
            { id: 'inv-1', quantityInStock: 10, expiryDate: new Date('2027-01-01') },
            { id: 'inv-2', quantityInStock: 15, expiryDate: new Date('2027-06-01') },
          ],
        },
        {
          id: 'med-2',
          name: 'Paracetamol 650mg',
          reorderLevel: 50,
          inventories: [
            { id: 'inv-3', quantityInStock: 60, expiryDate: new Date('2028-01-01') },
          ],
        },
      ]);

      const result = await service.findAllMedicines();

      expect(result).toHaveLength(2);
      expect(result[0].totalStock).toBe(25);
      expect(result[0].isLowStock).toBe(true); // 25 <= 30
      expect(result[1].totalStock).toBe(60);
      expect(result[1].isLowStock).toBe(false); // 60 > 50
    });
  });

  describe('dispenseMedicine - FEFO Strategy', () => {
    it('should reject dispensing with non-positive quantity', async () => {
      await expect(
        service.dispenseMedicine({ medicineId: 'med-1', quantity: 0 }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject dispensing if requested quantity exceeds total available stock', async () => {
      prisma.inventory.findMany.mockResolvedValue([
        { id: 'inv-1', quantityInStock: 20, expiryDate: new Date('2026-12-31') },
      ]);

      await expect(
        service.dispenseMedicine({ medicineId: 'med-1', quantity: 25 }, 'user-1'),
      ).rejects.toThrow('Insufficient stock! Requested: 25, Available: 20');
    });

    it('should deduct batches in FEFO order (earliest expiry first) and record transaction', async () => {
      // 2 batches: earlier batch has 15, later batch has 30
      prisma.inventory.findMany.mockResolvedValue([
        { id: 'inv-early', quantityInStock: 15, expiryDate: new Date('2026-11-01') },
        { id: 'inv-late', quantityInStock: 30, expiryDate: new Date('2027-05-01') },
      ]);

      prisma.medicine.findUnique.mockResolvedValue({
        id: 'med-1',
        name: 'Azithromycin 250mg',
        reorderLevel: 10,
      });

      // Dispense 20 units -> 15 from inv-early, 5 from inv-late
      const result = await service.dispenseMedicine(
        { medicineId: 'med-1', quantity: 20, notes: 'Prescription dispense' },
        'pharmacist-1',
      );

      expect(result.success).toBe(true);
      expect(result.remainingStock).toBe(25); // 45 - 20

      // Verify earliest batch was completely depleted (15 - 15 = 0)
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-early' },
        data: { quantityInStock: 0 },
      });

      // Verify second batch was partially deducted (30 - 5 = 25)
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-late' },
        data: { quantityInStock: 25 },
      });

      expect(prisma.inventoryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transactionType: InventoryTransactionType.DISPENSED,
            quantity: 20,
            previousStock: 45,
            newStock: 25,
          }),
        }),
      );
    });

    it('should trigger low stock notifications if remaining stock drops below reorderLevel', async () => {
      prisma.inventory.findMany.mockResolvedValue([
        { id: 'inv-1', quantityInStock: 15, expiryDate: new Date('2027-01-01') },
      ]);

      prisma.medicine.findUnique.mockResolvedValue({
        id: 'med-1',
        name: 'Metformin 500mg',
        reorderLevel: 10,
      });

      // Dispensing 10 leaves 5, which is <= reorderLevel of 10
      await service.dispenseMedicine({ medicineId: 'med-1', quantity: 10 }, 'pharmacist-1');

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Low Stock Alert',
            type: NotificationType.WARNING,
          }),
        }),
      );
    });
  });

  describe('restockMedicine', () => {
    it('should create a new inventory batch and log a purchase transaction', async () => {
      prisma.inventory.findUnique.mockResolvedValue(null);
      prisma.inventory.create.mockResolvedValue({
        id: 'inv-new',
        batchNumber: 'BATCH-2026-X',
        quantityInStock: 100,
      });

      const result = await service.restockMedicine(
        {
          medicineId: 'med-1',
          batchNumber: 'BATCH-2026-X',
          expiryDate: '2028-06-30',
          quantity: 100,
          purchaseCost: 15.5,
          location: 'Shelf B-2',
        },
        'pharmacist-1',
      );

      expect(result.id).toBe('inv-new');
      expect(prisma.inventory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            batchNumber: 'BATCH-2026-X',
            quantityInStock: 100,
            location: 'Shelf B-2',
          }),
        }),
      );
      expect(prisma.inventoryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transactionType: InventoryTransactionType.PURCHASE,
            quantity: 100,
          }),
        }),
      );
    });

    it('should increment stock on an existing batch if already registered', async () => {
      prisma.inventory.findUnique.mockResolvedValue({
        id: 'inv-existing',
        batchNumber: 'BATCH-OLD',
        quantityInStock: 40,
      });

      prisma.inventory.update.mockResolvedValue({
        id: 'inv-existing',
        batchNumber: 'BATCH-OLD',
        quantityInStock: 90,
      });

      const result = await service.restockMedicine(
        {
          medicineId: 'med-1',
          batchNumber: 'BATCH-OLD',
          expiryDate: '2028-06-30',
          quantity: 50,
          purchaseCost: 12.0,
        },
        'pharmacist-1',
      );

      expect(result.quantityInStock).toBe(90);
      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { id: 'inv-existing' },
        data: {
          quantityInStock: 90,
          purchaseCost: 12.0,
        },
      });
    });
  });
});
