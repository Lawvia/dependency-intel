package marshal

import (
	"github.com/lawvia/depintel/model"
)

// analyzeDownloads scores a package based on download volume.
func analyzeDownloads(stats *model.DownloadStats, ecosystem string) model.SignalResult {
	result := model.SignalResult{
		Name:   "downloads",
		Weight: signalWeights["downloads"],
	}

	// Go modules don't have public download stats
	if stats == nil || ecosystem == "Go" {
		result.Score = 30
		result.Level = "medium"
		result.Verdict = "Download statistics unavailable for this ecosystem"
		result.Details = map[string]any{"available": false}
		return result
	}

	monthly := stats.LastMonth

	switch {
	case monthly < 50:
		result.Score = 80
		result.Level = "critical"
		result.Verdict = "Extremely low adoption — less than 50 downloads/month"
	case monthly < 500:
		result.Score = 55
		result.Level = "high"
		result.Verdict = "Low adoption — under 500 downloads/month"
	case monthly < 5000:
		result.Score = 30
		result.Level = "medium"
		result.Verdict = "Moderate adoption"
	case monthly < 100000:
		result.Score = 10
		result.Level = "safe"
		result.Verdict = "Well adopted package"
	default:
		result.Score = 5
		result.Level = "safe"
		result.Verdict = "Highly popular package"
	}

	result.Details = map[string]any{
		"lastMonth": stats.LastMonth,
		"lastWeek":  stats.LastWeek,
		"lastDay":   stats.LastDay,
	}

	return result
}
