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

	if !meta.HasReadme || meta.ReadmeLength == 0 {
		result.Score = 90
		result.Level = "critical"
		result.Verdict = "No documentation — highly suspicious for a legitimate package"
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
