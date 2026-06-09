package camoufox

import (
	browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/browser/automation/v1"
)

func serverOptions(cfg Config, session *browserautomationv1.BrowserSession, proxyURL string) (map[string]any, error) {
	profile := session.GetProfile()
	options := map[string]any{
		"headless": cfg.Headless,
		"port":     cfg.ServerPort,
		"ws_path":  cfg.WSPathPrefix + safeID(session.GetSessionId()),
	}
	if profile.GetLocale() != "" {
		options["locale"] = profile.GetLocale()
	}
	if viewport := profile.GetViewport(); viewport != nil && viewport.GetWidth() > 0 && viewport.GetHeight() > 0 {
		options["window"] = []int32{viewport.GetWidth(), viewport.GetHeight()}
	}
	if proxyURL != "" {
		proxy, err := parseProxyOption(proxyURL)
		if err != nil {
			return nil, err
		}
		options["proxy"] = proxy
	}
	return options, nil
}
