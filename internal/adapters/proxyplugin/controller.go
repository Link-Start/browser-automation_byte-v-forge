package proxyplugin

import (
	"context"
	"fmt"
	"strings"
	"sync"

	browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/browser/automation/v1"
	"github.com/byte-v-forge/browser-automation/internal/core"
	"github.com/byte-v-forge/browser-automation/internal/platform/proxyurl"
)

const (
	manualRefPrefix       = "manual:"
	proxyRuntimeRefPrefix = "proxy-runtime:"
)

type Controller struct {
	manual       map[string]string
	proxyRuntime *proxyRuntimeClient
	mu           sync.Mutex
	sessions     map[string]sessionProxy
}

type sessionProxy struct {
	accountID string
	leaseID   string
	purpose   string
	url       string
}

func NewController(cfg Config) (*Controller, error) {
	manual := make(map[string]string, len(cfg.ManualRefs))
	for key, value := range cfg.ManualRefs {
		key = strings.TrimSpace(key)
		value = strings.TrimSpace(value)
		if key == "" || value == "" {
			return nil, fmt.Errorf("manual proxy refs cannot contain empty key or value")
		}
		if err := validateProxyValue(value); err != nil {
			return nil, fmt.Errorf("manual proxy ref %q is invalid", key)
		}
		manual[key] = value
	}
	client, err := newProxyRuntimeClient(cfg)
	if err != nil {
		return nil, err
	}
	return &Controller{manual: manual, proxyRuntime: client, sessions: map[string]sessionProxy{}}, nil
}

func (c *Controller) PrepareSessionProxy(ctx context.Context, session *core.Session, selection *browserautomationv1.BrowserProxySelection) error {
	if session == nil || session.GetSessionId() == "" {
		return core.NewError(core.CodeValidationFailed, "session is required", false)
	}
	profile := session.GetProfile()
	if profile == nil {
		return nil
	}
	lease, proxyRef, err := c.resolveSelection(ctx, session.GetSessionId(), selection, profile.GetProxyRef())
	if err != nil {
		return core.NewError(core.CodeProxyFailed, err.Error(), false)
	}
	profile.ProxyRef = proxyRef
	if lease.url == "" {
		return nil
	}
	c.mu.Lock()
	c.sessions[session.GetSessionId()] = lease
	c.mu.Unlock()
	return nil
}

func (c *Controller) ResolveSessionProxy(_ context.Context, session *core.Session) (string, error) {
	if session == nil {
		return "", nil
	}
	c.mu.Lock()
	state := c.sessions[session.GetSessionId()]
	c.mu.Unlock()
	return state.url, nil
}

func (c *Controller) ReleaseSessionProxy(ctx context.Context, session *core.Session) error {
	if session == nil {
		return nil
	}
	c.mu.Lock()
	state := c.sessions[session.GetSessionId()]
	delete(c.sessions, session.GetSessionId())
	c.mu.Unlock()
	if state.leaseID == "" || c.proxyRuntime == nil {
		return nil
	}
	return c.proxyRuntime.release(ctx, state.leaseID, state.accountID, state.purpose)
}

func (c *Controller) resolveSelection(ctx context.Context, sessionID string, selection *browserautomationv1.BrowserProxySelection, legacyRef string) (sessionProxy, string, error) {
	if selection == nil || selection.GetProviderKind() == browserautomationv1.BrowserProxyProviderKind_BROWSER_PROXY_PROVIDER_KIND_UNSPECIFIED {
		return c.resolveLegacy(legacyRef)
	}
	switch selection.GetProviderKind() {
	case browserautomationv1.BrowserProxyProviderKind_BROWSER_PROXY_PROVIDER_KIND_NONE:
		return sessionProxy{}, "", nil
	case browserautomationv1.BrowserProxyProviderKind_BROWSER_PROXY_PROVIDER_KIND_MANUAL:
		return c.resolveManual(selection)
	case browserautomationv1.BrowserProxyProviderKind_BROWSER_PROXY_PROVIDER_KIND_PROXY_RUNTIME:
		return c.resolveProxyRuntime(ctx, sessionID, selection)
	default:
		return sessionProxy{}, "", fmt.Errorf("unsupported proxy provider")
	}
}

func (c *Controller) resolveLegacy(proxyRef string) (sessionProxy, string, error) {
	proxyRef = strings.TrimSpace(proxyRef)
	if proxyRef == "" {
		return sessionProxy{}, "", nil
	}
	proxyURL, ok := c.manual[proxyRef]
	if !ok {
		return sessionProxy{}, proxyRef, fmt.Errorf("proxy_ref %q is not configured", proxyRef)
	}
	return sessionProxy{url: proxyURL}, proxyRef, nil
}

func (c *Controller) resolveManual(selection *browserautomationv1.BrowserProxySelection) (sessionProxy, string, error) {
	if rawURL := strings.TrimSpace(selection.GetManualProxyUrl()); rawURL != "" {
		if err := validateProxyValue(rawURL); err != nil {
			return sessionProxy{}, "", err
		}
		return sessionProxy{url: rawURL}, manualRefPrefix + "session", nil
	}
	ref := strings.TrimSpace(selection.GetManualProxyRef())
	if ref == "" {
		return sessionProxy{}, "", nil
	}
	proxyURL, ok := c.manual[ref]
	if !ok {
		return sessionProxy{}, ref, fmt.Errorf("manual proxy %q is not configured", ref)
	}
	return sessionProxy{url: proxyURL}, ref, nil
}

func (c *Controller) resolveProxyRuntime(ctx context.Context, sessionID string, selection *browserautomationv1.BrowserProxySelection) (sessionProxy, string, error) {
	if c.proxyRuntime == nil {
		return sessionProxy{}, "", fmt.Errorf("proxy-runtime provider is not configured")
	}
	accountID := strings.TrimSpace(selection.GetProxyRuntimeAccountId())
	purpose := strings.TrimSpace(selection.GetProxyRuntimePurpose())
	lease, err := c.proxyRuntime.acquire(ctx, sessionID, accountID, purpose)
	if err != nil {
		return sessionProxy{}, "", err
	}
	ref := proxyRuntimeRefPrefix + lease.accountID
	return sessionProxy{accountID: lease.accountID, leaseID: lease.leaseID, purpose: lease.purpose, url: lease.proxyURL}, ref, nil
}

func validateProxyValue(raw string) error {
	parsed, err := proxyurl.Parse(raw, "http")
	if err != nil {
		return err
	}
	_, err = proxyurl.BrowserMap(parsed)
	return err
}
