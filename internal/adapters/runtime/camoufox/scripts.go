package camoufox

import (
	"embed"
	"sort"
	"strings"
)

//go:embed scripts/server.py
var serverScript string

//go:embed scripts/worker/*.py
var workerScripts embed.FS

type scripts struct {
	server string
	worker string
}

func defaultScripts() scripts {
	return scripts{
		server: serverScript,
		worker: embeddedWorkerScript(),
	}
}

func embeddedWorkerScript() string {
	entries, err := workerScripts.ReadDir("scripts/worker")
	if err != nil {
		panic(err)
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Name() < entries[j].Name() })
	var out strings.Builder
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".py") {
			continue
		}
		data, err := workerScripts.ReadFile("scripts/worker/" + entry.Name())
		if err != nil {
			panic(err)
		}
		out.Write(data)
		if !strings.HasSuffix(string(data), "\n") {
			out.WriteByte('\n')
		}
		out.WriteByte('\n')
	}
	return out.String()
}
