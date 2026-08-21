import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial system data...');

  // 1. Seed Super Admin User
  const adminEmail = 'admin@university.edu';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  let adminUser = existingAdmin;
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('AdminPass123!', salt);
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: 'System',
        lastName: 'Admin',
        role: Role.ADMIN,
      },
    });
    console.log(`Created Admin user: ${adminEmail}`);
  }

  // 2. Seed Faculty of Technology
  const facultyCode = 'ENG';
  let faculty = await prisma.faculty.findUnique({
    where: { code: facultyCode },
  });

  if (!faculty) {
    faculty = await prisma.faculty.create({
      data: {
        code: facultyCode,
        name: 'Faculty of Engineering and Technology',
        description: 'Overarching engineering academic division',
        establishedYear: 2000,
      },
    });
    console.log(`Created Faculty: ${faculty.name}`);
  }

  // 3. Seed Department of Computer Science
  const deptCode = 'CS';
  let department = await prisma.department.findUnique({
    where: { code: deptCode },
  });

  if (!department) {
    department = await prisma.department.create({
      data: {
        facultyId: faculty.id,
        code: deptCode,
        name: 'Department of Computer Science',
        description: 'Computing and software engineering discipline',
      },
    });
    console.log(`Created Department: ${department.name}`);
  }

  // 4. Seed Program: BSc in Software Engineering
  const programCode = 'BSC-SE';
  let program = await prisma.program.findUnique({
    where: { code: programCode },
  });

  if (!program) {
    program = await prisma.program.create({
      data: {
        departmentId: department.id,
        code: programCode,
        name: 'Bachelor of Science in Software Engineering',
        degreeType: 'BACHELOR',
        durationYears: 4.0,
        totalCreditsRequired: 140,
      },
    });
    console.log(`Created Program: ${program.name}`);
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
