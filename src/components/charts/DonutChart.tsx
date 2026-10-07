import React, { useState } from 'react';

export interface ChartSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: ChartSegment[];
  size?: number;
  donutThickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
  className?: string;
  showLegend?: boolean;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 180,
  donutThickness = 26,
  centerLabel,
  centerValue,
  className = '',
  showLegend = true,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const radius = size / 2;
  const circumference = 2 * Math.PI * (radius - donutThickness / 2);

  let accumulatedPercent = 0;

  // If no data or 0 total, render a placeholder light donut
  if (total === 0) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={radius}
              cy={radius}
              r={radius - donutThickness / 2}
              fill="transparent"
              stroke="#E5E5E5"
              strokeWidth={donutThickness}
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-xs text-neutral-400 font-medium">No Data</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-4 ${className}`}>
      {/* SVG Donut Circle */}
      <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 origin-center transition-all duration-300"
        >
          {data.map((item, index) => {
            const percent = item.value / total;
            const strokeDasharray = `${percent * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += percent;

            const isHovered = hoveredIdx === index;

            return (
              <circle
                key={index}
                cx={radius}
                cy={radius}
                r={radius - donutThickness / 2}
                fill="transparent"
                stroke={item.color}
                strokeWidth={isHovered ? donutThickness + 3 : donutThickness}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(index)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center Label & Value */}
        <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center px-2">
          {hoveredIdx !== null ? (
            <>
              <span className="text-base font-bold text-neutral-900 font-mono">
                {data[hoveredIdx].value}
              </span>
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider truncate max-w-[80px]">
                {Math.round((data[hoveredIdx].value / total) * 100)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-base font-bold text-neutral-900 font-mono">
                {centerValue !== undefined ? centerValue : total}
              </span>
              {centerLabel && (
                <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
                  {centerLabel}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex-1 w-full space-y-1.5 text-xs">
          {data.map((item, index) => {
            const pct = Math.round((item.value / total) * 100) || 0;
            const isHovered = hoveredIdx === index;
            return (
              <div
                key={index}
                onMouseEnter={() => setHoveredIdx(index)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition ${
                  isHovered ? 'bg-neutral-100 font-semibold' : 'hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-neutral-700 truncate text-[11px]">{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-end">
                  <span className="font-mono font-semibold text-neutral-900 text-xs">{item.value}</span>
                  <span className="text-[10px] text-neutral-400 font-mono">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
