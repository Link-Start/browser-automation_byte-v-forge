package protojsonx

import (
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

var (
	MarshalOptions   = protojson.MarshalOptions{UseProtoNames: true}
	UnmarshalOptions = protojson.UnmarshalOptions{DiscardUnknown: true}
)

func Marshal(value proto.Message) ([]byte, error) {
	return MarshalOptions.Marshal(value)
}
