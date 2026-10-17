import { IsNotEmpty, IsEmail, IsOptional, IsEnum, IsArray, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, BloodGroup } from '@prisma/client';

export class CreatePatientDto {
  @ApiProperty({ example: 'Eleanor' })
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Rigby' })
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '1988-04-12' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ enum: Gender, example: Gender.FEMALE })
  @IsEnum(Gender)
  gender: Gender;

  @ApiPropertyOptional({ enum: BloodGroup, example: BloodGroup.O_POSITIVE })
  @IsOptional()
  @IsEnum(BloodGroup)
  bloodGroup?: BloodGroup;

  @ApiPropertyOptional({ example: 'eleanor.rigby@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+1 (555) 234-5678' })
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: '342 Abbey Road, Apt 4B' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Liverpool' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Merseyside' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'L8 1AB' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Paul McCartney' })
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiPropertyOptional({ example: '+1 (555) 876-5432' })
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiPropertyOptional({ example: 'Friend' })
  @IsOptional()
  @IsString()
  emergencyContactRelation?: string;

  @ApiPropertyOptional({ type: [String], example: ['Penicillin', 'Peanuts'] })
  @IsOptional()
  @IsArray()
  allergies?: string[];

  @ApiPropertyOptional({ type: [String], example: ['Asthma'] })
  @IsOptional()
  @IsArray()
  chronicConditions?: string[];

  @ApiPropertyOptional({ example: 'BlueCross BlueShield' })
  @IsOptional()
  @IsString()
  insuranceProvider?: string;

  @ApiPropertyOptional({ example: 'POL-992819' })
  @IsOptional()
  @IsString()
  insurancePolicyNumber?: string;
}
