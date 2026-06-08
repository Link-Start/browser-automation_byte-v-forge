package cloakbrowser

import (
	"fmt"
	"strings"

	browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/browser/automation/v1"
)

func workerOptions(cfg Config, session *browserautomationv1.BrowserSession) (map[string]any, error) {
	profile := session.GetProfile()
	launchOptions := map[string]any{
		"headless": cfg.Headless,
		"humanize": cfg.Humanize,
	}
	if proxyRef := strings.TrimSpace(profile.GetProxyRef()); proxyRef != "" {
		proxyURL := strings.TrimSpace(cfg.ProxyRefs[proxyRef])
		if proxyURL == "" {
			return nil, fmt.Errorf("proxy_ref %q is not configured", proxyRef)
		}
		proxy, err := parseProxyOption(proxyURL)
		if err != nil {
			return nil, fmt.Errorf("proxy_ref %q is invalid: %w", proxyRef, err)
		}
		launchOptions["proxy"] = proxy
	}
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
	return map[string]any{
		"artifacts_dir":   cfg.ArtifactsDir,
		"launch_options":  launchOptions,
		"context_options": contextOptions,
		"init_scripts":    profile.GetInitScripts(),
	}, nil
}
