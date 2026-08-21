import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, IsUUID, Max, Min } from 'class-validator';

export class CreateCourseDto {
  @IsUUID()
  @IsNotEmpty()
  departmentId: string;

  @IsUUID()
  @IsOptional()
  programId?: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0.5)
  creditHours: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  lectureHours?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  labHours?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  tutorialHours?: number;

  @IsInt()
  @Min(1)
  @Max(7)
  @IsOptional()
  courseLevel?: number;

  @IsInt()
  @Min(1)
  @Max(14)
  @IsOptional()
  recommendedSemester?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  version?: number;

  @IsBoolean()
  @IsOptional()
  isElective?: boolean;

  @IsString()
  @IsOptional()
  passingGrade?: string;

  @IsUrl()
  @IsOptional()
  syllabusUrl?: string;
}
