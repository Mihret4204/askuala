import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ExcuseReason {
  MEDICAL = 'MEDICAL',
  ATHLETIC_EVENT = 'ATHLETIC_EVENT',
  FAMILY_EMERGENCY = 'FAMILY_EMERGENCY',
  INSTITUTIONAL_REPRESENTATION = 'INSTITUTIONAL_REPRESENTATION',
  OTHER = 'OTHER',
}

export class SubmitExcuseDto {
  @ApiProperty({ enum: ExcuseReason })
  @IsEnum(ExcuseReason)
  @IsNotEmpty()
  reason: ExcuseReason;

  @ApiProperty({ description: 'Detailed explanation for the absence' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Supporting document URL (medical note, certificate, etc.)' })
  @IsUrl()
  @IsOptional()
  documentUrl?: string;
}
