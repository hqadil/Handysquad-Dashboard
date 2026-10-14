// src/components/WhatIfCalculator.tsx
import React, { useState } from 'react';
import { formatINR } from '../lib/finance';
import { 
  CheckCircledIcon, 
  CrossCircledIcon, 
  ExclamationTriangleIcon, 
  ResetIcon,
  MixerHorizontalIcon,
  ArrowRightIcon,
} from '@radix-ui/react-icons';

interface Unit {
  id: string;
  name: string;
  type: string;
  defaultHeadcount: number;
  dailyCapacityHr: number;
  standards?: {
    dailyRevenueTarget: number;
    standardDailyOperatingCost: number;
    dailyCapacityHours: number;
    outsideManpowerRate: number;
    minRevenuePerAdditionalTech: number;
    overtimeRatePerHour: number;
  }[];
}

interface WhatIfCalculatorProps {
  units: Unit[];
}

export default function WhatIfCalculator({ units }: WhatIfCalculatorProps) {
  const [scope, setScope] = useState<'all' | string>('all');

  // Input states
  const [revenuePct, setRevenuePct] = useState<number>(100);
  const [customRevenue, setCustomRevenue] = useState<number | null>(null);
  const [costModifierPct, setCostModifierPct] = useState<number>(100);
  const [outsideHelpersCount, setOutsideHelpersCount] = useState<number>(0);
  const [outsideHelperRate, setOutsideHelperRate] = useState<number>(1000);
  const [overtimeWorkers, setOvertimeWorkers] = useState<number>(0);
  const [overtimeHoursPerWorker, setOvertimeHoursPerWorker] = useState<number>(0);
  const [overtimeRatePerHour, setOvertimeRatePerHour] = useState<number>(100);
  const [travelAndDelayHours, setTravelAndDelayHours] = useState<number>(1.5);
  const [extraDirectExpenses, setExtraDirectExpenses] = useState<number>(0);
  const [sharedExpenses, setSharedExpenses] = useState<number>(1500);

  // Active preset tag
  const [activePreset, setActivePreset] = useState<string>('baseline');

  // Selected Unit or Combined Base metrics
  const selectedUnit = scope !== 'all' ? units.find((u) => u.id === scope) : null;

  const baselineTarget = selectedUnit
    ? selectedUnit.standards?.[0]?.dailyRevenueTarget || (selectedUnit.type === 'MAIN_TEAM' ? 15000 : 10000)
    : units.reduce((acc, u) => acc + (u.standards?.[0]?.dailyRevenueTarget || (u.type === 'MAIN_TEAM' ? 15000 : 10000)), 0) || 65000;

  const baselineFixedCost = selectedUnit
    ? selectedUnit.standards?.[0]?.standardDailyOperatingCost || (selectedUnit.type === 'MAIN_TEAM' ? 8000 : 5500)
    : units.reduce((acc, u) => acc + (u.standards?.[0]?.standardDailyOperatingCost || (u.type === 'MAIN_TEAM' ? 8000 : 5500)), 0) || 35000;

  const baselineCapacity = selectedUnit
    ? selectedUnit.standards?.[0]?.dailyCapacityHours || (selectedUnit.dailyCapacityHr || 9)
    : units.reduce((acc, u) => acc + (u.dailyCapacityHr || 9), 0) || 45;

  const baselineContribution = baselineTarget - baselineFixedCost;
  const baselinePostShared = scope === 'all' ? baselineContribution - sharedExpenses : baselineContribution;
  const baselineMargin = baselineTarget > 0 ? Math.round((baselineContribution / baselineTarget) * 100) : 0;

  // What-If Modeled Calculations
  const modeledRevenue = customRevenue !== null ? customRevenue : Math.round(baselineTarget * (revenuePct / 100));
  const modeledFixedCost = Math.round(baselineFixedCost * (costModifierPct / 100));
  const modeledManpowerCost = outsideHelpersCount * outsideHelperRate;
  const modeledOvertimeCost = overtimeWorkers * overtimeHoursPerWorker * overtimeRatePerHour;
  const totalAdditionalCosts = modeledManpowerCost + modeledOvertimeCost + extraDirectExpenses;
  const modeledTotalCost = modeledFixedCost + totalAdditionalCosts;
  
  const modeledContribution = modeledRevenue - modeledTotalCost;
  const modeledPostShared = scope === 'all' ? modeledContribution - sharedExpenses : modeledContribution;
  const modeledMargin = modeledRevenue > 0 ? Math.round((modeledContribution / modeledRevenue) * 100) : 0;

  // Financial Health Metrics
  const fixedCostRecoveryPct = modeledFixedCost > 0 ? Math.round((modeledRevenue / modeledFixedCost) * 100) : 0;
  const breakEvenRevenue = modeledTotalCost + (scope === 'all' ? sharedExpenses : 0);
  const revenueVariance = modeledRevenue - baselineTarget;
  const contributionVariance = modeledContribution - baselineContribution;

  // Capacity calculations
  const totalProductiveHours = Math.max(0, baselineCapacity - travelAndDelayHours);
  const fixedCostPerHour = baselineCapacity > 0 ? modeledFixedCost / baselineCapacity : 0;
  const unusedCapacityHours = Math.max(0, baselineCapacity - (totalProductiveHours + travelAndDelayHours));
  const travelCostImpact = travelAndDelayHours * fixedCostPerHour;
  const contributionPerHour = totalProductiveHours > 0 ? modeledContribution / totalProductiveHours : 0;

  // Additional Technician Benchmark (₹2,000 threshold)
  const helperBenchmarkTarget = outsideHelpersCount * 2000;
  const helperMeetsBenchmark = outsideHelpersCount > 0 ? modeledRevenue >= helperBenchmarkTarget : true;

  // Presets Handlers
  const applyPreset = (presetName: string) => {
    setActivePreset(presetName);
    setCustomRevenue(null);

    switch (presetName) {
      case 'shortfall-70':
        setRevenuePct(70);
        setCostModifierPct(100);
        setOutsideHelpersCount(0);
        setOvertimeWorkers(0);
        setOvertimeHoursPerWorker(0);
        setTravelAndDelayHours(1.5);
        setExtraDirectExpenses(0);
        break;
      case 'shortfall-50':
        setRevenuePct(50);
        setCostModifierPct(100);
        setOutsideHelpersCount(0);
        setOvertimeWorkers(0);
        setOvertimeHoursPerWorker(0);
        setTravelAndDelayHours(1.5);
        setExtraDirectExpenses(0);
        break;
      case 'helpers-2':
        setRevenuePct(120); // bigger job
        setCostModifierPct(100);
        setOutsideHelpersCount(2);
        setOutsideHelperRate(1000);
        setOvertimeWorkers(0);
        setOvertimeHoursPerWorker(0);
        setTravelAndDelayHours(1.5);
        setExtraDirectExpenses(300);
        break;
      case 'overtime-rush':
        setRevenuePct(115);
        setCostModifierPct(100);
        setOutsideHelpersCount(0);
        setOvertimeWorkers(scope === 'all' ? 6 : 3);
        setOvertimeHoursPerWorker(2);
        setOvertimeRatePerHour(100);
        setTravelAndDelayHours(2);
        setExtraDirectExpenses(0);
        break;
      case 'traffic-delay':
        setRevenuePct(90);
        setCostModifierPct(100);
        setOutsideHelpersCount(0);
        setOvertimeWorkers(0);
        setOvertimeHoursPerWorker(0);
        setTravelAndDelayHours(scope === 'all' ? 12 : 3.5);
        setExtraDirectExpenses(0);
        break;
      case 'cost-inflation':
        setRevenuePct(100);
        setCostModifierPct(120); // 20% cost surge
        setOutsideHelpersCount(0);
        setOvertimeWorkers(0);
        setOvertimeHoursPerWorker(0);
        setTravelAndDelayHours(1.5);
        setExtraDirectExpenses(500);
        break;
      case 'high-demand':
        setRevenuePct(135);
        setCostModifierPct(105);
        setOutsideHelpersCount(1);
        setOutsideHelperRate(1000);
        setOvertimeWorkers(scope === 'all' ? 4 : 2);
        setOvertimeHoursPerWorker(1.5);
        setOvertimeRatePerHour(100);
        setTravelAndDelayHours(1.5);
        setExtraDirectExpenses(400);
        break;
      case 'baseline':
      default:
        setRevenuePct(100);
        setCostModifierPct(100);
        setOutsideHelpersCount(0);
        setOutsideHelperRate(1000);
        setOvertimeWorkers(0);
        setOvertimeHoursPerWorker(0);
        setTravelAndDelayHours(scope === 'all' ? 6 : 1.5);
        setExtraDirectExpenses(0);
        break;
    }
  };

  // Verdict status
  let verdictType: 'profit' | 'warning' | 'loss' = 'profit';
  if (modeledContribution < 0) {
    verdictType = 'loss';
  } else if (modeledContribution < baselineContribution * 0.3) {
    verdictType = 'warning';
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Scope Selector */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <MixerHorizontalIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">What-If & Sensitivity Calculator</h2>
              <p className="text-xs text-slate-500">Test operational what-if questions, target shortfalls, cost surges, and manpower changes.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600">Simulate For:</label>
          <select
            value={scope}
            onChange={(e) => {
              setScope(e.target.value);
              setCustomRevenue(null);
            }}
            className="text-xs border border-slate-300 rounded-xl px-3 py-2 font-bold bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 shadow-sm"
          >
            <option value="all">Combined Operation (All {units.length} Units)</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.type === 'MAIN_TEAM' ? '₹15,000 target' : '₹10,000 target'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick What-If Question Presets */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick What-If Scenarios</span>
          <button
            onClick={() => applyPreset('baseline')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <ResetIcon className="w-3.5 h-3.5" /> Reset to 100% Target Baseline
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => applyPreset('shortfall-70')}
            className={`text-xs px-3 py-2 rounded-xl border font-semibold transition ${
              activePreset === 'shortfall-70'
                ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            📉 What if target is only 70% achieved?
          </button>

          <button
            onClick={() => applyPreset('shortfall-50')}
            className={`text-xs px-3 py-2 rounded-xl border font-semibold transition ${
              activePreset === 'shortfall-50'
                ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            🚨 What if severe shortfall (50% target)?
          </button>

          <button
            onClick={() => applyPreset('helpers-2')}
            className={`text-xs px-3 py-2 rounded-xl border font-semibold transition ${
              activePreset === 'helpers-2'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-800 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            👥 What if we hire 2 outside helpers (₹2,000)?
          </button>

          <button
            onClick={() => applyPreset('overtime-rush')}
            className={`text-xs px-3 py-2 rounded-xl border font-semibold transition ${
              activePreset === 'overtime-rush'
                ? 'bg-purple-50 border-purple-300 text-purple-800 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            ⏰ What if crew works 2 hours overtime?
          </button>

          <button
            onClick={() => applyPreset('traffic-delay')}
            className={`text-xs px-3 py-2 rounded-xl border font-semibold transition ${
              activePreset === 'traffic-delay'
                ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            🚗 What if travel delays eat 3.5 hours?
          </button>

          <button
            onClick={() => applyPreset('cost-inflation')}
            className={`text-xs px-3 py-2 rounded-xl border font-semibold transition ${
              activePreset === 'cost-inflation'
                ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            ⛽ What if petrol / operating costs jump 20%?
          </button>

          <button
            onClick={() => applyPreset('high-demand')}
            className={`text-xs px-3 py-2 rounded-xl border font-semibold transition ${
              activePreset === 'high-demand'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            🚀 What if high demand day (135% target)?
          </button>
        </div>
      </div>

      {/* Main Interactive Sandbox Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Sliders & Variables Tuning (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Configure What-If Variables</h3>
              <p className="text-xs text-slate-500">Fine-tune revenue, fixed costs, delays, and direct expenses</p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
              Interactive
            </span>
          </div>

          {/* Variable 1: Achieved Revenue */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-xs font-bold text-slate-900 block">Daily Revenue Achieved</label>
                <span className="text-[11px] text-slate-500">Baseline Target: {formatINR(baselineTarget)}</span>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-indigo-600">{formatINR(modeledRevenue)}</span>
                <span className="text-[11px] font-bold text-slate-500 block">
                  ({revenuePct}% of Target)
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <input
                type="range"
                min="0"
                max="160"
                step="5"
                value={revenuePct}
                onChange={(e) => {
                  setRevenuePct(Number(e.target.value));
                  setCustomRevenue(null);
                  setActivePreset('custom');
                }}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>0% (₹0)</span>
                <span>50% (Shortfall)</span>
                <span>100% (Target Met)</span>
                <span>150% (Surplus)</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <span className="text-[11px] font-medium text-slate-500">Or type exact revenue:</span>
              <input
                type="number"
                placeholder={String(modeledRevenue)}
                value={customRevenue !== null ? customRevenue : ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setCustomRevenue(val);
                  if (val !== null && baselineTarget > 0) {
                    setRevenuePct(Math.round((val / baselineTarget) * 100));
                  }
                  setActivePreset('custom');
                }}
                className="w-32 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 bg-white"
              />
            </div>
          </div>

          {/* Variable 2: Fixed Operating Cost Surge / Reduction */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-xs font-bold text-slate-900 block">Fixed Operating Costs (Salaries, Petrol, Team)</label>
                <span className="text-[11px] text-slate-500">Standard Daily Cost: {formatINR(baselineFixedCost)}</span>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-slate-900">{formatINR(modeledFixedCost)}</span>
                <span className="text-[11px] font-bold text-slate-500 block">
                  ({costModifierPct}% of standard)
                </span>
              </div>
            </div>

            <input
              type="range"
              min="70"
              max="150"
              step="5"
              value={costModifierPct}
              onChange={(e) => {
                setCostModifierPct(Number(e.target.value));
                setActivePreset('custom');
              }}
              className="w-full accent-slate-700 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>-30% Savings</span>
              <span>100% (Standard)</span>
              <span>+50% Inflation Surge</span>
            </div>
          </div>

          {/* Variable 3: Outside Manpower & Overtime */}
          <div className="p-4 rounded-xl border border-slate-200 space-y-4">
            <span className="text-xs font-bold text-slate-900 block uppercase tracking-wider">
              Outside Helpers & Overtime
            </span>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block">Outside Helpers (Count)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={outsideHelpersCount}
                  onChange={(e) => {
                    setOutsideHelpersCount(Number(e.target.value));
                    setActivePreset('custom');
                  }}
                  className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block">Helper Daily Rate (₹1,000 std)</label>
                <input
                  type="number"
                  value={outsideHelperRate}
                  onChange={(e) => {
                    setOutsideHelperRate(Number(e.target.value));
                    setActivePreset('custom');
                  }}
                  className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block">Overtime Staff</label>
                <input
                  type="number"
                  min="0"
                  value={overtimeWorkers}
                  onChange={(e) => {
                    setOvertimeWorkers(Number(e.target.value));
                    setActivePreset('custom');
                  }}
                  className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block">OT Hours / Pax</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={overtimeHoursPerWorker}
                  onChange={(e) => {
                    setOvertimeHoursPerWorker(Number(e.target.value));
                    setActivePreset('custom');
                  }}
                  className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block">OT Rate / Hr (₹100)</label>
                <input
                  type="number"
                  value={overtimeRatePerHour}
                  onChange={(e) => {
                    setOvertimeRatePerHour(Number(e.target.value));
                    setActivePreset('custom');
                  }}
                  className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>
          </div>

          {/* Variable 4: Travel Delays & Direct Expenses */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Non-Productive Travel & Delays (Hours)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={travelAndDelayHours}
                onChange={(e) => {
                  setTravelAndDelayHours(Number(e.target.value));
                  setActivePreset('custom');
                }}
                className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-bold"
              />
              <span className="text-[10px] text-slate-400 block mt-1">Drains productive capacity</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block">Materials & Other Expenses (₹)</label>
              <input
                type="number"
                min="0"
                value={extraDirectExpenses}
                onChange={(e) => {
                  setExtraDirectExpenses(Number(e.target.value));
                  setActivePreset('custom');
                }}
                className="mt-1 w-full text-xs border border-slate-300 rounded-lg p-2 font-bold"
              />
              <span className="text-[10px] text-slate-400 block mt-1">Chemicals, parking, etc.</span>
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Economic Diagnosis & Impact (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Verdict Card */}
          <div className={`p-6 rounded-2xl shadow-lg border text-white space-y-4 ${
            verdictType === 'profit'
              ? 'bg-slate-900 border-slate-800'
              : verdictType === 'warning'
                ? 'bg-amber-950 border-amber-800'
                : 'bg-rose-950 border-rose-800'
          }`}>
            <div className="flex justify-between items-center border-b pb-3 border-white/10">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                What-If Scenario Result
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                verdictType === 'profit'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : verdictType === 'warning'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {verdictType === 'profit' ? 'Profitable' : verdictType === 'warning' ? 'Marginal / At Risk' : 'Loss Warning'}
              </span>
            </div>

            {/* Contribution Display */}
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold uppercase">
                Modeled Operational Contribution
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-3xl font-black ${
                  modeledContribution >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatINR(modeledContribution)}
                </span>
                <span className="text-xs text-slate-300 font-bold">
                  ({modeledMargin}% margin)
                </span>
              </div>
              <span className={`text-[11px] font-semibold block mt-1 ${
                contributionVariance >= 0 ? 'text-emerald-300' : 'text-rose-300'
              }`}>
                {contributionVariance >= 0 ? '+' : ''}{formatINR(contributionVariance)} vs Baseline Target
              </span>
            </div>

            {/* Quick Math Breakdown */}
            <div className="space-y-2 pt-3 border-t border-white/10 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Modeled Revenue:</span>
                <span className="font-bold text-white">{formatINR(modeledRevenue)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Fixed Operating Costs:</span>
                <span>-{formatINR(modeledFixedCost)}</span>
              </div>
              {totalAdditionalCosts > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>Additional Costs (Helpers/OT):</span>
                  <span>-{formatINR(totalAdditionalCosts)}</span>
                </div>
              )}
              {scope === 'all' && (
                <div className="flex justify-between text-slate-300">
                  <span>Shared Expenses:</span>
                  <span>-{formatINR(sharedExpenses)}</span>
                </div>
              )}
              {scope === 'all' && (
                <div className="flex justify-between font-bold pt-1 border-t border-white/10 text-indigo-300">
                  <span>Net Post-Shared Contribution:</span>
                  <span className={modeledPostShared >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                    {formatINR(modeledPostShared)}
                  </span>
                </div>
              )}
            </div>

            {/* Fixed Cost Coverage & Break-even */}
            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">Fixed Cost Covered:</span>
                <span className={`font-bold ${fixedCostRecoveryPct >= 100 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {fixedCostRecoveryPct}%
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full ${fixedCostRecoveryPct >= 100 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                  style={{ width: `${Math.min(fixedCostRecoveryPct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-300 pt-1">
                <span>Break-Even Revenue Needed:</span>
                <span className="font-bold text-amber-300">{formatINR(breakEvenRevenue)}</span>
              </div>
            </div>
          </div>

          {/* Diagnostic Takeaways */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Diagnostic Takeaways
            </h4>

            <div className="space-y-2.5 text-xs text-slate-600">
              {/* Takeaway 1: Revenue & Target */}
              <div className="flex items-start gap-2">
                {modeledRevenue >= baselineTarget ? (
                  <CheckCircledIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <span>
                  {modeledRevenue >= baselineTarget
                    ? `Revenue achieves 100% of target (+${formatINR(revenueVariance)} surplus).`
                    : `Revenue shortfall of ${formatINR(Math.abs(revenueVariance))} below daily target.`}
                </span>
              </div>

              {/* Takeaway 2: Fixed Cost Coverage */}
              <div className="flex items-start gap-2">
                {fixedCostRecoveryPct >= 100 ? (
                  <CheckCircledIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <CrossCircledIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>
                  {fixedCostRecoveryPct >= 100
                    ? `Earned revenue fully covers the ${formatINR(modeledFixedCost)} fixed team salaries and petrol.`
                    : `Earned revenue fails to cover fixed operating costs by ${formatINR(modeledFixedCost - modeledRevenue)}.`}
                </span>
              </div>

              {/* Takeaway 3: Travel & Capacity Impact */}
              {travelAndDelayHours > 0 && (
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    Non-productive travel ({travelAndDelayHours} hrs) consumes{' '}
                    <strong className="text-slate-900">{formatINR(Math.round(travelCostImpact))}</strong> of fixed overhead.
                  </span>
                </div>
              )}

              {/* Takeaway 4: Helper Benchmark */}
              {outsideHelpersCount > 0 && (
                <div className="flex items-start gap-2">
                  {helperMeetsBenchmark ? (
                    <CheckCircledIcon className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <span>
                    {helperMeetsBenchmark
                      ? `Additional helpers satisfy the ₹2,000/helper revenue benchmark.`
                      : `Helpers revenue shortfall: Does not generate sufficient revenue to justify ₹${outsideHelperRate}/helper cost.`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Side-by-Side Impact Matrix</h3>
            <p className="text-xs text-slate-500">Comparison of Baseline Target vs What-If Modeled Scenario</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Metric</th>
                <th className="px-6 py-3 text-right">Baseline (100% Target)</th>
                <th className="px-6 py-3 text-right">What-If Modeled</th>
                <th className="px-6 py-3 text-right">Impact / Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-700">
              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3.5 font-bold text-slate-900">Earned Revenue</td>
                <td className="px-6 py-3.5 text-right font-semibold text-slate-600">{formatINR(baselineTarget)}</td>
                <td className="px-6 py-3.5 text-right font-bold text-indigo-600">{formatINR(modeledRevenue)}</td>
                <td className={`px-6 py-3.5 text-right font-bold ${revenueVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {revenueVariance >= 0 ? '+' : ''}{formatINR(revenueVariance)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3.5 font-bold text-slate-900">Standard Fixed Operating Cost</td>
                <td className="px-6 py-3.5 text-right text-slate-600">{formatINR(baselineFixedCost)}</td>
                <td className="px-6 py-3.5 text-right font-semibold text-slate-900">{formatINR(modeledFixedCost)}</td>
                <td className="px-6 py-3.5 text-right text-slate-500">
                  {modeledFixedCost - baselineFixedCost === 0 ? '₹0' : formatINR(modeledFixedCost - baselineFixedCost)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3.5 font-bold text-slate-900">Additional Direct Costs (Helpers/OT)</td>
                <td className="px-6 py-3.5 text-right text-slate-600">₹0</td>
                <td className="px-6 py-3.5 text-right font-semibold text-slate-900">{formatINR(totalAdditionalCosts)}</td>
                <td className="px-6 py-3.5 text-right text-rose-600">
                  +{formatINR(totalAdditionalCosts)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50 bg-slate-50/50">
                <td className="px-6 py-3.5 font-black text-slate-900">Operational Contribution</td>
                <td className="px-6 py-3.5 text-right font-bold text-emerald-600">{formatINR(baselineContribution)}</td>
                <td className={`px-6 py-3.5 text-right font-black ${modeledContribution >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatINR(modeledContribution)}
                </td>
                <td className={`px-6 py-3.5 text-right font-black ${contributionVariance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {contributionVariance >= 0 ? '+' : ''}{formatINR(contributionVariance)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3.5 font-bold text-slate-900">Contribution Margin %</td>
                <td className="px-6 py-3.5 text-right font-semibold text-slate-600">{baselineMargin}%</td>
                <td className="px-6 py-3.5 text-right font-bold text-slate-900">{modeledMargin}%</td>
                <td className="px-6 py-3.5 text-right text-slate-500">
                  {modeledMargin - baselineMargin >= 0 ? '+' : ''}{modeledMargin - baselineMargin}% pts
                </td>
              </tr>

              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3.5 font-bold text-slate-900">Break-Even Revenue Goal</td>
                <td className="px-6 py-3.5 text-right text-slate-600">{formatINR(baselineFixedCost)}</td>
                <td className="px-6 py-3.5 text-right font-bold text-amber-600">{formatINR(breakEvenRevenue)}</td>
                <td className="px-6 py-3.5 text-right text-slate-500">
                  +{formatINR(breakEvenRevenue - baselineFixedCost)}
                </td>
              </tr>

              <tr className="hover:bg-slate-50">
                <td className="px-6 py-3.5 font-bold text-slate-900">Contribution per Productive Hour</td>
                <td className="px-6 py-3.5 text-right text-slate-600">
                  {formatINR(Math.round(baselineContribution / baselineCapacity))}/hr
                </td>
                <td className="px-6 py-3.5 text-right font-bold text-indigo-600">
                  {formatINR(Math.round(contributionPerHour))}/hr
                </td>
                <td className="px-6 py-3.5 text-right text-slate-500">
                  {formatINR(Math.round(contributionPerHour - (baselineContribution / baselineCapacity)))}/hr
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
