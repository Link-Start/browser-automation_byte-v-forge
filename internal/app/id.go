package app

import (
	"encoding/binary"
	"encoding/hex"
	"sync/atomic"
	"time"

	"github.com/byte-v-forge/common-lib/randx"
)

type RandomIDGenerator struct{}

var fallbackIDCounter atomic.Uint64

func (RandomIDGenerator) NewID(prefix string) string {
	if id, err := randx.Hex(16); err == nil {
		return prefix + id
	}
	var buf [16]byte
	binary.BigEndian.PutUint64(buf[:8], uint64(time.Now().UnixNano()))
	binary.BigEndian.PutUint64(buf[8:], fallbackIDCounter.Add(1))
	return prefix + hex.EncodeToString(buf[:])
}
