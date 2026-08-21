import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';

@Injectable()
export class TimetableService {
  constructor(private prisma: PrismaService) {}

  async createTimetableSlot(dto: CreateTimetableSlotDto) {
    const offering = await this.prisma.courseOffering.findUnique({
      where: { id: dto.courseOfferingId },
      include: { semester: true },
    });
    if (!offering) {
      throw new NotFoundException('Course offering not found');
    }

    const room = await this.prisma.room.findUnique({
      where: { id: dto.roomId },
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const instructorId = dto.instructorId || offering.instructorId;

    if (instructorId) {
      const instructor = await this.prisma.instructor.findUnique({
        where: { id: instructorId },
      });
      if (!instructor) {
        throw new NotFoundException('Instructor not found');
      }
    }

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('startTime must be strictly before endTime');
    }

    const startWeek = dto.startWeek ?? 1;
    const endWeek = dto.endWeek ?? 16;

    if (startWeek > endWeek) {
      throw new BadRequestException('startWeek must be less than or equal to endWeek');
    }

    const dayOfWeek = dto.dayOfWeek as any;

    // Room Collision Check
    const roomCollision = await this.prisma.timetableSlot.findFirst({
      where: {
        roomId: dto.roomId,
        dayOfWeek,
        status: 'ACTIVE',
        AND: [
          { startTime: { lt: dto.endTime } },
          { endTime: { gt: dto.startTime } },
          { startWeek: { lte: endWeek } },
          { endWeek: { gte: startWeek } },
        ],
      },
      include: { courseOffering: { include: { course: true } } },
    });

    if (roomCollision) {
      throw new ConflictException(
        `Room conflict: Room ${room.code} is already booked for ${roomCollision.courseOffering.course.code} on ${dayOfWeek} between ${roomCollision.startTime} and ${roomCollision.endTime}`,
      );
    }

    // Instructor Collision Check
    if (instructorId) {
      const instructorCollision = await this.prisma.timetableSlot.findFirst({
        where: {
          instructorId,
          dayOfWeek,
          status: 'ACTIVE',
          AND: [
            { startTime: { lt: dto.endTime } },
            { endTime: { gt: dto.startTime } },
            { startWeek: { lte: endWeek } },
            { endWeek: { gte: startWeek } },
          ],
        },
        include: { courseOffering: { include: { course: true } } },
      });

      if (instructorCollision) {
        throw new ConflictException(
          `Instructor conflict: Instructor is already scheduled for ${instructorCollision.courseOffering.course.code} on ${dayOfWeek} between ${instructorCollision.startTime} and ${instructorCollision.endTime}`,
        );
      }
    }

    return this.prisma.timetableSlot.create({
      data: {
        courseOfferingId: dto.courseOfferingId,
        roomId: dto.roomId,
        instructorId,
        dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        startWeek,
        endWeek,
        recurrencePattern: dto.recurrencePattern as any ?? 'WEEKLY',
        sessionType: dto.sessionType as any ?? 'LECTURE',
      },
      include: {
        courseOffering: { include: { course: true, semester: true } },
        room: { include: { building: true } },
        instructor: { include: { user: true } },
      },
    });
  }

  async findAllTimetableSlots() {
    return this.prisma.timetableSlot.findMany({
      include: {
        courseOffering: { include: { course: true } },
        room: { include: { building: true } },
        instructor: { include: { user: true } },
      },
    });
  }

  async findOneTimetableSlot(id: string) {
    const slot = await this.prisma.timetableSlot.findUnique({
      where: { id },
      include: {
        courseOffering: { include: { course: true, semester: true } },
        room: { include: { building: true } },
        instructor: { include: { user: true } },
      },
    });

    if (!slot) {
      throw new NotFoundException(`Timetable slot with ID ${id} not found`);
    }

    return slot;
  }
}
