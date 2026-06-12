import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  Search, 
  Code, 
  Terminal, 
  Play, 
  Lightbulb, 
  Zap, 
  Flame, 
  Bug 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { scanManifest, scanPackage } from '../services/api';

const SAMPLES = [
  {
    name: "Web App Stack (Vulnerable Node)",
    ecosystem: "package.json",
    filename: "package.json",
    content: `{
  "name": "corporate-portal",
  "version": "1.2.0",
  "dependencies": {
    "axios": "^1.5.0",
    "lodash": "^4.17.15",
    "express": "4.18.2",
    "jsonwebtoken": "9.0.0",
    "tailwiind-css": "1.0.2",
    "minimist": "1.2.0"
  },
  "devDependencies": {
    "nodemon": "2.0.1"
  }
}`
  },
  {
    name: "AI & ML Pipeline (Python requirements)",
    ecosystem: "requirements.txt",
    filename: "requirements.txt",
    content: `# Security Threat Intel Testing Requirements
requests==2.28.1
urllib3==1.26.14
numpy==1.22.0
django==4.1.2
pyyaml==5.3.1
jinja2==3.0.1
`
  },
  {
    name: "Cloud Backend Router (Go Modules)",
    ecosystem: "go.mod",
    filename: "go.mod",
    content: `module github.com/enterprise/backend-router

go 1.20

require (
	github.com/gin-gonic/gin v1.9.0
	github.com/golang-jwt/jwt/v4 v4.4.2
	google.golang.org/protobuf v1.28.1
	gopkg.in/yaml.v3 v3.0.0
)
`
  },
  {
    name: "Rust Library (Cargo Manifest)",
    ecosystem: "Cargo.toml",
    filename: "Cargo.toml",
    content: `[package]
name = "secure-auth"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1.28", features = ["full"] }
rand = "0.8.5"
`
  }
];

const TRENDING_CVE_FEED = [
  {
    id: "CVE-2024-4367",
    pkg: "pdfjs-dist",
    eco: "npm",
    severity: "CRITICAL",
    desc: "Arbitrary JavaScript execution vulnerability inside standard PDF readers using unvalidated font graphics objects.",
    patchedIn: "4.2.67"
  },
  {
    id: "CVE-2023-45857",
    pkg: "urllib3",
    eco: "PyPI",
    severity: "HIGH",
    desc: "Cookie leaked across cross-site redirects. Session authentication tokens are exposed to third parties automatically.",
    patchedIn: "2.0.7"
  },
  {
    id: "CVE-2023-49569",
    pkg: "github.com/go-git/go-git/v5",
    eco: "Go",
    severity: "HIGH",
    desc: "Path traversal vulnerability during checkout allowing arbitrary file writes on system.",
    patchedIn: "5.11.0"
  },
  {
    id: "CVE-2023-26159",
    pkg: "follow-redirects",
    eco: "npm",
    severity: "HIGH",
    desc: "Improper Input Validation causing Server-Side Request Forgery vulnerability of core node HTTP network requests.",
    patchedIn: "1.15.4"
  }
];

const LOADING_LOGS = [
  "Spinning dependency intel thread workers...",
  "Reaching out to secure OSV and Vulndb security proxies...",
  "Injecting metadata heuristical analyzer engines...",
  "Detecting active package dependencies...",
  "Evaluating package maturity factor indices...",
  "Aggregating vulnerability mitigations and recommended patches..."
];

export default function HomePage({ onScanComplete }) {
  const navigate = useNavigate();

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState(null);

  // Single package form states
  const [singleEcosystem, setSingleEcosystem] = useState("npm");
  const [singlePackage, setSinglePackage] = useState("");
  const [singleVersion, setSingleVersion] = useState("");

  // Manifest form states
  const [manifestFormat, setManifestFormat] = useState("");
  const [manifestContent, setManifestContent] = useState("");

  const ecosystemsList = [
    { id: "npm", label: "NPM (Node.js)", icon: "📦" },
    { id: "PyPI", label: "PyPI (Python)", icon: "🐍" },
    { id: "Go", label: "Go Modules (Go)", icon: "🐹" },
    { id: "crates.io", label: "Cargo (Rust)", icon: "🦀" },
  ];

  // Helper to load simulated developer micro steps
  const triggerLoadingAnimation = (callback) => {
    setLoading(true);
    setError(null);
    setLoadingStep(0);

    const logInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < LOADING_LOGS.length - 1) {
          return prev + 1;
        }
        clearInterval(logInterval);
        return prev;
      });
    }, 400);

    return () => clearInterval(logInterval);
  };

  const handleScanPackage = async (e) => {
    e.preventDefault();
    if (!singlePackage.trim()) return;

    const clearLog = triggerLoadingAnimation();

    try {
      const result = await scanPackage(singlePackage.trim(), singleVersion.trim(), singleEcosystem);
      onScanComplete({
        summary: {
          total: 1,
          vulnerable: result.vulnerabilities?.length > 0 ? 1 : 0,
          malicious: result.malwareResult?.isMalicious ? 1 : 0,
          riskDistribution: { [result.marshalScore?.riskLevel || 'safe']: 1 }
        },
        results: [result],
      });
      clearLog();
      setLoading(false);
      navigate('/results');
    } catch (err) {
      clearLog();
      setLoading(false);
      setError(err.message);
    }
  };

  const handleScanManifest = async (e) => {
    e.preventDefault();
    if (!manifestContent.trim()) return;

    const clearLog = triggerLoadingAnimation();

    try {
      const results = await scanManifest(manifestContent, manifestFormat);
      onScanComplete(results);
      clearLog();
      setLoading(false);
      navigate('/results');
    } catch (err) {
      clearLog();
      setLoading(false);
      setError(err.message);
    }
  };

  const loadSample = (sample) => {
    setManifestFormat(sample.ecosystem);
    setManifestContent(sample.content);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading-terminal"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-2xl mx-auto py-10"
            id="scanning-loading-stage"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <span className="font-mono text-sm text-zinc-300 font-bold">Dependency Intel Parser Engine</span>
                </div>
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/50"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></span>
                </div>
              </div>

              <div className="flex items-center justify-center py-4">
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-indigo-500 animate-spin"></div>
                  <div className="absolute font-mono text-xs font-bold text-zinc-300">
                    {Math.min(99, Math.round(((loadingStep + 1) / LOADING_LOGS.length) * 100))}%
                  </div>
                </div>
              </div>

              <div className="space-y-2 bg-zinc-950 p-4 rounded-lg font-mono text-xs border border-zinc-850 h-40 overflow-y-auto">
                {LOADING_LOGS.slice(0, loadingStep + 1).map((log, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-zinc-400"
                  >
                    <span className="text-zinc-600">[{10 + i * 14}s]</span>
                    <span className={i === loadingStep ? "text-indigo-400" : "text-zinc-500"}>
                      {i === loadingStep ? "▶" : "✔"} {log}
                    </span>
                  </motion.div>
                ))}
              </div>
              <p className="text-center text-zinc-500 text-xs font-sans">
                Analyzing repository patterns against real-world CVE repositories. Please wait...
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="input-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-10"
          >
            {/* Eye-catching clean landing intro wrapper */}
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono font-semibold uppercase tracking-wider inline-block">
                Advanced Supply-Chain Intelligence
              </span>
              <h1 className="text-4xl sm:text-5xl font-sans font-extrabold tracking-tight text-white leading-none">
                Vulnerability & Malware Intel
              </h1>
              <p className="text-zinc-400 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
                Evaluate direct package threats, security patch trajectories, typosquatting risks, and malware flags across ecosystems.
              </p>
            </div>

            {/* General Custom Scan Errors notification code */}
            {error && (
              <div className="p-4 bg-red-950/40 border border-red-500/20 rounded-xl flex items-start gap-3" id="scan-error-block">
                <Bug className="w-5 h-5 text-rose-400 mt-0.5" />
                <div>
                  <h5 className="text-sm font-semibold text-rose-400">Analysis Error occurred</h5>
                  <p className="text-xs text-zinc-400 mt-0.5">{error}</p>
                  <button 
                    onClick={() => setError(null)}
                    className="text-xs text-red-400/80 underline mt-1.5 hover:text-red-400 block"
                  >
                    Dismiss error
                  </button>
                </div>
              </div>
            )}

            {/* Segment A: Primary Prominent Search Single Package */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl" id="box-single-search">
              <div className="bg-gradient-to-r from-indigo-950/20 to-purple-950/20 px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-sans font-semibold text-sm text-white uppercase tracking-wider">Search Package Intel</h3>
                </div>
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono uppercase font-bold">
                  Real-time
                </span>
              </div>

              <form onSubmit={handleScanPackage} className="p-6 space-y-6">
                {/* Ecosystem Selector Pill strip */}
                <div>
                  <label className="text-zinc-400 text-xs font-semibold block mb-2 font-sans">
                    1. Match Repository Ecosystem
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ecosystemsList.map((eco) => {
                      const selected = singleEcosystem === eco.id;
                      return (
                        <button
                          key={eco.id}
                          type="button"
                          onClick={() => setSingleEcosystem(eco.id)}
                          className={`px-4 py-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                            selected 
                              ? "bg-indigo-500/10 border-indigo-500 text-indigo-400 shadow-lg" 
                              : "bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                          }`}
                          id={`eco-pill-${eco.id}`}
                        >
                          <span className="text-lg">{eco.icon}</span>
                          <span className="text-xs font-semibold mt-2">{eco.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Core Inputs layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-zinc-400 text-xs font-semibold block mb-1.5">
                      2. Dependency Package Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        singleEcosystem === "npm" ? "e.g., lodash, axios, tailwiind-css (typosquat test)" :
                        singleEcosystem === "PyPI" ? "e.g., requests, django, urllib3" :
                        singleEcosystem === "Go" ? "e.g., github.com/gin-gonic/gin" : "e.g., rand, serde"
                      }
                      value={singlePackage}
                      onChange={(e) => setSinglePackage(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                      id="single-package-name-input"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-400 text-xs font-semibold block mb-1.5">
                      3. Version <span className="text-zinc-600">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 4.17.15, latest"
                      value={singleVersion}
                      onChange={(e) => setSingleVersion(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm placeholder-zinc-650 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-zinc-100"
                      id="single-package-version-input"
                    />
                  </div>
                </div>

                <div className="flex md:items-center justify-between gap-4 pt-2 border-t border-zinc-800 flex-col md:flex-row">
                  <span className="text-zinc-500 text-xs font-sans flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-500/80" />
                    Try typosquatting testing! Search for <code className="text-indigo-400 bg-zinc-950 px-1 py-0.2 rounded">tailwiind-css</code>.
                  </span>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer"
                    id="submit-single-scan"
                  >
                    <Search className="w-4 h-4" />
                    Query Package Security
                  </button>
                </div>
              </form>
            </div>

            {/* Segment B: Paste Manifest File below searching single package */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl" id="box-manifest-paste">
              <div className="px-6 py-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950/20">
                <div className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="font-sans font-semibold text-sm text-white uppercase tracking-wider">Project Manifest Scanner</h3>
                    <p className="text-[10px] text-zinc-550 text-zinc-400">Scan package.json, requirements.txt, go.mod, or Cargo.toml</p>
                  </div>
                </div>

                {/* Auto detect vs strict select */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-400">Ecosystem:</span>
                  <select
                    value={manifestFormat}
                    onChange={(e) => setManifestFormat(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-lg text-zinc-300 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                    id="manifest-eco-select"
                  >
                    <option value="">✨ Auto-Detect Ecosystem</option>
                    <option value="package.json">NPM (package.json)</option>
                    <option value="requirements.txt">Python (requirements.txt)</option>
                    <option value="go.mod">Go Module (go.mod)</option>
                    <option value="Cargo.toml">Cargo Rust (Cargo.toml)</option>
                  </select>
                </div>
              </div>

              <form onSubmit={handleScanManifest} className="p-6 space-y-6">
                {/* Template quick selects */}
                <div>
                  <span className="text-zinc-500 text-xs font-semibold block mb-2 uppercase tracking-wide">
                    Select Demo Project Profiles To Scan Automatically
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {SAMPLES.map((sample, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => loadSample(sample)}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-950 text-xs text-zinc-400 border border-zinc-800 hover:bg-zinc-800/60 hover:text-white transition-all font-mono cursor-pointer"
                        id={`manifest-template-btn-${sample.filename}`}
                      >
                        📄 {sample.name} ({sample.filename})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content area */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-semibold font-sans">Raw Manifest File Code</span>
                    {manifestContent && (
                      <button 
                        type="button" 
                        onClick={() => setManifestContent("")}
                        className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
                      >
                        Clear Code
                      </button>
                    )}
                  </div>
                  <textarea
                    required
                    rows={8}
                    placeholder="Paste details of package.json, requirements.txt, go.mod, or Cargo.toml here..."
                    value={manifestContent}
                    onChange={(e) => setManifestContent(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-zinc-350 placeholder-zinc-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono leading-relaxed text-zinc-200"
                    id="manifest-textarea"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5" />
                    Manifest is parsed fully client & server-side
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white font-semibold text-sm transition-all shadow flex items-center justify-center gap-2 cursor-pointer"
                    id="submit-manifest-scan"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Launch Project Scan
                  </button>
                </div>
              </form>
            </div>

            {/* Trending security vulnerability CVE updates */}
            <div className="space-y-4" id="trending-feed-block">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h3 className="text-xs font-mono font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Trending Threat Intelligence feed
                </h3>
                <span className="text-xs text-zinc-650 text-zinc-500 font-mono">Live threat database</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TRENDING_CVE_FEED.map((cve) => {
                  const ecoStyles = {
                    npm: "text-red-400 bg-red-400/5 border-red-500/10",
                    PyPI: "text-blue-400 bg-blue-400/5 border-blue-500/10",
                    Go: "text-cyan-400 bg-cyan-400/5 border-cyan-500/10",
                  };
                  return (
                    <div 
                      key={cve.id}
                      className="p-4 bg-zinc-900 border border-zinc-800/80 rounded-xl flex flex-col justify-between hover:border-zinc-700 transition-all cursor-pointer"
                      onClick={() => {
                        // Quick load single package scan from feed
                        setSingleEcosystem(cve.eco);
                        setSinglePackage(cve.pkg);
                        setSingleVersion(cve.patchedIn);
                        // Scroll up to search block
                        document.getElementById("box-single-search")?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      id={`trending-item-${cve.id}`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-rose-400 font-bold font-mono text-xs bg-rose-500/5 border border-rose-500/10 px-2 py-0.5 rounded">
                            {cve.id}
                          </span>
                          <span className={`text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded border ${ecoStyles[cve.eco] || "text-zinc-400 border-zinc-800"}`}>
                            {cve.eco}
                          </span>
                        </div>

                        <span className="text-white font-bold text-sm block mb-1 font-mono">{cve.pkg}</span>
                        <p className="text-zinc-550 text-zinc-400 text-xs font-sans leading-relaxed line-clamp-2">{cve.desc}</p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-zinc-800/50 flex justify-between items-center text-[11px] text-zinc-400 font-mono font-medium">
                        <span className="text-indigo-400">View Live Analysis →</span>
                        <span className="text-zinc-500">Patched in: v{cve.patchedIn}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
