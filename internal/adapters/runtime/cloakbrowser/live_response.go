package cloakbrowser

import (
	"encoding/json"

	browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/browser/automation/v1"
	"github.com/byte-v-forge/browser-automation/internal/core"
	"github.com/byte-v-forge/browser-automation/internal/platform/protojsonx"
)

type liveFrameEnvelope struct {
	Type  string          `json:"type"`
	Frame json.RawMessage `json:"frame"`
	Error *workerError    `json:"error"`
}

type liveInputEnvelope struct {
	Type  string       `json:"type"`
	Error *workerError `json:"error"`
}

func decodeLiveFrameResponse(line string) (*browserautomationv1.BrowserLiveFrame, error) {
	var envelope liveFrameEnvelope
	if err := json.Unmarshal([]byte(line), &envelope); err != nil {
		return nil, core.NewError(core.CodeBrowserUnavailable, "cloakbrowser live frame response is invalid: "+err.Error(), true)
	}
	if envelope.Error != nil {
		return nil, core.NewError(core.ErrorCode(envelope.Error.Code), envelope.Error.Message, envelope.Error.Retryable)
	}
	if envelope.Type != "live_frame" {
		return nil, core.NewError(core.CodeBrowserUnavailable, "cloakbrowser live frame response type is invalid", true)
	}
	frame := &browserautomationv1.BrowserLiveFrame{}
	if err := protojsonx.UnmarshalOptions.Unmarshal(envelope.Frame, frame); err != nil {
		return nil, core.NewError(core.CodeBrowserUnavailable, "cloakbrowser live frame is invalid: "+err.Error(), true)
	}
	return frame, nil
}

func decodeLiveInputResponse(line string) error {
	var envelope liveInputEnvelope
	if err := json.Unmarshal([]byte(line), &envelope); err != nil {
		return core.NewError(core.CodeBrowserUnavailable, "cloakbrowser live input response is invalid: "+err.Error(), true)
	}
	if envelope.Error != nil {
		return core.NewError(core.ErrorCode(envelope.Error.Code), envelope.Error.Message, envelope.Error.Retryable)
	}
	if envelope.Type != "live_input_result" {
		return core.NewError(core.CodeBrowserUnavailable, "cloakbrowser live input response type is invalid", true)
	}
	return nil
}
