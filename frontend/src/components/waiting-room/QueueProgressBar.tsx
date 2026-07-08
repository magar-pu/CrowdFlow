/**
 * components/waiting-room/QueueProgressBar.tsx
 *
 * Linear progress bar showing overall queue clearance, with the diagonal
 * shimmer sweep ported from the Stitch screen's .shimmer::after CSS
 * (translateX sweep + white gradient overlay) — recreated here as a
 * Tailwind arbitrary-value animation rather than approximated.
 */

interface QueueProgressBarProps {
    position: number;
    total_in_queue: number;
  }
  
  export function QueueProgressBar({
    position,
    total_in_queue,
  }: QueueProgressBarProps) {
    const cleared = Math.max(0, total_in_queue - position);
    const progress_pct = total_in_queue > 0
      ? Math.min(100, Math.round((cleared / total_in_queue) * 100))
      : 0;
  
    return (
      <div className="w-full max-w-lg">
        <div className="mb-1.5 flex items-center justify-between font-label-sm text-label-sm text-text-secondary">
          <span>Queue Progress</span>
          <span>{progress_pct}%</span>
        </div>
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-container">
          <div
            className="relative h-full overflow-hidden rounded-full bg-secondary transition-[width] duration-1000 ease-linear"
            style={{ width: `${progress_pct}%` }}
          >
            <span className="absolute inset-0 [animation:shimmer-sweep_2.2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          </div>
        </div>
        <style>{`
          @keyframes shimmer-sweep {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }