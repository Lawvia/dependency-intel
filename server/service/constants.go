package service

import "time"

// Cache TTL constants for different data types.
const (
	cacheTTLMeta = 15 * time.Minute // Registry metadata
	cacheTTLVuln = 1 * time.Hour    // Vulnerability data
	cacheTTLOSM  = 1 * time.Hour    // Malware check results
)
