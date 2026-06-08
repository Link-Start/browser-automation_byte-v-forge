package camoufox

import (
	"encoding/json"

	"github.com/byte-v-forge/browser-automation/internal/platform/proxyurl"
)

func encodeOptions(options map[string]any) (string, error) {
	payload, err := json.Marshal(options)
	if err != nil {
		return "", err
	}
	return string(payload), nil
}

func parseProxyOption(raw string) (map[string]string, error) {
	parsed, err := proxyurl.Parse(raw, "http")
	if err != nil {
		return nil, err
	}
	return proxyurl.BrowserMap(parsed)
}
