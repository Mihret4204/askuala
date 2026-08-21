import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

export enum DayOfWeekEnum {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export enum RecurrencePatternEnum {
  WEEKLY = 'WEEKLY',
  BIWEEKLY_EVEN = 'BIWEEKLY_EVEN',
  BIWEEKLY_ODD = 'BIWEEKLY_ODD',
}

export enum SessionTypeEnum {
  LECTURE = 'LECTURE',
  LABORATORY = 'LABORATORY',
  TUTORIAL = 'TUTORIAL',
  SEMINAR = 'SEMINAR',
}

export class CreateTimetableSlotDto {
  @IsUUID()
  @IsNotEmpty()
  courseOfferingId: string;

  @IsUUID()
  @IsNotEmpty()
  roomId: string;

  @IsUUID()
  @IsOptional()
  instructorId?: string;

  @IsEnum(DayOfWeekEnum)
  @IsNotEmpty()
  dayOfWeek: DayOfWeekEnum;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'startTime must be in HH:mm:ss format',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'endTime must be in HH:mm:ss format',
  })
  endTime: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  startWeek?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  endWeek?: number;

  @IsEnum(RecurrencePatternEnum)
  @IsOptional()
  recurrencePattern?: RecurrencePatternEnum;

  @IsEnum(SessionTypeEnum)
  @IsOptional()
  sessionType?: SessionTypeEnum;
}
