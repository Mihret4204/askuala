import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateInstructorDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsUUID()
  @IsNotEmpty()
  departmentId: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  officeLocation?: string;
}
