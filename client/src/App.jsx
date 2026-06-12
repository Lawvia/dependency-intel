import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import HomePage from './pages/HomePage';
import ScanResultsPage from './pages/ScanResultsPage';
import PackageDetailPage from './pages/PackageDetailPage';

export default function App() {
  const [scanResults, setScanResults] = useState(null);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white">
        {/* Sleek Top Banner Navbar */}
        <header className="border-b border-zinc-900 bg-zinc-950 w-full" id="navbar">
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 cursor-pointer no-underline">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center border border-indigo-400/30 shadow-md shadow-indigo-500/10">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-mono font-bold text-white tracking-tight text-lg">DepIntel</span>
                <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.2 rounded ml-2 font-mono">v1.2</span>
              </div>
            </Link>

            <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
              {/* <span className="hidden sm:inline">OSV Database v2026.06</span> */}
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                Status: OK
              </span>
            </div>
          </div>
        </header>

        {/* Main app framework stage container */}
        <main className="flex-1 py-10">
          <Routes>
            <Route path="/" element={<HomePage onScanComplete={setScanResults} />} />
            <Route path="/results" element={<ScanResultsPage results={scanResults} />} />
            <Route path="/package/:ecosystem/:name" element={<PackageDetailPage />} />
          </Routes>
        </main>

        {/* Snyk style humble footer element */}
        <footer className="border-t border-zinc-900 bg-zinc-950 py-6" id="footer">
          <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
            <span>© 2026 DepIntel Dependency Scanning tool.</span>
            <div className="flex items-center gap-4">
              <span className="hover:text-zinc-400 cursor-pointer">Security Heuristics Advisory</span>
              <span>•</span>
              <span className="hover:text-zinc-400 cursor-pointer">Disclaimer</span>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
