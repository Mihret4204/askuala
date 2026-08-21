import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum GradeApprovalAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ApproveGradeDto {
  @ApiProperty({
    enum: GradeApprovalAction,
    description: 'Approve (moves to APPROVED) or Reject (moves back to DRAFT)',
  })
  @IsEnum(GradeApprovalAction)
  @IsNotEmpty()
  action: GradeApprovalAction;
}
