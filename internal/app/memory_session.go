package app

import (
	"context"

	"github.com/byte-v-forge/browser-automation/internal/core"
)

func (s *MemoryStore) CreateSession(_ context.Context, session *core.Session) error {
	if session == nil || session.GetSessionId() == "" {
		return core.NewError(core.CodeValidationFailed, "session_id is required", false)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.sessions[session.GetSessionId()]; ok {
		return core.NewError(core.CodeValidationFailed, "session already exists", false)
	}
	if session.GetRequestId() != "" {
		if _, ok := s.sessionRequestID[session.GetRequestId()]; ok {
			return core.NewError(core.CodeValidationFailed, "request_id already exists", false)
		}
		s.sessionRequestID[session.GetRequestId()] = session.GetSessionId()
	}
	s.sessions[session.GetSessionId()] = cloneSession(session)
	return nil
}

func (s *MemoryStore) GetSession(_ context.Context, sessionID string) (*core.Session, error) {
	if sessionID == "" {
		return nil, core.NewError(core.CodeValidationFailed, "session_id is required", false)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	session, ok := s.sessions[sessionID]
	if !ok {
		return nil, core.NewError(core.CodeSessionNotFound, "browser session not found", false)
	}
	return cloneSession(session), nil
}

func (s *MemoryStore) GetSessionByRequestID(_ context.Context, requestID string) (*core.Session, error) {
	if requestID == "" {
		return nil, core.NewError(core.CodeValidationFailed, "request_id is required", false)
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	sessionID, ok := s.sessionRequestID[requestID]
	if !ok {
		return nil, core.NewError(core.CodeSessionNotFound, "browser session not found", false)
	}
	return cloneSession(s.sessions[sessionID]), nil
}

func (s *MemoryStore) UpdateSession(_ context.Context, session *core.Session) error {
	if session == nil || session.GetSessionId() == "" {
		return core.NewError(core.CodeValidationFailed, "session_id is required", false)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.sessions[session.GetSessionId()]; !ok {
		return core.NewError(core.CodeSessionNotFound, "browser session not found", false)
	}
	s.sessions[session.GetSessionId()] = cloneSession(session)
	if session.GetRequestId() != "" {
		s.sessionRequestID[session.GetRequestId()] = session.GetSessionId()
	}
	return nil
}
