package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/lawvia/depintel/model"
	"github.com/lawvia/depintel/util"
)

// OSVClient handles communication with the OSV.dev API.
type OSVClient struct {
	httpClient *http.Client
	cache      *util.Cache
	baseURL    string
}

// NewOSVClient creates a new OSV API client.
func NewOSVClient(httpClient *http.Client, cache *util.Cache) *OSVClient {
	return &OSVClient{
		httpClient: httpClient,
		cache:      cache,
		baseURL:    "https://api.osv.dev",
	}
}

// osvQuery represents a single query in the OSV API format.
type osvQuery struct {
	Package *osvPackage `json:"package,omitempty"`
	Version string      `json:"version,omitempty"`
}

type osvPackage struct {
	Name      string `json:"name"`
	Ecosystem string `json:"ecosystem"`
}

type osvBatchRequest struct {
	Queries []osvQuery `json:"queries"`
}

type osvBatchResponse struct {
	Results []osvBatchResult `json:"results"`
}

type osvBatchResult struct {
	Vulns []osvVuln `json:"vulns"`
}

type osvVuln struct {
	ID       string        `json:"id"`
	Summary  string        `json:"summary"`
	Details  string        `json:"details"`
	Aliases  []string      `json:"aliases"`
	Severity []osvSeverity `json:"severity"`
	Affected []osvAffected `json:"affected"`
	References []osvRef    `json:"references"`
}

type osvSeverity struct {
	Type  string `json:"type"`
	Score string `json:"score"`
}

type osvAffected struct {
	Package  osvPackage    `json:"package"`
	Ranges   []osvRange    `json:"ranges"`
	Versions []string      `json:"versions"`
}

type osvRange struct {
	Type   string      `json:"type"`
	Events []osvEvent  `json:"events"`
}

type osvEvent struct {
	Introduced string `json:"introduced,omitempty"`
	Fixed      string `json:"fixed,omitempty"`
}

type osvRef struct {
	Type string `json:"type"`
	URL  string `json:"url"`
}

// GetVulnDetails fetches full details for a given vulnerability ID.
func (c *OSVClient) GetVulnDetails(ctx context.Context, id string) (*model.Vulnerability, error) {
	cacheKey := "osv:vuln:" + id
	if cached, ok := c.cache.Get(cacheKey); ok {
		return cached.(*model.Vulnerability), nil
	}

	reqURL := fmt.Sprintf("%s/v1/vulns/%s", c.baseURL, id)
	req, err := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("OSV returned status %d", resp.StatusCode)
	}

	var vulnDetail osvVuln
	if err := json.NewDecoder(resp.Body).Decode(&vulnDetail); err != nil {
		return nil, err
	}

	vuln := convertOSVVuln(vulnDetail)
	c.cache.Set(cacheKey, &vuln, cacheTTLVuln)
	return &vuln, nil
}

// QueryBatch queries OSV for vulnerabilities across multiple packages.
func (c *OSVClient) QueryBatch(ctx context.Context, packages []model.ParsedPackage) (map[string][]model.Vulnerability, error) {
	results := make(map[string][]model.Vulnerability)

	// Build batch query
	queries := make([]osvQuery, 0, len(packages))
	for _, pkg := range packages {
		queries = append(queries, osvQuery{
			Package: &osvPackage{
				Name:      pkg.Name,
				Ecosystem: mapEcosystem(pkg.Ecosystem),
			},
			Version: pkg.Version,
		})
	}

	// OSV supports up to 1000 per batch
	const batchSize = 1000
	var batchResults []osvBatchResult
	var batchPackages []model.ParsedPackage

	for i := 0; i < len(queries); i += batchSize {
		end := i + batchSize
		if end > len(queries) {
			end = len(queries)
		}

		batch := queries[i:end]
		batchPkgs := packages[i:end]

		resp, err := c.doBatchQuery(ctx, batch)
		if err != nil {
			return nil, fmt.Errorf("OSV batch query failed: %w", err)
		}

		batchResults = append(batchResults, resp.Results...)
		batchPackages = append(batchPackages, batchPkgs...)
	}

	// Collect all unique vuln IDs to fetch details concurrently
	uniqueVulnIDs := make(map[string]bool)
	for _, result := range batchResults {
		for _, v := range result.Vulns {
			if v.ID != "" {
				uniqueVulnIDs[v.ID] = true
			}
		}
	}

	if len(uniqueVulnIDs) > 0 {
		type vulnDetailResult struct {
			id   string
			vuln *model.Vulnerability
			err  error
		}

		ch := make(chan vulnDetailResult, len(uniqueVulnIDs))
		for id := range uniqueVulnIDs {
			go func(vulnID string) {
				detail, err := c.GetVulnDetails(ctx, vulnID)
				ch <- vulnDetailResult{id: vulnID, vuln: detail, err: err}
			}(id)
		}

		// Wait and collect details
		vulnDetails := make(map[string]model.Vulnerability)
		for i := 0; i < len(uniqueVulnIDs); i++ {
			res := <-ch
			if res.err == nil && res.vuln != nil {
				vulnDetails[res.id] = *res.vuln
			} else {
				vulnDetails[res.id] = model.Vulnerability{
					ID:       res.id,
					Severity: "UNKNOWN",
					Source:   "osv",
				}
			}
		}

		// Map results to packages with details
		for j, result := range batchResults {
			if j >= len(batchPackages) {
				break
			}
			key := batchPackages[j].Ecosystem + "/" + batchPackages[j].Name
			for _, vuln := range result.Vulns {
				if detail, ok := vulnDetails[vuln.ID]; ok {
					results[key] = append(results[key], detail)
				} else {
					results[key] = append(results[key], model.Vulnerability{
						ID:       vuln.ID,
						Severity: "UNKNOWN",
						Source:   "osv",
					})
				}
			}
		}
	}

	return results, nil
}

// QuerySingle queries OSV for a single package.
func (c *OSVClient) QuerySingle(ctx context.Context, pkg model.ParsedPackage) ([]model.Vulnerability, error) {
	cacheKey := fmt.Sprintf("osv:%s/%s@%s", pkg.Ecosystem, pkg.Name, pkg.Version)
	if cached, ok := c.cache.Get(cacheKey); ok {
		return cached.([]model.Vulnerability), nil
	}

	query := osvQuery{
		Package: &osvPackage{
			Name:      pkg.Name,
			Ecosystem: mapEcosystem(pkg.Ecosystem),
		},
		Version: pkg.Version,
	}

	body, _ := json.Marshal(query)
	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/v1/query", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("OSV query failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("OSV returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var result osvBatchResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode OSV response: %w", err)
	}

	var vulns []model.Vulnerability
	for _, v := range result.Vulns {
		vulns = append(vulns, convertOSVVuln(v))
	}

	c.cache.Set(cacheKey, vulns, cacheTTLVuln)
	return vulns, nil
}

func (c *OSVClient) doBatchQuery(ctx context.Context, queries []osvQuery) (*osvBatchResponse, error) {
	body, _ := json.Marshal(osvBatchRequest{Queries: queries})
	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/v1/querybatch", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("OSV returned status %d: %s", resp.StatusCode, string(respBody))
	}

	var result osvBatchResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

func convertOSVVuln(v osvVuln) model.Vulnerability {
	vuln := model.Vulnerability{
		ID:      v.ID,
		Summary: v.Summary,
		Source:  "osv",
		Aliases: v.Aliases,
	}

	// Extract severity
	if len(v.Severity) > 0 {
		vuln.Severity = categorizeSeverity(v.Severity[0].Score)
	}

	// Extract fix version from affected ranges
	for _, aff := range v.Affected {
		for _, r := range aff.Ranges {
			for _, ev := range r.Events {
				if ev.Fixed != "" {
					vuln.FixVersion = ev.Fixed
				}
			}
		}
	}

	// Extract advisory URL
	for _, ref := range v.References {
		if ref.Type == "ADVISORY" || ref.Type == "WEB" {
			vuln.AdvisoryURL = ref.URL
			break
		}
	}

	return vuln
}

// categorizeSeverity converts a CVSS score string to a severity category.
func categorizeSeverity(score string) string {
	// Try to extract CVSS score — format is often "CVSS:3.1/AV:N/AC:L/..."
	// For simplicity, check known severity levels
	switch {
	case containsAny(score, "9.", "10."):
		return "CRITICAL"
	case containsAny(score, "7.", "8."):
		return "HIGH"
	case containsAny(score, "4.", "5.", "6."):
		return "MEDIUM"
	default:
		return "LOW"
	}
}

func containsAny(s string, substrs ...string) bool {
	for _, sub := range substrs {
		if len(s) >= len(sub) {
			for i := 0; i <= len(s)-len(sub); i++ {
				if s[i:i+len(sub)] == sub {
					return true
				}
			}
		}
	}
	return false
}

// mapEcosystem maps our internal ecosystem names to OSV ecosystem names.
func mapEcosystem(ecosystem string) string {
	switch ecosystem {
	case "npm":
		return "npm"
	case "PyPI":
		return "PyPI"
	case "Go":
		return "Go"
	case "crates.io":
		return "crates.io"
	default:
		return ecosystem
	}
}
