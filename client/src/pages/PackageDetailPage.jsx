import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scanPackage } from '../services/api';
import RiskGauge from '../components/RiskGauge';
import SignalCard from '../components/SignalCard';
import VulnerabilityList from '../components/VulnerabilityList';

export default function PackageDetailPage() {
  const { ecosystem, name } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await scanPackage(name, '', ecosystem);
        setResult(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ecosystem, name]);

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" style={{ width: 40, height: 40 }} />
        <div>Analyzing {name}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: 'var(--risk-critical)' }}>Error: {error}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>
          ← Go Back
        </button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="animate-fade-in">
      <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: '1.5rem' }}>
        ← Back
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h1 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>
            {result.package.name}
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
            <span className="badge badge-ecosystem">{result.package.ecosystem}</span>
            {result.package.version && (
              <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                v{result.package.version}
              </span>
            )}
          </div>

          {/* Malware Alert */}
          {result.malwareResult?.isMalicious && (
            <div className="card" style={{
              background: 'var(--malware-bg)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              marginBottom: '1.5rem',
            }}>
              <h3 style={{ color: 'var(--malware-red)', marginBottom: '0.5rem' }}>🔴 MALWARE DETECTED</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {result.malwareResult.description || 'This package is flagged as malicious.'}
              </p>
              {result.malwareResult.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  {result.malwareResult.tags.map(tag => (
                    <span key={tag} className="badge badge-malware">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vulnerabilities */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
              Vulnerabilities {result.vulnerabilities?.length > 0 && `(${result.vulnerabilities.length})`}
            </h3>
            <VulnerabilityList vulnerabilities={result.vulnerabilities} />
          </div>
        </div>

        {/* Marshal Score Sidebar */}
        {result.marshalScore && (
          <div style={{ width: '360px' }}>
            <div className="card" style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Marshal Risk Score
              </h3>
              <RiskGauge score={result.marshalScore.compositeScore} size={160} />
              <div style={{ marginTop: '0.5rem' }}>
                <span className={`badge badge-${result.marshalScore.riskLevel}`} style={{ textTransform: 'capitalize', fontSize: '0.875rem', padding: '4px 14px' }}>
                  {result.marshalScore.riskLevel} risk
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {result.marshalScore.signals?.map(signal => (
                <SignalCard key={signal.name} signal={signal} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
