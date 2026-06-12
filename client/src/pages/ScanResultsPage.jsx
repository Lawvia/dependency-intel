import { useState, useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  X, 
  ExternalLink, 
  Clock, 
  Users, 
  Download, 
  Copy, 
  Check, 
  Terminal,
  Info
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const SIGNAL_ICONS = {
  age: '📅',
  author: '👤',
  downloads: '📊',
  readme: '📖',
  version: '🏷️',
  typosquat: '🎯',
  malware: '🦠',
};

function getLevelBadgeClass(level) {
  switch (level) {
    case 'critical':
      return 'bg-red-500/10 text-red-400 border border-red-500/20';
    case 'high':
      return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    case 'medium':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    case 'low':
      return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
    default:
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  }
}

function getLevelBarColor(level) {
  switch (level) {
    case 'critical': return 'bg-red-500';
    case 'high': return 'bg-rose-500';
    case 'medium': return 'bg-amber-500';
    case 'low': return 'bg-yellow-500';
    default: return 'bg-emerald-500';
  }
}

export default function ScanResultsPage({ results }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  // Sorting states
  const [sortField, setSortField] = useState('score');
  const [sortDir, setSortDir] = useState('desc');

  if (!results) {
    return <Navigate to="/" replace />;
  }

  const { summary, results: packages } = results;

  // Copy command to clipboard helper
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Compute average composite risk score
  const avgScore = packages.length > 0
    ? Math.round(packages.reduce((sum, r) => sum + (r.marshalScore?.compositeScore || 0), 0) / packages.length)
    : 0;

  // Circle progress calculation
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (avgScore / 100) * circumference;

  // Handle column sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Filter package reports based on tab & query & sort
  const filteredReports = useMemo(() => {
    let items = [...(packages || [])];

    // Query filter
    if (searchQuery.trim()) {
      items = items.filter(r => r.package?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Tab filter
    if (activeTab === "vulnerable") {
      items = items.filter(r => r.vulnerabilities?.length > 0);
    } else if (activeTab === "malware") {
      items = items.filter(r => r.malwareResult?.isMalicious);
    } else if (activeTab === "risky") {
      items = items.filter(r => (r.marshalScore?.compositeScore || 0) >= 40);
    }

    // Sorting
    items.sort((a, b) => {
      let av, bv;
      switch (sortField) {
        case 'name':
          av = a.package?.name || '';
          bv = b.package?.name || '';
          return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
        case 'vulns':
          av = a.vulnerabilities?.length || 0;
          bv = b.vulnerabilities?.length || 0;
          break;
        case 'score':
          av = a.marshalScore?.compositeScore || 0;
          bv = b.marshalScore?.compositeScore || 0;
          break;
        default:
          av = 0;
          bv = 0;
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });

    return items;
  }, [packages, activeTab, searchQuery, sortField, sortDir]);

  const sortArrow = (field) => {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  // Render ecosystem badges
  const renderEcosystemBadge = (eco) => {
    const styles = {
      npm: "bg-red-500/10 text-red-400 border-red-500/20",
      pypi: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      go: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      "crates.io": "bg-orange-500/10 text-orange-400 border-orange-500/20",
      cargo: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    };
    const key = eco?.toLowerCase() || '';
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${styles[key] || "bg-gray-500/10 text-gray-400 border-gray-500/20"}`}>
        {eco}
      </span>
    );
  };

  // Render risk level badges
  const getRiskLevelStyle = (level) => {
    const key = level?.toLowerCase() || '';
    switch (key) {
      case "critical":
        return { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", label: "Critical" };
      case "high":
        return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: "High Risk" };
      case "medium":
        return { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20", label: "Medium Risk" };
      case "low":
        return { bg: "bg-yellow-500/5", text: "text-yellow-300", border: "border-yellow-500/10", label: "Low Risk" };
      default:
        return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "Safe" };
    }
  };

  // Details drawer calculations
  const recommendedVersion = selectedPkg?.vulnerabilities?.find(v => v.fixVersion)?.fixVersion;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-0">
      {/* Upper Navigation & Back Trigger */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all font-medium text-sm cursor-pointer"
          id="back-to-scan-btn"
        >
          ← New Search
        </button>
        <span className="text-zinc-500 text-sm font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Threat Intelligence Active
        </span>
      </div>

      <h1 className="text-3xl font-sans font-bold tracking-tight text-white mb-8 flex items-center gap-3">
        <Shield className="w-8 h-8 text-indigo-500" />
        Dependency Scan Results
      </h1>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Total Packages */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col justify-between" id="kpi-total-packages">
          <span className="text-zinc-500 text-sm font-medium">Total Dependencies</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-4xl font-sans font-bold text-white tracking-tight">{summary.total}</span>
            <span className="text-xs font-mono text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-700/50">Packages</span>
          </div>
        </div>

        {/* Vulnerable */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col justify-between" id="kpi-vulnerable">
          <span className="text-zinc-500 text-sm font-medium">Vulnerable Packages</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className={`text-4xl font-sans font-bold tracking-tight ${summary.vulnerable > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {summary.vulnerable}
            </span>
            <ShieldAlert className={`w-5 h-5 ${summary.vulnerable > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
          </div>
        </div>

        {/* Malware Flagged */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col justify-between" id="kpi-malware">
          <span className="text-zinc-500 text-sm font-medium">Malware Risk Found</span>
          <div className="flex items-baseline justify-between mt-3">
            <span className={`text-4xl font-sans font-bold tracking-tight ${summary.malicious > 0 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>
              {summary.malicious}
            </span>
            <AlertTriangle className={`w-5 h-5 ${summary.malicious > 0 ? 'text-rose-500' : 'text-emerald-400'}`} />
          </div>
        </div>

        {/* Average Risk Score (Dial Gauge!) */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex items-center justify-between" id="kpi-risk-dial">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-500 text-sm font-medium">Avg Risk Score</span>
            <span className="text-xs text-zinc-400 mt-1">Weighted composite</span>
          </div>
          <div className="relative flex items-center justify-center">
            <svg className="w-18 h-18 transform -rotate-90">
              <circle cx="36" cy="36" r={radius} stroke="#27272a" strokeWidth="6" fill="transparent" />
              <circle 
                cx="36" 
                cy="36" 
                r={radius} 
                stroke={avgScore > 50 ? "#f43f5e" : avgScore > 20 ? "#f59e0b" : "#10b981"} 
                strokeWidth="6" 
                fill="transparent" 
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-lg font-sans font-extrabold text-white">{avgScore}</span>
              <span className="text-[9px] block text-zinc-500 leading-none">/100</span>
            </div>
          </div>
        </div>

        {/* Distribution overview summary */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col justify-between" id="kpi-distribution">
          <span className="text-zinc-500 text-sm font-medium border-b border-zinc-800 pb-2">Risk Breakdown</span>
          <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-red-400 font-medium">{summary.riskDistribution?.critical || 0}</span>
              <span className="text-zinc-500 text-[10px]">Crit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-rose-400 font-medium">{summary.riskDistribution?.high || 0}</span>
              <span className="text-zinc-500 text-[10px]">High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-amber-400 font-medium">{summary.riskDistribution?.medium || 0}</span>
              <span className="text-zinc-500 text-[10px]">Med</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-emerald-400 font-medium">
                {(summary.riskDistribution?.safe || 0) + (summary.riskDistribution?.low || 0)}
              </span>
              <span className="text-zinc-500 text-[10px]">Safe</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table List View & Filter Bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-12">
        <div className="px-6 py-5 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950/40">
          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 text-sm">
            {[
              ["all", `All (${packages.length})`],
              ["vulnerable", `Vulnerable (${packages.filter(r => r.vulnerabilities?.length > 0).length})`],
              ["malware", `Malware (${packages.filter(r => r.malwareResult?.isMalicious).length})`],
              ["risky", `Risky ≥40 (${packages.filter(r => (r.marshalScore?.compositeScore || 0) >= 40).length})`]
            ].map(([tab, label]) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                    active 
                      ? "bg-zinc-800 border-zinc-700 text-white shadow-inner" 
                      : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200"
                  }`}
                  id={`tab-filter-${tab}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="relative w-full max-w-sm">
            <input
              type="text"
              placeholder="Filter by package name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              id="package-search-input"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="absolute right-3 top-2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/20 text-xs text-zinc-500 uppercase tracking-wider font-mono">
                <th className="py-4 px-6 font-semibold cursor-pointer select-none" onClick={() => handleSort('name')}>
                  Package Name {sortArrow('name')}
                </th>
                <th className="py-4 px-6 font-semibold">Version</th>
                <th className="py-4 px-6 font-semibold">Ecosystem</th>
                <th className="py-4 px-6 font-semibold cursor-pointer select-none" onClick={() => handleSort('vulns')}>
                  Vulns {sortArrow('vulns')}
                </th>
                <th className="py-4 px-6 font-semibold">Malware Warning</th>
                <th className="py-4 px-6 font-semibold cursor-pointer select-none" onClick={() => handleSort('score')}>
                  Risk Score {sortArrow('score')}
                </th>
                <th className="py-4 px-4 font-semibold text-right">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans text-sm">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-550 text-zinc-500">
                    <ShieldCheck className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    No packages match the filter parameters.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report, idx) => {
                  const riskStyle = getRiskLevelStyle(report.marshalScore?.riskLevel);
                  const isSelected = selectedPkg?.package?.name === report.package?.name;
                  const score = report.marshalScore?.compositeScore ?? 0;
                  return (
                    <tr 
                      key={idx}
                      onClick={() => setSelectedPkg(report)}
                      className={`hover:bg-zinc-800/40 cursor-pointer transition-all ${isSelected ? 'bg-indigo-500/5' : ''}`}
                      id={`package-row-${report.package?.name}`}
                    >
                      {/* Name */}
                      <td className="py-4 px-6 font-medium text-white flex items-center gap-1.5">
                        <span className="font-mono">{report.package?.name}</span>
                        {report.malwareResult?.isMalicious && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse" title="Security Malware alert!" />
                        )}
                        {report.package?.isDev && (
                          <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-750 rounded uppercase tracking-wide">
                            dev
                          </span>
                        )}
                      </td>

                      {/* Version */}
                      <td className="py-4 px-6 font-mono text-zinc-400 text-xs">
                        {report.package?.version || "latest"}
                      </td>

                      {/* Ecosystem */}
                      <td className="py-4 px-6">
                        {renderEcosystemBadge(report.package?.ecosystem)}
                      </td>

                      {/* Vulns Count */}
                      <td className="py-4 px-6 font-mono">
                        {report.vulnerabilities?.length > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-xs border border-amber-500/20 font-bold">
                            {report.vulnerabilities.length}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Malware Warn */}
                      <td className="py-4 px-6">
                        {report.malwareResult?.isMalicious ? (
                          <span className="flex items-center gap-1 text-xs text-rose-500 font-semibold font-sans bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 max-w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            MALWARE
                          </span>
                        ) : report.malwareResult?.hasMaliciousVersions ? (
                          <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold font-sans bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 max-w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            MALWARE RISK
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Risk Score */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold text-sm ${score >= 75 ? 'text-rose-400' : score >= 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {score}
                          </span>
                          <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                score >= 75 ? 'bg-rose-500' : score >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`} 
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Risk Level Badge */}
                      <td className="py-4 px-4 text-right">
                        <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full border ${riskStyle.bg} ${riskStyle.text} ${riskStyle.border}`}>
                          {riskStyle.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Details Sliding Drawer (AnimatePresence) */}
      <AnimatePresence>
        {selectedPkg && (
          <>
            {/* Backdrop cover overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPkg(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40"
            />

            {/* Sidebar drawer block */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg md:max-w-xl bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 overflow-y-auto flex flex-col"
              id="security-drawer-root"
            >
              {/* Header drawer controls */}
              <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-zinc-400 font-mono text-sm">Dependency Intel</span>
                    {renderEcosystemBadge(selectedPkg.package?.ecosystem)}
                  </div>
                  <h2 className="text-2xl font-mono font-bold text-white tracking-tight">{selectedPkg.package?.name}</h2>
                  <p className="text-zinc-500 text-xs mt-0.5">Matched analyzed version: {selectedPkg.package?.version || "latest"}</p>
                </div>
                <button 
                  onClick={() => setSelectedPkg(null)}
                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
                  id="close-drawer-btn"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body details */}
              <div className="p-6 flex-1 space-y-6">
                
                {/* Malware Risk Warning Banner */}
                {selectedPkg.malwareResult?.isMalicious ? (
                  <div className="p-4 bg-red-950/40 border border-red-500/20 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm">
                      <AlertTriangle className="w-5 h-5" />
                      MALWARE INFECTION DETECTED
                    </div>
                    <p className="text-zinc-300 text-xs font-sans leading-relaxed">
                      {selectedPkg.malwareResult.description || "This package is flagged as malware and poses severe threat to execution environments."}
                    </p>
                    {selectedPkg.malwareResult.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedPkg.malwareResult.tags.map((tag, i) => (
                          <span key={i} className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : selectedPkg.malwareResult?.hasMaliciousVersions ? (
                  <div className="p-4 bg-amber-950/40 border border-amber-500/20 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                      <AlertTriangle className="w-5 h-5" />
                      MALWARE HISTORY DETECTED
                    </div>
                    <p className="text-zinc-300 text-xs font-sans leading-relaxed">
                      Specific versions of this package are known to contain malware. The current version you are scanning is safe, but be careful with package resolutions.
                    </p>
                    <div className="space-y-1.5 mt-2">
                      <div className="text-[11px] text-zinc-400 font-mono font-semibold uppercase">Affected Versions:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPkg.malwareResult.knownMaliciousVersions?.map((v, i) => (
                          <span key={i} className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Score Dial & Health Indexes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Gauge representation */}
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col items-center justify-center text-center md:col-span-1">
                    <span className="text-zinc-400 text-xs mb-2 font-medium">Calculated Risk Index</span>
                    <div className="relative flex items-center justify-center">
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle cx="48" cy="48" r="38" stroke="#27272a" strokeWidth="6" fill="transparent" />
                        <circle 
                          cx="48" 
                          cy="48" 
                          r="38" 
                          stroke={selectedPkg.marshalScore?.compositeScore > 50 ? "#f43f5e" : selectedPkg.marshalScore?.compositeScore > 20 ? "#eab308" : "#10b981"} 
                          strokeWidth="6" 
                          fill="transparent" 
                          strokeDasharray={2 * Math.PI * 38}
                          strokeDashoffset={2 * Math.PI * 38 - ((selectedPkg.marshalScore?.compositeScore || 0) / 100) * (2 * Math.PI * 38)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-2xl font-extrabold text-white">{selectedPkg.marshalScore?.compositeScore || 0}</span>
                        <span className="text-[10px] block text-zinc-500 font-mono">/100</span>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold mt-3 px-2 py-0.5 rounded-full capitalize ${
                      (selectedPkg.marshalScore?.compositeScore || 0) > 50 ? 'bg-red-500/10 text-red-400' : (selectedPkg.marshalScore?.compositeScore || 0) > 20 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {selectedPkg.marshalScore?.riskLevel || "safe"} Risk
                    </span>
                  </div>

                  {/* Health indexes info values */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:col-span-2">
                    {selectedPkg.marshalScore?.signals?.map(signal => (
                      <div key={signal.name} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex flex-col justify-between gap-1">
                        <div className="flex items-center justify-between text-zinc-400 font-semibold text-xs">
                          <span className="flex items-center gap-1.5">
                            <span>{SIGNAL_ICONS[signal.name] || '📋'}</span>
                            <span className="capitalize">{signal.name}</span>
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${getLevelBadgeClass(signal.level)}`}>
                            {signal.score}
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-300 leading-relaxed font-medium mt-1">
                          {signal.verdict}
                        </span>
                        <div className="w-full h-1 bg-zinc-800 rounded-full mt-2">
                          <div className={`h-full rounded-full ${getLevelBarColor(signal.level)}`} style={{ width: `${signal.score}%` }} />
                        </div>
                      </div>
                    ))}
                    {!selectedPkg.marshalScore?.signals?.length && (
                      <div className="text-zinc-500 text-xs italic text-center py-6 col-span-2">
                        No metadata health signals returned
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommendations & Fix actions */}
                <div className="space-y-3 bg-zinc-900 border border-indigo-500/10 p-5 rounded-xl">
                  <h3 className="text-sm font-semibold text-indigo-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    Security Recommendations
                  </h3>
                  <p className="text-zinc-300 text-xs leading-relaxed font-sans">
                    {selectedPkg.vulnerabilities?.length > 0 
                      ? `This package version contains ${selectedPkg.vulnerabilities.length} active vulnerabilities. Upgrade is highly recommended.`
                      : selectedPkg.malwareResult?.isMalicious
                      ? "Do not use this package version. Remove dependency immediately."
                      : "Your package version has no critical security vulnerability reports. Standard version updates are recommended."}
                  </p>

                  {/* Copy Fix execution panel */}
                  {recommendedVersion && (
                    <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
                      <span className="text-zinc-500 text-[11px] uppercase tracking-wider font-semibold block">Terminal Quick Fix Command</span>
                      <div className="flex items-center gap-2 bg-zinc-950 px-3.5 py-2.5 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-300 relative justify-between">
                        <span className="truncate pr-4">
                          {selectedPkg.package?.ecosystem === "npm" ? `npm i ${selectedPkg.package.name}@${recommendedVersion}` : 
                           selectedPkg.package?.ecosystem === "PyPI" || selectedPkg.package?.ecosystem === "pip" ? `pip install --upgrade ${selectedPkg.package.name}==${recommendedVersion}` : 
                           selectedPkg.package?.ecosystem === "Go" || selectedPkg.package?.ecosystem === "go" ? `go get ${selectedPkg.package.name}@v${recommendedVersion}` : 
                           `upgrade build configuration properties to ${recommendedVersion}`}
                        </span>
                        <button 
                          onClick={() => {
                            const cmd = selectedPkg.package?.ecosystem === "npm" ? `npm i ${selectedPkg.package.name}@${recommendedVersion}` : 
                            selectedPkg.package?.ecosystem === "PyPI" || selectedPkg.package?.ecosystem === "pip" ? `pip install --upgrade ${selectedPkg.package.name}==${recommendedVersion}` : 
                            selectedPkg.package?.ecosystem === "Go" || selectedPkg.package?.ecosystem === "go" ? `go get ${selectedPkg.package.name}@v${recommendedVersion}` : 
                            recommendedVersion;
                            copyToClipboard(cmd, "patch_cmd");
                          }}
                          className="text-zinc-500 hover:text-indigo-400 p-1 cursor-pointer absolute right-2"
                          title="Copy fix command"
                          id="copy-command-btn"
                        >
                          {copiedId === "patch_cmd" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Vulnerability list section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                      Vulnerability Reports ({selectedPkg.vulnerabilities?.length || 0})
                    </h3>
                    <span className="text-[11px] text-zinc-500 font-mono">Source: OSV database</span>
                  </div>

                  {!selectedPkg.vulnerabilities?.length ? (
                    <div className="py-6 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                      <ShieldCheck className="w-8 h-8 text-emerald-400/20 mx-auto mb-2" />
                      Clean Report — No CVEs flagged for this matched version
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedPkg.vulnerabilities.map((vuln, vIdx) => {
                        const sevColors = {
                          CRITICAL: "bg-red-500/10 text-red-400 border-red-500/20",
                          HIGH: "bg-rose-500/10 text-rose-400 border-rose-500/20",
                          MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                          MODERATE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
                          LOW: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
                        };

                        const severity = vuln.severity || "MEDIUM";

                        return (
                          <div 
                            key={vIdx} 
                            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-all"
                            id={`vuln-item-${vuln.id}`}
                          >
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <span className="text-zinc-200 font-mono text-sm font-semibold">{vuln.id}</span>
                                <div className="text-zinc-500 text-[10px] mt-0.5 space-x-1.5">
                                  {vuln.affectedRange && <span>Affected: <span className="font-mono text-zinc-300">{vuln.affectedRange}</span></span>}
                                  {vuln.fixVersion && (
                                    <>
                                      <span>•</span>
                                      <span>Fixed: <span className="font-mono text-indigo-400">{vuln.fixVersion}</span></span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sevColors[severity] || sevColors.MEDIUM}`}>
                                {severity}
                              </span>
                            </div>
                            <p className="text-zinc-400 text-xs leading-relaxed font-sans">{vuln.summary || vuln.description}</p>
                            {vuln.advisoryUrl && (
                              <a 
                                href={vuln.advisoryUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-[11px] text-indigo-400 hover:underline mt-2 inline-flex items-center gap-1 font-medium"
                              >
                                Advisory Details <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
