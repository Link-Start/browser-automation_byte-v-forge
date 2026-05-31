package app

import (
	"errors"
	"time"

	"github.com/byte-v-forge/browser-automation/internal/core"
	browserautomationv1 "github.com/byte-v-forge/common-lib/gen/go/byte/v/forge/contracts/browserautomation/v1"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/durationpb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func isSessionNotFound(err error) bool {
	var coreErr *core.Error
	return errors.As(err, &coreErr) && coreErr.Code == core.CodeSessionNotFound
}

func isTaskNotFound(err error) bool {
	var coreErr *core.Error
	return errors.As(err, &coreErr) && coreErr.Code == core.CodeTaskNotFound
}

func asCoreError(err error, fallback core.ErrorCode) *core.Error {
	if err == nil {
		return nil
	}
	var coreErr *core.Error
	if errors.As(err, &coreErr) {
		return coreErr
	}
	return core.NewError(fallback, err.Error(), true)
}

func cloneProfile(profile *core.Profile) *core.Profile {
	if profile == nil {
		return &browserautomationv1.BrowserProfile{}
	}
	return proto.Clone(profile).(*browserautomationv1.BrowserProfile)
}

func cloneTaskInput(input *core.TaskInput) *core.TaskInput {
	if input == nil {
		return nil
	}
	return proto.Clone(input).(*browserautomationv1.BrowserTaskInput)
}

func defaultBrowserKind(runtime core.Runtime) browserautomationv1.BrowserKind {
	if defaults, ok := runtime.(core.RuntimeProfileDefaults); ok {
		kind := defaults.DefaultBrowserKind()
		if kind != browserautomationv1.BrowserKind_BROWSER_KIND_UNSPECIFIED {
			return kind
		}
	}
	return browserautomationv1.BrowserKind_BROWSER_KIND_CHROMIUM
}

func timestamp(value time.Time) *timestamppb.Timestamp {
	if value.IsZero() {
		return nil
	}
	return timestamppb.New(value)
}

func duration(value *durationpb.Duration) time.Duration {
	if value == nil {
		return 0
	}
	return value.AsDuration()
}
