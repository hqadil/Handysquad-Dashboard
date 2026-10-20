// src/pages/api/daily.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getDailyData, upsertDailyRecord } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { date } = req.query;
      const targetDate = date ? new Date(String(date)) : new Date();
      targetDate.setHours(0, 0, 0, 0);

      const data = await getDailyData(targetDate);
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { 
        unitId, 
        date, 
        grossRevenue,
        gstAmount,
        earnedRevenue, 
        additionalDirectExpenses, 
        usedHours, 
        finalized, 
        notes,
        remarks 
      } = req.body;
      const targetDate = date ? new Date(date) : new Date();
      targetDate.setHours(0, 0, 0, 0);

      const record = await upsertDailyRecord({
        unitId,
        date: targetDate,
        grossRevenue,
        gstAmount,
        earnedRevenue,
        additionalDirectExpenses,
        usedHours,
        finalized,
        notes: notes || remarks,
        remarks: remarks || notes,
      });

      return res.status(200).json(record);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
