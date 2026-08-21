import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum PrerequisiteTypeEnum {
  PREREQUISITE = 'PREREQUISITE',
  COREQUISITE = 'COREQUISITE',
}

export class AddPrerequisiteDto {
  @IsUUID()
  @IsNotEmpty()
  prerequisiteCourseId: string;

  @IsEnum(PrerequisiteTypeEnum)
  @IsOptional()
  type?: PrerequisiteTypeEnum;

  @IsString()
  @IsOptional()
  minimumGrade?: string;

  @IsBoolean()
  @IsOptional()
  isMandatory?: boolean;
}
