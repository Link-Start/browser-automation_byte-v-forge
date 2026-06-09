package httpadapter

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/browser/automation/v1"
	"github.com/byte-v-forge/browser-automation/internal/app"
	"github.com/byte-v-forge/browser-automation/internal/core"
	"github.com/byte-v-forge/browser-automation/internal/platform/protojsonx"
	"github.com/gorilla/websocket"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/durationpb"
)

const maxRequestBodyBytes = 8 * 1024 * 1024
const liveFrameInterval = 500 * time.Millisecond
const liveOperationTimeout = 5 * time.Second

type Server struct {
	service *app.AutomationService
	webDir  string
}

func NewServer(service *app.AutomationService, webDir string) *Server {
	return &Server{service: service, webDir: strings.TrimSpace(webDir)}
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(r.URL.Path, "/ws/browser-automation/live/") {
		s.serveLiveWebSocket(w, r, strings.TrimPrefix(r.URL.Path, "/ws/browser-automation/live/"))
		return
	}
	if strings.HasPrefix(r.URL.Path, "/live/") {
		s.serveStatic(w, r)
		return
	}
	if strings.HasPrefix(r.URL.Path, "/api/browser-automation/") {
		s.serveAPI(w, r)
		return
	}
	if r.URL.Path == "/api/health" {
		writeJSON(w, http.StatusOK, []byte(`{"status":"ok"}`))
		return
	}
	s.serveStatic(w, r)
}

func (s *Server) serveAPI(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/browser-automation")
	switch {
	case r.Method == http.MethodPost && path == "/sessions":
		s.startSession(w, r)
	case r.Method == http.MethodGet && path == "/sessions":
		s.listSessions(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(path, "/sessions/"):
		s.getSession(w, r, strings.TrimPrefix(path, "/sessions/"))
	case r.Method == http.MethodPost && strings.HasPrefix(path, "/sessions/") && strings.HasSuffix(path, "/live"):
		s.createLiveView(w, r, path)
	case r.Method == http.MethodPost && strings.HasPrefix(path, "/sessions/") && strings.HasSuffix(path, "/stop"):
		s.stopSession(w, r, path)
	case r.Method == http.MethodPost && path == "/tasks/execute":
		s.executeTask(w, r)
	case r.Method == http.MethodGet && path == "/tasks":
		s.listTasks(w, r)
	case r.Method == http.MethodGet && strings.HasPrefix(path, "/tasks/"):
		s.getTask(w, r, strings.TrimPrefix(path, "/tasks/"))
	default:
		http.NotFound(w, r)
	}
}

func (s *Server) startSession(w http.ResponseWriter, r *http.Request) {
	request := &browserautomationv1.StartBrowserSessionRequest{}
	if !readProto(w, r, request) {
		return
	}
	session, err := s.service.StartBrowserSession(r.Context(), request.GetRequestId(), request.GetProfile(), protoDuration(request.GetTtl()), request.GetLabels())
	writeProto(w, &browserautomationv1.StartBrowserSessionResponse{Session: session, Error: core.AutomationError(err)})
}

func (s *Server) getSession(w http.ResponseWriter, r *http.Request, sessionID string) {
	session, err := s.service.GetBrowserSession(r.Context(), strings.TrimSpace(sessionID))
	writeProto(w, &browserautomationv1.GetBrowserSessionResponse{Session: session, Error: core.AutomationError(err)})
}

func (s *Server) listSessions(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	result, err := s.service.ListBrowserSessions(r.Context(), parseInt(query.Get("page_size")), query.Get("page_token"))
	writeProto(w, &browserautomationv1.ListBrowserSessionsResponse{Sessions: result.Sessions, NextPageToken: result.NextPageToken, Error: core.AutomationError(err)})
}

func (s *Server) stopSession(w http.ResponseWriter, r *http.Request, path string) {
	sessionID := strings.TrimSuffix(strings.TrimPrefix(path, "/sessions/"), "/stop")
	request := &browserautomationv1.StopBrowserSessionRequest{}
	if r.ContentLength != 0 && !readProto(w, r, request) {
		return
	}
	if request.SessionId == "" {
		request.SessionId = strings.TrimSpace(sessionID)
	}
	session, err := s.service.StopBrowserSession(r.Context(), request.GetSessionId(), request.GetReason())
	writeProto(w, &browserautomationv1.StopBrowserSessionResponse{Session: session, Error: core.AutomationError(err)})
}

func (s *Server) createLiveView(w http.ResponseWriter, r *http.Request, path string) {
	sessionID := strings.TrimSuffix(strings.TrimPrefix(path, "/sessions/"), "/live")
	request := &browserautomationv1.CreateBrowserLiveViewRequest{}
	if r.ContentLength != 0 && !readProto(w, r, request) {
		return
	}
	if request.SessionId == "" {
		request.SessionId = strings.TrimSpace(sessionID)
	}
	liveView, err := s.service.CreateBrowserLiveView(r.Context(), request)
	writeProto(w, &browserautomationv1.CreateBrowserLiveViewResponse{LiveView: liveView, Error: core.AutomationError(err)})
}

func (s *Server) executeTask(w http.ResponseWriter, r *http.Request) {
	request := &browserautomationv1.ExecuteBrowserCommandsRequest{}
	if !readProto(w, r, request) {
		return
	}
	task, err := s.service.ExecuteBrowserCommands(r.Context(), request.GetRequestId(), request.GetInput())
	writeProto(w, &browserautomationv1.ExecuteBrowserCommandsResponse{Task: task, Results: taskResults(task), Error: core.AutomationError(err)})
}

func (s *Server) getTask(w http.ResponseWriter, r *http.Request, taskID string) {
	task, err := s.service.GetBrowserTask(r.Context(), strings.TrimSpace(taskID))
	writeProto(w, &browserautomationv1.GetBrowserTaskResponse{Task: task, Error: core.AutomationError(err)})
}

func (s *Server) listTasks(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	filter := &browserautomationv1.BrowserTaskFilter{
		SessionId:   query.Get("session_id"),
		TaskKey:     query.Get("task_key"),
		ScenarioKey: query.Get("scenario_key"),
		LabelKey:    query.Get("label_key"),
		LabelValue:  query.Get("label_value"),
	}
	result, err := s.service.ListBrowserTasks(r.Context(), filter, parseInt(query.Get("page_size")), query.Get("page_token"))
	writeProto(w, &browserautomationv1.ListBrowserTasksResponse{Tasks: result.Tasks, NextPageToken: result.NextPageToken, Error: core.AutomationError(err)})
}

func (s *Server) serveLiveWebSocket(w http.ResponseWriter, r *http.Request, token string) {
	view, err := s.service.AuthorizeBrowserLiveView(r.Context(), token)
	if err != nil {
		writeProto(w, &browserautomationv1.BrowserLiveServerMessage{Error: core.AutomationError(err)})
		return
	}
	upgrader := websocket.Upgrader{CheckOrigin: sameOrigin}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()
	conn.SetReadLimit(maxRequestBodyBytes)
	errCh := make(chan error, 1)
	go s.readLiveMessages(r.Context(), conn, view, errCh)
	ticker := time.NewTicker(liveFrameInterval)
	defer ticker.Stop()
	var sequence int64
	for {
		select {
		case <-r.Context().Done():
			return
		case <-errCh:
			return
		case <-ticker.C:
			sequence++
			ctx, cancel := context.WithTimeout(r.Context(), liveOperationTimeout)
			frame, captureErr := s.service.CaptureLiveFrame(ctx, view, sequence)
			cancel()
			message := &browserautomationv1.BrowserLiveServerMessage{Frame: frame, Error: core.AutomationError(captureErr)}
			if err := writeWebSocketProto(conn, message); err != nil {
				return
			}
			if captureErr != nil {
				return
			}
		}
	}
}

func (s *Server) readLiveMessages(ctx context.Context, conn *websocket.Conn, view *browserautomationv1.BrowserLiveView, errCh chan<- error) {
	for {
		_, data, err := conn.ReadMessage()
		if err != nil {
			select {
			case errCh <- err:
			default:
			}
			return
		}
		message := &browserautomationv1.BrowserLiveClientMessage{}
		if err := protojsonx.UnmarshalOptions.Unmarshal(data, message); err != nil || message.GetInput() == nil {
			continue
		}
		dispatchCtx, cancel := context.WithTimeout(ctx, liveOperationTimeout)
		err = s.service.DispatchLiveInput(dispatchCtx, view, message.GetInput())
		cancel()
		if err != nil {
			select {
			case errCh <- err:
			default:
			}
			return
		}
	}
}

func (s *Server) serveStatic(w http.ResponseWriter, r *http.Request) {
	if s.webDir == "" {
		http.NotFound(w, r)
		return
	}
	path := filepath.Clean(strings.TrimPrefix(r.URL.Path, "/"))
	if path == "." {
		path = "index.html"
	}
	file := filepath.Join(s.webDir, path)
	if !strings.HasPrefix(file, filepath.Clean(s.webDir)+string(os.PathSeparator)) && file != filepath.Clean(s.webDir) {
		http.NotFound(w, r)
		return
	}
	if info, err := os.Stat(file); err == nil && !info.IsDir() {
		http.ServeFile(w, r, file)
		return
	}
	index := filepath.Join(s.webDir, "index.html")
	if _, err := os.Stat(index); err == nil {
		http.ServeFile(w, r, index)
		return
	}
	http.NotFound(w, r)
}

func writeWebSocketProto(conn *websocket.Conn, message proto.Message) error {
	data, err := protojsonx.Marshal(message)
	if err != nil {
		return err
	}
	return conn.WriteMessage(websocket.TextMessage, data)
}

func sameOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	parsed, err := url.Parse(origin)
	if err != nil {
		return false
	}
	return strings.EqualFold(parsed.Host, r.Host)
}

func readProto(w http.ResponseWriter, r *http.Request, message proto.Message) bool {
	defer r.Body.Close()
	data, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxRequestBodyBytes))
	if err != nil {
		writeError(w, http.StatusBadRequest, "request body is invalid")
		return false
	}
	if len(strings.TrimSpace(string(data))) == 0 {
		writeError(w, http.StatusBadRequest, "request body is required")
		return false
	}
	if err := protojsonx.UnmarshalOptions.Unmarshal(data, message); err != nil {
		writeError(w, http.StatusBadRequest, "request body is not valid proto JSON")
		return false
	}
	return true
}

func writeProto(w http.ResponseWriter, message proto.Message) {
	data, err := protojsonx.Marshal(message)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "response encode failed")
		return
	}
	writeJSON(w, http.StatusOK, data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	payload, err := json.Marshal(map[string]string{"error": message})
	if err != nil {
		payload = []byte(`{"error":"internal"}`)
	}
	writeJSON(w, status, payload)
}

func writeJSON(w http.ResponseWriter, status int, data []byte) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_, _ = w.Write(data)
}

func parseInt(value string) int {
	var out int
	for _, r := range strings.TrimSpace(value) {
		if r < '0' || r > '9' {
			return 0
		}
		out = out*10 + int(r-'0')
	}
	return out
}

func taskResults(task *browserautomationv1.BrowserTask) []*browserautomationv1.BrowserCommandResult {
	if task == nil {
		return nil
	}
	return task.GetResults()
}

func protoDuration(value *durationpb.Duration) time.Duration {
	if value == nil {
		return 0
	}
	return value.AsDuration()
}
