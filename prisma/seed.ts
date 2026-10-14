import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial Handy Squad database...');

  // Clean existing data
  await prisma.payment.deleteMany();
  await prisma.jobCost.deleteMany();
  await prisma.job.deleteMany();
  await prisma.dailyRecord.deleteMany();
  await prisma.financialStandard.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.user.deleteMany();
  await prisma.sharedExpense.deleteMany();

  // Create Users
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@handysquad.com',
      password: 'password123',
      name: 'Adil (Admin)',
      role: 'ADMIN',
    },
  });

  const opsUser = await prisma.user.create({
    data: {
      email: 'ops@handysquad.com',
      password: 'password123',
      name: 'Operations Manager',
      role: 'OPERATIONS',
    },
  });

  // Operating Units
  const unitsData = [
    { name: 'Deep Cleaning Team 1', type: 'MAIN_TEAM', headcount: 5, target: 15000, cost: 8000 },
    { name: 'Deep Cleaning Team 2', type: 'MAIN_TEAM', headcount: 5, target: 15000, cost: 8000 },
    { name: 'Deep Cleaning Team 3', type: 'MAIN_TEAM', headcount: 5, target: 15000, cost: 8000 },
    { name: 'Small Jobs Crew 1', type: 'SMALL_CREW', headcount: 3, target: 10000, cost: 5500 },
    { name: 'Small Jobs Crew 2', type: 'SMALL_CREW', headcount: 3, target: 10000, cost: 5500 },
  ];

  const createdUnits = [];

  for (const u of unitsData) {
    const unit = await prisma.unit.create({
      data: {
        name: u.name,
        type: u.type,
        defaultHeadcount: u.headcount,
        dailyCapacityHr: 9,
        active: true,
        standards: {
          create: {
            effectiveStartDate: new Date('2026-01-01T00:00:00Z'),
            dailyRevenueTarget: u.target,
            standardDailyOperatingCost: u.cost,
            dailyCapacityHours: 9,
            outsideManpowerRate: 1000,
            minRevenuePerAdditionalTech: 2000,
            overtimeRatePerHour: 100,
          },
        },
      },
      include: { standards: true },
    });
    createdUnits.push(unit);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sample Jobs
  // Job 1: Main Team 1 (Confirmed)
  const job1 = await prisma.job.create({
    data: {
      title: 'Full Villa Deep Clean - Palm Meadows',
      customerRef: 'CUST-1001 (Mr. Rajesh)',
      unitId: createdUnits[0].id,
      scheduledDate: today,
      status: 'CONFIRMED',
      bookingStatus: 'CONFIRMED',
      probabilityWeight: 1.0,
      expectedRevenue: 16500,
      finalRevenue: 16500,
      earnedRevenue: 16500,
      estimatedDurationHr: 7,
      actualDurationHr: 7.5,
      estimatedTravelHr: 1.5,
      actualTravelHr: 1.5,
      notes: 'Includes terrace and deep degreasing',
      createdById: opsUser.id,
      costs: {
        create: [
          { category: 'OUTSIDE_MANPOWER', estimated: 1000, actual: 1000, quantity: 1, rate: 1000, description: '1 helper' },
          { category: 'MATERIALS', estimated: 400, actual: 450, description: 'Eco-clean chemicals' },
        ],
      },
      payments: {
        create: [
          { amount: 10000, paymentMethod: 'UPI', reference: 'UPI-77821', notes: 'Advance payment' },
        ],
      },
    },
  });

  // Job 2: Small Crew 1 (Completed)
  await prisma.job.create({
    data: {
      title: '3-BHK Sofa Shampoo & Sanitization',
      customerRef: 'CUST-1002 (Priya S.)',
      unitId: createdUnits[3].id,
      scheduledDate: today,
      status: 'COMPLETED',
      bookingStatus: 'CONFIRMED',
      probabilityWeight: 1.0,
      expectedRevenue: 11000,
      finalRevenue: 11000,
      earnedRevenue: 11000,
      estimatedDurationHr: 5,
      actualDurationHr: 5,
      estimatedTravelHr: 2,
      actualTravelHr: 2,
      notes: 'Customer very satisfied',
      createdById: opsUser.id,
      payments: {
        create: [
          { amount: 11000, paymentMethod: 'BANK_TRANSFER', reference: 'NEFT-8899', notes: 'Full settlement' },
        ],
      },
    },
  });

  // Job 3: Tentative job for Team 2 (Simulation/Forecast)
  await prisma.job.create({
    data: {
      title: 'Penthouse Move-in Cleaning',
      customerRef: 'CUST-1003 (Vikram M.)',
      unitId: createdUnits[1].id,
      scheduledDate: today,
      status: 'TENTATIVE',
      bookingStatus: 'TENTATIVE',
      probabilityWeight: 0.6,
      expectedRevenue: 14000,
      estimatedDurationHr: 6,
      estimatedTravelHr: 1.5,
      createdById: opsUser.id,
      costs: {
        create: [
          { category: 'OUTSIDE_MANPOWER', estimated: 1000, quantity: 1, rate: 1000, description: '1 temp technician' },
        ],
      },
    },
  });

  // Daily records for today
  for (const unit of createdUnits) {
    let earned = 0;
    let usedHrs = 0;
    let addExp = 0;

    if (unit.name === 'Deep Cleaning Team 1') {
      earned = 16500;
      usedHrs = 9;
      addExp = 1450;
    } else if (unit.name === 'Small Jobs Crew 1') {
      earned = 11000;
      usedHrs = 7;
      addExp = 0;
    } else if (unit.name === 'Deep Cleaning Team 2') {
      earned = 14000;
      usedHrs = 7.5;
      addExp = 1000;
    } else if (unit.name === 'Deep Cleaning Team 3') {
      earned = 15000;
      usedHrs = 9;
      addExp = 500;
    } else if (unit.name === 'Small Jobs Crew 2') {
      earned = 8500;
      usedHrs = 7;
      addExp = 1000;
    }

    const std = unit.standards[0];
    await prisma.dailyRecord.create({
      data: {
        date: today,
        unitId: unit.id,
        earnedRevenue: earned,
        standardFixedCost: std.standardDailyOperatingCost,
        additionalDirectExpenses: addExp,
        usedHours: usedHrs,
        finalized: false,
      },
    });
  }

  // Shared Expenses
  await prisma.sharedExpense.create({
    data: {
      date: today,
      category: 'ADMIN_OFFICE',
      amount: 1500,
      description: 'Operations software & dispatch platform fee',
    },
  });

  console.log('Database seeded successfully with all 5 units, sample jobs, and daily records.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
