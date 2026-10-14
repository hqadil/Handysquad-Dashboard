-- =========================================================================
-- Handy Squad Housekeeping Economics Engine - Supabase PostgreSQL Setup
-- Run this complete script in your Supabase SQL Editor (Dashboard > SQL Editor)
-- =========================================================================

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Drop existing tables if re-running
DROP TABLE IF EXISTS "Payment" CASCADE;
DROP TABLE IF EXISTS "JobCost" CASCADE;
DROP TABLE IF EXISTS "Job" CASCADE;
DROP TABLE IF EXISTS "DailyRecord" CASCADE;
DROP TABLE IF EXISTS "FinancialStandard" CASCADE;
DROP TABLE IF EXISTS "Unit" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "SharedExpense" CASCADE;

-- 2. CREATE TABLES

-- User Table
CREATE TABLE "User" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OPERATIONS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Operating Unit Table
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL, -- 'MAIN_TEAM' | 'SMALL_CREW'
    "defaultHeadcount" INTEGER NOT NULL,
    "dailyCapacityHr" INTEGER NOT NULL DEFAULT 9,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- Financial Standard Table
CREATE TABLE "FinancialStandard" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "unitId" TEXT NOT NULL,
    "effectiveStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveEndDate" TIMESTAMP(3),
    "dailyRevenueTarget" DOUBLE PRECISION NOT NULL,
    "standardDailyOperatingCost" DOUBLE PRECISION NOT NULL,
    "dailyCapacityHours" DOUBLE PRECISION NOT NULL DEFAULT 9,
    "outsideManpowerRate" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "minRevenuePerAdditionalTech" DOUBLE PRECISION NOT NULL DEFAULT 2000,
    "overtimeRatePerHour" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialStandard_pkey" PRIMARY KEY ("id")
);

-- Job Table
CREATE TABLE "Job" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "title" TEXT NOT NULL,
    "customerRef" TEXT,
    "unitId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'TENTATIVE', -- 'TENTATIVE' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
    "bookingStatus" TEXT NOT NULL DEFAULT 'TENTATIVE',
    "probabilityWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "expectedRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalRevenue" DOUBLE PRECISION,
    "earnedRevenue" DOUBLE PRECISION,
    "estimatedDurationHr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualDurationHr" DOUBLE PRECISION,
    "estimatedTravelHr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualTravelHr" DOUBLE PRECISION,
    "estimatedCompletionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualCompletionPct" DOUBLE PRECISION,
    "notes" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- Job Cost Table
CREATE TABLE "JobCost" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "jobId" TEXT NOT NULL,
    "category" TEXT NOT NULL, -- 'OUTSIDE_MANPOWER' | 'MATERIALS' | 'OTHER'
    "estimated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actual" DOUBLE PRECISION,
    "quantity" DOUBLE PRECISION,
    "rate" DOUBLE PRECISION,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobCost_pkey" PRIMARY KEY ("id")
);

-- Daily Record Table
CREATE TABLE "DailyRecord" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "date" TIMESTAMP(3) NOT NULL,
    "unitId" TEXT NOT NULL,
    "earnedRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "standardFixedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "additionalDirectExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyRecord_pkey" PRIMARY KEY ("id")
);

-- Payment Table
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "jobId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- Shared Overhead Expense Table
CREATE TABLE "SharedExpense" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedExpense_pkey" PRIMARY KEY ("id")
);

-- 3. UNIQUE INDEXES
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "DailyRecord_date_unitId_key" ON "DailyRecord"("date", "unitId");

-- 4. FOREIGN KEY CONSTRAINTS
ALTER TABLE "FinancialStandard" ADD CONSTRAINT "FinancialStandard_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JobCost" ADD CONSTRAINT "JobCost_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobCost" ADD CONSTRAINT "JobCost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DailyRecord" ADD CONSTRAINT "DailyRecord_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. ROW-LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on all tables and permit anon / authenticated access for the dashboard
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Unit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancialStandard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobCost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DailyRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SharedExpense" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to User" ON "User" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to Unit" ON "Unit" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to FinancialStandard" ON "FinancialStandard" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to Job" ON "Job" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to JobCost" ON "JobCost" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to DailyRecord" ON "DailyRecord" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to Payment" ON "Payment" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to SharedExpense" ON "SharedExpense" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. SEED DATA

-- Initial Users
INSERT INTO "User" ("id", "email", "password", "name", "role") VALUES
('user_admin_01', 'admin@handysquad.com', 'password123', 'Adil (Admin)', 'ADMIN'),
('user_ops_01', 'ops@handysquad.com', 'password123', 'Operations Manager', 'OPERATIONS');

-- Operating Units
INSERT INTO "Unit" ("id", "name", "type", "defaultHeadcount", "dailyCapacityHr", "active") VALUES
('unit_team_1', 'Deep Cleaning Team 1', 'MAIN_TEAM', 5, 9, true),
('unit_team_2', 'Deep Cleaning Team 2', 'MAIN_TEAM', 5, 9, true),
('unit_team_3', 'Deep Cleaning Team 3', 'MAIN_TEAM', 5, 9, true),
('unit_crew_1', 'Small Jobs Crew 1', 'SMALL_CREW', 3, 9, true),
('unit_crew_2', 'Small Jobs Crew 2', 'SMALL_CREW', 3, 9, true);

-- Financial Standards for Units
INSERT INTO "FinancialStandard" ("id", "unitId", "effectiveStartDate", "dailyRevenueTarget", "standardDailyOperatingCost", "dailyCapacityHours", "outsideManpowerRate", "minRevenuePerAdditionalTech", "overtimeRatePerHour") VALUES
('std_team_1', 'unit_team_1', '2026-01-01 00:00:00', 15000, 8000, 9, 1000, 2000, 100),
('std_team_2', 'unit_team_2', '2026-01-01 00:00:00', 15000, 8000, 9, 1000, 2000, 100),
('std_team_3', 'unit_team_3', '2026-01-01 00:00:00', 15000, 8000, 9, 1000, 2000, 100),
('std_crew_1', 'unit_crew_1', '2026-01-01 00:00:00', 10000, 5500, 9, 1000, 2000, 100),
('std_crew_2', 'unit_crew_2', '2026-01-01 00:00:00', 10000, 5500, 9, 1000, 2000, 100);

-- Sample Jobs for Today
INSERT INTO "Job" ("id", "title", "customerRef", "unitId", "scheduledDate", "status", "bookingStatus", "probabilityWeight", "expectedRevenue", "finalRevenue", "earnedRevenue", "estimatedDurationHr", "actualDurationHr", "estimatedTravelHr", "actualTravelHr", "notes", "createdById") VALUES
('job_001', 'Full Villa Deep Clean - Palm Meadows', 'CUST-1001 (Mr. Rajesh)', 'unit_team_1', CURRENT_DATE, 'CONFIRMED', 'CONFIRMED', 1.0, 16500, 16500, 16500, 7.0, 7.5, 1.5, 1.5, 'Includes terrace and deep degreasing', 'user_ops_01'),
('job_002', '3BHK Move-out Clean - Indiranagar', 'CUST-1002 (Ms. Priya)', 'unit_team_2', CURRENT_DATE, 'CONFIRMED', 'CONFIRMED', 1.0, 12000, 12000, 12000, 6.0, 6.0, 1.0, 1.0, 'Standard move-out cleaning', 'user_ops_01'),
('job_003', 'Commercial Kitchen Sanitization - Koramangala', 'CUST-1003 (Bistro Cafe)', 'unit_team_3', CURRENT_DATE, 'TENTATIVE', 'TENTATIVE', 0.6, 9500, 0, 0, 5.0, NULL, 1.0, NULL, 'Awaiting key handover confirmation', 'user_ops_01'),
('job_004', 'L-Shape Sofa Shampoo & Rug Clean', 'CUST-1004 (Dr. Arvind)', 'unit_crew_1', CURRENT_DATE, 'COMPLETED', 'CONFIRMED', 1.0, 5500, 5500, 5500, 3.5, 3.5, 0.5, 0.5, 'Client paid cash in full', 'user_ops_01'),
('job_005', 'Mattress Sanitization & Balcony Jet Wash', 'CUST-1005 (Mr. George)', 'unit_crew_1', CURRENT_DATE, 'COMPLETED', 'CONFIRMED', 1.0, 4800, 4800, 4800, 3.0, 3.0, 0.5, 0.5, 'Paid via UPI', 'user_ops_01'),
('job_006', 'Fabric Dining Chairs & Carpet Care', 'CUST-1006 (Mrs. Kapoor)', 'unit_crew_2', CURRENT_DATE, 'TENTATIVE', 'TENTATIVE', 0.6, 6000, 0, 0, 4.0, NULL, 1.0, NULL, 'Pending afternoon time slot approval', 'user_ops_01');

-- Sample Job Direct Costs
INSERT INTO "JobCost" ("id", "jobId", "category", "estimated", "actual", "quantity", "rate", "description", "createdById") VALUES
('cost_001', 'job_001', 'OUTSIDE_MANPOWER', 1000, 1000, 1, 1000, '1 helper hired', 'user_ops_01'),
('cost_002', 'job_001', 'MATERIALS', 400, 450, NULL, NULL, 'Eco-clean chemicals and degreaser', 'user_ops_01'),
('cost_003', 'job_002', 'MATERIALS', 250, 250, NULL, NULL, 'Microfiber pads and glass cleaner', 'user_ops_01'),
('cost_004', 'job_004', 'MATERIALS', 200, 200, NULL, NULL, 'Fabric shampoo solution', 'user_ops_01');

-- Initial Daily Actual Records for Today
INSERT INTO "DailyRecord" ("id", "date", "unitId", "earnedRevenue", "standardFixedCost", "additionalDirectExpenses", "usedHours", "finalized") VALUES
('rec_001', CURRENT_DATE, 'unit_team_1', 16500, 8000, 1450, 9.0, false),
('rec_002', CURRENT_DATE, 'unit_team_2', 12000, 8000, 250, 7.0, false),
('rec_003', CURRENT_DATE, 'unit_team_3', 0, 8000, 0, 0.0, false),
('rec_004', CURRENT_DATE, 'unit_crew_1', 10300, 5500, 200, 7.5, false),
('rec_005', CURRENT_DATE, 'unit_crew_2', 0, 5500, 0, 0.0, false)
ON CONFLICT ("date", "unitId") DO UPDATE SET
    "earnedRevenue" = EXCLUDED."earnedRevenue",
    "standardFixedCost" = EXCLUDED."standardFixedCost",
    "additionalDirectExpenses" = EXCLUDED."additionalDirectExpenses",
    "usedHours" = EXCLUDED."usedHours";

-- Sample Shared Head-Office Expenses
INSERT INTO "SharedExpense" ("id", "date", "category", "amount", "description") VALUES
('shared_001', CURRENT_DATE, 'VEHICLE_FUEL', 1500, 'Central fuel and toll allocation across all teams');
