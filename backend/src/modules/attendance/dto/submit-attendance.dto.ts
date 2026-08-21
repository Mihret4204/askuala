import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  ABSENT = 'ABSENT',
}

export class AttendanceRecordInput {
  @ApiProperty({ description: 'Enrollment ID of the student' })
  @IsUUID()
  @IsNotEmpty()
  enrollmentId: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  @IsNotEmpty()
  status: AttendanceStatus;

  @ApiPropertyOptional({ description: 'Minutes late (if status is LATE)', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  minutesLate?: number;

  @ApiPropertyOptional({ description: 'Optional comments or notes' })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class SubmitAttendanceDto {
  @ApiProperty({ type: [AttendanceRecordInput], description: 'Roll call records for all enrolled students' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordInput)
  records: AttendanceRecordInput[];
}
