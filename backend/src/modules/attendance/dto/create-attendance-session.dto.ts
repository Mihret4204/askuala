import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AttendanceSessionType {
  REGULAR = 'REGULAR',
  MAKEUP = 'MAKEUP',
  SPECIAL_SESSION = 'SPECIAL_SESSION',
}

export class CreateAttendanceSessionDto {
  @ApiProperty({ description: 'ID of the course offering' })
  @IsUUID()
  @IsNotEmpty()
  courseOfferingId: string;

  @ApiPropertyOptional({ description: 'Optional timetable slot from which session was generated' })
  @IsUUID()
  @IsOptional()
  timetableSlotId?: string;

  @ApiPropertyOptional({ description: 'Instructor conducting the session' })
  @IsUUID()
  @IsOptional()
  instructorId?: string;

  @ApiPropertyOptional({ description: 'Room where class meets' })
  @IsUUID()
  @IsOptional()
  roomId?: string;

  @ApiProperty({ description: 'Date of the class session' })
  @IsDateString()
  @IsNotEmpty()
  sessionDate: string;

  @ApiProperty({ description: 'Start time in HH:mm:ss format' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm:ss format',
  })
  startTime: string;

  @ApiProperty({ description: 'End time in HH:mm:ss format' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm:ss format',
  })
  endTime: string;

  @ApiPropertyOptional({ description: 'Topic covered in this session' })
  @IsString()
  @IsOptional()
  topicTitle?: string;

  @ApiPropertyOptional({ enum: AttendanceSessionType, default: AttendanceSessionType.REGULAR })
  @IsEnum(AttendanceSessionType)
  @IsOptional()
  sessionType?: AttendanceSessionType;
}
