package app

import (
	"context"
	"sort"

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

func (s *MemoryStore) ListSessions(_ context.Context, pageSize int, pageToken string) (core.SessionListResult, error) {
	offset, err := core.ParsePageToken(pageToken)
	if err != nil {
		return core.SessionListResult{}, err
	}
	pageSize = core.NormalizePageSize(pageSize)
	s.mu.RLock()
	defer s.mu.RUnlock()

	sessions := make([]*core.Session, 0, len(s.sessions))
	for _, session := range s.sessions {
		sessions = append(sessions, cloneSession(session))
	}
	sort.Slice(sessions, func(i, j int) bool {
		left := protoTime(sessions[i].GetUpdatedAt())
		right := protoTime(sessions[j].GetUpdatedAt())
		if !left.Equal(right) {
			return left.After(right)
		}
		return sessions[i].GetSessionId() < sessions[j].GetSessionId()
	})
	if offset >= len(sessions) {
		return core.SessionListResult{}, nil
	}
	end := offset + pageSize
	if end > len(sessions) {
		end = len(sessions)
	}
	nextPageToken := ""
	if end < len(sessions) {
		nextPageToken = core.PageToken(end)
	}
	return core.SessionListResult{Sessions: sessions[offset:end], NextPageToken: nextPageToken}, nil
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
