package main

import (
	"errors"
	"os"
	"strconv"
	"strings"
)

const (
	bytesPerMiB                     = int64(1024 * 1024)
	defaultSessionMemoryMiB         = int64(1024)
	defaultBrowserMemoryReserveMiB  = int64(768)
	defaultMaxConcurrentSessions    = 1
	unlimitedCgroupMemoryLimitBytes = int64(1 << 60)
)

func deriveMaxConcurrentSessions(configured int) int {
	if configured > 0 {
		return configured
	}
	limit, ok := cgroupMemoryLimitBytes()
	if !ok || limit <= 0 || limit >= unlimitedCgroupMemoryLimitBytes {
		return defaultMaxConcurrentSessions
	}
	available := limit - defaultBrowserMemoryReserveMiB*bytesPerMiB
	if available <= 0 {
		return defaultMaxConcurrentSessions
	}
	derived := int(available / (defaultSessionMemoryMiB * bytesPerMiB))
	if derived < defaultMaxConcurrentSessions {
		return defaultMaxConcurrentSessions
	}
	return derived
}

func cgroupMemoryLimitBytes() (int64, bool) {
	for _, path := range []string{"/sys/fs/cgroup/memory.max", "/sys/fs/cgroup/memory/memory.limit_in_bytes"} {
		value, ok := readMemoryLimitFile(path)
		if ok {
			return value, true
		}
	}
	return 0, false
}

func readMemoryLimitFile(path string) (int64, bool) {
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return 0, false
	}
	if err != nil {
		return 0, false
	}
	value := strings.TrimSpace(string(data))
	if value == "" || value == "max" {
		return unlimitedCgroupMemoryLimitBytes, true
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil || parsed <= 0 {
		return 0, false
	}
	return parsed, true
}
