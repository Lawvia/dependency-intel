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

// PyPIRegistry fetches package metadata from PyPI.
type PyPIRegistry struct {
	httpClient *http.Client
	cache      *util.Cache
}

// NewPyPIRegistry creates a new PyPI registry client.
func NewPyPIRegistry(httpClient *http.Client, cache *util.Cache) *PyPIRegistry {
	return &PyPIRegistry{httpClient: httpClient, cache: cache}
}

type pypiPackageResponse struct {
	Info struct {
		Name            string `json:"name"`
		Summary         string `json:"summary"`
		Description     string `json:"description"`
		Version         string `json:"version"`
		Author          string `json:"author"`
		AuthorEmail     string `json:"author_email"`
		Maintainer      string `json:"maintainer"`
		MaintainerEmail string `json:"maintainer_email"`
		License         string `json:"license"`
		HomePage        string `json:"home_page"`
		ProjectURL      string `json:"project_url"`
		ProjectURLs     map[string]string `json:"project_urls"`
	} `json:"info"`
	Releases map[string][]struct {
		UploadTimeISO string `json:"upload_time_iso_8601"`
	} `json:"releases"`
}

// GetMetadata fetches full package metadata from PyPI.
func (r *PyPIRegistry) GetMetadata(ctx context.Context, name string) (*model.PackageMetadata, error) {
	cacheKey := fmt.Sprintf("pypi:meta:%s", name)
	if cached, ok := r.cache.Get(cacheKey); ok {
		return cached.(*model.PackageMetadata), nil
	}

	reqURL := fmt.Sprintf("https://pypi.org/pypi/%s/json", name)
	req, err := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("PyPI request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("PyPI returned %d: %s", resp.StatusCode, string(body))
	}

	var raw pypiPackageResponse
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return nil, fmt.Errorf("failed to decode PyPI response: %w", err)
	}

	meta := &model.PackageMetadata{
		Name:          raw.Info.Name,
		Ecosystem:     "PyPI",
		Description:   raw.Info.Summary,
		LatestVersion: raw.Info.Version,
		License:       raw.Info.License,
		Homepage:      raw.Info.HomePage,
		HasReadme:     len(raw.Info.Description) > 0,
		ReadmeLength:  len(raw.Info.Description),
		VersionCount:  len(raw.Releases),
		Versions:      make(map[string]string),
	}

	// Repository URL
	if urls := raw.Info.ProjectURLs; urls != nil {
		for _, key := range []string{"Source", "Repository", "Code", "GitHub", "Homepage"} {
			if u, ok := urls[key]; ok {
				meta.Repository = u
				break
			}
		}
	}

	// Maintainers
	if raw.Info.Author != "" {
		meta.Maintainers = append(meta.Maintainers, model.Maintainer{
			Name:  raw.Info.Author,
			Email: raw.Info.AuthorEmail,
		})
	}
	if raw.Info.Maintainer != "" {
		meta.Maintainers = append(meta.Maintainers, model.Maintainer{
			Name:  raw.Info.Maintainer,
			Email: raw.Info.MaintainerEmail,
		})
	}

	// Version dates
	var allDates []time.Time
	for ver, files := range raw.Releases {
		if len(files) > 0 && files[0].UploadTimeISO != "" {
			meta.Versions[ver] = files[0].UploadTimeISO
			if t, err := time.Parse(time.RFC3339, files[0].UploadTimeISO); err == nil {
				allDates = append(allDates, t)
			}
		}
	}

	sort.Slice(allDates, func(i, j int) bool { return allDates[i].Before(allDates[j]) })
	if len(allDates) > 0 {
		meta.CreatedAt = allDates[0].Format(time.RFC3339)
		meta.UpdatedAt = allDates[len(allDates)-1].Format(time.RFC3339)
	}

	r.cache.Set(cacheKey, meta, 15*time.Minute)
	return meta, nil
}

// GetDownloads fetches download stats from pypistats.org.
func (r *PyPIRegistry) GetDownloads(ctx context.Context, name string) (*model.DownloadStats, error) {
	cacheKey := fmt.Sprintf("pypi:dl:%s", name)
	if cached, ok := r.cache.Get(cacheKey); ok {
		return cached.(*model.DownloadStats), nil
	}

	reqURL := fmt.Sprintf("https://pypistats.org/api/packages/%s/recent", name)
	req, err := http.NewRequestWithContext(ctx, "GET", reqURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("pypistats request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return &model.DownloadStats{}, nil // Graceful fallback
	}

	var result struct {
		Data struct {
			LastMonth int `json:"last_month"`
			LastWeek  int `json:"last_week"`
			LastDay   int `json:"last_day"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return &model.DownloadStats{}, nil
	}

	stats := &model.DownloadStats{
		LastMonth: result.Data.LastMonth,
		LastWeek:  result.Data.LastWeek,
		LastDay:   result.Data.LastDay,
	}

	r.cache.Set(cacheKey, stats, 15*time.Minute)
	return stats, nil
}
