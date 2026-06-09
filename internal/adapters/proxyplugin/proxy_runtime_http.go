package proxyplugin

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	proxyRuntimeMaxAttempts = 3
	proxyRuntimeRetryDelay  = 150 * time.Millisecond
)

func (c *proxyRuntimeClient) post(ctx context.Context, path string, request any, response any) error {
	payload, err := json.Marshal(request)
	if err != nil {
		return err
	}
	var lastErr error
	for attempt := 1; attempt <= proxyRuntimeMaxAttempts; attempt++ {
		retry, err := c.postPayload(ctx, path, payload, response)
		if err == nil {
			return nil
		}
		lastErr = err
		if !retry || attempt == proxyRuntimeMaxAttempts {
			return err
		}
		if err := waitProxyRuntimeRetry(ctx, attempt); err != nil {
			return err
		}
	}
	return lastErr
}

func (c *proxyRuntimeClient) postPayload(ctx context.Context, path string, payload []byte, response any) (bool, error) {
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+path, bytes.NewReader(payload))
	if err != nil {
		return false, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpResp, err := c.client.Do(httpReq)
	if err != nil {
		if ctx.Err() != nil {
			return false, ctx.Err()
		}
		return true, err
	}
	defer httpResp.Body.Close()
	if httpResp.StatusCode < 200 || httpResp.StatusCode >= 300 {
		return retryProxyRuntimeStatus(httpResp.StatusCode), fmt.Errorf("proxy-runtime request failed with status %d", httpResp.StatusCode)
	}
	if response == nil {
		return false, nil
	}
	if err := json.NewDecoder(httpResp.Body).Decode(response); err != nil && !errors.Is(err, io.EOF) {
		return false, err
	}
	return false, nil
}

func waitProxyRuntimeRetry(ctx context.Context, attempt int) error {
	timer := time.NewTimer(time.Duration(attempt) * proxyRuntimeRetryDelay)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

func retryProxyRuntimeStatus(statusCode int) bool {
	return statusCode == http.StatusTooManyRequests || statusCode >= 500
}
