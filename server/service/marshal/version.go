package marshal

import (
	"strings"
	"time"

	"github.com/lawvia/depintel/model"
)

// analyzeVersion scores a package based on version maturity and release history.
func analyzeVersion(meta *model.PackageMetadata, currentVersion string) model.SignalResult {
	result := model.SignalResult{
		Name:   "version",
		Weight: signalWeights["version"],
	}

	if meta.NotFound {
		result.Score = 100
		result.Level = "critical"
		result.Verdict = "Package not found in registry — no version history available"
		result.Details = map[string]any{"notFound": true}
		return result
	}

	versionCount := meta.VersionCount
	if versionCount == 0 && len(meta.Versions) > 0 {
		versionCount = len(meta.Versions)
	}

	// Check if pre-1.0
	isPreStable := strings.HasPrefix(currentVersion, "0.") || currentVersion == "0"

	// Check if abandoned (no release in 2+ years)
	isAbandoned := false
	if meta.UpdatedAt != "" {
		if t, err := time.Parse(time.RFC3339, meta.UpdatedAt); err == nil {
			if time.Since(t).Hours()/24 > 730 { // ~2 years
				isAbandoned = true
			}
		}
	}

	switch {
	case versionCount <= 1:
		result.Score = 80
		result.Level = "critical"
		result.Verdict = "Only a single release — early stage package"
	case isAbandoned:
		result.Score = 60
		result.Level = "high"
		result.Verdict = "No release in over 2 years — possibly abandoned"
	case isPreStable:
		result.Score = 50
		result.Level = "medium"
		result.Verdict = "Pre-stable version (0.x.x) — API may change"
	case versionCount < 5:
		result.Score = 35
		result.Level = "medium"
		result.Verdict = "Few releases — still in early stages"
	default:
		result.Score = 10
		result.Level = "safe"
		result.Verdict = "Mature package with regular releases"
	}

	result.Details = map[string]any{
		"currentVersion": currentVersion,
		"versionCount":   versionCount,
		"isPreStable":    isPreStable,
		"isAbandoned":    isAbandoned,
		"lastUpdated":    meta.UpdatedAt,
	}

	return result
}
