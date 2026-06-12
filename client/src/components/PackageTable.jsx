import { useState, useMemo } from 'react';

export default function PackageTable({ results, onSelectPackage }) {
  const [sortField, setSortField] = useState('score');
  const [sortDir, setSortDir] = useState('desc');
  const [filter, setFilter] = useState('all');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    let items = [...(results || [])];

    // Filter
    if (filter === 'vulnerable') {
      items = items.filter(r => r.vulnerabilities?.length > 0);
    } else if (filter === 'malware') {
      items = items.filter(r => r.malwareResult?.isMalicious);
    } else if (filter === 'risky') {
      items = items.filter(r => (r.marshalScore?.compositeScore || 0) >= 40);
    }

    // Sort
    items.sort((a, b) => {
      let av, bv;
      switch (sortField) {
        case 'name':
          av = a.package.name; bv = b.package.name;
          return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        case 'vulns':
          av = a.vulnerabilities?.length || 0; bv = b.vulnerabilities?.length || 0;
          break;
        case 'score':
          av = a.marshalScore?.compositeScore || 0; bv = b.marshalScore?.compositeScore || 0;
          break;
        default:
          av = 0; bv = 0;
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });

    return items;
  }, [results, sortField, sortDir, filter]);

  const sortArrow = (field) => {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div>
      {/* Filter tabs */}
      <div className="tabs">
        {[
          ['all', `All (${results?.length || 0})`],
          ['vulnerable', `Vulnerable`],
          ['malware', `Malware`],
          ['risky', `Risky (≥40)`],
        ].map(([key, label]) => (
          <button key={key} className={`tab ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')}>Package{sortArrow('name')}</th>
              <th>Version</th>
              <th>Ecosystem</th>
              <th onClick={() => handleSort('vulns')}>Vulns{sortArrow('vulns')}</th>
              <th>Malware</th>
              <th onClick={() => handleSort('score')}>Risk Score{sortArrow('score')}</th>
              <th>Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const pkg = r.package;
              const vulnCount = r.vulnerabilities?.length || 0;
              const isMalware = r.malwareResult?.isMalicious;
              const score = r.marshalScore?.compositeScore ?? '-';
              const level = r.marshalScore?.riskLevel || 'safe';

              return (
                <tr
                  key={`${pkg.ecosystem}/${pkg.name}@${pkg.version}-${i}`}
                  onClick={() => onSelectPackage?.(r)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <span className="table-pkg-name">{pkg.name}</span>
                    {pkg.isDev && <span className="badge badge-ecosystem" style={{ marginLeft: '0.5rem', fontSize: '0.625rem' }}>dev</span>}
                  </td>
                  <td><span className="table-version">{pkg.version || '*'}</span></td>
                  <td><span className="badge badge-ecosystem">{pkg.ecosystem}</span></td>
                  <td>
                    {vulnCount > 0 ? (
                      <span className="badge badge-critical">{vulnCount}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>0</span>
                    )}
                  </td>
                  <td>
                    {isMalware ? (
                      <span className="badge badge-malware">🔴 MALWARE</span>
                    ) : r.malwareResult?.hasMaliciousVersions ? (
                      <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600 }}>⚠️ RISK</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: getScoreColor(score) }}>
                      {score}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${level}`} style={{ textTransform: 'capitalize' }}>
                      {level}
                    </span>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No packages match the current filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getScoreColor(score) {
  if (typeof score !== 'number') return 'var(--text-muted)';
  if (score >= 80) return 'var(--risk-critical)';
  if (score >= 60) return 'var(--risk-high)';
  if (score >= 40) return 'var(--risk-medium)';
  if (score >= 20) return 'var(--risk-low)';
  return 'var(--risk-safe)';
}
