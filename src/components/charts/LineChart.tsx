import React, { useState } from 'react';

export interface LineDataPoint {
  label: string;
  seriesA: number;
  seriesB?: number;
}

interface LineChartProps {
  data: LineDataPoint[];
  seriesAName: string;
  seriesBName?: string;
  seriesAColor?: string;
  seriesBColor?: string;
  unit?: string;
  height?: number;
  className?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  seriesAName,
  seriesBName,
  seriesAColor = '#EA580C', // Orange
  seriesBColor = '#262626', // Charcoal
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

  const hasSeriesB = seriesBName !== undefined && data.some((d) => d.seriesB !== undefined);

  const maxVal = Math.max(
    1,
    ...data.map((d) => Math.max(d.seriesA || 0, hasSeriesB ? d.seriesB || 0 : 0))
  );

  const width = Math.max(480, data.length * 60);
  const plotLeft = 45;
  const plotRight = width - 15;
  const plotTop = 15;
  const plotBottom = height - 25;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const pointsA = data.map((d, i) => {
    const x = plotLeft + (i / Math.max(1, data.length - 1)) * plotWidth;
    const y = plotBottom - ((d.seriesA || 0) / maxVal) * plotHeight;
    return { x, y, val: d.seriesA, label: d.label };
  });

  const pointsB = hasSeriesB
    ? data.map((d, i) => {
        const x = plotLeft + (i / Math.max(1, data.length - 1)) * plotWidth;
        const y = plotBottom - ((d.seriesB || 0) / maxVal) * plotHeight;
        return { x, y, val: d.seriesB || 0, label: d.label };
      })
    : [];

  const pathA = pointsA.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ''
  );

  const pathB = pointsB.reduce(
    (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ''
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Legend & Hover tooltip */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full shrink-0" style={{ backgroundColor: seriesAColor }} />
            <span className="font-semibold text-neutral-700">{seriesAName}</span>
          </div>
          {hasSeriesB && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full shrink-0" style={{ backgroundColor: seriesBColor }} />
              <span className="font-semibold text-neutral-700">{seriesBName}</span>
            </div>
          )}
        </div>

        {hoveredIdx !== null && data[hoveredIdx] && (
          <div className="text-[11px] font-mono font-bold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
            {data[hoveredIdx].label}: {seriesAName} = {data[hoveredIdx].seriesA.toLocaleString()} {unit}
            {hasSeriesB && ` | ${seriesBName} = ${(data[hoveredIdx].seriesB || 0).toLocaleString()} ${unit}`}
          </div>
        )}
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[220px]"
          style={{ minWidth: '320px' }}
        >
          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = plotBottom - pct * plotHeight;
            return (
              <g key={i}>
                <line x1={plotLeft} y1={y} x2={plotRight} y2={y} stroke="#F3F4F6" strokeWidth="1" />
                <text x={34} y={y + 3} textAnchor="end" fontSize="9" fill="#9CA3AF" fontFamily="monospace">
                  {Math.round(maxVal * pct).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Area under series A */}
          {pointsA.length > 0 && (
            <path
              d={`${pathA} L ${pointsA[pointsA.length - 1].x} ${plotBottom} L ${pointsA[0].x} ${plotBottom} Z`}
              fill={seriesAColor}
              fillOpacity="0.08"
            />
          )}

          {/* Line Series B */}
          {hasSeriesB && pathB && (
            <path d={pathB} fill="none" stroke={seriesBColor} strokeWidth="2.5" strokeLinecap="round" />
          )}

          {/* Line Series A */}
          <path d={pathA} fill="none" stroke={seriesAColor} strokeWidth="2.5" strokeLinecap="round" />

          {/* Point Markers */}
          {pointsA.map((p, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 5 : 3.5}
                  fill={seriesAColor}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  className="transition-all"
                />
                {hasSeriesB && pointsB[i] && (
                  <circle
                    cx={pointsB[i].x}
                    cy={pointsB[i].y}
                    r={isHovered ? 5 : 3.5}
                    fill={seriesBColor}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="transition-all"
                  />
                )}
                {/* X-axis label */}
                <text
                  x={p.x}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="600"
                  fill={isHovered ? '#EA580C' : '#6B7280'}
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
