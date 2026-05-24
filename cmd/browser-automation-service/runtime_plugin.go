package main

import (
	"fmt"

	browserautomationinternalv1 "github.com/byte-v-forge/browser-automation/gen/go/byte/v/forge/browserautomation/private/v1"
	browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/byte/v/forge/contracts/browserautomation/v1"
	"github.com/byte-v-forge/browser-automation/internal/adapters/runtime/camoufox"
	"github.com/byte-v-forge/browser-automation/internal/core"
	"google.golang.org/protobuf/proto"
)

type runtimePlugin struct {
	config *browserautomationinternalv1.BrowserRuntimeConfig
	build  func(config) (core.Runtime, error)
}

func runtimePlugins() []runtimePlugin {
	return []runtimePlugin{camoufoxRuntimePlugin()}
}

func runtimePluginByKey(key string) *runtimePlugin {
	for _, plugin := range runtimePlugins() {
		if plugin.config.GetRuntimeConfigId() == key {
			return &plugin
		}
	}
	return nil
}

func newRuntime(cfg config) (core.Runtime, error) {
	plugin := runtimePluginByKey(cfg.Runtime)
	if plugin == nil {
		return nil, fmt.Errorf("unsupported BROWSER_AUTOMATION_RUNTIME %q", cfg.Runtime)
	}
	runtime, err := plugin.build(cfg)
	if err != nil {
		return nil, fmt.Errorf("configure %s runtime: %w", plugin.config.GetRuntimeConfigId(), err)
	}
	return runtime, nil
}

func camoufoxRuntimePlugin() runtimePlugin {
	return runtimePlugin{
		config: &browserautomationinternalv1.BrowserRuntimeConfig{
			RuntimeConfigId:   defaultRuntime,
			Kind:              browserautomationinternalv1.BrowserRuntimeKind_BROWSER_RUNTIME_KIND_CAMOUFOX_SIDECAR,
			Enabled:           true,
			SupportedBrowsers: []browserautomationv1.BrowserKind{browserautomationv1.BrowserKind_BROWSER_KIND_FIREFOX},
			Labels:            map[string]string{"adapter": "camoufox"},
		},
		build: func(cfg config) (core.Runtime, error) {
			return camoufox.NewRuntime(camoufox.Config{
				PythonPath:      cfg.CamoufoxPythonPath,
				ArtifactsDir:    cfg.CamoufoxArtifactsDir,
				StartupTimeout:  cfg.CamoufoxStartupTimeout,
				ShutdownTimeout: cfg.CamoufoxShutdownTimeout,
				TaskTimeout:     cfg.CamoufoxTaskTimeout,
				Headless:        cfg.CamoufoxHeadless,
				ServerPort:      cfg.CamoufoxServerPort,
				WSPathPrefix:    cfg.CamoufoxWSPathPrefix,
				ExtraEnv:        cfg.CamoufoxExtraEnv,
				ProxyRefs:       cfg.CamoufoxProxyRefs,
			})
		},
	}
}

func runtimePluginProfileDefaults() map[string]*browserautomationv1.BrowserProfile {
	descriptors := runtimePluginDescriptors()
	out := make(map[string]*browserautomationv1.BrowserProfile, len(descriptors))
	for _, descriptor := range descriptors {
		out[descriptor.GetRuntimeConfigId()] = &browserautomationv1.BrowserProfile{
			BrowserKind: firstSupportedBrowser(descriptor.GetSupportedBrowsers()),
			Labels:      descriptor.GetLabels(),
		}
	}
	return out
}

func runtimePluginDescriptors() []*browserautomationinternalv1.BrowserRuntimeConfig {
	plugins := runtimePlugins()
	out := make([]*browserautomationinternalv1.BrowserRuntimeConfig, 0, len(plugins))
	for _, plugin := range plugins {
		out = append(out, proto.Clone(plugin.config).(*browserautomationinternalv1.BrowserRuntimeConfig))
	}
	return out
}

func firstSupportedBrowser(browsers []browserautomationv1.BrowserKind) browserautomationv1.BrowserKind {
	if len(browsers) == 0 {
		return browserautomationv1.BrowserKind_BROWSER_KIND_UNSPECIFIED
	}
	return browsers[0]
}
