// src/components/ConsistencyReport.tsx
import React, { useState, useMemo } from 'react';
import { 
  CheckCircledIcon, 
  ExclamationTriangleIcon, 
  CrossCircledIcon, 
  TargetIcon,
  LayersIcon,
  InfoCircledIcon
} from '@radix-ui/react-icons';
import { formatINR } from '../lib/finance';

export interface TrendItem {
  date: string;
  dayName: string;
  targetRevenue: number;
  earnedRevenue: number;
  standardCost: number;
  additionalCost: number;
  contribution: number;
  usedHours: number;
}

interface ConsistencyReportProps {
  data: TrendItem[];
  unitName?: string;
  periodLabel?: string;
}

export default function ConsistencyReport({ data, unitName = 'All Units', periodLabel = 'Selected Period' }: ConsistencyReportProps) {
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const [surgePenaltyPct, setSurgePenaltyPct] = useState<number>(20); // 20% default overtime/rush penalty on surge volume
  const [showExplanation, setShowExplanation] = useState(true);

  const metrics = useMemo(() => {
    if (!data || data.length === 0) return null;

    let totalTarget = 0;
    let totalEarned = 0;
    let totalSurgeRevenue = 0;
    let totalIdleShortfall = 0;
    let balancedDays = 0;
    let idleDays = 0;
    let surgeDays = 0;
    let absDevPctSum = 0;

    const days = data.map((d) => {
      const target = d.targetRevenue > 0 ? d.targetRevenue : 65000;
      const earned = d.earnedRevenue || 0;
      const ratio = earned / target;
      const variance = earned - target;
      const shortfall = Math.max(0, target - earned);
      const surge = Math.max(0, earned - target);
      const devPct = Math.abs(earned - target) / target;
      absDevPctSum += devPct;

      let status: 'balanced' | 'idle' | 'surge' = 'balanced';
      if (ratio < 0.85) {
        status = 'idle';
        idleDays++;
      } else if (ratio > 1.15) {
        status = 'surge';
        surgeDays++;
      } else {
        balancedDays++;
      }

      totalTarget += target;
      totalEarned += earned;
      totalSurgeRevenue += surge;
      totalIdleShortfall += shortfall;

      const surgeFrictionCost = Math.round(surge * (surgePenaltyPct / 100));

      return {
        ...d,
        target,
        earned,
        ratio,
        status,
        variance,
        shortfall,
        surge,
        surgeFrictionCost,
      };
    });

    const count = days.length;
    const meanAbsDev = count > 0 ? absDevPctSum / count : 0;
    const consistencyScore = Math.max(0, Math.min(100, Math.round((1 - Math.min(meanAbsDev, 1)) * 100)));
    const totalSurgeFriction = Math.round(totalSurgeRevenue * (surgePenaltyPct / 100));
    const totalVolatilityDrag = totalIdleShortfall + totalSurgeFriction;
    const balancedPct = count > 0 ? Math.round((balancedDays / count) * 100) : 0;

    return {
      count,
      days,
      consistencyScore,
      balancedDays,
      idleDays,
      surgeDays,
      balancedPct,
      totalTarget,
      totalEarned,
      totalSurgeRevenue,
      totalIdleShortfall,
      totalSurgeFriction,
      totalVolatilityDrag,
    };
  }, [data, surgePenaltyPct]);

  if (!metrics) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
        No operational records available to compute consistency for this period.
      </div>
    );
  }

  const {
    count,
    days,
    consistencyScore,
    balancedDays,
    idleDays,
    surgeDays,
    balancedPct,
    totalSurgeRevenue,
    totalIdleShortfall,
    totalSurgeFriction,
    totalVolatilityDrag,
  } = metrics;

  // Consistency Score Qualitative Label & Color
  const getScoreMeta = (score: number) => {
    if (score >= 80) {
      return {
        label: 'Smooth & Highly Stable',
        sub: 'Capacity is smoothly utilized with minimal overtime or idle waste.',
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        barColor: 'bg-emerald-500',
      };
    }
    if (score >= 60) {
      return {
        label: 'Moderate Operational Swings',
        sub: 'Noticeable fluctuations between quiet days and sudden rush days.',
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        barColor: 'bg-amber-500',
      };
    }
    return {
      label: 'High Volatility (Feast or Famine)',
      sub: 'Severe swings. Quiet days burn idle fixed costs; surge days trigger high overtime & helper costs.',
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      barColor: 'bg-rose-500',
    };
  };

  const scoreMeta = getScoreMeta(consistencyScore);

  // Chart max value for scaling
  const maxDayVal = Math.max(
    ...days.map((d) => Math.max(d.earned, d.target)),
    70000
  );

  return (
    <div className="space-y-6">
      {/* Educational Operational Insight Callout */}
      {showExplanation && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                <TargetIcon className="w-4 h-4" />
                <span>The Microeconomics of Capacity Consistency</span>
              </div>
              <h3 className="text-base font-bold text-white">
                Why ₹30k on Tuesday + ₹100k on Wednesday is Worse Than Two Consistent ₹65k Days
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Housekeeping service hours are <strong className="text-white">perishable</strong>. When crew earns ₹30,000 against a ₹65,000 target, 
                unused crew capacity cannot be stored in a warehouse for tomorrow—that ₹35,000 fixed overhead is burned permanently. 
                When the team later surges to ₹100,000, delivering ₹35,000 above normal capacity requires <strong className="text-amber-300">overtime pay, extra helper hires, and rush friction</strong>. 
                Consistency smoothing protects margins from both unrecovered overhead and surge costs.
              </p>
            </div>
            <button
              onClick={() => setShowExplanation(false)}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 transition-all self-start md:self-center shrink-0"
            >
              Dismiss Notice
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Card 1: Consistency Score */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Consistency Score</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${scoreMeta.bg} ${scoreMeta.color} ${scoreMeta.border}`}>
              {scoreMeta.label}
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black ${scoreMeta.color}`}>{consistencyScore}</span>
              <span className="text-slate-400 font-bold text-sm">/ 100</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{scoreMeta.sub}</p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className={`h-2 rounded-full transition-all ${scoreMeta.barColor}`} style={{ width: `${consistencyScore}%` }} />
          </div>
          <div className="text-[10px] text-slate-400 flex justify-between">
            <span>0 (Erratic)</span>
            <span>100 (Rock-solid steady)</span>
          </div>
        </div>

        {/* Card 2: Operational Zone Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operational Balance</span>
          <div>
            <span className="text-2xl font-black text-slate-900">{balancedDays} / {count} Days</span>
            <span className="text-xs text-slate-400 block mt-0.5">{balancedPct}% in Optimal Execution Zone</span>
          </div>
          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex justify-between items-center text-emerald-700">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircledIcon className="w-3.5 h-3.5" /> Balanced (85-115%):
              </span>
              <span className="font-bold">{balancedDays} days</span>
            </div>
            <div className="flex justify-between items-center text-rose-600">
              <span className="flex items-center gap-1.5 font-medium">
                <CrossCircledIcon className="w-3.5 h-3.5" /> Idle Waste (&lt;85%):
              </span>
              <span className="font-bold">{idleDays} days</span>
            </div>
            <div className="flex justify-between items-center text-amber-600">
              <span className="flex items-center gap-1.5 font-medium">
                <ExclamationTriangleIcon className="w-3.5 h-3.5" /> Overdrive (&gt;115%):
              </span>
              <span className="font-bold">{surgeDays} days</span>
            </div>
          </div>
        </div>

        {/* Card 3: Surge Overdrive & Rush Friction */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overdrive Surge Friction</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
              +{surgePenaltyPct}% Extra Expense
            </span>
          </div>
          <div>
            <span className="text-2xl font-black text-amber-600">+{formatINR(totalSurgeRevenue)}</span>
            <span className="text-xs text-slate-400 block mt-0.5">Pushed above nominal target capacity</span>
          </div>
          <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
            <div className="flex justify-between">
              <span>Estimated Overtime/Helper Drag:</span>
              <span className="font-bold text-rose-600">{formatINR(totalSurgeFriction)}</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Execution beyond normal capacity incurs overtime and outside helper wages.
            </p>
          </div>
        </div>

        {/* Card 4: Idle Shortfall Waste */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Perishable Idle Waste</span>
          <div>
            <span className="text-2xl font-black text-rose-600">-{formatINR(totalIdleShortfall)}</span>
            <span className="text-xs text-slate-400 block mt-0.5">Shortfall on low-execution days</span>
          </div>
          <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
            <div className="flex justify-between">
              <span>Total Volatility Drag:</span>
              <span className="font-bold text-slate-900">{formatINR(totalVolatilityDrag)}</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Combined loss from unrecovered overhead plus rush surge penalties.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Capacity Smoothing Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Daily Demand Smoothing vs Capacity Ceiling</h4>
            <p className="text-xs text-slate-500">
              Compare actual earned revenue each day against the nominal daily target benchmark (₹65k)
            </p>
          </div>

          {/* Friction Surcharge Adjuster */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-600 font-medium">Surge Cost Friction:</span>
            <select
              value={surgePenaltyPct}
              onChange={(e) => setSurgePenaltyPct(Number(e.target.value))}
              className="bg-white border border-slate-300 text-slate-800 font-bold rounded-lg px-2 py-0.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value={15}>15% (Mild overtime)</option>
              <option value={20}>20% (Standard helper cost)</option>
              <option value={25}>25% (High rush friction)</option>
              <option value={30}>30% (Heavy premium/rush)</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
            <span className="text-slate-600 font-medium">Optimal Band (85% – 115% of Target)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500 inline-block" />
            <span className="text-slate-600 font-medium">Under-capacity (Idle Waste)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500 inline-block" />
            <span className="text-slate-600 font-medium">Overdrive Surge (Incurs Overtime/Helper Expense)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-indigo-600 inline-block" />
            <span className="text-slate-600 font-medium">Target Benchmark Line</span>
          </div>
        </div>

        {/* Interactive Visual Bar Representation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3 pt-4">
          {days.map((d, idx) => {
            const isHovered = selectedDayIdx === idx;
            const barHeightPct = Math.min(Math.round((d.earned / maxDayVal) * 100), 100);
            const targetLinePct = Math.min(Math.round((d.target / maxDayVal) * 100), 100);

            // Bar background based on state
            let barBg = 'bg-emerald-500';
            let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            let statusText = 'Balanced';
            if (d.status === 'idle') {
              barBg = 'bg-rose-500';
              badgeBg = 'bg-rose-50 text-rose-700 border-rose-200';
              statusText = 'Idle Waste';
            } else if (d.status === 'surge') {
              barBg = 'bg-amber-500';
              badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
              statusText = 'Surge Overdrive';
            }

            return (
              <div
                key={idx}
                onMouseEnter={() => setSelectedDayIdx(idx)}
                onMouseLeave={() => setSelectedDayIdx(null)}
                className={`p-3 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                  isHovered 
                    ? 'border-indigo-400 bg-indigo-50/40 shadow-md ring-2 ring-indigo-200' 
                    : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="text-center">
                  <span className="text-[11px] font-bold text-slate-800 block truncate">{d.dayName}</span>
                  <span className="text-[10px] text-slate-400 block">{d.date}</span>
                </div>

                {/* Vertical Column with Target Line */}
                <div className="relative h-32 flex items-end justify-center py-2 my-1">
                  {/* Target benchmark horizontal dashed indicator */}
                  <div 
                    className="absolute w-full border-t border-dashed border-indigo-400 z-10 pointer-events-none" 
                    style={{ bottom: `${targetLinePct}%` }}
                    title={`Target: ${formatINR(d.target)}`}
                  />

                  {/* Earned Bar */}
                  <div 
                    className={`w-7 rounded-t transition-all ${barBg}`} 
                    style={{ height: `${barHeightPct}%` }}
                    title={`Earned: ${formatINR(d.earned)} vs Target: ${formatINR(d.target)}`}
                  />
                </div>

                {/* Card Footer */}
                <div className="text-center border-t border-slate-200 pt-2 space-y-1">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border inline-block ${badgeBg}`}>
                    {statusText}
                  </span>
                  <span className="text-xs font-black text-slate-900 block">
                    {formatINR(d.earned)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {d.status === 'idle' && (
                      <span className="text-rose-600 font-semibold">-{formatINR(d.shortfall)} waste</span>
                    )}
                    {d.status === 'surge' && (
                      <span className="text-amber-600 font-semibold">+{formatINR(d.surge)} surge</span>
                    )}
                    {d.status === 'balanced' && (
                      <span className="text-emerald-600 font-semibold">In Target Band</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Deep Dive (When hovered or clicked) */}
      {selectedDayIdx !== null && days[selectedDayIdx] && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 shadow-sm space-y-3 transition-all animate-fadeIn">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="font-bold text-indigo-950 text-sm">{days[selectedDayIdx].dayName} ({days[selectedDayIdx].date}) Economic Deep Dive</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                days[selectedDayIdx].status === 'balanced' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                days[selectedDayIdx].status === 'idle' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                'bg-amber-100 text-amber-800 border-amber-300'
              }`}>
                {days[selectedDayIdx].status === 'balanced' ? 'Balanced Sweet Spot' :
                 days[selectedDayIdx].status === 'idle' ? 'Under-utilized Idle Loss' :
                 'Overdrive Surge (Incurred Friction)'}
              </span>
            </div>
            <button
              onClick={() => setSelectedDayIdx(null)}
              className="text-xs text-indigo-600 hover:text-indigo-900 font-bold"
            >
              ✕ Close
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-white p-3 rounded-xl border border-indigo-100">
              <span className="text-slate-400 block text-[10px]">Target Capacity</span>
              <span className="text-sm font-bold text-slate-800">{formatINR(days[selectedDayIdx].target)}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-100">
              <span className="text-slate-400 block text-[10px]">Realized Revenue</span>
              <span className="text-sm font-bold text-indigo-700">{formatINR(days[selectedDayIdx].earned)}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-100">
              <span className="text-slate-400 block text-[10px]">Achievement vs Target</span>
              <span className={`text-sm font-bold ${days[selectedDayIdx].variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {Math.round(days[selectedDayIdx].ratio * 100)}% ({days[selectedDayIdx].variance >= 0 ? '+' : ''}{formatINR(days[selectedDayIdx].variance)})
              </span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-100">
              <span className="text-slate-400 block text-[10px]">Microeconomic Impact</span>
              <span className="text-xs font-bold text-slate-800 block mt-0.5">
                {days[selectedDayIdx].status === 'balanced' && 'Optimal fixed overhead recovery.'}
                {days[selectedDayIdx].status === 'idle' && `Unrecovered fixed overhead: -${formatINR(days[selectedDayIdx].shortfall)}`}
                {days[selectedDayIdx].status === 'surge' && `Surge drag: ~${formatINR(days[selectedDayIdx].surgeFrictionCost)} extra expense`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Daily Consistency Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Day-by-Day Capacity Consistency Ledger</h4>
            <p className="text-xs text-slate-500">Detailed breakdown of idle shortfalls and overdrive rush costs</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{count} Days Tracked</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-4 py-3 text-right">Target Capacity</th>
                <th className="px-4 py-3 text-right">Realized Revenue</th>
                <th className="px-4 py-3 text-center">Achievement</th>
                <th className="px-4 py-3 text-center">Operational Zone</th>
                <th className="px-4 py-3 text-right">Idle Shortfall</th>
                <th className="px-4 py-3 text-right">Surge Overdrive</th>
                <th className="px-4 py-3 text-right">Surge Expense Drag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-700">
              {days.map((d, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-slate-900">
                    {d.dayName}
                    <span className="text-[10px] text-slate-400 block font-normal">{d.date}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-600">
                    {formatINR(d.target)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {formatINR(d.earned)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      d.ratio >= 0.85 && d.ratio <= 1.15
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : d.ratio < 0.85
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {Math.round(d.ratio * 100)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {d.status === 'balanced' && (
                      <span className="text-emerald-700 font-semibold flex items-center justify-center gap-1">
                        <CheckCircledIcon className="w-3.5 h-3.5" /> Balanced
                      </span>
                    )}
                    {d.status === 'idle' && (
                      <span className="text-rose-600 font-semibold flex items-center justify-center gap-1">
                        <CrossCircledIcon className="w-3.5 h-3.5" /> Under-capacity
                      </span>
                    )}
                    {d.status === 'surge' && (
                      <span className="text-amber-600 font-semibold flex items-center justify-center gap-1">
                        <ExclamationTriangleIcon className="w-3.5 h-3.5" /> Overdrive Surge
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {d.shortfall > 0 ? (
                      <span className="text-rose-600 font-bold">-{formatINR(d.shortfall)}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {d.surge > 0 ? (
                      <span className="text-amber-600 font-bold">+{formatINR(d.surge)}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {d.surgeFrictionCost > 0 ? (
                      <span className="text-rose-700 font-bold">~{formatINR(d.surgeFrictionCost)}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold text-xs text-slate-800 border-t-2 border-slate-300">
              <tr>
                <td className="px-5 py-3">Total Period Volatility</td>
                <td className="px-4 py-3 text-right">{formatINR(metrics.totalTarget)}</td>
                <td className="px-4 py-3 text-right text-indigo-700">{formatINR(metrics.totalEarned)}</td>
                <td className="px-4 py-3 text-center">{Math.round((metrics.totalEarned / (metrics.totalTarget || 1)) * 100)}%</td>
                <td className="px-4 py-3 text-center">{balancedDays}/{count} Balanced</td>
                <td className="px-4 py-3 text-right text-rose-600">-{formatINR(totalIdleShortfall)}</td>
                <td className="px-4 py-3 text-right text-amber-600">+{formatINR(totalSurgeRevenue)}</td>
                <td className="px-4 py-3 text-right text-rose-700">~{formatINR(totalSurgeFriction)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
