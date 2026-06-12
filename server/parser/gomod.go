package parser

import (
	"regexp"
	"strings"

	"github.com/lawvia/depintel/model"
)

// GoModParser parses Go module go.mod files.
type GoModParser struct{}

func (p *GoModParser) Ecosystem() string { return "Go" }

var requireLineRegex = regexp.MustCompile(`^\s*([^\s]+)\s+(v[^\s]+)`)

func (p *GoModParser) Parse(content string) ([]model.ParsedPackage, error) {
	var pkgs []model.ParsedPackage
	lines := strings.Split(content, "\n")
	inRequireBlock := false

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Skip empty lines and comments
		if trimmed == "" || strings.HasPrefix(trimmed, "//") {
			continue
		}

		// Detect require block start/end
		if strings.HasPrefix(trimmed, "require (") || strings.HasPrefix(trimmed, "require(") {
			inRequireBlock = true
			continue
		}
		if inRequireBlock && trimmed == ")" {
			inRequireBlock = false
			continue
		}

		// Single-line require: require github.com/foo/bar v1.2.3
		if strings.HasPrefix(trimmed, "require ") && !strings.Contains(trimmed, "(") {
			rest := strings.TrimPrefix(trimmed, "require ")
			if matches := requireLineRegex.FindStringSubmatch(rest); matches != nil {
				pkgs = append(pkgs, model.ParsedPackage{
					Name:      matches[1],
					Version:   matches[2],
					Ecosystem: "Go",
					IsDev:     false,
				})
			}
			continue
		}

		// Inside require block
		if inRequireBlock {
			if matches := requireLineRegex.FindStringSubmatch(trimmed); matches != nil {
				isIndirect := strings.Contains(line, "// indirect")
				pkgs = append(pkgs, model.ParsedPackage{
					Name:      matches[1],
					Version:   matches[2],
					Ecosystem: "Go",
					IsDev:     isIndirect,
				})
			}
		}
	}

	return pkgs, nil
}
