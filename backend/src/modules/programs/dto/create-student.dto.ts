import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateStudentDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  studentIdNumber: string;

  @IsUUID()
  @IsNotEmpty()
  programId: string;

  @IsInt()
  @IsNotEmpty()
  batch: number;

  @IsUUID()
  @IsOptional()
  admissionSemesterId?: string;
}
