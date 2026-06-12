package parser

import (
	"fmt"
	"strings"

	"github.com/lawvia/depintel/model"
)

// Parser defines the interface for manifest file parsers.
type Parser interface {
	Parse(content string) ([]model.ParsedPackage, error)
	Ecosystem() string
}

// DetectFormat attempts to identify the manifest format from content heuristics.
// Returns the format string or empty string if unknown.
func DetectFormat(content string) string {
	trimmed := strings.TrimSpace(content)

	// package.json: JSON with "dependencies" key
	if strings.HasPrefix(trimmed, "{") && (strings.Contains(content, `"dependencies"`) || strings.Contains(content, `"devDependencies"`)) {
		return "package.json"
	}

	// go.mod: starts with "module " or contains "require ("
	if strings.HasPrefix(trimmed, "module ") || strings.Contains(content, "require (") || strings.Contains(content, "require(") {
		return "go.mod"
	}

	// Cargo.toml: contains [dependencies] or [package] TOML headers
	if strings.Contains(content, "[dependencies]") || strings.Contains(content, "[dev-dependencies]") {
		return "Cargo.toml"
	}

	// requirements.txt: lines matching pkg==version or pkg>=version patterns
	lines := strings.Split(trimmed, "\n")
	reqPatternCount := 0
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if strings.Contains(line, "==") || strings.Contains(line, ">=") || strings.Contains(line, "<=") || strings.Contains(line, "~=") {
			reqPatternCount++
		}
	}
	if reqPatternCount > 0 && float64(reqPatternCount)/float64(len(lines)) > 0.3 {
		return "requirements.txt"
	}

	return ""
}

// ParseManifest auto-detects the format and parses the content.
func ParseManifest(content string, format string) ([]model.ParsedPackage, string, error) {
	if format == "" {
		format = DetectFormat(content)
	}
	if format == "" {
		return nil, "", fmt.Errorf("unable to detect manifest format; please specify the format explicitly")
	}

	var p Parser
	switch format {
	case "package.json":
		p = &PackageJSONParser{}
	case "go.mod":
		p = &GoModParser{}
	case "requirements.txt":
		p = &RequirementsParser{}
	case "Cargo.toml":
		p = &CargoParser{}
	default:
		return nil, format, fmt.Errorf("unsupported manifest format: %s", format)
	}

	pkgs, err := p.Parse(content)
	if err != nil {
		return nil, format, fmt.Errorf("failed to parse %s: %w", format, err)
	}

	return pkgs, format, nil
}
