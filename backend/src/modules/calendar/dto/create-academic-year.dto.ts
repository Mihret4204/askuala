import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum CalendarStatusEnum {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateAcademicYearDto {
  @IsString()
  @IsNotEmpty()
  yearCode: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;

  @IsEnum(CalendarStatusEnum)
  @IsOptional()
  status?: CalendarStatusEnum;
}
