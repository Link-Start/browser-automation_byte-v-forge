package camoufox

import (
	browserautomationinternalv1 "github.com/byte-v-forge/browser-automation/gen/go/byte/v/forge/browserautomation/private/v1"
	"github.com/byte-v-forge/browser-automation/internal/adapters/runtime/runtimeplugin"
	"github.com/byte-v-forge/browser-automation/internal/core"
	browserautomationv1 "github.com/byte-v-forge/common-lib/gen/go/byte/v/forge/contracts/browserautomation/v1"
)

func Plugin[C any](runtimeConfigID string, configFactory func(C) Config) runtimeplugin.Plugin[C] {
	return runtimeplugin.NewDefinition(runtimeplugin.Definition[C]{
		RuntimeConfig: Descriptor(runtimeConfigID),
		Factory: func(cfg C) (core.Runtime, error) {
			return NewRuntime(configFactory(cfg))
		},
	})
}

func Descriptor(runtimeConfigID string) *browserautomationinternalv1.BrowserRuntimeConfig {
	return &browserautomationinternalv1.BrowserRuntimeConfig{
		RuntimeConfigId:   runtimeConfigID,
		Kind:              browserautomationinternalv1.BrowserRuntimeKind_BROWSER_RUNTIME_KIND_CAMOUFOX_SIDECAR,
		Enabled:           true,
		SupportedBrowsers: []browserautomationv1.BrowserKind{browserautomationv1.BrowserKind_BROWSER_KIND_FIREFOX},
		Labels:            map[string]string{"adapter": "camoufox"},
	}
}
