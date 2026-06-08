package secretref

import (
	"errors"
	"strings"

	browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/browser/automation/v1"
)

func Configured(ref *browserautomationv1.SecretRef) bool {
	return strings.TrimSpace(ref.GetSecretId()) != ""
}

func Validate(ref *browserautomationv1.SecretRef) error {
	if !Configured(ref) {
		return errors.New("secret_id is required")
	}
	if strings.TrimSpace(ref.GetProvider()) == "" {
		return errors.New("secret provider is required")
	}
	if strings.TrimSpace(ref.GetPurpose()) == "" {
		return errors.New("secret purpose is required")
	}
	return nil
}
