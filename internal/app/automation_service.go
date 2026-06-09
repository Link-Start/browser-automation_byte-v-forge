package app

import "github.com/byte-v-forge/browser-automation/internal/core"

type AutomationService struct {
	store        core.Store
	runtime      core.Runtime
	clock        core.Clock
	ids          core.IDGenerator
	liveTokenKey []byte
	proxy        core.ProxyController
}

func NewAutomationService(store core.Store, runtime core.Runtime, proxy core.ProxyController, clock core.Clock, ids core.IDGenerator) *AutomationService {
	if runtime == nil {
		runtime = NoopRuntime{}
	}
	if clock == nil {
		clock = SystemClock{}
	}
	if ids == nil {
		ids = RandomIDGenerator{}
	}
	return &AutomationService{store: store, runtime: runtime, proxy: proxy, clock: clock, ids: ids, liveTokenKey: newLiveTokenKey()}
}
