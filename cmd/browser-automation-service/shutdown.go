package main

import (
	"context"
	"net/http"
	"time"

	"github.com/byte-v-forge/browser-automation/internal/platform/grpchealth"
	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
)

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
