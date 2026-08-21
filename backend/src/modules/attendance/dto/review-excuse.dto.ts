import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ExcuseStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ReviewExcuseDto {
  @ApiProperty({ enum: ExcuseStatus, description: 'Decision to approve or reject the excuse' })
  @IsEnum(ExcuseStatus)
  @IsNotEmpty()
  status: ExcuseStatus;
}
