const SIGNAL_ICONS = {
  age: '📅',
  author: '👤',
  downloads: '📊',
  readme: '📖',
  version: '🏷️',
  typosquat: '🎯',
  malware: '🦠',
};

export default function SignalCard({ signal }) {
  const color = getSignalColor(signal.level);

  return (
    <div className="signal-card">
      <div className="signal-header">
        <span className="signal-name">
          <span>{SIGNAL_ICONS[signal.name] || '📋'}</span>
          <span style={{ textTransform: 'capitalize' }}>{signal.name}</span>
        </span>
        <span className={`badge badge-${signal.level}`}>
          {signal.score}/100
        </span>
      </div>
      <div className="signal-bar">
        <div
          className="signal-bar-fill"
          style={{
            width: `${signal.score}%`,
            background: color,
          }}
        />
      </div>
      <div className="signal-verdict">{signal.verdict}</div>
    </div>
  );
}

function getSignalColor(level) {
  const colors = {
    critical: 'var(--risk-critical)',
    high: 'var(--risk-high)',
    medium: 'var(--risk-medium)',
    low: 'var(--risk-low)',
    safe: 'var(--risk-safe)',
  };
  return colors[level] || colors.safe;
}
