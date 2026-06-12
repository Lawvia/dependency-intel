package registry

import (
	"context"
	"net/http"

	"github.com/lawvia/depintel/model"
	"github.com/lawvia/depintel/util"
)

// GolangRegistry fetches package metadata for Go modules.
// Note: Go doesn't have a centralized registry like npm/PyPI.
// We rely on deps.dev for most metadata. This is a placeholder adapter.
type GolangRegistry struct {
	httpClient *http.Client
	cache      *util.Cache
}

// NewGolangRegistry creates a new Go registry client.
func NewGolangRegistry(httpClient *http.Client, cache *util.Cache) *GolangRegistry {
	return &GolangRegistry{httpClient: httpClient, cache: cache}
}

// GetMetadata returns minimal metadata for a Go module.
// Most enrichment comes from deps.dev rather than direct Go APIs.
func (r *GolangRegistry) GetMetadata(ctx context.Context, name string) (*model.PackageMetadata, error) {
	return &model.PackageMetadata{
		Name:      name,
		Ecosystem: "Go",
		HasReadme: false, // Cannot determine from Go APIs
	}, nil
}

// GetDownloads returns nil for Go modules as there's no public download stats API.
func (r *GolangRegistry) GetDownloads(ctx context.Context, name string) (*model.DownloadStats, error) {
	return nil, nil
}
