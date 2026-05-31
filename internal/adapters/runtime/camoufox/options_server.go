package camoufox

import (
	"fmt"
	"strings"

	browserautomationv1 "github.com/byte-v-forge/common-lib/gen/go/byte/v/forge/contracts/browserautomation/v1"
)

func serverOptions(cfg Config, session *browserautomationv1.BrowserSession) (map[string]any, error) {
	profile := session.GetProfile()
	labels := profile.GetLabels()
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
	setStringOption(options, labels, "camoufox.os", "os")
	setBoolOption(options, labels, "camoufox.headless", "headless")
	setBoolOrStringOption(options, labels, "camoufox.geoip", "geoip")
	setBoolOption(options, labels, "camoufox.block_images", "block_images")
	setBoolOption(options, labels, "camoufox.block_webrtc", "block_webrtc")
	setBoolOption(options, labels, "camoufox.block_webgl", "block_webgl")
	setBoolOption(options, labels, "camoufox.disable_coop", "disable_coop")
	setBoolOption(options, labels, "camoufox.main_world_eval", "main_world_eval")
	setBoolOption(options, labels, "camoufox.enable_cache", "enable_cache")
	setBoolFloatOrStringOption(options, labels, "camoufox.humanize", "humanize")
	if proxyRef := strings.TrimSpace(profile.GetProxyRef()); proxyRef != "" {
		proxyURL := strings.TrimSpace(cfg.ProxyRefs[proxyRef])
		if proxyURL == "" {
			return nil, fmt.Errorf("proxy_ref %q is not configured", proxyRef)
		}
		proxy, err := parseProxyOption(proxyURL)
		if err != nil {
			return nil, fmt.Errorf("proxy_ref %q is invalid: %w", proxyRef, err)
		}
		options["proxy"] = proxy
	}
	return options, nil
}
