package camoufox

import browserautomationv1 "github.com/byte-v-forge/common-lib/gen/go/byte/v/forge/contracts/browserautomation/v1"

func workerOptions(endpoint string, cfg Config, session *browserautomationv1.BrowserSession) map[string]any {
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
	return map[string]any{
		"endpoint":        endpoint,
		"artifacts_dir":   cfg.ArtifactsDir,
		"context_options": contextOptions,
		"init_scripts":    profile.GetInitScripts(),
	}
}
