/**
 * components/auth/PasswordStrengthMeter.tsx
 *
 * Live password-strength bar + label. Scoring logic is a direct port of
 * the original Stitch screen's vanilla JS: +1 point each for length>=8,
 * mixed case, a digit, and a symbol — same 4-point scale, same
 * weak/medium/strong thresholds and colors (danger/warning/success).
 */

interface PasswordStrengthMeterProps {
    password: string;
  }
  
  function calculate_strength(password: string): {
    score: number;
    label: string;
    color_class: string;
    width_pct: string;
  } {
    if (password.length === 0) {
      return { score: 0, label: "", color_class: "bg-danger", width_pct: "0%" };
    }
  
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
  
    if (score === 1) {
      return { score, label: "Weak", color_class: "bg-danger", width_pct: "33%" };
    }
    if (score === 2 || score === 3) {
      return {
        score,
        label: "Medium",
        color_class: "bg-warning",
        width_pct: "66%",
      };
    }
    if (score === 4) {
      return {
        score,
        label: "Strong",
        color_class: "bg-success",
        width_pct: "100%",
      };
    }
    // score === 0 with non-empty password (shorter than 8, all-lowercase, no digit/symbol)
    return { score, label: "Weak", color_class: "bg-danger", width_pct: "10%" };
  }
  
  const LABEL_TEXT_CLASS: Record<string, string> = {
    Weak: "text-danger",
    Medium: "text-warning",
    Strong: "text-success",
  };
  
  export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
    const { label, color_class, width_pct } = calculate_strength(password);
  
    return (
      <div className="pt-2">
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-variant">
          <div
            className={`h-full transition-[width,background-color] duration-300 ease-in-out ${color_class}`}
            style={{ width: width_pct }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <p className="font-label-sm text-label-sm text-text-secondary">
            Password strength
          </p>
          <p
            className={`font-label-sm text-label-sm font-semibold ${LABEL_TEXT_CLASS[label] ?? ""}`}
          >
            {label}
          </p>
        </div>
      </div>
    );
  }