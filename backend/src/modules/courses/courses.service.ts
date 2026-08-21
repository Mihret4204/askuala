import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { AddPrerequisiteDto } from './dto/add-prerequisite.dto';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async createCourse(dto: CreateCourseDto) {
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    if (dto.programId) {
      const program = await this.prisma.program.findUnique({
        where: { id: dto.programId },
      });
      if (!program) {
        throw new NotFoundException('Program not found');
      }
    }

    const version = dto.version ?? 1;
    const existing = await this.prisma.course.findUnique({
      where: {
        code_version: {
          code: dto.code.toUpperCase(),
          version,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Course with code ${dto.code} version ${version} already exists`);
    }

    const lectureHours = dto.lectureHours ?? 0;
    const labHours = dto.labHours ?? 0;
    const tutorialHours = dto.tutorialHours ?? 0;

    if (lectureHours + labHours + tutorialHours <= 0) {
      throw new BadRequestException('Total contact hours (lecture + lab + tutorial) must be greater than 0');
    }

    return this.prisma.course.create({
      data: {
        departmentId: dto.departmentId,
        programId: dto.programId,
        code: dto.code.toUpperCase(),
        title: dto.title,
        description: dto.description,
        creditHours: dto.creditHours,
        lectureHours,
        labHours,
        tutorialHours,
        courseLevel: dto.courseLevel ?? 1,
        recommendedSemester: dto.recommendedSemester ?? 1,
        version,
        isElective: dto.isElective ?? false,
        passingGrade: dto.passingGrade ?? 'D',
        syllabusUrl: dto.syllabusUrl,
      },
      include: {
        department: true,
        program: true,
      },
    });
  }

  async findAllCourses() {
    return this.prisma.course.findMany({
      include: {
        department: true,
        program: true,
        prerequisiteRequirements: {
          include: { prerequisiteCourse: true },
        },
      },
    });
  }

  async findOneCourse(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        department: true,
        program: true,
        prerequisiteRequirements: {
          include: { prerequisiteCourse: true },
        },
        servedAsPrerequisites: {
          include: { course: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  async addPrerequisite(courseId: string, dto: AddPrerequisiteDto) {
    if (courseId === dto.prerequisiteCourseId) {
      throw new BadRequestException('A course cannot be a prerequisite of itself');
    }

    const targetCourse = await this.findOneCourse(courseId);
    const prereqCourse = await this.findOneCourse(dto.prerequisiteCourseId);

    // Cycle Detection: Check if targetCourse is already an ancestor/prerequisite of prereqCourse
    const isCycle = await this.detectCycle(dto.prerequisiteCourseId, courseId);
    if (isCycle) {
      throw new BadRequestException(
        `Circular prerequisite dependency detected: ${prereqCourse.code} depends on ${targetCourse.code}`,
      );
    }

    const type = dto.type as any ?? 'PREREQUISITE';

    const existing = await this.prisma.coursePrerequisite.findUnique({
      where: {
        courseId_prerequisiteCourseId_type: {
          courseId,
          prerequisiteCourseId: dto.prerequisiteCourseId,
          type,
        },
      },
    });

    if (existing) {
      throw new ConflictException('This prerequisite relationship already exists');
    }

    return this.prisma.coursePrerequisite.create({
      data: {
        courseId,
        prerequisiteCourseId: dto.prerequisiteCourseId,
        type,
        minimumGrade: dto.minimumGrade ?? 'C',
        isMandatory: dto.isMandatory ?? true,
      },
      include: {
        course: true,
        prerequisiteCourse: true,
      },
    });
  }

  // Recursive DFS helper to detect circular prerequisite cycles
  private async detectCycle(startCourseId: string, targetCourseId: string): Promise<boolean> {
    const visited = new Set<string>();
    const stack = [startCourseId];

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      if (currentId === targetCourseId) {
        return true;
      }

      if (!visited.has(currentId)) {
        visited.add(currentId);
        const prerequisites = await this.prisma.coursePrerequisite.findMany({
          where: { courseId: currentId },
          select: { prerequisiteCourseId: true },
        });

        for (const req of prerequisites) {
          stack.push(req.prerequisiteCourseId);
        }
      }
    }

    return false;
  }
}
