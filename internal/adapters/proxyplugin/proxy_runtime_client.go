package proxyplugin

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	defaultProxyRuntimeAccountID = "browser-automation"
	defaultProxyRuntimePurpose   = "browser-automation"
)

type proxyRuntimeClient struct {
	accountID string
	baseURL   string
	client    *http.Client
	purpose   string
}

type proxyRuntimeLease struct {
	accountID string
	leaseID   string
	purpose   string
	proxyURL  string
}

func newProxyRuntimeClient(cfg Config) (*proxyRuntimeClient, error) {
	baseURL := strings.TrimRight(strings.TrimSpace(cfg.ProxyRuntimeBaseURL), "/")
	if baseURL == "" {
		return nil, nil
	}
	parsed, err := url.Parse(baseURL)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return nil, fmt.Errorf("proxy-runtime base URL is invalid")
	}
	timeout := cfg.ProxyRuntimeTimeout
	if timeout == 0 {
		timeout = 10 * time.Second
	}
	if timeout < 0 {
		return nil, fmt.Errorf("proxy-runtime timeout cannot be negative")
	}
	purpose := strings.TrimSpace(cfg.ProxyRuntimePurpose)
	if purpose == "" {
		purpose = defaultProxyRuntimePurpose
	}
	return &proxyRuntimeClient{accountID: strings.TrimSpace(cfg.ProxyRuntimeAccountID), baseURL: baseURL, client: &http.Client{Timeout: timeout}, purpose: purpose}, nil
}

func (c *proxyRuntimeClient) acquire(ctx context.Context, sessionID string, accountID string, purpose string) (proxyRuntimeLease, error) {
	if accountID == "" {
		accountID = c.accountID
	}
	if accountID == "" {
		accountID = defaultProxyRuntimeAccountID
	}
	if purpose == "" {
		purpose = c.purpose
	}
	request := map[string]any{
		"accountId": accountID,
		"purpose":   purpose,
		"policy": map[string]any{
			"mode": "PROXY_SESSION_MODE_STICKY",
			"labels": map[string]string{
				"selection_seed": sessionID,
				"session_id":     sessionID,
				"source":         "browser-automation",
			},
		},
	}
	var response acquireProxyLeaseResponse
	if err := c.post(ctx, "/leases/acquire", request, &response); err != nil {
		return proxyRuntimeLease{}, err
	}
	leaseID := strings.TrimSpace(response.Lease.LeaseID)
	if leaseID == "" {
		return proxyRuntimeLease{}, errors.New("proxy-runtime lease_id is empty")
	}
	egress := response.Egress
	if egress.Host == "" || egress.Port <= 0 {
		egress = response.Lease.Egress
	}
	proxyURL, err := endpointURL(egress)
	if err != nil {
		return proxyRuntimeLease{}, err
	}
	return proxyRuntimeLease{accountID: accountID, leaseID: leaseID, purpose: purpose, proxyURL: proxyURL}, nil
}

func (c *proxyRuntimeClient) release(ctx context.Context, leaseID string, accountID string, purpose string) error {
	leaseID = strings.TrimSpace(leaseID)
	if leaseID == "" {
		return nil
	}
	if accountID == "" {
		accountID = c.accountID
	}
	if purpose == "" {
		purpose = c.purpose
	}
	request := map[string]string{"leaseId": leaseID, "accountId": accountID, "purpose": purpose}
	return c.post(ctx, "/leases/release", request, &struct{}{})
}

type acquireProxyLeaseResponse struct {
	Lease struct {
		LeaseID string               `json:"leaseId"`
		Egress  proxyRuntimeEndpoint `json:"egress"`
	} `json:"lease"`
	Egress proxyRuntimeEndpoint `json:"egress"`
}

type proxyRuntimeEndpoint struct {
	Protocol string            `json:"protocol"`
	Host     string            `json:"host"`
	Port     int               `json:"port"`
	Labels   map[string]string `json:"labels"`
}

func endpointURL(endpoint proxyRuntimeEndpoint) (string, error) {
	host := strings.TrimSpace(endpoint.Host)
	if host == "" || endpoint.Port <= 0 {
		return "", errors.New("proxy-runtime egress endpoint is invalid")
	}
	scheme := proxyRuntimeProtocol(endpoint.Protocol)
	value := &url.URL{Scheme: scheme, Host: net.JoinHostPort(host, strconv.Itoa(endpoint.Port))}
	username := strings.TrimSpace(endpoint.Labels["proxy_username"])
	password := strings.TrimSpace(endpoint.Labels["proxy_password"])
	if username != "" || password != "" {
		value.User = url.UserPassword(username, password)
	}
	return value.String(), nil
}

func proxyRuntimeProtocol(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "PROXY_PROTOCOL_SOCKS5", "SOCKS5":
		return "socks5"
	case "PROXY_PROTOCOL_HTTP", "HTTP", "", "PROXY_PROTOCOL_UNSPECIFIED":
		return "http"
	default:
		return "http"
	}
}
