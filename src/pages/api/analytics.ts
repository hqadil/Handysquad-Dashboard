// src/pages/api/analytics.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getAnalyticsRawData } from '../../lib/db';
import { calculateRevenueVariance, calculateCapacityMetrics } from '../../lib/finance';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { period = 'weekly', unitId = 'all', referenceDate, fromDate, toDate } = req.query;

    const baseDate = referenceDate ? new Date(String(referenceDate)) : new Date();
    baseDate.setHours(0, 0, 0, 0);

    let startDate: Date;
    let endDate: Date;
    let daysCount = 1;

    if (period === 'day') {
      startDate = new Date(baseDate);
      endDate = new Date(baseDate);
      daysCount = 1;
    } else if (period === 'custom' && fromDate && toDate) {
      startDate = new Date(String(fromDate));
      endDate = new Date(String(toDate));
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      daysCount = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
    } else if (period === 'monthly') {
      startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
      endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
      daysCount = endDate.getDate();
    } else {
      // Weekly: Monday to Sunday of baseDate week
      const dayOfWeek = baseDate.getDay(); // 0 is Sunday
      const diffToMonday = (dayOfWeek + 6) % 7; // days since Monday
      startDate = new Date(baseDate);
      startDate.setDate(baseDate.getDate() - diffToMonday);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      daysCount = 7;
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    // Fetch raw data (Supabase with Prisma fallback)
    const { units, dailyRecords, jobs, sharedExpenses } = await getAnalyticsRawData(startDate, endDate, String(unitId));

    // Aggregate statistics
    let totalTargetRevenue = 0;
    let totalStandardCost = 0;
    let totalCapacityHours = 0;

    units.forEach((u) => {
      const std = u.standards[0];
      const target = std ? std.dailyRevenueTarget : (u.type === 'MAIN_TEAM' ? 15000 : 10000);
      const cost = std ? std.standardDailyOperatingCost : (u.type === 'MAIN_TEAM' ? 8000 : 5500);
      const cap = std ? std.dailyCapacityHours : (u.dailyCapacityHr || 9);

      totalTargetRevenue += target * daysCount;
      totalStandardCost += cost * daysCount;
      totalCapacityHours += cap * daysCount;
    });

    // Earned revenue & additional direct expenses from dailyRecords
    let totalEarnedRevenue = dailyRecords.reduce((acc, r) => acc + (r.earnedRevenue || 0), 0);
    let totalAdditionalCost = dailyRecords.reduce((acc, r) => acc + (r.additionalDirectExpenses || 0), 0);
    let totalHoursUtilized = dailyRecords.reduce((acc, r) => acc + (r.usedHours || 0), 0);

    // If dailyRecords have 0 earned and jobs have records, supplement
    if (totalEarnedRevenue === 0 && jobs.length > 0) {
      totalEarnedRevenue = jobs.reduce((acc, j) => acc + (j.earnedRevenue || 0), 0);
      totalHoursUtilized = jobs.reduce((acc, j) => acc + (j.actualDurationHr || j.estimatedDurationHr || 0), 0);
      totalAdditionalCost = jobs.reduce((acc, j) => {
        const costSum = j.costs.reduce((cAcc, c) => cAcc + (c.actual !== null ? c.actual : c.estimated), 0);
        return acc + costSum;
      }, 0);
    }

    const { variance: revenueVariance, achievementPercentage: targetAchievementPct } = calculateRevenueVariance(
      totalEarnedRevenue,
      totalTargetRevenue
    );

    const operationalContribution = totalEarnedRevenue - totalStandardCost - totalAdditionalCost;
    const totalSharedExpenses = unitId === 'all' ? sharedExpenses.reduce((acc, s) => acc + (s.amount || 0), 0) : 0;
    const netOverallContribution = operationalContribution - totalSharedExpenses;

    const capacityMetrics = calculateCapacityMetrics(totalCapacityHours, totalHoursUtilized, totalStandardCost);
    const revenuePerHour = totalHoursUtilized > 0 ? totalEarnedRevenue / totalHoursUtilized : 0;
    const contributionPerHour = totalHoursUtilized > 0 ? operationalContribution / totalHoursUtilized : 0;

    // Collections vs Outstanding
    let totalCollections = 0;
    jobs.forEach((j) => {
      j.payments.forEach((p) => {
        totalCollections += p.amount;
      });
    });
    const totalOutstanding = Math.max(0, totalEarnedRevenue - totalCollections);

    // Per-Unit Breakdown
    const unitBreakdown = units.map((u) => {
      const std = u.standards[0];
      const target = (std ? std.dailyRevenueTarget : (u.type === 'MAIN_TEAM' ? 15000 : 10000)) * daysCount;
      const stdCost = (std ? std.standardDailyOperatingCost : (u.type === 'MAIN_TEAM' ? 8000 : 5500)) * daysCount;
      const capHrs = (std ? std.dailyCapacityHours : (u.dailyCapacityHr || 9)) * daysCount;

      const uRecords = dailyRecords.filter((r) => r.unitId === u.id);
      const uJobs = jobs.filter((j) => j.unitId === u.id);

      let earned = uRecords.reduce((acc, r) => acc + (r.earnedRevenue || 0), 0);
      let addExp = uRecords.reduce((acc, r) => acc + (r.additionalDirectExpenses || 0), 0);
      let usedHrs = uRecords.reduce((acc, r) => acc + (r.usedHours || 0), 0);

      if (earned === 0 && uJobs.length > 0) {
        earned = uJobs.reduce((acc, j) => acc + (j.earnedRevenue || 0), 0);
        usedHrs = uJobs.reduce((acc, j) => acc + (j.actualDurationHr || j.estimatedDurationHr || 0), 0);
        addExp = uJobs.reduce((acc, j) => {
          return acc + j.costs.reduce((cAcc, c) => cAcc + (c.actual !== null ? c.actual : c.estimated), 0);
        }, 0);
      }

      const contrib = earned - stdCost - addExp;
      const utilPct = capHrs > 0 ? Math.round((usedHrs / capHrs) * 100) : 0;
      const revPerHr = usedHrs > 0 ? earned / usedHrs : 0;

      return {
        unitId: u.id,
        unitName: u.name,
        unitType: u.type,
        targetRevenue: target,
        earnedRevenue: earned,
        revenueVariance: earned - target,
        achievementPct: target > 0 ? Math.round((earned / target) * 100) : 0,
        standardCost: stdCost,
        additionalCost: addExp,
        contribution: contrib,
        capacityHours: capHrs,
        hoursUtilized: usedHrs,
        utilizationPct: utilPct,
        revenuePerHour: revPerHr,
        jobsCount: uJobs.length,
      };
    });

    // Time-series breakdown for trends (Day by Day)
    const trendData = [];
    const curDate = new Date(startDate);
    while (curDate <= endDate) {
      const dateStr = curDate.toISOString().split('T')[0];
      const dayRecords = dailyRecords.filter((r) => r.date.toISOString().split('T')[0] === dateStr);
      const dayJobs = jobs.filter((j) => j.scheduledDate.toISOString().split('T')[0] === dateStr);

      let dayEarned = dayRecords.reduce((acc, r) => acc + (r.earnedRevenue || 0), 0);
      let dayAddCost = dayRecords.reduce((acc, r) => acc + (r.additionalDirectExpenses || 0), 0);
      let dayUsedHrs = dayRecords.reduce((acc, r) => acc + (r.usedHours || 0), 0);

      if (dayEarned === 0 && dayJobs.length > 0) {
        dayEarned = dayJobs.reduce((acc, j) => acc + (j.earnedRevenue || 0), 0);
        dayUsedHrs = dayJobs.reduce((acc, j) => acc + (j.actualDurationHr || j.estimatedDurationHr || 0), 0);
        dayAddCost = dayJobs.reduce((acc, j) => {
          return acc + j.costs.reduce((cAcc, c) => cAcc + (c.actual !== null ? c.actual : c.estimated), 0);
        }, 0);
      }

      const dayTarget = units.reduce((acc, u) => {
        const std = u.standards[0];
        return acc + (std ? std.dailyRevenueTarget : (u.type === 'MAIN_TEAM' ? 15000 : 10000));
      }, 0);

      const dayStdCost = units.reduce((acc, u) => {
        const std = u.standards[0];
        return acc + (std ? std.standardDailyOperatingCost : (u.type === 'MAIN_TEAM' ? 8000 : 5500));
      }, 0);

      const dayContribution = dayEarned - dayStdCost - dayAddCost;

      trendData.push({
        date: dateStr,
        dayName: curDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        targetRevenue: dayTarget,
        earnedRevenue: dayEarned,
        standardCost: dayStdCost,
        additionalCost: dayAddCost,
        contribution: dayContribution,
        usedHours: dayUsedHrs,
      });

      curDate.setDate(curDate.getDate() + 1);
    }

    return res.status(200).json({
      period,
      unitId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      daysCount,
      summary: {
        totalTargetRevenue,
        totalEarnedRevenue,
        revenueVariance,
        targetAchievementPct: Math.round(targetAchievementPct),
        totalStandardCost,
        totalAdditionalCost,
        operationalContribution,
        totalSharedExpenses,
        netOverallContribution,
        totalCapacityHours,
        totalHoursUtilized,
        capacityUtilizationPct: Math.round(capacityMetrics.capacityUtilizationPct),
        revenuePerHour: Math.round(revenuePerHour),
        contributionPerHour: Math.round(contributionPerHour),
        totalCollections,
        totalOutstanding,
      },
      unitBreakdown,
      trendData,
    });
  } catch (err: any) {
    console.error('Analytics API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
