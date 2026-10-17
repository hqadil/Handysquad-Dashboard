// src/components/CustomTrackingApp.tsx
import React, { useState } from 'react';
import { 
  ActivityLogIcon, 
  MixerHorizontalIcon, 
  TargetIcon, 
  BarChartIcon, 
  TableIcon, 
  PlusIcon,
  CheckCircledIcon,
  InfoCircledIcon,
  CalendarIcon
} from '@radix-ui/react-icons';

interface CustomTrackingAppProps {
  onSwitchToEconomicCalculator: () => void;
  activeTab: string;
}

export default function CustomTrackingApp({ onSwitchToEconomicCalculator, activeTab }: CustomTrackingAppProps) {
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState('All');

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {/* Top Banner: Application Status */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Handy Squad Suite · New Application
              </span>
              <span className="text-slate-400 text-xs">· Awaiting Next Prompt Details</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Custom Tracking Dashboard
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              This application slot is live inside your Handy Squad application switcher. 
              Once you provide the exact tracking dimensions, KPIs, or workflow in your next prompt, 
              this dashboard will be wired to your custom database tracking tables.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <button
              onClick={onSwitchToEconomicCalculator}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl border border-white/20 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <MixerHorizontalIcon className="w-4 h-4 text-indigo-300" />
              <span>Switch to Economic Calculator</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <CalendarIcon className="w-4 h-4 text-slate-500" />
            <span>Tracking Date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            {['All', 'Active', 'Completed', 'Flagged'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  selectedCategory === cat 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-sm transition flex items-center gap-1.5"
            onClick={() => alert('Ready to configure your custom tracking entry once you define the metrics in your next prompt!')}
          >
            <PlusIcon className="w-4 h-4" />
            <span>New Tracking Entry</span>
          </button>
        </div>
      </div>

      {/* Placeholder KPI Cards Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metric 1 (Primary Target)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">—</span>
            <span className="text-xs text-slate-400">Target to be defined</span>
          </div>
          <p className="text-[11px] text-slate-500">Will track primary unit or conversion target</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metric 2 (Achievement Rate)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">—%</span>
            <span className="text-xs text-emerald-600 font-semibold">Ready</span>
          </div>
          <p className="text-[11px] text-slate-500">Real-time percentage benchmark</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metric 3 (Volume / Count)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600">0</span>
            <span className="text-xs text-slate-400">Units logged</span>
          </div>
          <p className="text-[11px] text-slate-500">Daily logged records and counts</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metric 4 (Variance / Quality)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">—</span>
            <span className="text-xs text-slate-400">Status</span>
          </div>
          <p className="text-[11px] text-slate-500">Variance, friction, or quality score</p>
        </div>
      </div>

      {/* Main Ready Workspace Container */}
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center shadow-sm space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mx-auto flex items-center justify-center shadow-sm">
          <ActivityLogIcon className="w-8 h-8" />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-base font-bold text-slate-900">
            Awaiting Tracking Schema in Next Prompt
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Send me the fields, targets, and workflow for this new tracking application. 
            I will generate the Supabase database table, API routes, and live analytical visualizations immediately.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={onSwitchToEconomicCalculator}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-xl transition shadow-sm"
          >
            ← Return to Economic Calculator
          </button>
        </div>
      </div>
    </div>
  );
}
