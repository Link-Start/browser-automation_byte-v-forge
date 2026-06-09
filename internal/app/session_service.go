package app

import (
	"context"
	"time"

	browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/browser/automation/v1"
	"github.com/byte-v-forge/browser-automation/internal/core"
)

const defaultSessionTTL = 30 * time.Minute

func (s *AutomationService) StartBrowserSession(ctx context.Context, requestID string, profile *core.Profile, ttl time.Duration, labels map[string]string) (*core.Session, error) {
	if requestID != "" {
		existing, err := s.store.GetSessionByRequestID(ctx, requestID)
		if err == nil {
			return existing, nil
		}
		if !isSessionNotFound(err) {
			return nil, err
		}
	}
	profile = cloneProfile(profile)
	if err := validateProfile(profile); err != nil {
		return nil, err
	}
	if profile.GetBrowserKind() == browserautomationv1.BrowserKind_BROWSER_KIND_UNSPECIFIED {
		profile.BrowserKind = defaultBrowserKind(s.runtime)
	}
	if ttl < 0 {
		return nil, core.NewError(core.CodeValidationFailed, "ttl cannot be negative", false)
	}
	if ttl == 0 {
		ttl = defaultSessionTTL
	}
	if err := s.ensureSessionCapacity(); err != nil {
		return nil, err
	}
	now := s.clock.Now()
	if requestID == "" {
		requestID = s.ids.NewID("req_")
	}
	session := &browserautomationv1.BrowserSession{
		SessionId: s.ids.NewID("brsess_"),
		RequestId: requestID,
		Status:    browserautomationv1.BrowserSessionStatus_BROWSER_SESSION_STATUS_STARTING,
		Profile:   profile,
		Labels:    cloneMap(labels),
		CreatedAt: timestamp(now),
		UpdatedAt: timestamp(now),
		ExpiresAt: timestamp(now.Add(ttl)),
	}
	if err := s.store.CreateSession(ctx, session); err != nil {
		return nil, err
	}
	if err := s.runtime.StartSession(ctx, session); err != nil {
		session.Status = browserautomationv1.BrowserSessionStatus_BROWSER_SESSION_STATUS_FAILED
		session.LastError = core.AutomationError(asCoreError(err, core.CodeBrowserUnavailable))
		session.UpdatedAt = timestamp(s.clock.Now())
		_ = s.store.UpdateSession(ctx, session)
		return session, err
	}
	startedAt := s.clock.Now()
	session.Status = browserautomationv1.BrowserSessionStatus_BROWSER_SESSION_STATUS_RUNNING
	session.StartedAt = timestamp(startedAt)
	session.UpdatedAt = timestamp(startedAt)
	if err := s.store.UpdateSession(ctx, session); err != nil {
		return nil, err
	}
	return session, nil
}

func (s *AutomationService) GetBrowserSession(ctx context.Context, sessionID string) (*core.Session, error) {
	session, err := s.store.GetSession(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	return s.expireSessionIfNeeded(ctx, session)
}

func (s *AutomationService) ListBrowserSessions(ctx context.Context, pageSize int, pageToken string) (core.SessionListResult, error) {
	result, err := s.store.ListSessions(ctx, pageSize, pageToken)
	if err != nil {
		return core.SessionListResult{}, err
	}
	for index, session := range result.Sessions {
		current, expireErr := s.expireSessionIfNeeded(ctx, session)
		if expireErr != nil {
			return core.SessionListResult{}, expireErr
		}
		result.Sessions[index] = current
	}
	return result, nil
}

func (s *AutomationService) StopBrowserSession(ctx context.Context, sessionID, reason string) (*core.Session, error) {
	session, err := s.store.GetSession(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if core.SessionStatusIsFinal(session.GetStatus()) {
		return session, core.NewError(core.CodeSessionFinalized, "browser session already finalized", false)
	}
	session.Status = browserautomationv1.BrowserSessionStatus_BROWSER_SESSION_STATUS_STOPPING
	session.UpdatedAt = timestamp(s.clock.Now())
	if err := s.store.UpdateSession(ctx, session); err != nil {
		return nil, err
	}
	if err := s.runtime.StopSession(ctx, session, reason); err != nil {
		session.Status = browserautomationv1.BrowserSessionStatus_BROWSER_SESSION_STATUS_FAILED
		session.LastError = core.AutomationError(asCoreError(err, core.CodeBrowserUnavailable))
		session.UpdatedAt = timestamp(s.clock.Now())
		_ = s.store.UpdateSession(ctx, session)
		return session, err
	}
	stoppedAt := s.clock.Now()
	session.Status = browserautomationv1.BrowserSessionStatus_BROWSER_SESSION_STATUS_STOPPED
	session.StoppedAt = timestamp(stoppedAt)
	session.UpdatedAt = timestamp(stoppedAt)
	if reason != "" {
		if session.Labels == nil {
			session.Labels = make(map[string]string)
		}
		session.Labels["stop_reason"] = reason
	}
	if err := s.store.UpdateSession(ctx, session); err != nil {
		return nil, err
	}
	return session, nil
}

func (s *AutomationService) expireSessionIfNeeded(ctx context.Context, session *core.Session) (*core.Session, error) {
	if session == nil {
		return nil, core.NewError(core.CodeSessionNotFound, "browser session not found", false)
	}
	now := s.clock.Now()
	expiresAt := session.GetExpiresAt()
	if expiresAt == nil || !now.After(expiresAt.AsTime()) || core.SessionStatusIsFinal(session.GetStatus()) {
		return session, nil
	}
	session.Status = browserautomationv1.BrowserSessionStatus_BROWSER_SESSION_STATUS_EXPIRED
	session.UpdatedAt = timestamp(now)
	session.StoppedAt = timestamp(now)
	_ = s.runtime.StopSession(ctx, session, "browser session expired")
	if err := s.store.UpdateSession(ctx, session); err != nil {
		return nil, err
	}
	return session, nil
}

func (s *AutomationService) ensureSessionCapacity() error {
	capacity, ok := s.runtime.(core.RuntimeCapacity)
	if !ok {
		return nil
	}
	maxSessions := capacity.MaxSessionCount()
	if maxSessions < 1 {
		return nil
	}
	if capacity.ActiveSessionCount() < maxSessions {
		return nil
	}
	return core.NewError(core.CodeCapacityUnavailable, "browser session capacity is exhausted", true)
}
