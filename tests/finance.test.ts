import {
  calculateRevenueVariance,
  calculateFixedCostPerHour,
  calculateAllocatedJobFixedCost,
  calculateOutsideManpowerCost,
  calculateOvertimeCost,
  calculateJobContribution,
  calculateContributionPerHour,
  calculateTeamDailyContribution,
  calculateOverallContribution,
  calculateCapacityMetrics,
  calculateAdditionalTechnicianEconomics,
  calculateOutstandingBalance,
  calculateWeightedForecastRevenue,
  calculateMonthlyProjections,
} from '../src/lib/finance';

describe('Handy Squad Housekeeping Economics Engine', () => {
  // Case A: Baseline daily economics
  test('Case A: Baseline daily economics for 3 main teams and 2 small crews', () => {
    const mainTeamTarget = 15000;
    const smallCrewTarget = 10000;
    const combinedTarget = 3 * mainTeamTarget + 2 * smallCrewTarget; // 65,000

    const mainTeamCost = 8000;
    const smallCrewCost = 5500;
    const combinedCost = 3 * mainTeamCost + 2 * smallCrewCost; // 35,000

    const baselineContribution = combinedTarget - combinedCost; // 30,000

    expect(combinedTarget).toBe(65000);
    expect(combinedCost).toBe(35000);
    expect(baselineContribution).toBe(30000);
  });

  // Case B: Main-team job contribution
  test('Case B: Main-team job contribution', () => {
    const revenue = 6000;
    const duration = 4;
    const mainTeamDailyCost = 8000;
    const capacityHours = 9;

    const allocatedFixed = calculateAllocatedJobFixedCost(mainTeamDailyCost, capacityHours, duration);
    // 8000 / 9 * 4 = 3555.555...
    expect(Number(allocatedFixed.toFixed(2))).toBe(3555.56);

    const manpowerCost = calculateOutsideManpowerCost(1, 1000);
    const otherCosts = 200;
    const totalAdditionalCosts = manpowerCost + otherCosts;
    expect(totalAdditionalCosts).toBe(1200);

    const result = calculateJobContribution(revenue, allocatedFixed, totalAdditionalCosts);
    // 6000 - 3555.56 - 1200 = 1244.44 approximately
    expect(Number(result.jobContribution.toFixed(2))).toBe(1244.44);

    const contribPerHour = calculateContributionPerHour(result.jobContribution, duration);
    // 1244.44 / 4 = 311.11
    expect(Number(contribPerHour.toFixed(2))).toBe(311.11);
  });

  // Case C: Small-crew job contribution
  test('Case C: Small-crew job contribution', () => {
    const revenue = 4000;
    const duration = 3;
    const dailyCost = 5500;
    const capacityHours = 9;

    const allocatedFixed = calculateAllocatedJobFixedCost(dailyCost, capacityHours, duration);
    // 5500 / 9 * 3 = 1833.333...
    expect(Number(allocatedFixed.toFixed(2))).toBe(1833.33);

    const result = calculateJobContribution(revenue, allocatedFixed, 0);
    // 4000 - 1833.33 = 2166.67
    expect(Number(result.jobContribution.toFixed(2))).toBe(2166.67);
  });

  // Case D: Unused capacity
  test('Case D: Unused capacity calculation without double counting', () => {
    const dailyCost = 8000;
    const capacityHours = 9;
    const jobTime = 3;
    const revenue = 6000;

    const allocatedJobFixedCost = calculateAllocatedJobFixedCost(dailyCost, capacityHours, jobTime);
    expect(Number(allocatedJobFixedCost.toFixed(2))).toBe(2666.67);

    const metrics = calculateCapacityMetrics(capacityHours, jobTime, dailyCost);
    expect(metrics.unusedHours).toBe(6);
    expect(Number(metrics.unusedCapacityCost.toFixed(2))).toBe(5333.33);

    // Actual team daily operating contribution: Full daily cost is subtracted once
    const teamDailyContribution = calculateTeamDailyContribution(revenue, dailyCost, 0);
    // 6000 - 8000 = -2000
    expect(teamDailyContribution).toBe(-2000);
  });

  // Case E: Overtime calculation
  test('Case E: Overtime cost calculation', () => {
    const workers = 2;
    const hoursPerPerson = 3;
    const rate = 100;
    const cost = calculateOvertimeCost(workers, hoursPerPerson, rate);
    expect(cost).toBe(600);
  });

  // Case F: Additional manpower
  test('Case F: Additional manpower calculation', () => {
    const workers = 3;
    const rate = 1000;
    const cost = calculateOutsideManpowerCost(workers, rate);
    expect(cost).toBe(3000);
  });

  // Case G: Forecast probability
  test('Case G: Forecast probability weighting', () => {
    const tentativeRevenue = 10000;
    const probability = 0.6;
    const weightedRevenue = calculateWeightedForecastRevenue(tentativeRevenue, probability);
    expect(weightedRevenue).toBe(6000);
  });

  // Case H: Collections & outstanding
  test('Case H: Collections and outstanding customer balance', () => {
    const earnedRevenue = 10000;
    const payments = [3000, 2000];
    const { totalCollected, outstandingBalance } = calculateOutstandingBalance(earnedRevenue, payments);
    expect(totalCollected).toBe(5000);
    expect(outstandingBalance).toBe(5000);
  });

  // Case K: Over-capacity warning
  test('Case K: Over-capacity detection and warning', () => {
    const dailyCapacity = 9;
    const scheduledHours = 11;
    const metrics = calculateCapacityMetrics(dailyCapacity, scheduledHours, 8000);
    expect(metrics.overCapacityHours).toBe(2);
    expect(metrics.hasCapacityWarning).toBe(true);
  });

  // Additional Technician economics
  test('Case L: Additional technician benchmark evaluation', () => {
    const count = 1;
    const attributableRevenue = 2500;
    const rate = 1000;
    const benchmark = 2000;

    const result = calculateAdditionalTechnicianEconomics(count, attributableRevenue, rate, benchmark);
    expect(result.benchmarkRevenue).toBe(2000);
    expect(result.manpowerCost).toBe(1000);
    expect(result.incrementalContribution).toBe(1500);
    expect(result.meetsBenchmark).toBe(true);
  });
});
