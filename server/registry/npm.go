package registry

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"time"

	"github.com/lawvia/depintel/model"
	"github.com/lawvia/depintel/util"
)

// NpmRegistry fetches package metadata from the npm registry.
type NpmRegistry struct {
	httpClient *http.Client
	cache      *util.Cache
}

// NewNpmRegistry creates a new npm registry client.
func NewNpmRegistry(httpClient *http.Client, cache *util.Cache) *NpmRegistry {
	return &NpmRegistry{httpClient: httpClient, cache: cache}
}

type npmPackageResponse struct {
	Name        string            `json:"name"`
	Description string            `json:"description"`
	DistTags    map[string]string `json:"dist-tags"`
	Time        map[string]string `json:"time"` // version -> ISO date
	Maintainers []struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	} `json:"maintainers"`
	License    any    `json:"license"`
	Homepage   string `json:"homepage"`
	Repository any    `json:"repository"`
	Readme     string `json:"readme"`
	Versions   map[string]struct {
		Maintainers []struct {
			Name  string `json:"name"`
			Email string `json:"email"`
		} `json:"maintainers"`
	} `json:"versions"`
}

// GetMetadata fetches full package metadata from npm.
func (r *NpmRegistry) GetMetadata(ctx context.Context, name string) (*model.PackageMetadata, error) {
	cacheKey := fmt.Sprintf("npm:meta:%s", name)
	if cached, ok := r.cache.Get(cacheKey); ok {
		return cached.(*model.PackageMetadata), nil
	}

	reqURL := fmt.Sprintf("https://registry.npmjs.org/%s", name)
	req, err := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("npm registry request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		// Package not found (deleted/unpublished) — return metadata with NotFound flag
		if resp.StatusCode == http.StatusNotFound {
			notFoundMeta := &model.PackageMetadata{
				Name:      name,
				Ecosystem: "npm",
				NotFound:  true,
			}
			r.cache.Set(cacheKey, notFoundMeta, 15*time.Minute)
			return notFoundMeta, nil
		}
		return nil, fmt.Errorf("npm registry returned %d: %s", resp.StatusCode, string(body))
	}

	var raw npmPackageResponse
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("failed to decode npm response: %w", err)
	}

	meta := &model.PackageMetadata{
		Name:          raw.Name,
		Ecosystem:     "npm",
		Description:   raw.Description,
		LatestVersion: raw.DistTags["latest"],
		Homepage:      raw.Homepage,
		HasReadme:     len(raw.Readme) > 0,
		ReadmeLength:  len(raw.Readme),
		VersionCount:  len(raw.Time) - 2, // subtract "created" and "modified"
		Versions:      make(map[string]string),
	}

	// License
	switch v := raw.License.(type) {
	case string:
		meta.License = v
	case map[string]any:
		if t, ok := v["type"]; ok {
			meta.License = fmt.Sprint(t)
		}
	}

	// Repository
	switch v := raw.Repository.(type) {
	case string:
		meta.Repository = v
	case map[string]any:
		if u, ok := v["url"]; ok {
			meta.Repository = fmt.Sprint(u)
		}
	}

	// Maintainers
	for _, m := range raw.Maintainers {
		meta.Maintainers = append(meta.Maintainers, model.Maintainer{
			Name:  m.Name,
			Email: m.Email,
		})
	}

	// Timestamps
	if created, ok := raw.Time["created"]; ok {
		meta.CreatedAt = created
	}
	if modified, ok := raw.Time["modified"]; ok {
		meta.UpdatedAt = modified
	}

	// Version publish dates (keep last 20 for analysis)
	versions := make([]string, 0, len(raw.Time))
	for v := range raw.Time {
		if v != "created" && v != "modified" {
			versions = append(versions, v)
			meta.Versions[v] = raw.Time[v]
		}
	}
	sort.Strings(versions)

	r.cache.Set(cacheKey, meta, 15*time.Minute)
	return meta, nil
}

// GetDownloads fetches download stats for an npm package.
func (r *NpmRegistry) GetDownloads(ctx context.Context, name string) (*model.DownloadStats, error) {
	cacheKey := fmt.Sprintf("npm:dl:%s", name)
	if cached, ok := r.cache.Get(cacheKey); ok {
		return cached.(*model.DownloadStats), nil
	}

	stats := &model.DownloadStats{}

	// Last month
	if count, err := r.fetchDownloadPoint(ctx, "last-month", name); err == nil {
		stats.LastMonth = count
	}
	// Last week
	if count, err := r.fetchDownloadPoint(ctx, "last-week", name); err == nil {
		stats.LastWeek = count
	}

	r.cache.Set(cacheKey, stats, 15*time.Minute)
	return stats, nil
}

func (r *NpmRegistry) fetchDownloadPoint(ctx context.Context, period, name string) (int, error) {
	reqURL := fmt.Sprintf("https://api.npmjs.org/downloads/point/%s/%s", period, name)
	req, err := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
	if err != nil {
		return 0, err
	}

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("npm downloads API returned %d", resp.StatusCode)
	}

	var result struct {
		Downloads int `json:"downloads"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return 0, err
	}

	return result.Downloads, nil
}
