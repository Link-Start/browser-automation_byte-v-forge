package core

import "github.com/byte-v-forge/common-lib/pagex"

func ParsePageToken(pageToken string) (int, error) {
	offset, err := pagex.ParseOffsetToken(pageToken)
	if err != nil {
		return 0, NewError(CodeValidationFailed, err.Error(), false)
	}
	return offset, nil
}

func NormalizePageSize(pageSize int) int {
	return pagex.ClampSize(pageSize, 50, 200)
}

func PageToken(offset int) string {
	return pagex.OffsetToken(offset)
}
