ARG BROWSER_AUTOMATION_RUNTIME_IMAGE=browser-automation-runtime:camoufox-cloakbrowser-py3.12-bookworm

FROM docker.m.daocloud.io/library/node:24-alpine AS webui-builder
WORKDIR /app
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories \
    && apk update \
    && apk add --no-cache bash protobuf protobuf-dev
COPY webui/package.json ./webui/package.json
WORKDIR /app/webui
RUN npm config set registry https://registry.npmmirror.com \
    && npm install
WORKDIR /app
COPY proto ./proto
COPY webui ./webui
WORKDIR /app/webui
RUN npm run build

FROM docker.m.daocloud.io/library/golang:1.26-alpine AS service-builder
WORKDIR /app
ENV GOPROXY=https://goproxy.cn,direct
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories \
    && apk add --no-cache git ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/browser-automation-service ./cmd/browser-automation-service

FROM ${BROWSER_AUTOMATION_RUNTIME_IMAGE}
WORKDIR /app
COPY --from=service-builder /out/browser-automation-service /usr/local/bin/browser-automation-service
COPY --from=webui-builder /app/webui/dist ./webui/dist
COPY migrations ./migrations

ENV BROWSER_AUTOMATION_LISTEN_ADDR=:50051 \
    BROWSER_AUTOMATION_HTTP_LISTEN_ADDR=:8080 \
    BROWSER_AUTOMATION_RUNTIME=camoufox \
    BROWSER_AUTOMATION_MAX_CONCURRENT_SESSIONS=0 \
    BROWSER_AUTOMATION_MIGRATIONS_DIR=/app/migrations \
    BROWSER_AUTOMATION_WEB_DIR=/app/webui/dist \
    BROWSER_AUTOMATION_ARTIFACTS_DIR=/tmp/browser-automation-artifacts

EXPOSE 50051 8080
CMD ["browser-automation-service"]
