package app

import (
	"time"

	"github.com/byte-v-forge/browser-automation/internal/core"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func cloneSession(session *core.Session) *core.Session {
	if session == nil {
		return nil
	}
	return proto.Clone(session).(*core.Session)
}

func cloneTask(task *core.Task) *core.Task {
	if task == nil {
		return nil
	}
	return proto.Clone(task).(*core.Task)
}

func cloneMap(in map[string]string) map[string]string {
	if len(in) == 0 {
		return nil
	}
	out := make(map[string]string, len(in))
	for key, value := range in {
		out[key] = value
	}
	return out
}

func protoTime(timestamp *timestamppb.Timestamp) time.Time {
	if timestamp == nil {
		return time.Time{}
	}
	return timestamp.AsTime()
}
