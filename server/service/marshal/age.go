package marshal

import (
	"time"

	"github.com/lawvia/depintel/model"
)

// analyzeAge scores a package based on how long it has been published.
func analyzeAge(meta *model.PackageMetadata) model.SignalResult {
	result := model.SignalResult{
		Name:   "age",
		Weight: signalWeights["age"],
	}

	if meta.CreatedAt == "" {
		result.Score = 50
		result.Level = "medium"
		result.Verdict = "Unable to determine package age"
		result.Details = map[string]any{"createdAt": nil}
		return result
	}

	created, err := time.Parse(time.RFC3339, meta.CreatedAt)
	if err != nil {
		// Try alternative formats
		created, err = time.Parse("2006-01-02T15:04:05.000Z", meta.CreatedAt)
		if err != nil {
			result.Score = 50
			result.Level = "medium"
			result.Verdict = "Unable to parse package creation date"
			return result
		}
	}

	daysSinceCreated := int(time.Since(created).Hours() / 24)

	switch {
	case daysSinceCreated < 7:
		result.Score = 95
		result.Level = "critical"
		result.Verdict = "Brand new package — extreme caution"
	case daysSinceCreated < 30:
		result.Score = 75
		result.Level = "high"
		result.Verdict = "Very new package — proceed with caution"
	case daysSinceCreated < 90:
		result.Score = 50
		result.Level = "medium"
		result.Verdict = "Relatively new package"
	case daysSinceCreated < 365:
		result.Score = 25
		result.Level = "low"
		result.Verdict = "Established package"
	default:
		result.Score = 5
		result.Level = "safe"
		result.Verdict = "Mature package with long history"
	}

	result.Details = map[string]any{
		"createdAt":        meta.CreatedAt,
		"daysSinceCreated": daysSinceCreated,
	}

	return result
}
