/**
 * components/organizer-dashboard/Sparkline.tsx
 *
 * Tiny inline SVG line chart, replacing the Stitch screen's Chart.js
 * canvas sparklines. Chart.js is unnecessary weight for a single static
 * mini-chart with no tooltips/legend/axes — a hand-rolled SVG polyline
 * achieves the identical visual with zero extra dependencies.
 */

interface SparklineProps {
    data: number[];
    color: string; // any valid CSS color, e.g. "var(--color-success)" or a hex
    height?: number;
  }
  
  export function Sparkline({ data, color, height = 32 }: SparklineProps) {
    const width = 100;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
  
    const points = data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
      })
      .join(" ");
  
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }