package core

import (
	"fmt"
	"strconv"
)

const (
	defaultPageSize = 50
	maxPageSize     = 200
)

func ParsePageToken(pageToken string) (int, error) {
	if pageToken == "" {
		return 0, nil
	}
	offset, err := strconv.Atoi(pageToken)
	if err != nil || offset < 0 {
		return 0, NewError(CodeValidationFailed, "page_token must be a non-negative offset", false)
	}
	return offset, nil
}

func NormalizePageSize(pageSize int) int {
	if pageSize <= 0 {
		return defaultPageSize
	}
	if pageSize > maxPageSize {
		return maxPageSize
	}
	return pageSize
}

func PageToken(offset int) string {
	if offset <= 0 {
		return ""
	}
	return fmt.Sprint(offset)
}
