import { IsNotEmpty, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentType } from '@prisma/client';

export class CreateAppointmentDto {
  @ApiProperty({ example: 'patient-uuid' })
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ example: 'doctor-uuid' })
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ example: 'department-uuid' })
  @IsNotEmpty()
  departmentId: string;

  @ApiProperty({ example: '2026-10-15' })
  @IsDateString()
  appointmentDate: string;

  @ApiProperty({ example: '10:00' })
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '10:30' })
  @IsNotEmpty()
  endTime: string;

  @ApiPropertyOptional({ enum: AppointmentType, default: AppointmentType.CONSULTATION })
  @IsOptional()
  @IsEnum(AppointmentType)
  type?: AppointmentType = AppointmentType.CONSULTATION;

  @ApiPropertyOptional({ example: 'Routine cardiovascular checkup and prescription refill' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
