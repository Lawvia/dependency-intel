package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"

	"github.com/lawvia/depintel/model"
	"github.com/lawvia/depintel/parser"
	"github.com/lawvia/depintel/service"
	"github.com/lawvia/depintel/service/marshal"
)

// ScanHandler handles scan-related API endpoints.
type ScanHandler struct {
	osv     *service.OSVClient
	osm     *service.OSMClient
	depsDev *service.DepsDevClient
	marshal *marshal.Engine
}

// NewScanHandler creates a new scan handler.
func NewScanHandler(osv *service.OSVClient, osm *service.OSMClient, depsDev *service.DepsDevClient, marshal *marshal.Engine) *ScanHandler {
	return &ScanHandler{
		osv:     osv,
		osm:     osm,
		depsDev: depsDev,
		marshal: marshal,
	}
}

// ScanManifest handles POST /api/scan/manifest
func (h *ScanHandler) ScanManifest(w http.ResponseWriter, r *http.Request) {
	var input model.ManifestInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if input.Content == "" {
		writeError(w, http.StatusBadRequest, "Manifest content is required")
		return
	}

	// Parse the manifest
	packages, detectedFormat, err := parser.ParseManifest(input.Content, input.Format)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if len(packages) == 0 {
		writeError(w, http.StatusBadRequest, "No dependencies found in the "+detectedFormat+" manifest")
		return
	}

	ctx := r.Context()

	// Run OSV batch query
	osvResults, err := h.osv.QueryBatch(ctx, packages)
	if err != nil {
		// Don't fail completely — continue with partial results
		osvResults = make(map[string][]model.Vulnerability)
	}

	// Process each package concurrently (OSM + Marshal)
	results := make([]model.ScanResult, len(packages))
	var wg sync.WaitGroup
	sem := make(chan struct{}, 10) // Limit concurrency to 10

	for i, pkg := range packages {
		wg.Add(1)
		go func(idx int, p model.ParsedPackage) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			result := model.ScanResult{Package: p}

			// OSV vulnerabilities
			key := p.Ecosystem + "/" + p.Name
			if vulns, ok := osvResults[key]; ok {
				result.Vulnerabilities = vulns
			}

			// OSM malware check
			if malware, err := h.osm.CheckMalicious(ctx, p); err == nil {
				result.MalwareResult = malware
			}

			// Marshal analysis
			if marshalResult, err := h.marshal.Analyze(ctx, p); err == nil {
				result.MarshalScore = marshalResult
			}

			results[idx] = result
		}(i, pkg)
	}
	wg.Wait()

	// Build summary
	summary := buildSummary(results)

	writeJSON(w, http.StatusOK, model.ScanResponse{
		Summary: summary,
		Results: results,
	})
}

// ScanPackage handles POST /api/scan/package
func (h *ScanHandler) ScanPackage(w http.ResponseWriter, r *http.Request) {
	var input model.ScanRequest
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	if input.Name == "" || input.Ecosystem == "" {
		writeError(w, http.StatusBadRequest, "Package name and ecosystem are required")
		return
	}

	ctx := r.Context()
	pkg := model.ParsedPackage{
		Name:      input.Name,
		Version:   input.Version,
		Ecosystem: input.Ecosystem,
	}

	result := model.ScanResult{Package: pkg}

	// Run all checks concurrently
	var wg sync.WaitGroup
	wg.Add(3)

	go func() {
		defer wg.Done()
		if vulns, err := h.osv.QuerySingle(ctx, pkg); err == nil {
			result.Vulnerabilities = vulns
		}
	}()

	go func() {
		defer wg.Done()
		if malware, err := h.osm.CheckMalicious(ctx, pkg); err == nil {
			result.MalwareResult = malware
		}
	}()

	go func() {
		defer wg.Done()
		if marshalResult, err := h.marshal.Analyze(ctx, pkg); err == nil {
			result.MarshalScore = marshalResult
		}
	}()

	wg.Wait()

	// If no OSV results, try deps.dev fallback
	if len(result.Vulnerabilities) == 0 {
		if vulns, err := h.depsDev.GetAdvisories(context.Background(), pkg); err == nil && len(vulns) > 0 {
			result.Vulnerabilities = vulns
		}
	}

	writeJSON(w, http.StatusOK, result)
}

func buildSummary(results []model.ScanResult) model.ScanSummary {
	summary := model.ScanSummary{
		Total:            len(results),
		RiskDistribution: map[string]int{"critical": 0, "high": 0, "medium": 0, "low": 0, "safe": 0},
	}

	for _, r := range results {
		if len(r.Vulnerabilities) > 0 {
			summary.Vulnerable++
		}
		if r.MalwareResult != nil && r.MalwareResult.IsMalicious {
			summary.Malicious++
		}
		if r.MarshalScore != nil {
			summary.RiskDistribution[r.MarshalScore.RiskLevel]++
		}
	}

	return summary
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
