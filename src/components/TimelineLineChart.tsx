// src/components/TimelineLineChart.tsx
import React, { useState, useRef } from 'react';
import { formatINR } from '../lib/finance';

interface TrendItem {
  date: string;
  dayName: string;
  targetRevenue: number;
  earnedRevenue: number;
  standardCost: number;
  additionalCost: number;
  contribution: number;
  usedHours: number;
}

interface TimelineLineChartProps {
  data: TrendItem[];
}

export default function TimelineLineChart({ data }: TimelineLineChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showEarned, setShowEarned] = useState(true);
  const [showTarget, setShowTarget] = useState(true);
  const [showContribution, setShowContribution] = useState(true);
  const svgRef = useRef<SVGSVGElement | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
        No timeline data available for this period.
      </div>
    );
  }

  // SVG Dimensions & Margins
  const width = 1000;
  const height = 360;
  const padding = { top: 35, right: 35, bottom: 55, left: 80 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Calculate Value Range (Y-Axis)
  const allValues: number[] = [];
  data.forEach((d) => {
    if (showEarned) allValues.push(d.earnedRevenue);
    if (showTarget) allValues.push(d.targetRevenue);
    if (showContribution) allValues.push(d.contribution);
  });

  const rawMin = allValues.length > 0 ? Math.min(...allValues) : 0;
  const rawMax = allValues.length > 0 ? Math.max(...allValues) : 65000;

  // Round min down and max up for clean Y ticks
  const minVal = Math.floor(Math.min(rawMin, 0) / 10000) * 10000;
  const maxVal = Math.ceil(Math.max(rawMax, 65000) / 10000) * 10000 + 5000;
  const valRange = maxVal - minVal || 1;

  // Coordinate Mapping
  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (data.length - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padding.top + plotHeight - ((clamped - minVal) / valRange) * plotHeight;
  };

  const zeroY = getY(0);

  // SVG Path Generators
  const generatePath = (key: 'earnedRevenue' | 'targetRevenue' | 'contribution') => {
    return data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d[key]).toFixed(1)}`)
      .join(' ');
  };

  // Gradient Area Path for Earned Revenue
  const generateAreaPath = () => {
    if (data.length === 0) return '';
    const linePath = data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(d.earnedRevenue).toFixed(1)}`)
      .join(' ');
    const closePath = `L ${getX(data.length - 1).toFixed(1)} ${getY(minVal).toFixed(1)} L ${getX(0).toFixed(1)} ${getY(minVal).toFixed(1)} Z`;
    return `${linePath} ${closePath}`;
  };

  // Y-Axis Ticks (5 intervals)
  const tickCount = 5;
  const yTicks = Array.from({ length: tickCount + 1 }).map((_, i) => {
    return minVal + (i / tickCount) * (maxVal - minVal);
  });

  // Handle Mouse Hover
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || data.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;

    if (svgX < padding.left - 20 || svgX > width - padding.right + 20) {
      setHoveredIdx(null);
      return;
    }

    if (data.length === 1) {
      setHoveredIdx(0);
      return;
    }

    const ratio = Math.max(0, Math.min(1, (svgX - padding.left) / plotWidth));
    const closestIdx = Math.round(ratio * (data.length - 1));
    setHoveredIdx(closestIdx);
  };

  const hoveredItem = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    <div className="space-y-4">
      {/* Chart Legend & Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowEarned(!showEarned)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
              showEarned 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' 
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${showEarned ? 'bg-indigo-600' : 'bg-slate-300'}`} />
            <span>Earned Revenue</span>
          </button>

          <button
            onClick={() => setShowTarget(!showTarget)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
              showTarget 
                ? 'bg-slate-100 border-slate-300 text-slate-700 font-bold' 
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div className={`w-3 h-1.5 border-t-2 border-dashed ${showTarget ? 'border-slate-600' : 'border-slate-300'}`} />
            <span>Daily Target</span>
          </button>

          <button
            onClick={() => setShowContribution(!showContribution)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition ${
              showContribution 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' 
                : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${showContribution ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <span>Contribution</span>
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-medium">
          Hover over points to inspect metrics
        </span>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative bg-slate-50/50 rounded-xl border border-slate-200 p-2 overflow-hidden select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            {/* Linear gradient under Earned Revenue curve */}
            <linearGradient id="earnedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
            </linearGradient>

            {/* Linear gradient under Contribution curve */}
            <linearGradient id="contribGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>

            {/* Drop shadow for tooltip markers */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Horizontal Grid Lines & Y-Axis Labels */}
          {yTicks.map((tick, i) => {
            const y = getY(tick);
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={tick === 0 ? '#cbd5e1' : '#e2e8f0'}
                  strokeWidth={tick === 0 ? 1.5 : 1}
                  strokeDasharray={tick === 0 ? 'none' : '4,4'}
                />
                <text
                  x={padding.left - 12}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-semibold font-mono"
                >
                  {formatINR(tick)}
                </text>
              </g>
            );
          })}

          {/* X-Axis Tick Labels & Markers */}
          {data.map((d, i) => {
            const x = getX(i);
            // Skip some labels if too dense
            const skipStep = data.length > 15 ? 3 : data.length > 8 ? 2 : 1;
            const showLabel = i % skipStep === 0 || i === data.length - 1;

            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={padding.top + plotHeight}
                  x2={x}
                  y2={padding.top + plotHeight + 6}
                  stroke="#cbd5e1"
                  strokeWidth={1}
                />
                {showLabel && (
                  <text
                    x={x}
                    y={padding.top + plotHeight + 22}
                    textAnchor="middle"
                    className="text-[10px] fill-slate-500 font-bold"
                  >
                    {d.dayName}
                  </text>
                )}
              </g>
            );
          })}

          {/* Area Fill: Earned Revenue */}
          {showEarned && (
            <path
              d={generateAreaPath()}
              fill="url(#earnedGradient)"
              className="transition-all duration-300"
            />
          )}

          {/* Daily Target Line (Dashed Slate) */}
          {showTarget && (
            <path
              d={generatePath('targetRevenue')}
              fill="none"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="6,6"
              className="transition-all duration-300"
            />
          )}

          {/* Operational Contribution Line (Emerald) */}
          {showContribution && (
            <path
              d={generatePath('contribution')}
              fill="none"
              stroke="#10b981"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {/* Earned Revenue Line (Bold Indigo) */}
          {showEarned && (
            <path
              d={generatePath('earnedRevenue')}
              fill="none"
              stroke="#4f46e5"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {/* Data Points (Circles) */}
          {data.map((d, i) => {
            const x = getX(i);
            return (
              <g key={i}>
                {showTarget && (
                  <circle
                    cx={x}
                    cy={getY(d.targetRevenue)}
                    r={3}
                    fill="#ffffff"
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                  />
                )}

                {showContribution && (
                  <circle
                    cx={x}
                    cy={getY(d.contribution)}
                    r={3.5}
                    fill="#ffffff"
                    stroke={d.contribution >= 0 ? '#10b981' : '#f43f5e'}
                    strokeWidth={2}
                  />
                )}

                {showEarned && (
                  <circle
                    cx={x}
                    cy={getY(d.earnedRevenue)}
                    r={4}
                    fill="#4f46e5"
                    stroke="#ffffff"
                    strokeWidth={2}
                    filter="url(#glow)"
                  />
                )}
              </g>
            );
          })}

          {/* Interactive Hover Guide Line & Indicators */}
          {hoveredIdx !== null && (
            <g className="transition-all">
              {/* Vertical dotted ruler */}
              <line
                x1={getX(hoveredIdx)}
                y1={padding.top}
                x2={getX(hoveredIdx)}
                y2={padding.top + plotHeight}
                stroke="#6366f1"
                strokeWidth={1.5}
                strokeDasharray="4,4"
              />

              {/* Glowing ring on Earned Revenue */}
              {showEarned && (
                <circle
                  cx={getX(hoveredIdx)}
                  cy={getY(data[hoveredIdx].earnedRevenue)}
                  r={7}
                  fill="#4f46e5"
                  stroke="#ffffff"
                  strokeWidth={2.5}
                  filter="url(#glow)"
                />
              )}

              {/* Glowing ring on Contribution */}
              {showContribution && (
                <circle
                  cx={getX(hoveredIdx)}
                  cy={getY(data[hoveredIdx].contribution)}
                  r={6}
                  fill={data[hoveredIdx].contribution >= 0 ? '#10b981' : '#f43f5e'}
                  stroke="#ffffff"
                  strokeWidth={2}
                  filter="url(#glow)"
                />
              )}
            </g>
          )}
        </svg>

        {/* Floating Tooltip Card */}
        {hoveredItem && hoveredIdx !== null && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl border border-slate-700/80 text-xs backdrop-blur-md transition-all duration-75"
            style={{
              left: `${Math.min(Math.max(10, (getX(hoveredIdx) / width) * 100), 75)}%`,
              top: '12px',
            }}
          >
            <div className="font-bold text-slate-100 border-b border-slate-800 pb-1.5 mb-2 flex justify-between items-center gap-4">
              <span>{hoveredItem.dayName}</span>
              <span className="text-[10px] text-slate-400 font-mono">{hoveredItem.date}</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center gap-4">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" /> Earned Revenue:
                </span>
                <span className="font-bold text-white">{formatINR(hoveredItem.earnedRevenue)}</span>
              </div>

              <div className="flex justify-between items-center gap-4">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-1 bg-slate-400" /> Target Goal:
                </span>
                <span className="font-medium text-slate-300">{formatINR(hoveredItem.targetRevenue)}</span>
              </div>

              <div className="flex justify-between items-center gap-4 pt-1 border-t border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${hoveredItem.contribution >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} /> Contribution:
                </span>
                <span className={`font-bold ${hoveredItem.contribution >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatINR(hoveredItem.contribution)}
                </span>
              </div>

              {hoveredItem.usedHours > 0 && (
                <div className="flex justify-between items-center gap-4 text-[10px] text-slate-400">
                  <span>Capacity Used:</span>
                  <span className="font-medium text-slate-200">{hoveredItem.usedHours} hrs</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
