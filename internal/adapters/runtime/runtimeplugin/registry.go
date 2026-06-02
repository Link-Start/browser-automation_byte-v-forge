package runtimeplugin

import (
	"fmt"
	"sort"
	"strings"

	browserautomationinternalv1 "github.com/byte-v-forge/browser-automation/gen/go/byte/v/forge/browserautomation/private/v1"
	"github.com/byte-v-forge/browser-automation/internal/core"
	browserautomationv1 "github.com/byte-v-forge/common-lib/gen/go/byte/v/forge/contracts/browserautomation/v1"
	"google.golang.org/protobuf/proto"
)

type Factory[C any] func(C) (core.Runtime, error)

type Plugin[C any] interface {
	Config() *browserautomationinternalv1.BrowserRuntimeConfig
	NewRuntime(C) (core.Runtime, error)
}

type Definition[C any] struct {
	RuntimeConfig *browserautomationinternalv1.BrowserRuntimeConfig
	Factory       Factory[C]
}

type definitionPlugin[C any] struct{ definition Definition[C] }

type Registry[C any] struct {
	plugins map[string]Plugin[C]
	ids     []string
}

func NewDefinition[C any](definition Definition[C]) Plugin[C] {
	return definitionPlugin[C]{definition: definition}
}

func NewRegistry[C any](plugins ...Plugin[C]) (*Registry[C], error) {
	registry := &Registry[C]{plugins: make(map[string]Plugin[C], len(plugins))}
	for _, plugin := range plugins {
		if plugin == nil {
			return nil, fmt.Errorf("browser runtime plugin is required")
		}
		id := runtimeConfigID(plugin.Config())
		if id == "" {
			return nil, fmt.Errorf("browser runtime plugin id is required")
		}
		if _, exists := registry.plugins[id]; exists {
			return nil, fmt.Errorf("duplicate browser runtime plugin %q", id)
		}
		registry.plugins[id] = plugin
		registry.ids = append(registry.ids, id)
	}
	sort.Strings(registry.ids)
	return registry, nil
}

func (p definitionPlugin[C]) Config() *browserautomationinternalv1.BrowserRuntimeConfig {
	return cloneConfig(p.definition.RuntimeConfig)
}

func (p definitionPlugin[C]) NewRuntime(cfg C) (core.Runtime, error) {
	if p.definition.Factory == nil {
		return nil, fmt.Errorf("browser runtime factory is not configured")
	}
	return p.definition.Factory(cfg)
}

func (r *Registry[C]) Get(runtimeConfigID string) (Plugin[C], bool) {
	if r == nil {
		return nil, false
	}
	plugin, ok := r.plugins[normalizeRuntimeID(runtimeConfigID)]
	return plugin, ok
}

func (r *Registry[C]) NewRuntime(runtimeConfigID string, cfg C) (core.Runtime, error) {
	plugin, ok := r.Get(runtimeConfigID)
	if !ok {
		return nil, fmt.Errorf("unsupported browser runtime %q", runtimeConfigID)
	}
	runtime, err := plugin.NewRuntime(cfg)
	if err != nil {
		return nil, fmt.Errorf("configure %s runtime: %w", runtimeConfigID, err)
	}
	return runtime, nil
}

func (r *Registry[C]) Descriptors() []*browserautomationinternalv1.BrowserRuntimeConfig {
	if r == nil {
		return nil
	}
	out := make([]*browserautomationinternalv1.BrowserRuntimeConfig, 0, len(r.ids))
	for _, id := range r.ids {
		out = append(out, r.plugins[id].Config())
	}
	return out
}

func (r *Registry[C]) ProfileDefaults() map[string]*browserautomationv1.BrowserProfile {
	descriptors := r.Descriptors()
	out := make(map[string]*browserautomationv1.BrowserProfile, len(descriptors))
	for _, descriptor := range descriptors {
		out[descriptor.GetRuntimeConfigId()] = &browserautomationv1.BrowserProfile{
			BrowserKind: firstSupportedBrowser(descriptor.GetSupportedBrowsers()),
			Labels:      descriptor.GetLabels(),
		}
	}
	return out
}

func cloneConfig(config *browserautomationinternalv1.BrowserRuntimeConfig) *browserautomationinternalv1.BrowserRuntimeConfig {
	if config == nil {
		return &browserautomationinternalv1.BrowserRuntimeConfig{}
	}
	return proto.Clone(config).(*browserautomationinternalv1.BrowserRuntimeConfig)
}

func runtimeConfigID(config *browserautomationinternalv1.BrowserRuntimeConfig) string {
	return normalizeRuntimeID(config.GetRuntimeConfigId())
}

func normalizeRuntimeID(value string) string { return strings.ToLower(strings.TrimSpace(value)) }

func firstSupportedBrowser(browsers []browserautomationv1.BrowserKind) browserautomationv1.BrowserKind {
	if len(browsers) == 0 {
		return browserautomationv1.BrowserKind_BROWSER_KIND_UNSPECIFIED
	}
	return browsers[0]
}
