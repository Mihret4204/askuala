import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum TermTypeEnum {
  SEMESTER_1 = 'SEMESTER_1',
  SEMESTER_2 = 'SEMESTER_2',
  TRIMESTER_1 = 'TRIMESTER_1',
  TRIMESTER_2 = 'TRIMESTER_2',
  TRIMESTER_3 = 'TRIMESTER_3',
  SUMMER = 'SUMMER',
}

export enum SemesterStatusEnum {
  PLANNED = 'PLANNED',
  REGISTRATION = 'REGISTRATION',
  ACTIVE = 'ACTIVE',
  EXAM_PERIOD = 'EXAM_PERIOD',
  GRADING = 'GRADING',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateSemesterDto {
  @IsUUID()
  @IsNotEmpty()
  academicYearId: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(TermTypeEnum)
  @IsNotEmpty()
  termType: TermTypeEnum;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsDateString()
  @IsOptional()
  registrationStartDate?: string;

  @IsDateString()
  @IsOptional()
  registrationEndDate?: string;

  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;

  @IsEnum(SemesterStatusEnum)
  @IsOptional()
  status?: SemesterStatusEnum;
}
