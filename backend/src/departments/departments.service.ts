import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.department.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { doctors: true, appointments: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: {
        doctors: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, avatar: true } },
          },
        },
      },
    });

    if (!dept) {
      throw new NotFoundException(`Department #${id} not found`);
    }

    return dept;
  }
}
