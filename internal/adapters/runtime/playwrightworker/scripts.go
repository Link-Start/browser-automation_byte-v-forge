package playwrightworker

import (
	"embed"
	"sort"
	"strings"
)

//go:embed scripts/*.py
var fragments embed.FS

func Script(main string) string {
	entries, err := fragments.ReadDir("scripts")
	if err != nil {
		panic(err)
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Name() < entries[j].Name() })
	var out strings.Builder
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".py") {
			continue
		}
		if entry.Name() == "99_entrypoint.py" {
			writeScript(&out, main)
		}
		data, err := fragments.ReadFile("scripts/" + entry.Name())
		if err != nil {
			panic(err)
		}
		writeScript(&out, string(data))
	}
	return out.String()
}

func writeScript(out *strings.Builder, data string) {
	out.WriteString(data)
	if !strings.HasSuffix(data, "\n") {
		out.WriteByte('\n')
	}
	out.WriteByte('\n')
}
