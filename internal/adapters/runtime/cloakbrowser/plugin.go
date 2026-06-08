package cloakbrowser

import (
	browserautomationprivatev1 "github.com/byte-v-forge/browser-automation/gen/go/browser/automation/private/v1"
	browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/browser/automation/v1"
	"github.com/byte-v-forge/browser-automation/internal/adapters/runtime/runtimeplugin"
	"github.com/byte-v-forge/browser-automation/internal/core"
)

func Plugin[C any](runtimeConfigID string, configFactory func(C) Config) runtimeplugin.Plugin[C] {
	return runtimeplugin.NewDefinition(runtimeplugin.Definition[C]{
		RuntimeConfig: Descriptor(runtimeConfigID),
		Factory: func(cfg C) (core.Runtime, error) {
			return NewRuntime(configFactory(cfg))
		},
	})
}

func Descriptor(runtimeConfigID string) *browserautomationprivatev1.BrowserRuntimeConfig {
	return &browserautomationprivatev1.BrowserRuntimeConfig{
		RuntimeConfigId:   runtimeConfigID,
		Kind:              browserautomationprivatev1.BrowserRuntimeKind_BROWSER_RUNTIME_KIND_CLOAK_BROWSER,
		Enabled:           true,
		SupportedBrowsers: []browserautomationv1.BrowserKind{browserautomationv1.BrowserKind_BROWSER_KIND_CHROMIUM},
		Labels:            map[string]string{"adapter": "cloakbrowser"},
	}
}
