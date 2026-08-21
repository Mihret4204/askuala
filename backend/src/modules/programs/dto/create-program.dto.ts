import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum DegreeTypeEnum {
  DIPLOMA = 'DIPLOMA',
  BACHELOR = 'BACHELOR',
  MASTER = 'MASTER',
  DOCTORATE = 'DOCTORATE',
  CERTIFICATE = 'CERTIFICATE',
}

export class CreateProgramDto {
  @IsUUID()
  @IsNotEmpty()
  departmentId: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(DegreeTypeEnum)
  @IsOptional()
  degreeType?: DegreeTypeEnum;

  @IsNumber()
  @Min(0.5)
  durationYears: number;

  @IsInt()
  @Min(1)
  totalCreditsRequired: number;
}
