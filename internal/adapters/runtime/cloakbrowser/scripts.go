package cloakbrowser

import (
	_ "embed"

	"github.com/byte-v-forge/browser-automation/internal/adapters/runtime/playwrightworker"
)

//go:embed scripts/worker_main.py
var workerMainScript string

func workerScript() string {
	return playwrightworker.Script(workerMainScript)
}
