# 🛡️ DepIntel — Dependency Intelligence Platform

Scan, analyze, and score the health & security of your open-source dependencies.

<img width="952" height="608" alt="image" src="https://github.com/user-attachments/assets/da9cc033-e78e-4c89-9b67-a9b096e787f3" />
<img width="904" height="617" alt="image" src="https://github.com/user-attachments/assets/2a69e6ce-d34e-4726-aeef-64c13c9d956c" />
<img width="1327" height="823" alt="image" src="https://github.com/user-attachments/assets/c33688ab-b50f-448c-a239-444dee9e47a4" />
<img width="518" height="830" alt="image" src="https://github.com/user-attachments/assets/362dffb3-e0f8-4f9b-9399-5ef0c32a2e42" />


**Powered by:**
- **OSV.dev** — CVE vulnerability database
- **OpenSourceMalware** — Malware threat intelligence
- **Marshal Engine** — Custom heuristic risk scoring (age, author, downloads, readme, version, typosquat)

## Features

- 📋 **Paste & Scan** — Copy-paste your manifest file (package.json, go.mod, requirements.txt, Cargo.toml)
- 🔍 **Single Package Search** — Search any package by name across ecosystems
- 🦠 **Malware Detection** — Check against OpenSourceMalware's known-malicious package database
- 🎯 **Typosquatting Detection** — Flag packages with names suspiciously similar to popular ones
- 📊 **Risk Scoring** — 6 signal heuristic analysis with composite 0-100 score
- 🌐 **Multi-Ecosystem** — npm, PyPI, Go, Cargo

## Quick Start

### Local Development (No Docker)

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with your OSM_API_KEY

# 2. Start backend
cd server && go run main.go

# 3. Start frontend (in another terminal)
cd client && npm install && npm run dev

# 4. Open http://localhost:5173
```

Or use the Makefile:
```bash
make dev   # Starts both server and client concurrently
```

### Docker Compose

```bash
cp .env.example .env
# Edit .env with your OSM_API_KEY

docker compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8080
```

## Architecture

```
┌─────────────────────────┐     ┌──────────────────────────┐
│  Vite + React Frontend  │────▶│   Go Backend (chi)       │
│  :5173 (dev) / :3000    │     │   :8080                  │
└─────────────────────────┘     ├──────────────────────────┤
                                │  ┌─────────────────────┐ │
                                │  │ Manifest Parsers    │ │
                                │  │ (npm/go/pip/cargo)  │ │
                                │  └─────────────────────┘ │
                                │  ┌─────────────────────┐ │
                                │  │ OSV.dev Client      │ │──▶ api.osv.dev
                                │  └─────────────────────┘ │
                                │  ┌─────────────────────┐ │
                                │  │ OSM Client          │ │──▶ api.opensourcemalware.com
                                │  └─────────────────────┘ │
                                │  ┌─────────────────────┐ │
                                │  │ deps.dev Client     │ │──▶ api.deps.dev
                                │  └─────────────────────┘ │
                                │  ┌─────────────────────┐ │
                                │  │ Marshal Engine      │ │──▶ npm/PyPI registries
                                │  │ (6 risk signals)    │ │
                                │  └─────────────────────┘ │
                                └──────────────────────────┘
```

## Marshal Risk Signals

| Signal | Weight | What it checks |
|--------|--------|----------------|
| **Age** | 20% | How long the package has been published |
| **Author** | 20% | Maintainer count and credibility |
| **Downloads** | 20% | Monthly download volume |
| **README** | 10% | Documentation quality/existence |
| **Version** | 15% | Release count, pre-stable, abandoned |
| **Typosquat** | 15% | Name similarity to popular packages |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/scan/manifest` | Batch scan a pasted manifest |
| `POST` | `/api/scan/package` | Scan a single package |
| `GET` | `/api/package/{eco}/{name}` | Get package metadata + score |
| `GET` | `/api/package/{eco}/{name}/{ver}/vulns` | Get version vulnerabilities |
| `GET` | `/api/health` | Health check |

## Tech Stack

- **Backend**: Go 1.24, chi router, errgroup for concurrency
- **Frontend**: React 19, Vite 6, react-router-dom
- **APIs**: OSV.dev, OpenSourceMalware, deps.dev, npm Registry, PyPI, pypistats
- **Deploy**: Docker Compose (multi-stage builds)

## License

MIT
