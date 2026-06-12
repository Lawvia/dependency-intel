package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/lawvia/depintel/model"
	"github.com/lawvia/depintel/util"
)

// OSMClient handles communication with the OpenSourceMalware API.
type OSMClient struct {
	httpClient *http.Client
	cache      *util.Cache
	apiKey     string
	baseURL    string
}

// NewOSMClient creates a new OSM API client.
func NewOSMClient(httpClient *http.Client, cache *util.Cache, apiKey string) *OSMClient {
	return &OSMClient{
		httpClient: httpClient,
		cache:      cache,
		apiKey:     apiKey,
		baseURL:    "https://api.opensourcemalware.com/functions/v1",
	}
}

type osmResponse struct {
	Malicious              bool       `json:"malicious"`
	ReportType             string     `json:"report_type"`
	ResourceIdentifier     string     `json:"resource_identifier"`
	Ecosystem              string     `json:"ecosystem"`
	ThreatCount            int        `json:"threat_count"`
	Warning                string     `json:"warning,omitempty"`
	KnownMaliciousVersions []string   `json:"known_malicious_versions,omitempty"`
	Details                *osmDetail `json:"details,omitempty"`
}

type osmDetail struct {
	ID            string   `json:"id"`
	Status        string   `json:"status"`
	SeverityLevel string   `json:"severity_level"`
	Description   string   `json:"description"`
	Tags          []string `json:"tags"`
	FirstSeen     string   `json:"first_seen"`
	LastSeen      string   `json:"last_seen"`
	VersionInfo   string   `json:"version_info,omitempty"`
}

// CheckMalicious checks if a package is flagged as malicious in the OSM database.
func (c *OSMClient) CheckMalicious(ctx context.Context, pkg model.ParsedPackage) (*model.MalwareResult, error) {
	if c.apiKey == "" {
		// No API key configured — skip silently
		return &model.MalwareResult{IsMalicious: false}, nil
	}

	cacheKey := fmt.Sprintf("osm:%s/%s", pkg.Ecosystem, pkg.Name)
	if pkg.Version != "" {
		cacheKey = fmt.Sprintf("osm:%s/%s@%s", pkg.Ecosystem, pkg.Name, pkg.Version)
	}
	if cached, ok := c.cache.Get(cacheKey); ok {
		return cached.(*model.MalwareResult), nil
	}

	// Build query URL
	params := url.Values{
		"report_type":         {"package"},
		"resource_identifier": {pkg.Name},
		"ecosystem":           {mapOSMEcosystem(pkg.Ecosystem)},
	}
	if pkg.Version != "" {
		params.Set("version", pkg.Version)
	}

	reqURL := fmt.Sprintf("%s/check-malicious?%s", c.baseURL, params.Encode())
	req, err := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("OSM request failed: %w", err)
	}
	defer resp.Body.Close()

	// Handle rate limiting gracefully
	if resp.StatusCode == http.StatusTooManyRequests {
		return &model.MalwareResult{IsMalicious: false}, nil
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("OSM returned status %d: %s", resp.StatusCode, string(body))
	}

	var osmResp osmResponse
	if err := json.NewDecoder(resp.Body).Decode(&osmResp); err != nil {
		return nil, fmt.Errorf("failed to decode OSM response: %w", err)
	}

	var versionList []string
	addVersions := func(verStr string) {
		parts := strings.Split(verStr, ",")
		for _, p := range parts {
			p = strings.TrimSpace(p)
			if p != "" {
				versionList = append(versionList, p)
			}
		}
	}

	isMalicious := osmResp.Malicious
	hasMaliciousVersions := false

	if osmResp.Malicious {
		// If no version was provided, check if the threat is version-specific
		if pkg.Version == "" && osmResp.Details != nil && osmResp.Details.VersionInfo != "" && osmResp.Details.VersionInfo != "all" {
			isMalicious = false
			hasMaliciousVersions = true
			addVersions(osmResp.Details.VersionInfo)
		}
	} else {
		// Not currently flagged as malicious, check if it has a history/warning of malicious versions
		if osmResp.Warning != "" || len(osmResp.KnownMaliciousVersions) > 0 {
			hasMaliciousVersions = true
			for _, verGroup := range osmResp.KnownMaliciousVersions {
				addVersions(verGroup)
			}
		}
	}

	result := &model.MalwareResult{
		IsMalicious:            isMalicious,
		ThreatCount:            osmResp.ThreatCount,
		HasMaliciousVersions:   hasMaliciousVersions,
		KnownMaliciousVersions: versionList,
	}

	if osmResp.Details != nil {
		result.SeverityLevel = osmResp.Details.SeverityLevel
		result.Description = osmResp.Details.Description
		result.Tags = osmResp.Details.Tags
		result.Status = osmResp.Details.Status
		result.FirstSeen = osmResp.Details.FirstSeen
		result.LastSeen = osmResp.Details.LastSeen
	} else if osmResp.Warning != "" {
		result.Description = osmResp.Warning
	}

	c.cache.Set(cacheKey, result, cacheTTLOSM)
	return result, nil
}

// mapOSMEcosystem maps our ecosystem names to OSM ecosystem identifiers.
func mapOSMEcosystem(ecosystem string) string {
	switch ecosystem {
	case "npm":
		return "npm"
	case "PyPI":
		return "pypi"
	case "Go":
		return "go"
	case "crates.io":
		return "cargo"
	default:
		return ecosystem
	}
}
