package model

// SignalResult represents the output of a single Marshal signal analyzer.
type SignalResult struct {
	Name    string  `json:"name"`    // e.g., "age", "author", "downloads"
	Score   int     `json:"score"`   // 0–100 (0 = safe, 100 = max risk)
	Weight  float64 `json:"weight"`  // Weight for composite calculation
	Level   string  `json:"level"`   // "critical" | "high" | "medium" | "low" | "safe"
	Verdict string  `json:"verdict"` // Human-readable explanation
	Details any     `json:"details"` // Signal-specific raw data
}

// MarshalResult represents the aggregated output of all Marshal signals.
type MarshalResult struct {
	CompositeScore int            `json:"compositeScore"` // Weighted 0–100
	RiskLevel      string         `json:"riskLevel"`      // "critical" | "high" | "medium" | "low" | "safe"
	Signals        []SignalResult `json:"signals"`
}

// ScoreToLevel converts a numeric score to a risk level string.
func ScoreToLevel(score int) string {
	switch {
	case score >= 80:
		return "critical"
	case score >= 60:
		return "high"
	case score >= 40:
		return "medium"
	case score >= 20:
		return "low"
	default:
		return "safe"
	}
}
