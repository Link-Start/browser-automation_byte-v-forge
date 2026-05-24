package main

import (
	"fmt"

	browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/byte/v/forge/contracts/browserautomation/v1"
	"github.com/byte-v-forge/browser-automation/internal/adapters/runtime/camoufox"
	"github.com/byte-v-forge/browser-automation/internal/core"
	"google.golang.org/protobuf/proto"
)

type runtimePlugin struct {
	runtimeID       string
	profileDefaults *browserautomationv1.BrowserProfile
	build           func(config) (core.Runtime, error)
}

func runtimePlugins() []runtimePlugin {
	return []runtimePlugin{camoufoxRuntimePlugin()}
}

func runtimePluginByKey(key string) *runtimePlugin {
	for _, plugin := range runtimePlugins() {
		if plugin.runtimeID == key {
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
		return nil, fmt.Errorf("configure %s runtime: %w", plugin.runtimeID, err)
	}
	return runtime, nil
}

func camoufoxRuntimePlugin() runtimePlugin {
	return runtimePlugin{
		runtimeID: defaultRuntime,
		profileDefaults: &browserautomationv1.BrowserProfile{
			BrowserKind: browserautomationv1.BrowserKind_BROWSER_KIND_FIREFOX,
			Labels:      map[string]string{"adapter": "camoufox"},
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
	plugins := runtimePlugins()
	out := make(map[string]*browserautomationv1.BrowserProfile, len(plugins))
	for _, plugin := range plugins {
		out[plugin.runtimeID] = proto.Clone(plugin.profileDefaults).(*browserautomationv1.BrowserProfile)
	}
	return out
}
