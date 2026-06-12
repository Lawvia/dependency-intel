import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import HomePage from './pages/HomePage';
import ScanResultsPage from './pages/ScanResultsPage';
import PackageDetailPage from './pages/PackageDetailPage';

export default function App() {
  const [scanResults, setScanResults] = useState(null);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <div className="bg-glow" />
        <header className="app-header">
          <div className="app-header-inner">
            <a href="/" className="app-logo" style={{ textDecoration: 'none' }}>
              <div className="app-logo-icon">🛡️</div>
              <span>DepIntel</span>
            </a>
            <nav style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <a href="https://github.com/lawvia/depintel" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                GitHub
              </a>
            </nav>
          </div>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomePage onScanComplete={setScanResults} />} />
            <Route path="/results" element={<ScanResultsPage results={scanResults} />} />
            <Route path="/package/:ecosystem/:name" element={<PackageDetailPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
