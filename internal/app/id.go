package app

import (
	"crypto/rand"
	"encoding/binary"
	"encoding/hex"
	"sync/atomic"
	"time"
)

type RandomIDGenerator struct{}

var fallbackIDCounter atomic.Uint64

func (RandomIDGenerator) NewID(prefix string) string {
	if id, err := randomHex(16); err == nil {
		return prefix + id
	}
	var buf [16]byte
	binary.BigEndian.PutUint64(buf[:8], uint64(time.Now().UnixNano()))
	binary.BigEndian.PutUint64(buf[8:], fallbackIDCounter.Add(1))
	return prefix + hex.EncodeToString(buf[:])
}

func randomHex(size int) (string, error) {
	out := make([]byte, size)
	if _, err := rand.Read(out); err != nil {
		return "", err
	}
	return hex.EncodeToString(out), nil
}
