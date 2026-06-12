package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/lawvia/depintel/handler"
	"github.com/lawvia/depintel/registry"
	"github.com/lawvia/depintel/service"
	"github.com/lawvia/depintel/service/marshal"
	"github.com/lawvia/depintel/util"
)

func main() {
	// Load config from environment
	port := getEnv("SERVER_PORT", "8080")
	osmAPIKey := getEnv("OSM_API_KEY", "")
	corsOrigin := getEnv("CORS_ORIGIN", "http://localhost:5173")

	// Initialize shared dependencies
	httpClient := util.NewHTTPClient()
	cache := util.NewCache()

	// Initialize service clients
	osvClient := service.NewOSVClient(httpClient, cache)
	osmClient := service.NewOSMClient(httpClient, cache, osmAPIKey)
	depsDevClient := service.NewDepsDevClient(httpClient, cache)

	// Initialize registry adapters
	npmReg := registry.NewNpmRegistry(httpClient, cache)
	pypiReg := registry.NewPyPIRegistry(httpClient, cache)
	goReg := registry.NewGolangRegistry(httpClient, cache)

	// Initialize Marshal engine
	marshalEngine := marshal.NewEngine(npmReg, pypiReg, goReg, cache)

	// Initialize handlers
	scanHandler := handler.NewScanHandler(osvClient, osmClient, depsDevClient, marshalEngine)
	pkgHandler := handler.NewPackageHandler(osvClient, osmClient, depsDevClient, marshalEngine)

	// Setup router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RealIP)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{corsOrigin, "http://localhost:3000", "http://localhost:5173"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"depintel"}`))
	})

	// API routes
	r.Route("/api", func(r chi.Router) {
		r.Route("/scan", func(r chi.Router) {
			r.Post("/manifest", scanHandler.ScanManifest)
			r.Post("/package", scanHandler.ScanPackage)
		})
		r.Route("/package/{ecosystem}/{name}", func(r chi.Router) {
			r.Get("/", pkgHandler.GetPackage)
			r.Get("/{version}/vulns", pkgHandler.GetPackageVulns)
		})
	})

	// Start server
	addr := fmt.Sprintf(":%s", port)
	log.Printf("🛡️  DepIntel server starting on %s", addr)
	log.Printf("   CORS origin: %s", corsOrigin)
	if osmAPIKey != "" {
		log.Printf("   OSM API key: configured ✓")
	} else {
		log.Printf("   OSM API key: not configured (malware checks disabled)")
	}

	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}
