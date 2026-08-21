import { IsEnum, IsNotEmpty } from 'class-validator';

export enum EnrollmentStatusEnum {
  ENROLLED = 'ENROLLED',
  DROPPED = 'DROPPED',
  WITHDRAWN = 'WITHDRAWN',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class UpdateEnrollmentStatusDto {
  @IsEnum(EnrollmentStatusEnum)
  @IsNotEmpty()
  status: EnrollmentStatusEnum;
}
