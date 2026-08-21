import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID, Min } from 'class-validator';

export enum DeliveryModeEnum {
  REGULAR = 'REGULAR',
  EXTENSION = 'EXTENSION',
  DISTANCE = 'DISTANCE',
}

export enum CourseOfferingStatusEnum {
  PLANNED = 'PLANNED',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export class CreateCourseOfferingDto {
  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @IsUUID()
  @IsNotEmpty()
  semesterId: string;

  @IsUUID()
  @IsOptional()
  instructorId?: string;

  @IsUUID()
  @IsOptional()
  roomId?: string;

  @IsString()
  @IsNotEmpty()
  sectionCode: string;

  @IsEnum(DeliveryModeEnum)
  @IsOptional()
  deliveryMode?: DeliveryModeEnum;

  @IsInt()
  @Min(1)
  maxCapacity: number;

  @IsEnum(CourseOfferingStatusEnum)
  @IsOptional()
  status?: CourseOfferingStatusEnum;

  @IsUrl()
  @IsOptional()
  syllabusUrl?: string;
}
