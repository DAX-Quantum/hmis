import { IsNotEmpty, IsOptional, IsArray, IsString, IsNumber, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VitalInputDto {
  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsNumber()
  bloodPressureSystolic?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  bloodPressureDiastolic?: number;

  @ApiPropertyOptional({ example: 72 })
  @IsOptional()
  @IsNumber()
  heartRate?: number;

  @ApiPropertyOptional({ example: 37.0 })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ example: 16 })
  @IsOptional()
  @IsNumber()
  respiratoryRate?: number;

  @ApiPropertyOptional({ example: 98 })
  @IsOptional()
  @IsNumber()
  oxygenSaturation?: number;

  @ApiPropertyOptional({ example: 70.5 })
  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @ApiPropertyOptional({ example: 175 })
  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PrescriptionItemInputDto {
  @ApiPropertyOptional({ example: 'medicine-uuid' })
  @IsOptional()
  @IsString()
  medicineId?: string;

  @ApiProperty({ example: 'Amoxicillin 500mg' })
  @IsNotEmpty()
  @IsString()
  medicineName: string;

  @ApiProperty({ example: '1 capsule' })
  @IsNotEmpty()
  @IsString()
  dosage: string;

  @ApiProperty({ example: '3 times/day' })
  @IsNotEmpty()
  @IsString()
  frequency: string;

  @ApiPropertyOptional({ default: 'Oral' })
  @IsOptional()
  @IsString()
  route?: string = 'Oral';

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsNumber()
  durationDays?: number = 5;

  @ApiPropertyOptional({ example: 'Take after meals with water' })
  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreateConsultationDto {
  @ApiProperty({ example: 'appointment-uuid' })
  @IsNotEmpty()
  appointmentId: string;

  @ApiPropertyOptional({ type: [String], example: ['Fever', 'Sore throat', 'Cough'] })
  @IsOptional()
  @IsArray()
  symptoms?: string[];

  @ApiPropertyOptional({ example: 'Erythematous posterior pharynx without exudate.' })
  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @ApiProperty({ example: 'Acute Viral Pharyngitis' })
  @IsNotEmpty()
  @IsString()
  diagnosisText: string;

  @ApiPropertyOptional({ example: 'Rest, oral hydration, warm saline gargles.' })
  @IsOptional()
  @IsString()
  treatmentPlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  doctorNotes?: string;

  @ApiPropertyOptional({ example: '2026-10-20' })
  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @ApiPropertyOptional({ type: VitalInputDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VitalInputDto)
  vitals?: VitalInputDto;

  @ApiPropertyOptional({ type: [PrescriptionItemInputDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemInputDto)
  prescriptionItems?: PrescriptionItemInputDto[];
}
