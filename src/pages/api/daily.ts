// src/pages/api/daily.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { date } = req.query;
      const targetDate = date ? new Date(String(date)) : new Date();
      targetDate.setHours(0, 0, 0, 0);

      const records = await prisma.dailyRecord.findMany({
        where: { date: targetDate },
        include: {
          unit: {
            include: {
              standards: {
                orderBy: { effectiveStartDate: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      const shared = await prisma.sharedExpense.findMany({
        where: { date: targetDate },
      });

      return res.status(200).json({ records, shared });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { id, unitId, date, earnedRevenue, additionalDirectExpenses, usedHours, finalized, notes } = req.body;
      const targetDate = date ? new Date(date) : new Date();
      targetDate.setHours(0, 0, 0, 0);

      const unit = await prisma.unit.findUnique({
        where: { id: unitId },
        include: { standards: { orderBy: { effectiveStartDate: 'desc' }, take: 1 } },
      });

      const standardFixedCost = unit?.standards[0]?.standardDailyOperatingCost || (unit?.type === 'MAIN_TEAM' ? 8000 : 5500);

      const record = await prisma.dailyRecord.upsert({
        where: { date_unitId: { date: targetDate, unitId } },
        update: {
          earnedRevenue: Number(earnedRevenue) || 0,
          additionalDirectExpenses: Number(additionalDirectExpenses) || 0,
          usedHours: Number(usedHours) || 0,
          finalized: Boolean(finalized),
          notes,
        },
        create: {
          date: targetDate,
          unitId,
          earnedRevenue: Number(earnedRevenue) || 0,
          standardFixedCost,
          additionalDirectExpenses: Number(additionalDirectExpenses) || 0,
          usedHours: Number(usedHours) || 0,
          finalized: Boolean(finalized),
          notes,
        },
      });

      return res.status(200).json(record);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
