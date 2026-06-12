package marshal

import (
	"strings"

	"github.com/lawvia/depintel/model"
)

// Top popular packages per ecosystem for typosquatting detection.
var popularPackages = map[string][]string{
	"npm": {
		"lodash", "express", "react", "axios", "chalk", "commander", "moment",
		"webpack", "typescript", "debug", "uuid", "glob", "minimist", "semver",
		"yargs", "fs-extra", "bluebird", "underscore", "async", "request",
		"dotenv", "inquirer", "body-parser", "colors", "mkdirp", "rxjs",
		"jquery", "next", "vue", "angular", "eslint", "prettier", "babel",
		"mocha", "jest", "nodemon", "pm2", "socket.io", "mongoose", "sequelize",
		"passport", "jsonwebtoken", "bcrypt", "cors", "helmet", "morgan",
		"multer", "nodemailer", "puppeteer", "cheerio",
	},
	"PyPI": {
		"requests", "numpy", "pandas", "flask", "django", "scipy", "matplotlib",
		"beautifulsoup4", "pillow", "sqlalchemy", "celery", "redis", "boto3",
		"pytest", "setuptools", "wheel", "pip", "six", "pyyaml", "cryptography",
		"jinja2", "werkzeug", "click", "certifi", "urllib3", "idna", "chardet",
		"python-dateutil", "pytz", "pydantic", "fastapi", "uvicorn", "gunicorn",
		"httpx", "aiohttp", "scrapy", "tensorflow", "torch", "transformers",
		"scikit-learn", "black", "mypy", "flake8", "tox", "sphinx",
	},
	"Go": {
		"github.com/gin-gonic/gin", "github.com/gorilla/mux", "github.com/go-chi/chi",
		"github.com/stretchr/testify", "github.com/sirupsen/logrus", "go.uber.org/zap",
		"github.com/spf13/cobra", "github.com/spf13/viper", "google.golang.org/grpc",
		"github.com/golang/protobuf", "github.com/go-redis/redis", "gorm.io/gorm",
		"github.com/labstack/echo", "github.com/gofiber/fiber", "github.com/jackc/pgx",
	},
	"crates.io": {
		"serde", "tokio", "clap", "reqwest", "rand", "log", "regex", "chrono",
		"anyhow", "thiserror", "syn", "quote", "proc-macro2", "hyper", "actix-web",
		"tracing", "futures", "bytes", "once_cell", "lazy_static", "itertools",
	},
}

// analyzeTyposquat checks if a package name is suspiciously similar to popular packages.
func analyzeTyposquat(name string, ecosystem string) model.SignalResult {
	result := model.SignalResult{
		Name:   "typosquat",
		Weight: signalWeights["typosquat"],
	}

	popular, ok := popularPackages[ecosystem]
	if !ok {
		result.Score = 0
		result.Level = "safe"
		result.Verdict = "Typosquatting detection not available for this ecosystem"
		return result
	}

	nameLower := strings.ToLower(name)

	// Check if the package itself is in the popular list
	for _, p := range popular {
		if strings.ToLower(p) == nameLower {
			result.Score = 0
			result.Level = "safe"
			result.Verdict = "This is a well-known popular package"
			result.Details = map[string]any{"isPopular": true}
			return result
		}
	}

	// Check for suspiciously similar names
	bestDistance := 999
	bestMatch := ""

	for _, p := range popular {
		pLower := strings.ToLower(p)
		dist := levenshtein(nameLower, pLower)
		if dist < bestDistance {
			bestDistance = dist
			bestMatch = p
		}
	}

	switch {
	case bestDistance == 1:
		result.Score = 90
		result.Level = "critical"
		result.Verdict = "Name is 1 character away from popular package \"" + bestMatch + "\" — likely typosquat"
	case bestDistance == 2:
		result.Score = 70
		result.Level = "high"
		result.Verdict = "Name is similar to popular package \"" + bestMatch + "\" — possible typosquat"
	case bestDistance == 3:
		result.Score = 30
		result.Level = "medium"
		result.Verdict = "Name has some similarity to \"" + bestMatch + "\""
	default:
		result.Score = 0
		result.Level = "safe"
		result.Verdict = "No similarity to known popular packages detected"
	}

	result.Details = map[string]any{
		"closestMatch":      bestMatch,
		"levenshteinDist":   bestDistance,
		"isPopular":         false,
	}

	return result
}

// levenshtein calculates the Levenshtein edit distance between two strings.
func levenshtein(a, b string) int {
	la := len(a)
	lb := len(b)

	if la == 0 {
		return lb
	}
	if lb == 0 {
		return la
	}

	// Create matrix
	d := make([][]int, la+1)
	for i := range d {
		d[i] = make([]int, lb+1)
		d[i][0] = i
	}
	for j := 0; j <= lb; j++ {
		d[0][j] = j
	}

	for i := 1; i <= la; i++ {
		for j := 1; j <= lb; j++ {
			cost := 1
			if a[i-1] == b[j-1] {
				cost = 0
			}
			d[i][j] = min(
				d[i-1][j]+1,      // deletion
				d[i][j-1]+1,      // insertion
				d[i-1][j-1]+cost, // substitution
			)
		}
	}

	return d[la][lb]
}

func min(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}
