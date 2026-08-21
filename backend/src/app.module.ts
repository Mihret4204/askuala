import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { CoursesModule } from './modules/courses/courses.module';
import { CourseOfferingsModule } from './modules/course-offerings/course-offerings.module';
import { EnrollmentModule } from './modules/enrollment/enrollment.module';
import { TimetableModule } from './modules/timetable/timetable.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { GradesModule } from './modules/grades/grades.module';
import { TranscriptModule } from './modules/transcript/transcript.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    ProgramsModule,
    CalendarModule,
    RoomsModule,
    CoursesModule,
    CourseOfferingsModule,
    EnrollmentModule,
    TimetableModule,
    AttendanceModule,
    GradesModule,
    TranscriptModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
