// src/pages/api/calculate.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import {
  calculateAllocatedJobFixedCost,
  calculateJobContribution,
  calculateContributionPerHour,
  calculateOutsideManpowerCost,
  calculateOvertimeCost,
  calculateAdditionalTechnicianEconomics,
  calculateCapacityMetrics,
} from '../../lib/finance';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      unitId,
      expectedRevenue = 0,
      durationHr = 0,
      travelHr = 0,
      outsideManpowerCount = 0,
      outsideManpowerRate = 1000,
      overtimeHeadcount = 0,
      overtimeHoursPerPerson = 0,
      overtimeRate = 100,
      materialsCost = 0,
      otherExpenses = 0,
    } = req.body;

    // Fetch unit standard
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        standards: {
          orderBy: { effectiveStartDate: 'desc' },
          take: 1,
        },
      },
    });

    const stdCost = unit?.standards[0]?.standardDailyOperatingCost || (unit?.type === 'MAIN_TEAM' ? 8000 : 5500);
    const capacityHours = unit?.standards[0]?.dailyCapacityHours || 9;
    const minTechRevBenchmark = unit?.standards[0]?.minRevenuePerAdditionalTech || 2000;

    const totalJobHours = Number(durationHr) + Number(travelHr);
    const allocatedFixedCost = calculateAllocatedJobFixedCost(stdCost, capacityHours, totalJobHours);

    const manpowerCost = calculateOutsideManpowerCost(Number(outsideManpowerCount), Number(outsideManpowerRate));
    const overtimeCost = calculateOvertimeCost(
      Number(overtimeHeadcount),
      Number(overtimeHoursPerPerson),
      Number(overtimeRate)
    );
    const totalAdditionalCosts = manpowerCost + overtimeCost + Number(materialsCost) + Number(otherExpenses);

    const contributionResult = calculateJobContribution(
      Number(expectedRevenue),
      allocatedFixedCost,
      totalAdditionalCosts
    );

    const contribPerHour = calculateContributionPerHour(
      contributionResult.jobContribution,
      totalJobHours
    );

    const capacityResult = calculateCapacityMetrics(capacityHours, totalJobHours, stdCost);

    const techBenchmark = calculateAdditionalTechnicianEconomics(
      Number(outsideManpowerCount),
      Number(expectedRevenue),
      Number(outsideManpowerRate),
      minTechRevBenchmark
    );

    return res.status(200).json({
      expectedRevenue: Number(expectedRevenue),
      allocatedFixedCost,
      additionalCostsBreakdown: {
        outsideManpower: manpowerCost,
        overtime: overtimeCost,
        materials: Number(materialsCost),
        other: Number(otherExpenses),
        totalAdditional: totalAdditionalCosts,
      },
      totalModeledCost: allocatedFixedCost + totalAdditionalCosts,
      jobContribution: contributionResult.jobContribution,
      contributionMarginPct: contributionResult.contributionMarginPct,
      contributionPerHour: contribPerHour,
      breakEvenPrice: contributionResult.breakEvenPrice,
      isNegativeContribution: contributionResult.isNegative,
      capacityMetrics: capacityResult,
      additionalTechnicianBenchmark: techBenchmark,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
