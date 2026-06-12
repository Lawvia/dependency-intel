package parser

import (
	"fmt"
	"strings"

	"github.com/BurntSushi/toml"
	"github.com/lawvia/depintel/model"
)

// CargoParser parses Rust Cargo.toml files.
type CargoParser struct{}

func (p *CargoParser) Ecosystem() string { return "crates.io" }

func (p *CargoParser) Parse(content string) ([]model.ParsedPackage, error) {
	var raw struct {
		Dependencies    map[string]any `toml:"dependencies"`
		DevDependencies map[string]any `toml:"dev-dependencies"`
	}

	if _, err := toml.Decode(content, &raw); err != nil {
		return nil, fmt.Errorf("invalid TOML: %w", err)
	}

	var pkgs []model.ParsedPackage

	for name, val := range raw.Dependencies {
		version := extractCargoVersion(val)
		pkgs = append(pkgs, model.ParsedPackage{
			Name:      name,
			Version:   version,
			Ecosystem: "crates.io",
			IsDev:     false,
		})
	}

	for name, val := range raw.DevDependencies {
		version := extractCargoVersion(val)
		pkgs = append(pkgs, model.ParsedPackage{
			Name:      name,
			Version:   version,
			Ecosystem: "crates.io",
			IsDev:     true,
		})
	}

	return pkgs, nil
}

// extractCargoVersion handles both string ("1.0") and table ({ version = "1.0" }) formats.
func extractCargoVersion(val any) string {
	switch v := val.(type) {
	case string:
		return cleanCargoVersion(v)
	case map[string]any:
		if ver, ok := v["version"]; ok {
			if s, ok := ver.(string); ok {
				return cleanCargoVersion(s)
			}
		}
	}
	return ""
}

func cleanCargoVersion(v string) string {
	v = strings.TrimSpace(v)
	for _, prefix := range []string{">=", "<=", "^", "~", ">", "<", "="} {
		v = strings.TrimPrefix(v, prefix)
	}
	return strings.TrimSpace(v)
}
