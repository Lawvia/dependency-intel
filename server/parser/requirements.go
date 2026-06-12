package parser

import (
	"regexp"
	"strings"

	"github.com/lawvia/depintel/model"
)

// RequirementsParser parses Python requirements.txt files.
type RequirementsParser struct{}

func (p *RequirementsParser) Ecosystem() string { return "PyPI" }

// versionSplitter matches version specifiers like ==, >=, <=, ~=, !=, <, >
var versionSplitter = regexp.MustCompile(`([a-zA-Z0-9_\-\.]+)\s*(?:(==|>=|<=|~=|!=|<|>)\s*([^\s,;#]+))?`)

func (p *RequirementsParser) Parse(content string) ([]model.ParsedPackage, error) {
	var pkgs []model.ParsedPackage
	lines := strings.Split(content, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)

		// Skip empty lines, comments, and options
		if line == "" || strings.HasPrefix(line, "#") || strings.HasPrefix(line, "-") {
			continue
		}

		// Strip inline comments
		if idx := strings.Index(line, "#"); idx > 0 {
			line = strings.TrimSpace(line[:idx])
		}

		// Strip environment markers (e.g., ; python_version >= "3.6")
		if idx := strings.Index(line, ";"); idx > 0 {
			line = strings.TrimSpace(line[:idx])
		}

		// Skip lines with special syntax like -r, -e, etc.
		if strings.HasPrefix(line, "-") {
			continue
		}

		matches := versionSplitter.FindStringSubmatch(line)
		if matches == nil || matches[1] == "" {
			continue
		}

		name := strings.ToLower(matches[1]) // PyPI normalizes to lowercase
		version := ""
		if len(matches) > 3 {
			version = matches[3]
		}

		pkgs = append(pkgs, model.ParsedPackage{
			Name:      name,
			Version:   version,
			Ecosystem: "PyPI",
			IsDev:     false,
		})
	}

	return pkgs, nil
}
