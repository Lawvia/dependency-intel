import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ManifestInput from '../components/ManifestInput';
import SearchBar from '../components/SearchBar';
import { scanManifest, scanPackage } from '../services/api';

const SAMPLE_PACKAGE_JSON = `{
  "dependencies": {
    "express": "^4.18.2",
    "lodash": "4.17.20",
    "jsonwebtoken": "^9.0.0",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "mongoose": "^8.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0"
  }
}`;

const SAMPLE_REQUIREMENTS = `flask==3.0.0
requests==2.31.0
sqlalchemy==2.0.23
pydantic==2.5.0
celery==5.3.6
redis==5.0.1
pytest==7.4.3
black==23.11.0`;

export default function HomePage({ onScanComplete }) {
  const [content, setContent] = useState('');
  const [format, setFormat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleScanManifest = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const results = await scanManifest(content, format);
      onScanComplete(results);
      navigate('/results');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScanPackage = async (name, version, ecosystem) => {
    setLoading(true);
    setError(null);
    try {
      const result = await scanPackage(name, version, ecosystem);
      onScanComplete({
        summary: { total: 1, vulnerable: result.vulnerabilities?.length > 0 ? 1 : 0, malicious: result.malwareResult?.isMalicious ? 1 : 0, riskDistribution: { [result.marshalScore?.riskLevel || 'safe']: 1 } },
        results: [result],
      });
      navigate('/results');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (type) => {
    if (type === 'npm') {
      setContent(SAMPLE_PACKAGE_JSON);
      setFormat('package.json');
    } else {
      setContent(SAMPLE_REQUIREMENTS);
      setFormat('requirements.txt');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="hero">
        <h1 className="hero-title">Dependency Intelligence</h1>
        <p className="hero-subtitle">
          Scan your dependencies for vulnerabilities, malware, and supply-chain risks.
          Powered by OSV, OpenSourceMalware, and custom heuristic analysis.
        </p>
      </div>

      <div className="manifest-input-section">
        <div className="manifest-controls">
          <select
            className="input select"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            style={{ maxWidth: '200px' }}
          >
            <option value="">Auto-detect format</option>
            <option value="package.json">package.json (npm)</option>
            <option value="go.mod">go.mod (Go)</option>
            <option value="requirements.txt">requirements.txt (Python)</option>
            <option value="Cargo.toml">Cargo.toml (Rust)</option>
          </select>
          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => loadSample('npm')}>
              Try npm sample
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => loadSample('python')}>
              Try Python sample
            </button>
          </div>
        </div>

        <ManifestInput
          value={content}
          onChange={setContent}
          placeholder={`Paste your manifest file here...\n\nSupported formats:\n  • package.json (npm)\n  • go.mod (Go)\n  • requirements.txt (Python)\n  • Cargo.toml (Rust)`}
        />

        {error && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--risk-critical-bg)', color: 'var(--risk-critical)', fontSize: '0.875rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleScanManifest}
            disabled={loading || !content.trim()}
          >
            {loading ? <><span className="spinner" /> Analyzing...</> : '🔍  Analyze Dependencies'}
          </button>
        </div>

        <div className="search-divider">or search a single package</div>

        <SearchBar onSearch={handleScanPackage} loading={loading} />
      </div>
    </div>
  );
}
