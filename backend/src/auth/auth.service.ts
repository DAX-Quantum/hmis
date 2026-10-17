import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        doctorProfile: {
          include: { department: true }
        },
        patientProfile: true,
      },
    });

    if (!user) {
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated.');
    }

    const { passwordHash, refreshTokenHash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Update refresh token hash
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: refreshHash },
    });

    // Record audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        resource: 'AUTH',
        resourceId: user.id,
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || 'Browser',
        metadata: { role: user.role, email: user.email },
      },
    });

    // Get user permissions
    const permissions = await this.getUserPermissions(user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        doctorId: user.doctorProfile?.id,
        doctorDepartment: user.doctorProfile?.department?.name,
        patientId: user.patientProfile?.id,
        mrn: user.patientProfile?.mrn,
        permissions,
      },
      ...tokens,
    };
  }

  async register(registerDto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existing) {
      throw new ConflictException('Email is already registered.');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash: hashedPassword,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        role: registerDto.role || UserRole.PATIENT,
        phone: registerDto.phone,
      },
    });

    // If role is PATIENT, automatically create a Patient record with MRN
    if (user.role === UserRole.PATIENT) {
      const patientCount = await this.prisma.patient.count();
      const mrn = `MRN-2026-${String(patientCount + 1).padStart(4, '0')}`;
      await this.prisma.patient.create({
        data: {
          userId: user.id,
          mrn,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone || '+1 (555) 000-0000',
          dateOfBirth: new Date('1995-01-01'),
          gender: 'OTHER',
          email: user.email,
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    const permissions = await this.getUserPermissions(user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions,
      },
      ...tokens,
    };
  }

  async refreshToken(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Access Denied');
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) {
      throw new UnauthorizedException('Invalid Refresh Token');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: refreshHash },
    });

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_LOGOUT',
        resource: 'AUTH',
        resourceId: userId,
      },
    });

    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        doctorProfile: {
          include: { department: true }
        },
        patientProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permissions = await this.getUserPermissions(user.role);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      doctorId: user.doctorProfile?.id,
      doctorDepartment: user.doctorProfile?.department?.name,
      patientId: user.patientProfile?.id,
      mrn: user.patientProfile?.mrn,
      permissions,
    };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'hospital_management_jwt_super_secret_key_2026_x89',
        expiresIn: '1d',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'hospital_management_jwt_refresh_super_secret_key_2026_y90',
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 86400,
    };
  }

  private async getUserPermissions(role: UserRole): Promise<string[]> {
    if (role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN) {
      const allPerms = await this.prisma.permission.findMany({ select: { name: true } });
      return allPerms.map(p => p.name);
    }

    const rolePerms = await this.prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true },
    });

    return rolePerms.map(rp => rp.permission.name);
  }
}
