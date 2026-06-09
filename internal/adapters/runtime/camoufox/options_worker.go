package camoufox

import browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/browser/automation/v1"

func workerOptions(endpoint string, cfg Config, session *browserautomationv1.BrowserSession, proxyURL string) (map[string]any, error) {
	profile := session.GetProfile()
	contextOptions := map[string]any{}
	if profile.GetLocale() != "" {
		contextOptions["locale"] = profile.GetLocale()
	}
	if profile.GetTimezone() != "" {
		contextOptions["timezone_id"] = profile.GetTimezone()
	}
	if profile.GetUserAgent() != "" {
		contextOptions["user_agent"] = profile.GetUserAgent()
	}
	if len(profile.GetExtraHttpHeaders()) > 0 {
		contextOptions["extra_http_headers"] = profile.GetExtraHttpHeaders()
	}
	if viewport := profile.GetViewport(); viewport != nil && viewport.GetWidth() > 0 && viewport.GetHeight() > 0 {
		contextOptions["viewport"] = map[string]int32{
			"width":  viewport.GetWidth(),
			"height": viewport.GetHeight(),
		}
		if viewport.GetDeviceScaleFactor() > 0 {
			contextOptions["device_scale_factor"] = viewport.GetDeviceScaleFactor()
		}
	}
	if proxyURL != "" {
		proxy, err := parseProxyOption(proxyURL)
		if err != nil {
			return nil, err
		}
		contextOptions["proxy"] = proxy
	}
	return map[string]any{
		"endpoint":        endpoint,
		"artifacts_dir":   cfg.ArtifactsDir,
		"context_options": contextOptions,
		"init_scripts":    profile.GetInitScripts(),
	}, nil
}
