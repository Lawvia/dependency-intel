package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/lawvia/depintel/model"
	"github.com/lawvia/depintel/service"
	"github.com/lawvia/depintel/service/marshal"
)

// PackageHandler handles package info endpoints.
type PackageHandler struct {
	osv     *service.OSVClient
	osm     *service.OSMClient
	depsDev *service.DepsDevClient
	marshal *marshal.Engine
}

// NewPackageHandler creates a new package handler.
func NewPackageHandler(osv *service.OSVClient, osm *service.OSMClient, depsDev *service.DepsDevClient, marshal *marshal.Engine) *PackageHandler {
	return &PackageHandler{
		osv:     osv,
		osm:     osm,
		depsDev: depsDev,
		marshal: marshal,
	}
}

// GetPackage handles GET /api/package/{ecosystem}/{name}
func (h *PackageHandler) GetPackage(w http.ResponseWriter, r *http.Request) {
	ecosystem := chi.URLParam(r, "ecosystem")
	name := chi.URLParam(r, "name")

	if ecosystem == "" || name == "" {
		writeError(w, http.StatusBadRequest, "Ecosystem and package name are required")
		return
	}

	ctx := r.Context()
	pkg := model.ParsedPackage{
		Name:      name,
		Ecosystem: ecosystem,
	}

	result := model.ScanResult{Package: pkg}

	// Get Marshal analysis
	if marshalResult, err := h.marshal.Analyze(ctx, pkg); err == nil {
		result.MarshalScore = marshalResult
	}

	// Check OSM
	if malware, err := h.osm.CheckMalicious(ctx, pkg); err == nil {
		result.MalwareResult = malware
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// GetPackageVulns handles GET /api/package/{ecosystem}/{name}/{version}/vulns
func (h *PackageHandler) GetPackageVulns(w http.ResponseWriter, r *http.Request) {
	ecosystem := chi.URLParam(r, "ecosystem")
	name := chi.URLParam(r, "name")
	version := chi.URLParam(r, "version")

	if ecosystem == "" || name == "" || version == "" {
		writeError(w, http.StatusBadRequest, "Ecosystem, package name, and version are required")
		return
	}

	ctx := r.Context()
	pkg := model.ParsedPackage{
		Name:      name,
		Version:   version,
		Ecosystem: ecosystem,
	}

	// Query OSV
	vulns, err := h.osv.QuerySingle(ctx, pkg)
	if err != nil {
		vulns = []model.Vulnerability{}
	}

	// If no OSV results, try deps.dev
	if len(vulns) == 0 {
		if depsVulns, err := h.depsDev.GetAdvisories(ctx, pkg); err == nil {
			vulns = depsVulns
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"package":         pkg,
		"vulnerabilities": vulns,
	})
}
