package main

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/byte-v-forge/browser-automation/internal/core"
	"github.com/byte-v-forge/browser-automation/internal/platform/grpchealth"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
)

type runtimeShutdown interface {
	Shutdown(context.Context) error
}

func shutdownServers(grpcServer *grpc.Server, healthServer *health.Server, httpServer *http.Server, grace time.Duration) error {
	grpchealth.SetNotServing(healthServer)
	stopped := make(chan struct{})
	go func() {
		grpcServer.GracefulStop()
		close(stopped)
	}()
	ctx, cancel := context.WithTimeout(context.Background(), grace)
	defer cancel()
	if httpServer != nil {
		_ = httpServer.Shutdown(ctx)
	}
	select {
	case <-stopped:
		return nil
	case <-ctx.Done():
		grpcServer.Stop()
		return nil
	}
}

func shutdownRuntime(runtime core.Runtime, grace time.Duration) {
	shutdown, ok := runtime.(runtimeShutdown)
	if !ok {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), grace)
	defer cancel()
	if err := shutdown.Shutdown(ctx); err != nil {
		slog.Warn("browser runtime shutdown failed", "error", err)
	}
}
