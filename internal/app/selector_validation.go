package app

import (
	browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/browser/automation/v1"
	"github.com/byte-v-forge/browser-automation/internal/core"
)

func requireSelector(selector *browserautomationv1.BrowserSelector, group *browserautomationv1.BrowserSelectorGroup, message string) error {
	if hasSelector(selector, group) {
		return nil
	}
	return validationError(message)
}

func requireString(value string, message string) error {
	if value != "" {
		return nil
	}
	return validationError(message)
}

func hasSelector(selector *browserautomationv1.BrowserSelector, group *browserautomationv1.BrowserSelectorGroup) bool {
	if selector.GetValue() != "" {
		return true
	}
	for _, candidate := range group.GetSelectors() {
		if candidate.GetValue() != "" {
			return true
		}
	}
	return false
}

func validationError(message string) error {
	return core.NewError(core.CodeValidationFailed, message, false)
}
