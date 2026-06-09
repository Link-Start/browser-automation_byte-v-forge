package proxyplugin

import "time"

type Config struct {
	ManualRefs            map[string]string
	ProxyRuntimeBaseURL   string
	ProxyRuntimeTimeout   time.Duration
	ProxyRuntimePurpose   string
	ProxyRuntimeAccountID string
}
