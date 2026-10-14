// src/pages/api/units.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { all } = req.query;
      const units = await prisma.unit.findMany({
        where: all === 'true' ? {} : { active: true },
        include: {
          standards: {
            orderBy: { effectiveStartDate: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'asc' },
      });
      return res.status(200).json(units);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, type, defaultHeadcount, dailyCapacityHr, dailyRevenueTarget, standardDailyOperatingCost } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Team name is required' });
      }

      const unit = await prisma.unit.create({
        data: {
          name,
          type: type || 'MAIN_TEAM',
          defaultHeadcount: Number(defaultHeadcount) || (type === 'MAIN_TEAM' ? 5 : 3),
          dailyCapacityHr: Number(dailyCapacityHr) || 9,
          active: true,
          standards: {
            create: {
              effectiveStartDate: new Date(),
              dailyRevenueTarget: Number(dailyRevenueTarget) || (type === 'MAIN_TEAM' ? 15000 : 10000),
              standardDailyOperatingCost: Number(standardDailyOperatingCost) || (type === 'MAIN_TEAM' ? 8000 : 5500),
              dailyCapacityHours: Number(dailyCapacityHr) || 9,
              outsideManpowerRate: 1000,
              minRevenuePerAdditionalTech: 2000,
              overtimeRatePerHour: 100,
            },
          },
        },
        include: { standards: true },
      });
      return res.status(201).json(unit);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, name, active, dailyRevenueTarget, standardDailyOperatingCost, defaultHeadcount, dailyCapacityHr } = req.body;
      if (!id) return res.status(400).json({ error: 'Unit ID is required' });

      const updated = await prisma.unit.update({
        where: { id },
        data: {
          name: name !== undefined ? name : undefined,
          active: active !== undefined ? active : undefined,
          defaultHeadcount: defaultHeadcount !== undefined ? Number(defaultHeadcount) : undefined,
          dailyCapacityHr: dailyCapacityHr !== undefined ? Number(dailyCapacityHr) : undefined,
        },
      });

      // If financial standards are updated, create a new effective-dated standard record
      if (dailyRevenueTarget !== undefined || standardDailyOperatingCost !== undefined) {
        await prisma.financialStandard.create({
          data: {
            unitId: id,
            effectiveStartDate: new Date(),
            dailyRevenueTarget: Number(dailyRevenueTarget),
            standardDailyOperatingCost: Number(standardDailyOperatingCost),
            dailyCapacityHours: Number(dailyCapacityHr) || updated.dailyCapacityHr,
            outsideManpowerRate: 1000,
            minRevenuePerAdditionalTech: 2000,
            overtimeRatePerHour: 100,
          },
        });
      }

      return res.status(200).json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Soft delete / deactivate to preserve historical records
  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Unit ID is required' });

      await prisma.unit.update({
        where: { id: String(id) },
        data: { active: false },
      });

      return res.status(200).json({ success: true, message: 'Unit deactivated and historical records preserved.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
