package marshal

import (
	"context"
	"math"

	"github.com/lawvia/depintel/model"
	"github.com/lawvia/depintel/registry"
	"github.com/lawvia/depintel/util"
	"golang.org/x/sync/errgroup"
)

// Signal weights for the composite score calculation.
var signalWeights = map[string]float64{
	"age":       0.20,
	"author":    0.20,
	"downloads": 0.20,
	"readme":    0.10,
	"version":   0.15,
	"typosquat": 0.15,
}

// Engine orchestrates all Marshal signal analyzers.
type Engine struct {
	npmReg  *registry.NpmRegistry
	pypiReg *registry.PyPIRegistry
	goReg   *registry.GolangRegistry
	cache   *util.Cache
}

// NewEngine creates a new Marshal engine.
func NewEngine(npmReg *registry.NpmRegistry, pypiReg *registry.PyPIRegistry, goReg *registry.GolangRegistry, cache *util.Cache) *Engine {
	return &Engine{
		npmReg:  npmReg,
		pypiReg: pypiReg,
		goReg:   goReg,
		cache:   cache,
	}
}

// Analyze runs all signal analyzers concurrently and produces a composite score.
func (e *Engine) Analyze(ctx context.Context, pkg model.ParsedPackage) (*model.MarshalResult, error) {
	// Fetch metadata first (shared by multiple signals)
	meta, err := e.getMetadata(ctx, pkg)
	if err != nil {
		// If metadata fetch fails, return a partial result rather than failing completely
		meta = &model.PackageMetadata{
			Name:      pkg.Name,
			Ecosystem: pkg.Ecosystem,
		}
	}

	// Fetch downloads
	downloads, _ := e.getDownloads(ctx, pkg)

	// Run all signals concurrently
	signals := make([]model.SignalResult, 6)
	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		signals[0] = analyzeAge(meta)
		return nil
	})
	g.Go(func() error {
		signals[1] = analyzeAuthor(meta)
		return nil
	})
	g.Go(func() error {
		signals[2] = analyzeDownloads(downloads, pkg.Ecosystem)
		return nil
	})
	g.Go(func() error {
		signals[3] = analyzeReadme(meta)
		return nil
	})
	g.Go(func() error {
		signals[4] = analyzeVersion(meta, pkg.Version)
		return nil
	})
	g.Go(func() error {
		signals[5] = analyzeTyposquat(pkg.Name, pkg.Ecosystem)
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	// Calculate composite score
	var totalWeight float64
	var weightedSum float64
	for _, s := range signals {
		totalWeight += s.Weight
		weightedSum += s.Weight * float64(s.Score)
	}

	compositeScore := 0
	if totalWeight > 0 {
		compositeScore = int(math.Round(weightedSum / totalWeight))
	}

	return &model.MarshalResult{
		CompositeScore: compositeScore,
		RiskLevel:      model.ScoreToLevel(compositeScore),
		Signals:        signals,
	}, nil
}

func (e *Engine) getMetadata(ctx context.Context, pkg model.ParsedPackage) (*model.PackageMetadata, error) {
	switch pkg.Ecosystem {
	case "npm":
		return e.npmReg.GetMetadata(ctx, pkg.Name)
	case "PyPI":
		return e.pypiReg.GetMetadata(ctx, pkg.Name)
	case "Go":
		return e.goReg.GetMetadata(ctx, pkg.Name)
	default:
		return &model.PackageMetadata{Name: pkg.Name, Ecosystem: pkg.Ecosystem}, nil
	}
}

func (e *Engine) getDownloads(ctx context.Context, pkg model.ParsedPackage) (*model.DownloadStats, error) {
	switch pkg.Ecosystem {
	case "npm":
		return e.npmReg.GetDownloads(ctx, pkg.Name)
	case "PyPI":
		return e.pypiReg.GetDownloads(ctx, pkg.Name)
	default:
		return nil, nil
	}
}
