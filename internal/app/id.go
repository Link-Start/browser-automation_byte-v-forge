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
	var buf [16]byte
	if _, err := rand.Read(buf[:]); err == nil {
		return prefix + hex.EncodeToString(buf[:])
	}
	binary.BigEndian.PutUint64(buf[:8], uint64(time.Now().UnixNano()))
	binary.BigEndian.PutUint64(buf[8:], fallbackIDCounter.Add(1))
	return prefix + hex.EncodeToString(buf[:])
}
