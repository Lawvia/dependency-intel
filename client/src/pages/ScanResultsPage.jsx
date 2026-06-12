import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import PackageTable from '../components/PackageTable';
import RiskGauge from '../components/RiskGauge';
import SignalCard from '../components/SignalCard';
import VulnerabilityList from '../components/VulnerabilityList';

export default function ScanResultsPage({ results }) {
  const navigate = useNavigate();
  const [selectedPkg, setSelectedPkg] = useState(null);

  if (!results) {
    return <Navigate to="/" replace />;
  }

  const { summary, results: packages } = results;

  // Compute average risk score
  const avgScore = packages.length > 0
    ? Math.round(packages.reduce((sum, r) => sum + (r.marshalScore?.compositeScore || 0), 0) / packages.length)
    : 0;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>
          ← Back
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Scan Results</h1>
      </div>

      {/* Summary Stats */}
      <div className="stats-bar" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--text-primary)' }}>{summary.total}</div>
          <div className="stat-label">Total Packages</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: summary.vulnerable > 0 ? 'var(--risk-critical)' : 'var(--risk-safe)' }}>
            {summary.vulnerable}
          </div>
          <div className="stat-label">Vulnerable</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: summary.malicious > 0 ? 'var(--malware-red)' : 'var(--risk-safe)' }}>
            {summary.malicious}
          </div>
          <div className="stat-label">Malware Flagged</div>
        </div>
        <div className="stat-card">
          <RiskGauge score={avgScore} size={100} />
          <div className="stat-label" style={{ marginTop: '0.25rem' }}>Avg Risk Score</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {Object.entries(summary.riskDistribution || {}).map(([level, count]) =>
              count > 0 ? (
                <span key={level} className={`badge badge-${level}`} style={{ fontSize: '0.6875rem' }}>
                  {count} {level}
                </span>
              ) : null
            )}
          </div>
          <div className="stat-label" style={{ marginTop: '0.5rem' }}>Distribution</div>
        </div>
      </div>

      {/* Main content - table + detail panel */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedPkg ? '1fr 400px' : '1fr', gap: '1.5rem' }}>
        <PackageTable results={packages} onSelectPackage={setSelectedPkg} />

        {selectedPkg && (
          <div className="card animate-slide-up" style={{ position: 'sticky', top: '80px', alignSelf: 'start', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', marginBottom: '0.25rem' }}>
                  {selectedPkg.package.name}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="badge badge-ecosystem">{selectedPkg.package.ecosystem}</span>
                  {selectedPkg.package.version && (
                    <span className="table-version">@{selectedPkg.package.version}</span>
                  )}
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedPkg(null)}
                style={{ padding: '2px 8px' }}
              >✕</button>
            </div>

            {/* Malware Alert */}
            {selectedPkg.malwareResult?.isMalicious && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'var(--malware-bg)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
              }}>
                <div style={{ fontWeight: 700, color: 'var(--malware-red)', marginBottom: '0.25rem' }}>
                  🔴 MALWARE DETECTED
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {selectedPkg.malwareResult.description || 'This package has been flagged as malicious.'}
                </div>
                {selectedPkg.malwareResult.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedPkg.malwareResult.tags.map(tag => (
                      <span key={tag} className="badge badge-malware" style={{ fontSize: '0.625rem' }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Marshal Score */}
            {selectedPkg.marshalScore && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <RiskGauge score={selectedPkg.marshalScore.compositeScore} size={140} />
                  <span className={`badge badge-${selectedPkg.marshalScore.riskLevel}`} style={{ textTransform: 'capitalize' }}>
                    {selectedPkg.marshalScore.riskLevel} risk
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedPkg.marshalScore.signals?.map(signal => (
                    <SignalCard key={signal.name} signal={signal} />
                  ))}
                </div>
              </div>
            )}

            {/* Vulnerabilities */}
            {selectedPkg.vulnerabilities?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                  Vulnerabilities ({selectedPkg.vulnerabilities.length})
                </h4>
                <VulnerabilityList vulnerabilities={selectedPkg.vulnerabilities} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
