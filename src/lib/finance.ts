// src/lib/finance.ts

export interface FinancialStandardInput {
  dailyRevenueTarget: number;
  standardDailyOperatingCost: number;
  dailyCapacityHours: number;
  outsideManpowerRate: number;
  minRevenuePerAdditionalTech: number;
  overtimeRatePerHour: number;
}

/**
 * 6.1 Revenue Variance & Target Achievement
 */
export function calculateRevenueVariance(actualRevenue: number, targetRevenue: number): {
  variance: number;
  achievementPercentage: number;
} {
  const variance = actualRevenue - targetRevenue;
  const achievementPercentage = targetRevenue <= 0 ? 0 : (actualRevenue / targetRevenue) * 100;
  return { variance, achievementPercentage };
}

/**
 * 6.2 Allocated Fixed Team Cost Per Hour
 */
export function calculateFixedCostPerHour(standardDailyOperatingCost: number, dailyCapacityHours: number): number {
  if (dailyCapacityHours <= 0) return 0;
  return standardDailyOperatingCost / dailyCapacityHours;
}

/**
 * 6.3 Job-level Fixed Cost Allocation
 */
export function calculateAllocatedJobFixedCost(
  standardDailyOperatingCost: number,
  dailyCapacityHours: number,
  jobHours: number
): number {
  const perHour = calculateFixedCostPerHour(standardDailyOperatingCost, dailyCapacityHours);
  return perHour * jobHours;
}

/**
 * 6.4 Additional Job Costs (Manpower, Overtime, Materials, Other)
 */
export function calculateOutsideManpowerCost(count: number, ratePerPerson: number): number {
  return Math.max(0, count) * Math.max(0, ratePerPerson);
}

export function calculateOvertimeCost(
  headcount: number,
  overtimeHoursPerPerson: number,
  ratePerHour: number,
  authorizedActual?: number
): number {
  if (authorizedActual !== undefined && authorizedActual !== null) {
    return authorizedActual;
  }
  return Math.max(0, headcount) * Math.max(0, overtimeHoursPerPerson) * Math.max(0, ratePerHour);
}

/**
 * 6.5 Job Contribution
 */
export function calculateJobContribution(
  revenue: number,
  allocatedFixedCost: number,
  additionalJobCosts: number
): {
  jobContribution: number;
  contributionMarginPct: number;
  breakEvenPrice: number;
  isNegative: boolean;
} {
  const totalCost = allocatedFixedCost + additionalJobCosts;
  const jobContribution = revenue - totalCost;
  const contributionMarginPct = revenue <= 0 ? 0 : (jobContribution / revenue) * 100;
  const breakEvenPrice = totalCost;
  return {
    jobContribution,
    contributionMarginPct,
    breakEvenPrice,
    isNegative: jobContribution < 0,
  };
}

/**
 * 6.7 Contribution Per Hour
 */
export function calculateContributionPerHour(jobContribution: number, jobHours: number): number {
  if (jobHours <= 0) return 0;
  return jobContribution / jobHours;
}

/**
 * 6.8 Team Daily Operating Contribution
 * Actual earned revenue - Full daily standard operating cost - Actual additional direct expenses
 */
export function calculateTeamDailyContribution(
  earnedRevenue: number,
  standardDailyOperatingCost: number,
  additionalDirectExpenses: number = 0
): number {
  return earnedRevenue - standardDailyOperatingCost - additionalDirectExpenses;
}

/**
 * 6.9 Overall Operation Contribution
 */
export function calculateOverallContribution(
  unitContributions: number[],
  sharedExpenses: number = 0
): {
  beforeSharedExpenses: number;
  afterSharedExpenses: number;
} {
  const beforeSharedExpenses = unitContributions.reduce((acc, curr) => acc + curr, 0);
  const afterSharedExpenses = beforeSharedExpenses - sharedExpenses;
  return { beforeSharedExpenses, afterSharedExpenses };
}

/**
 * 6.10 Unused Capacity and Cost
 */
export function calculateCapacityMetrics(
  dailyAvailableHours: number,
  usedCapacityHours: number,
  standardDailyOperatingCost: number
): {
  unusedHours: number;
  capacityUtilizationPct: number;
  unusedCapacityCost: number;
  overCapacityHours: number;
  hasCapacityWarning: boolean;
} {
  const unusedHours = Math.max(0, dailyAvailableHours - usedCapacityHours);
  const capacityUtilizationPct = dailyAvailableHours <= 0 ? 0 : (usedCapacityHours / dailyAvailableHours) * 100;
  const fixedCostPerHour = calculateFixedCostPerHour(standardDailyOperatingCost, dailyAvailableHours);
  const unusedCapacityCost = unusedHours * fixedCostPerHour;
  const overCapacityHours = Math.max(0, usedCapacityHours - dailyAvailableHours);
  const hasCapacityWarning = overCapacityHours > 0;

  return {
    unusedHours,
    capacityUtilizationPct,
    unusedCapacityCost,
    overCapacityHours,
    hasCapacityWarning,
  };
}

/**
 * 6.11 Additional Technician Economics
 */
export function calculateAdditionalTechnicianEconomics(
  count: number,
  attributableRevenue: number,
  ratePerPerson: number,
  minRevenueBenchmark: number = 2000
): {
  benchmarkRevenue: number;
  manpowerCost: number;
  incrementalContribution: number;
  revenueVarianceAgainstBenchmark: number;
  meetsBenchmark: boolean;
} {
  const benchmarkRevenue = count * minRevenueBenchmark;
  const manpowerCost = count * ratePerPerson;
  const incrementalContribution = attributableRevenue - manpowerCost;
  const revenueVarianceAgainstBenchmark = attributableRevenue - benchmarkRevenue;
  const meetsBenchmark = attributableRevenue >= benchmarkRevenue;

  return {
    benchmarkRevenue,
    manpowerCost,
    incrementalContribution,
    revenueVarianceAgainstBenchmark,
    meetsBenchmark,
  };
}

/**
 * 6.12 Revenue Per Hour
 */
export function calculateRevenuePerHour(earnedRevenue: number, utilizedHours: number): number {
  if (utilizedHours <= 0) return 0;
  return earnedRevenue / utilizedHours;
}

/**
 * 6.13 Job Duration & Remaining Work
 */
export function calculateRemainingJobHours(estimatedDuration: number, completionPercentage: number): number {
  const clampedPct = Math.min(100, Math.max(0, completionPercentage));
  return estimatedDuration * (1 - clampedPct / 100);
}

/**
 * 6.14 Collections & Outstanding Balance
 */
export function calculateOutstandingBalance(earnedRevenue: number, collections: number[]): {
  totalCollected: number;
  outstandingBalance: number;
} {
  const totalCollected = collections.reduce((sum, c) => sum + c, 0);
  const outstandingBalance = Math.max(0, earnedRevenue - totalCollected);
  return { totalCollected, outstandingBalance };
}

/**
 * 6.15 Forecast Weighting
 */
export function calculateWeightedForecastRevenue(expectedRevenue: number, probabilityWeight: number): number {
  const clampedProb = Math.min(1, Math.max(0, probabilityWeight));
  return expectedRevenue * clampedProb;
}

/**
 * Monthly Projections
 */
export function calculateMonthlyProjections(
  dailyTargets: number[],
  dailyStandardCosts: number[],
  operatingDays: number
): {
  monthlyTargetRevenue: number;
  monthlyBaselineCosts: number;
  monthlyBaselineContribution: number;
} {
  const totalDailyTarget = dailyTargets.reduce((a, b) => a + b, 0);
  const totalDailyCost = dailyStandardCosts.reduce((a, b) => a + b, 0);
  const monthlyTargetRevenue = totalDailyTarget * operatingDays;
  const monthlyBaselineCosts = totalDailyCost * operatingDays;
  const monthlyBaselineContribution = monthlyTargetRevenue - monthlyBaselineCosts;

  return {
    monthlyTargetRevenue,
    monthlyBaselineCosts,
    monthlyBaselineContribution,
  };
}

/**
 * Indian Rupee Currency Formatter
 */
export function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}
