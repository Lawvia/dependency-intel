package parser

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/lawvia/depintel/model"
)

// PackageJSONParser parses npm package.json files.
type PackageJSONParser struct{}

func (p *PackageJSONParser) Ecosystem() string { return "npm" }

func (p *PackageJSONParser) Parse(content string) ([]model.ParsedPackage, error) {
	var raw struct {
		Dependencies    map[string]string `json:"dependencies"`
		DevDependencies map[string]string `json:"devDependencies"`
	}

	if err := json.Unmarshal([]byte(content), &raw); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}

	var pkgs []model.ParsedPackage

	for name, version := range raw.Dependencies {
		pkgs = append(pkgs, model.ParsedPackage{
			Name:      name,
			Version:   cleanNpmVersion(version),
			Ecosystem: "npm",
			IsDev:     false,
		})
	}

	for name, version := range raw.DevDependencies {
		pkgs = append(pkgs, model.ParsedPackage{
			Name:      name,
			Version:   cleanNpmVersion(version),
			Ecosystem: "npm",
			IsDev:     true,
		})
	}

	return pkgs, nil
}

// cleanNpmVersion strips semver range prefixes to get a base version.
func cleanNpmVersion(v string) string {
	v = strings.TrimSpace(v)
	// Remove common prefixes: ^, ~, >=, <=, >, <, =
	for _, prefix := range []string{">=", "<=", "~>", "^", "~", ">", "<", "="} {
		v = strings.TrimPrefix(v, prefix)
	}
	// Handle ranges like "1.0.0 - 2.0.0" → take the first
	if idx := strings.Index(v, " "); idx > 0 {
		v = v[:idx]
	}
	// Handle "||" alternatives → take the first
	if idx := strings.Index(v, "||"); idx > 0 {
		v = strings.TrimSpace(v[:idx])
	}
	return strings.TrimSpace(v)
}
