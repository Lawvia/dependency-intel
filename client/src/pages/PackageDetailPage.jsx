import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Users, 
  Download, 
  Copy, 
  Check, 
  ExternalLink,
  Bug
} from 'lucide-react';
import { scanPackage } from '../services/api';

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

export default function PackageDetailPage() {
  const { ecosystem, name } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

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

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-zinc-800 border-t-indigo-500 animate-spin"></div>
        <div className="font-mono text-sm text-zinc-400">Analyzing {name}...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-6">
        <Bug className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-xl font-bold text-white">Analysis Failed</h3>
        <p className="text-sm text-zinc-400">{error}</p>
        <button 
          className="px-6 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-semibold hover:bg-zinc-800 transition-all cursor-pointer"
          onClick={() => navigate('/')}
        >
          ← Go Back
        </button>
      </div>
    );
  }

  if (!result) return null;

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

  const recommendedVersion = result.vulnerabilities?.find(v => v.fixVersion)?.fixVersion;
  const score = result.marshalScore?.compositeScore || 0;

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Header Back Button & Meta */}
      <div className="flex items-center justify-between mb-8 border-b border-zinc-900 pb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all text-xs cursor-pointer"
          >
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-mono font-bold text-white leading-none">{result.package.name}</h1>
              {renderEcosystemBadge(result.package.ecosystem)}
            </div>
            <p className="text-zinc-500 text-xs mt-1.5">Parsed ecosystem version: {result.package.version || "latest"}</p>
          </div>
        </div>
        <span className="text-zinc-500 text-xs font-mono flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Standalone Query
        </span>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Score and Recommendations */}
        <div className="space-y-6">
          
          {/* Calculated Risk Index Card */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
            <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-4">Calculated Risk Index</span>
            <div className="relative flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="50" stroke="#27272a" strokeWidth="8" fill="transparent" />
                <circle 
                  cx="64" 
                  cy="64" 
                  r="50" 
                  stroke={score > 50 ? "#f43f5e" : score > 20 ? "#eab308" : "#10b981"} 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 - (score / 100) * (2 * Math.PI * 50)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-4xl font-extrabold text-white">{score}</span>
                <span className="text-xs block text-zinc-500">/100</span>
              </div>
            </div>
            <span className={`text-xs font-bold mt-4 px-3 py-1 rounded-full capitalize border ${
              score > 50 ? 'bg-red-500/10 text-red-400 border-red-500/20' : score > 20 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {result.marshalScore?.riskLevel || "safe"} Risk
            </span>
          </div>

          {/* Recommendations Card */}
          <div className="bg-zinc-900 border border-indigo-500/10 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-semibold text-indigo-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Security Recommendations
            </h3>
            <p className="text-zinc-350 text-xs leading-relaxed">
              {result.vulnerabilities?.length > 0 
                ? `This package contains ${result.vulnerabilities.length} active vulnerabilities. Upgrading to a patched version is highly recommended.`
                : result.malwareResult?.isMalicious 
                ? "Remove this dependency package immediately. Do not install." 
                : "Your package version has no critical security vulnerability reports. Standard version updates are recommended."}
            </p>

            {/* Quick upgrade execution command block */}
            {recommendedVersion && (
              <div className="pt-4 border-t border-zinc-800 space-y-2">
                <span className="text-zinc-500 text-[11px] uppercase tracking-wider font-semibold block">Terminal Quick Fix Command</span>
                <div className="flex items-center justify-between bg-zinc-950 px-3.5 py-2.5 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-350 relative">
                  <span className="truncate pr-8">
                    {result.package?.ecosystem === "npm" ? `npm i ${result.package.name}@${recommendedVersion}` : 
                     result.package?.ecosystem === "PyPI" || result.package?.ecosystem === "pip" ? `pip install --upgrade ${result.package.name}==${recommendedVersion}` : 
                     result.package?.ecosystem === "Go" || result.package?.ecosystem === "go" ? `go get ${result.package.name}@v${recommendedVersion}` : 
                     `upgrade version properties to ${recommendedVersion}`}
                  </span>
                  <button 
                    onClick={() => {
                      const cmd = result.package?.ecosystem === "npm" ? `npm i ${result.package.name}@${recommendedVersion}` : 
                      result.package?.ecosystem === "PyPI" || result.package?.ecosystem === "pip" ? `pip install --upgrade ${result.package.name}==${recommendedVersion}` : 
                      result.package?.ecosystem === "Go" || result.package?.ecosystem === "go" ? `go get ${result.package.name}@v${recommendedVersion}` : 
                      recommendedVersion;
                      copyToClipboard(cmd, "detail_fix");
                    }}
                    className="text-zinc-500 hover:text-indigo-400 p-1 cursor-pointer absolute right-2"
                    title="Copy fix command"
                  >
                    {copiedId === "detail_fix" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Column - Warnings, Heuristics, CVEs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Malware Infection Alert Banner */}
          {result.malwareResult?.isMalicious ? (
            <div className="p-5 bg-red-950/40 border border-red-500/20 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
                CRITICAL MALWARE DETECTED
              </div>
              <p className="text-zinc-300 text-xs leading-relaxed">
                {result.malwareResult.description || "This package is flagged as malware in the threat databases. Exclude immediately."}
              </p>
              {result.malwareResult.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {result.malwareResult.tags.map((tag, i) => (
                    <span key={i} className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : result.malwareResult?.hasMaliciousVersions ? (
            <div className="p-5 bg-amber-950/40 border border-amber-500/20 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                MALWARE HISTORY IN TARGET ECOSYSTEM
              </div>
              <p className="text-zinc-300 text-xs leading-relaxed">
                Specific versions of this package are known to contain malware. Ensure that version resolution constraints are locked and do not match the malicious scope.
              </p>
              <div className="space-y-1.5 mt-3">
                <div className="text-[11px] text-zinc-400 font-mono font-semibold uppercase">Known Malware Versions:</div>
                <div className="flex flex-wrap gap-1.5">
                  {result.malwareResult.knownMaliciousVersions?.map((v, i) => (
                    <span key={i} className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Dynamic Marshal Heuristics Signals */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider pl-1">Heuristics Signal metrics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.marshalScore?.signals?.map(signal => (
                <div key={signal.name} className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl flex flex-col justify-between gap-1">
                  <div className="flex items-center justify-between text-zinc-400 font-semibold text-xs">
                    <span className="flex items-center gap-1.5">
                      <span>{SIGNAL_ICONS[signal.name] || '📋'}</span>
                      <span className="capitalize">{signal.name}</span>
                    </span>
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${getLevelBadgeClass(signal.level)}`}>
                      {signal.score}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-300 font-medium leading-relaxed mt-1">{signal.verdict}</span>
                  <div className="w-full h-1 bg-zinc-800 rounded-full mt-2">
                    <div className={`h-full rounded-full ${getLevelBarColor(signal.level)}`} style={{ width: `${signal.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {!result.marshalScore?.signals?.length && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl py-8 text-center text-zinc-500 text-xs italic">
                No heuristic signals analyzed.
              </div>
            )}
          </div>

          {/* Vulnerability Report Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Vulnerability Reports ({result.vulnerabilities?.length || 0})
              </h3>
              <span className="text-[11px] text-zinc-500 font-mono">Source: OSV database</span>
            </div>

            {!result.vulnerabilities?.length ? (
              <div className="py-12 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-xs">
                <ShieldCheck className="w-10 h-10 text-emerald-400/25 mx-auto mb-3" />
                Clean Report — No active security vulnerabilities found.
              </div>
            ) : (
              <div className="space-y-3">
                {result.vulnerabilities.map((vuln, vIdx) => {
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

      </div>
    </div>
  );
}
