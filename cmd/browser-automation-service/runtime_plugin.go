package main

import (
	"fmt"

	"github.com/byte-v-forge/browser-automation/internal/adapters/runtime/camoufox"
	"github.com/byte-v-forge/browser-automation/internal/adapters/runtime/runtimeplugin"
	"github.com/byte-v-forge/browser-automation/internal/core"
)

func newRuntimeRegistry() (*runtimeplugin.Registry[config], error) {
	return runtimeplugin.NewRegistry(
		camoufox.Plugin(defaultRuntime, camoufoxConfig),
	)
}

func newRuntime(registry *runtimeplugin.Registry[config], cfg config) (core.Runtime, error) {
	if _, ok := registry.Get(cfg.Runtime); !ok {
		return nil, fmt.Errorf("unsupported BROWSER_AUTOMATION_RUNTIME %q", cfg.Runtime)
	}
	return registry.NewRuntime(cfg.Runtime, cfg)
}

func camoufoxConfig(cfg config) camoufox.Config {
	return camoufox.Config{
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
	}
}
