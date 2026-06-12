package marshal

import (
	"github.com/lawvia/depintel/model"
)

// analyzeReadme scores a package based on README/documentation quality.
func analyzeReadme(meta *model.PackageMetadata) model.SignalResult {
	result := model.SignalResult{
		Name:   "readme",
		Weight: signalWeights["readme"],
	}

	if meta.NotFound {
		result.Score = 100
		result.Level = "critical"
		result.Verdict = "Package not found in registry — no documentation available"
		result.Details = map[string]any{"notFound": true, "hasReadme": false, "length": 0}
		return result
	}

	if !meta.HasReadme || meta.ReadmeLength == 0 {
		// Fallback check: registry API occasionally returns empty readme due to sync lags or package size (e.g. express).
		// If description, homepage, or repository fields are present, we classify it as safe.
		if meta.Description != "" && (meta.Homepage != "" || meta.Repository != "") {
			result.Score = 15
			result.Level = "safe"
			result.Verdict = "Registry readme payload is empty, but package has description and project links"
			result.Details = map[string]any{"hasReadme": false, "length": 0, "fallbackSafe": true}
			return result
		}

		result.Score = 90
		result.Level = "critical"
		result.Verdict = "No documentation, description, or project links — highly suspicious"
		result.Details = map[string]any{"hasReadme": false, "length": 0}
		return result
	}

	length := meta.ReadmeLength

	switch {
	case length < 100:
		result.Score = 65
		result.Level = "high"
		result.Verdict = "Minimal documentation — less than 100 characters"
	case length < 500:
		result.Score = 35
		result.Level = "medium"
		result.Verdict = "Basic documentation"
	case length < 2000:
		result.Score = 15
		result.Level = "safe"
		result.Verdict = "Reasonable documentation"
	default:
		result.Score = 5
		result.Level = "safe"
		result.Verdict = "Well documented package"
	}

	result.Details = map[string]any{
		"hasReadme": true,
		"length":    length,
	}

	return result
}
