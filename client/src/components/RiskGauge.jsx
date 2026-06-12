export default function RiskGauge({ score, size = 120 }) {
  const radius = 45;
  const circumference = Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="risk-gauge" style={{ width: size, height: size * 0.6 }}>
      <svg className="risk-gauge-svg" viewBox="0 0 100 60">
        {/* Background arc */}
        <path
          d="M 5 55 A 45 45 0 0 1 95 55"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d="M 5 55 A 45 45 0 0 1 95 55"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 6px ${color}40)` }}
        />
      </svg>
      <div className="risk-gauge-score" style={{ color }}>{score}</div>
    </div>
  );
}

function getScoreColor(score) {
  if (score >= 80) return 'var(--risk-critical)';
  if (score >= 60) return 'var(--risk-high)';
  if (score >= 40) return 'var(--risk-medium)';
  if (score >= 20) return 'var(--risk-low)';
  return 'var(--risk-safe)';
}
