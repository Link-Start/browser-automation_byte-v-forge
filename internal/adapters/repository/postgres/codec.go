package postgres

import (
	"github.com/byte-v-forge/browser-automation/internal/core"
	browserautomationv1 "github.com/byte-v-forge/common-lib/gen/go/byte/v/forge/contracts/browserautomation/v1"
	"google.golang.org/protobuf/proto"
)

func (r *Repository) encode(message proto.Message) ([]byte, error) {
	data, err := r.marshal.Marshal(message)
	if err != nil {
		return nil, core.NewError(core.CodeInternal, "encode browser automation projection failed", false)
	}
	return data, nil
}

func (r *Repository) decodeSession(data []byte) (*core.Session, error) {
	session := &browserautomationv1.BrowserSession{}
	if err := r.unmarshal.Unmarshal(data, session); err != nil {
		return nil, core.NewError(core.CodeInternal, "decode browser session failed", false)
	}
	return proto.Clone(session).(*core.Session), nil
}

func (r *Repository) decodeTask(data []byte) (*core.Task, error) {
	task := &browserautomationv1.BrowserTask{}
	if err := r.unmarshal.Unmarshal(data, task); err != nil {
		return nil, core.NewError(core.CodeInternal, "decode browser task failed", false)
	}
	return proto.Clone(task).(*core.Task), nil
}
