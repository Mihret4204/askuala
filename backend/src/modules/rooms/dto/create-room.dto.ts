import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum RoomTypeEnum {
  LECTURE_HALL = 'LECTURE_HALL',
  LABORATORY = 'LABORATORY',
  COMPUTER_LAB = 'COMPUTER_LAB',
  SEMINAR_ROOM = 'SEMINAR_ROOM',
  OFFICE = 'OFFICE',
}

export class CreateRoomDto {
  @IsUUID()
  @IsNotEmpty()
  buildingId: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  roomNumber: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(RoomTypeEnum)
  @IsOptional()
  type?: RoomTypeEnum;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsInt()
  @IsOptional()
  floorLevel?: number;

  @IsBoolean()
  @IsOptional()
  isAccessible?: boolean;

  @IsBoolean()
  @IsOptional()
  hasProjector?: boolean;

  @IsBoolean()
  @IsOptional()
  hasComputers?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  computerCount?: number;

  @IsBoolean()
  @IsOptional()
  hasLabEquipment?: boolean;
}
