package model

// ManifestInput represents the raw pasted manifest content from the user.
type ManifestInput struct {
	Content string `json:"content"` // Raw pasted manifest text
	Format  string `json:"format"`  // "package.json" | "go.mod" | "requirements.txt" | "Cargo.toml" | "" (auto-detect)
}

// ParsedPackage represents a single parsed dependency from a manifest.
type ParsedPackage struct {
	Name      string `json:"name"`
	Version   string `json:"version"`
	Ecosystem string `json:"ecosystem"` // "npm" | "PyPI" | "Go" | "crates.io"
	IsDev     bool   `json:"isDev,omitempty"`
}

// ScanRequest is the request body for single-package scan.
type ScanRequest struct {
	Name      string `json:"name"`
	Version   string `json:"version"`
	Ecosystem string `json:"ecosystem"`
}

// ScanResult represents the full analysis result for a single package.
type ScanResult struct {
	Package         ParsedPackage  `json:"package"`
	Vulnerabilities []Vulnerability `json:"vulnerabilities"`
	MalwareResult   *MalwareResult  `json:"malwareResult,omitempty"`
	MarshalScore    *MarshalResult  `json:"marshalScore,omitempty"`
}

// ScanSummary provides aggregate stats for a batch scan.
type ScanSummary struct {
	Total            int            `json:"total"`
	Vulnerable       int            `json:"vulnerable"`
	Malicious        int            `json:"malicious"`
	RiskDistribution map[string]int `json:"riskDistribution"` // "critical" | "high" | "medium" | "low" | "safe"
}

// ScanResponse is the response for a batch scan.
type ScanResponse struct {
	Summary ScanSummary  `json:"summary"`
	Results []ScanResult `json:"results"`
}

// Vulnerability represents a known CVE or advisory from OSV/deps.dev.
type Vulnerability struct {
	ID            string   `json:"id"`
	Summary       string   `json:"summary"`
	Severity      string   `json:"severity"`      // "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
	CVSSScore     float64  `json:"cvssScore"`
	AffectedRange string   `json:"affectedRange"`
	FixVersion    string   `json:"fixVersion"`
	AdvisoryURL   string   `json:"advisoryUrl"`
	Source        string   `json:"source"`         // "osv" | "osm" | "depsdev"
	Aliases       []string `json:"aliases,omitempty"`
}

// MalwareResult represents the OSM malware check result.
type MalwareResult struct {
	IsMalicious            bool     `json:"isMalicious"`
	ThreatCount            int      `json:"threatCount"`
	SeverityLevel          string   `json:"severityLevel,omitempty"`
	Description            string   `json:"description,omitempty"`
	Tags                   []string `json:"tags,omitempty"`
	Status                 string   `json:"status,omitempty"`
	FirstSeen              string   `json:"firstSeen,omitempty"`
	LastSeen               string   `json:"lastSeen,omitempty"`
	HasMaliciousVersions   bool     `json:"hasMaliciousVersions"`
	KnownMaliciousVersions []string `json:"knownMaliciousVersions,omitempty"`
}

// PackageMetadata holds enriched metadata from registry APIs.
type PackageMetadata struct {
	Name           string            `json:"name"`
	Ecosystem      string            `json:"ecosystem"`
	LatestVersion  string            `json:"latestVersion"`
	Description    string            `json:"description"`
	License        string            `json:"license"`
	Homepage       string            `json:"homepage"`
	Repository     string            `json:"repository"`
	Maintainers    []Maintainer      `json:"maintainers"`
	CreatedAt      string            `json:"createdAt"`
	UpdatedAt      string            `json:"updatedAt"`
	VersionCount   int               `json:"versionCount"`
	Versions       map[string]string `json:"versions,omitempty"` // version -> publish date
	Downloads      *DownloadStats    `json:"downloads,omitempty"`
	ReadmeLength   int               `json:"readmeLength"`
	HasReadme      bool              `json:"hasReadme"`
	NotFound       bool              `json:"notFound"` // true if the package doesn't exist in the registry (deleted/unpublished)
}

// Maintainer represents a package maintainer.
type Maintainer struct {
	Name  string `json:"name"`
	Email string `json:"email,omitempty"`
}

// DownloadStats holds download metrics.
type DownloadStats struct {
	LastMonth int `json:"lastMonth"`
	LastWeek  int `json:"lastWeek"`
	LastDay   int `json:"lastDay"`
}
