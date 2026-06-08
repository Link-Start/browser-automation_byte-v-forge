package cloakbrowser

import (
	"encoding/json"

	browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/browser/automation/v1"
	"github.com/byte-v-forge/browser-automation/internal/core"
	"github.com/byte-v-forge/browser-automation/internal/platform/protojsonx"
)

type workerResponseEnvelope struct {
	Type      string            `json:"type"`
	TaskID    string            `json:"task_id"`
	Results   []json.RawMessage `json:"results"`
	Artifacts []json.RawMessage `json:"artifacts"`
	Error     *workerError      `json:"error"`
}

type workerError struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	Retryable bool   `json:"retryable"`
}

type decodedWorkerResponse struct {
	Results   []*browserautomationv1.BrowserCommandResult
	Artifacts []*browserautomationv1.BrowserArtifact
	Error     *core.Error
}

func decodeWorkerResponse(line string) (decodedWorkerResponse, error) {
	var envelope workerResponseEnvelope
	if err := json.Unmarshal([]byte(line), &envelope); err != nil {
		return decodedWorkerResponse{}, core.NewError(core.CodeBrowserUnavailable, "cloakbrowser worker response is invalid: "+err.Error(), true)
	}
	if envelope.Type != "task_result" {
		return decodedWorkerResponse{}, core.NewError(core.CodeBrowserUnavailable, "cloakbrowser worker response type is invalid", true)
	}
	unmarshal := protojsonx.UnmarshalOptions
	response := decodedWorkerResponse{
		Results:   make([]*browserautomationv1.BrowserCommandResult, 0, len(envelope.Results)),
		Artifacts: make([]*browserautomationv1.BrowserArtifact, 0, len(envelope.Artifacts)),
	}
	for _, raw := range envelope.Results {
		result := &browserautomationv1.BrowserCommandResult{}
		if err := unmarshal.Unmarshal(raw, result); err != nil {
			return decodedWorkerResponse{}, core.NewError(core.CodeBrowserUnavailable, "cloakbrowser command result is invalid: "+err.Error(), true)
		}
		response.Results = append(response.Results, result)
	}
	for _, raw := range envelope.Artifacts {
		artifact := &browserautomationv1.BrowserArtifact{}
		if err := unmarshal.Unmarshal(raw, artifact); err != nil {
			return decodedWorkerResponse{}, core.NewError(core.CodeBrowserUnavailable, "cloakbrowser artifact is invalid: "+err.Error(), true)
		}
		response.Artifacts = append(response.Artifacts, artifact)
	}
	if envelope.Error != nil {
		response.Error = core.NewError(core.ErrorCode(envelope.Error.Code), envelope.Error.Message, envelope.Error.Retryable)
	}
	return response, nil
}
