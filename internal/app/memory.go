package app

import (
	"sync"
	"time"

	"github.com/byte-v-forge/browser-automation/internal/core"
)

type SystemClock struct{}

func (SystemClock) Now() time.Time {
	return time.Now().UTC()
}

type MemoryStore struct {
	mu               sync.RWMutex
	sessions         map[string]*core.Session
	sessionRequestID map[string]string
	tasks            map[string]*core.Task
	taskRequestID    map[string]string
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		sessions:         make(map[string]*core.Session),
		sessionRequestID: make(map[string]string),
		tasks:            make(map[string]*core.Task),
		taskRequestID:    make(map[string]string),
	}
}

func NewMemoryStoreWithData(sessions []*core.Session, tasks []*core.Task) *MemoryStore {
	store := NewMemoryStore()
	for _, session := range sessions {
		if session == nil {
			continue
		}
		store.sessions[session.GetSessionId()] = cloneSession(session)
		if session.GetRequestId() != "" {
			store.sessionRequestID[session.GetRequestId()] = session.GetSessionId()
		}
	}
	for _, task := range tasks {
		if task == nil {
			continue
		}
		store.tasks[task.GetTaskId()] = cloneTask(task)
		if task.GetRequestId() != "" {
			store.taskRequestID[task.GetRequestId()] = task.GetTaskId()
		}
	}
	return store
}
