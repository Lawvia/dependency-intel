package marshal

import (
	"github.com/lawvia/depintel/model"
)

// analyzeAuthor scores a package based on maintainer credibility.
func analyzeAuthor(meta *model.PackageMetadata) model.SignalResult {
	result := model.SignalResult{
		Name:   "author",
		Weight: signalWeights["author"],
	}

	maintainerCount := len(meta.Maintainers)

	if maintainerCount == 0 {
		result.Score = 70
		result.Level = "high"
		result.Verdict = "No maintainer information available"
		result.Details = map[string]any{"maintainerCount": 0}
		return result
	}

	// Basic heuristic: more maintainers = more credible
	// TODO: In future, cross-reference authors against their other packages
	switch {
	case maintainerCount >= 3:
		result.Score = 5
		result.Level = "safe"
		result.Verdict = "Multiple maintainers — well-maintained project"
	case maintainerCount == 2:
		result.Score = 15
		result.Level = "safe"
		result.Verdict = "Two maintainers — reasonable oversight"
	case maintainerCount == 1:
		result.Score = 40
		result.Level = "medium"
		result.Verdict = "Single maintainer — limited bus factor"
	}

	details := map[string]any{
		"maintainerCount": maintainerCount,
	}
	if len(meta.Maintainers) > 0 {
		names := make([]string, 0, len(meta.Maintainers))
		for _, m := range meta.Maintainers {
			names = append(names, m.Name)
		}
		details["maintainers"] = names
	}
	result.Details = details

	return result
}
