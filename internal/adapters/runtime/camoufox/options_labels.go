package camoufox

import (
	"strconv"
	"strings"
)

func setStringOption(options map[string]any, labels map[string]string, labelKey, optionKey string) {
	value := strings.TrimSpace(labels[labelKey])
	if value == "" {
		return
	}
	if strings.Contains(value, ",") {
		parts := strings.Split(value, ",")
		values := make([]string, 0, len(parts))
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if part != "" {
				values = append(values, part)
			}
		}
		if len(values) > 0 {
			options[optionKey] = values
			return
		}
	}
	options[optionKey] = value
}

func setBoolOption(options map[string]any, labels map[string]string, labelKey, optionKey string) {
	value, ok := parseBoolLabel(labels[labelKey])
	if ok {
		options[optionKey] = value
	}
}

func setBoolOrStringOption(options map[string]any, labels map[string]string, labelKey, optionKey string) {
	raw := strings.TrimSpace(labels[labelKey])
	if raw == "" {
		return
	}
	if value, ok := parseBoolLabel(raw); ok {
		options[optionKey] = value
		return
	}
	options[optionKey] = raw
}

func setBoolFloatOrStringOption(options map[string]any, labels map[string]string, labelKey, optionKey string) {
	raw := strings.TrimSpace(labels[labelKey])
	if raw == "" {
		return
	}
	if value, ok := parseBoolLabel(raw); ok {
		options[optionKey] = value
		return
	}
	if value, err := strconv.ParseFloat(raw, 64); err == nil {
		options[optionKey] = value
		return
	}
	options[optionKey] = raw
}

func parseBoolLabel(raw string) (bool, bool) {
	raw = strings.TrimSpace(strings.ToLower(raw))
	if raw == "" {
		return false, false
	}
	value, err := strconv.ParseBool(raw)
	if err != nil {
		return false, false
	}
	return value, true
}
