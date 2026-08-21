import { IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export enum EnrollmentTypeEnum {
  CREDIT = 'CREDIT',
  AUDIT = 'AUDIT',
}

export class CreateEnrollmentDto {
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @IsUUID()
  @IsNotEmpty()
  courseOfferingId: string;

  @IsEnum(EnrollmentTypeEnum)
  @IsOptional()
  enrollmentType?: EnrollmentTypeEnum;
}
