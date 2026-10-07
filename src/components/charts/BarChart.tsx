import React, { useState } from 'react';

export interface BarDataPoint {
  label: string; // e.g. "10/01" or "Oct 01"
  seriesA: number; // e.g. Fresh Water / Small Cylinders / Diesel
  seriesB: number; // e.g. Waste Water / Big Cylinders / Petrol
}

interface BarChartProps {
  data: BarDataPoint[];
  seriesAName: string;
  seriesBName: string;
  seriesAColor?: string;
  seriesBColor?: string;
  unit?: string;
  height?: number;
  className?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  seriesAName,
  seriesBName,
  seriesAColor = '#EA580C', // Orange
  seriesBColor = '#262626', // Charcoal / Black
  unit = '',
  height = 200,
  className = '',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-[${height}px] bg-neutral-50/50 rounded-xl border border-neutral-200 text-xs text-neutral-400 font-medium ${className}`}>
        No data available
      </div>
    );
  }

  const maxVal = Math.max(
    1,
    ...data.map((d) => Math.max(d.seriesA || 0, d.seriesB || 0))
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Legend & Hover tooltip */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: seriesAColor }} />
            <span className="font-semibold text-neutral-700">{seriesAName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: seriesBColor }} />
            <span className="font-semibold text-neutral-700">{seriesBName}</span>
          </div>
        </div>

        {hoveredIdx !== null && data[hoveredIdx] && (
          <div className="text-[11px] font-mono font-bold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
            {data[hoveredIdx].label}: {seriesAName} = {data[hoveredIdx].seriesA.toLocaleString()} {unit} | {seriesBName} = {data[hoveredIdx].seriesB.toLocaleString()} {unit}
          </div>
        )}
      </div>

      {/* Chart SVG Canvas */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${Math.max(480, data.length * 60)} ${height}`}
          className="w-full h-auto max-h-[220px]"
          style={{ minWidth: '320px' }}
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = height - 25 - pct * (height - 45);
            return (
              <g key={i}>
                <line
                  x1={40}
                  y1={y}
                  x2={Math.max(480, data.length * 60) - 10}
                  y2={y}
                  stroke="#F3F4F6"
                  strokeWidth="1"
                />
                <text
                  x={32}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="#9CA3AF"
                  fontFamily="monospace"
                >
                  {Math.round(maxVal * pct).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, index) => {
            const totalSlots = data.length;
            const availableWidth = Math.max(480, totalSlots * 60) - 50;
            const slotWidth = availableWidth / totalSlots;
            const slotX = 45 + index * slotWidth;

            const barWidth = Math.min(18, slotWidth * 0.35);
            const chartPlotHeight = height - 45;

            const heightA = (d.seriesA / maxVal) * chartPlotHeight;
            const heightB = (d.seriesB / maxVal) * chartPlotHeight;

            const yA = height - 25 - heightA;
            const yB = height - 25 - heightB;

            const isHovered = hoveredIdx === index;

            return (
              <g
                key={index}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setHoveredIdx(index)}
                onMouseLeave={() => setHoveredIdx(null)}
                opacity={hoveredIdx === null || isHovered ? 1 : 0.45}
              >
                {/* Background highlight on hover */}
                {isHovered && (
                  <rect
                    x={slotX}
                    y={10}
                    width={slotWidth}
                    height={height - 35}
                    fill="#F97316"
                    fillOpacity="0.08"
                    rx={6}
                  />
                )}

                {/* Bar A */}
                <rect
                  x={slotX + slotWidth / 2 - barWidth - 1.5}
                  y={yA}
                  width={barWidth}
                  height={Math.max(2, heightA)}
                  fill={seriesAColor}
                  rx={3}
                />

                {/* Bar B */}
                <rect
                  x={slotX + slotWidth / 2 + 1.5}
                  y={yB}
                  width={barWidth}
                  height={Math.max(2, heightB)}
                  fill={seriesBColor}
                  rx={3}
                />

                {/* X-axis Label */}
                <text
                  x={slotX + slotWidth / 2}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="600"
                  fill={isHovered ? '#EA580C' : '#6B7280'}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
