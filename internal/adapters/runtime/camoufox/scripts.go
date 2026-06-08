package camoufox

import (
	"embed"

	"github.com/byte-v-forge/browser-automation/internal/adapters/runtime/playwrightworker"
)

//go:embed scripts/server.py
var serverScript string

//go:embed scripts/worker_main.py
var workerMainScript string

type scripts struct {
	server string
	worker string
}

func defaultScripts() scripts {
	return scripts{
		server: serverScript,
		worker: playwrightworker.Script(workerMainScript),
	}
}

var _ embed.FS
