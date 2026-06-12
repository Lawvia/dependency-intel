package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/lawvia/depintel/model"
	"github.com/lawvia/depintel/util"
)

// DepsDevClient handles communication with the deps.dev API.
type DepsDevClient struct {
	httpClient *http.Client
	cache      *util.Cache
	baseURL    string
}

// NewDepsDevClient creates a new deps.dev API client.
func NewDepsDevClient(httpClient *http.Client, cache *util.Cache) *DepsDevClient {
	return &DepsDevClient{
		httpClient: httpClient,
		cache:      cache,
		baseURL:    "https://api.deps.dev/v3",
	}
}

type depsdevVersionResponse struct {
	VersionKey struct {
		System  string `json:"system"`
		Name    string `json:"name"`
		Version string `json:"version"`
	} `json:"versionKey"`
	IsDefault        bool     `json:"isDefault"`
	Licenses         []string `json:"licenses"`
	AdvisoryKeys     []struct {
		ID string `json:"id"`
	} `json:"advisoryKeys"`
	Links []struct {
		Label string `json:"label"`
		URL   string `json:"url"`
	} `json:"links"`
	PublishedAt string `json:"publishedAt"`
}

type depsdevPackageResponse struct {
	PackageKey struct {
		System string `json:"system"`
		Name   string `json:"name"`
	} `json:"packageKey"`
	Versions []struct {
		VersionKey struct {
			System  string `json:"system"`
			Name    string `json:"name"`
			Version string `json:"version"`
		} `json:"versionKey"`
		IsDefault   bool   `json:"isDefault"`
		PublishedAt string `json:"publishedAt"`
	} `json:"versions"`
}

// GetPackageInfo retrieves package metadata from deps.dev.
func (c *DepsDevClient) GetPackageInfo(ctx context.Context, ecosystem, name string) (*depsdevPackageResponse, error) {
	cacheKey := fmt.Sprintf("depsdev:pkg:%s/%s", ecosystem, name)
	if cached, ok := c.cache.Get(cacheKey); ok {
		return cached.(*depsdevPackageResponse), nil
	}

	system := mapDepsDevSystem(ecosystem)
	reqURL := fmt.Sprintf("%s/systems/%s/packages/%s", c.baseURL, system, name)

	req, err := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("deps.dev request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("deps.dev returned status %d: %s", resp.StatusCode, string(body))
	}

	var result depsdevPackageResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode deps.dev response: %w", err)
	}

	c.cache.Set(cacheKey, &result, cacheTTLMeta)
	return &result, nil
}

// GetVersionInfo retrieves version-specific info from deps.dev.
func (c *DepsDevClient) GetVersionInfo(ctx context.Context, ecosystem, name, version string) (*depsdevVersionResponse, error) {
	cacheKey := fmt.Sprintf("depsdev:ver:%s/%s@%s", ecosystem, name, version)
	if cached, ok := c.cache.Get(cacheKey); ok {
		return cached.(*depsdevVersionResponse), nil
	}

	system := mapDepsDevSystem(ecosystem)
	reqURL := fmt.Sprintf("%s/systems/%s/packages/%s/versions/%s", c.baseURL, system, name, version)

	req, err := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("deps.dev request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("deps.dev returned status %d: %s", resp.StatusCode, string(body))
	}

	var result depsdevVersionResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode deps.dev response: %w", err)
	}

	c.cache.Set(cacheKey, &result, cacheTTLMeta)
	return &result, nil
}

// GetAdvisories fetches advisory info for a package version and converts to vulnerabilities.
func (c *DepsDevClient) GetAdvisories(ctx context.Context, pkg model.ParsedPackage) ([]model.Vulnerability, error) {
	verInfo, err := c.GetVersionInfo(ctx, pkg.Ecosystem, pkg.Name, pkg.Version)
	if err != nil {
		return nil, err
	}

	var vulns []model.Vulnerability
	for _, key := range verInfo.AdvisoryKeys {
		vulns = append(vulns, model.Vulnerability{
			ID:     key.ID,
			Source: "depsdev",
		})
	}

	return vulns, nil
}

// mapDepsDevSystem maps our ecosystem names to deps.dev system identifiers.
func mapDepsDevSystem(ecosystem string) string {
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
