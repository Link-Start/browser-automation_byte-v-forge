package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sort"
	"strings"
	"syscall"
	"time"

	browserautomationv1 "github.com/byte-v-forge/browser-automation/gen/go/browser/automation/v1"
	grpcadapter "github.com/byte-v-forge/browser-automation/internal/adapters/grpc"
	httpadapter "github.com/byte-v-forge/browser-automation/internal/adapters/http"
	"github.com/byte-v-forge/browser-automation/internal/adapters/repository/postgres"
	"github.com/byte-v-forge/browser-automation/internal/adapters/runtime/runtimeplugin"
	"github.com/byte-v-forge/browser-automation/internal/app"
	"github.com/byte-v-forge/browser-automation/internal/platform/envx"
	"github.com/byte-v-forge/browser-automation/internal/platform/grpchealth"
	"github.com/jackc/pgx/v5/pgxpool"
	"google.golang.org/grpc"
)

const (
	defaultListenAddr           = ":50051"
	defaultHTTPListenAddr       = ":8080"
	defaultRuntime              = defaultCamoufoxRuntime
	defaultMigrationsDir        = "migrations"
	defaultWebDir               = "webui/dist"
	defaultArtifactsDir         = "/tmp/browser-automation-artifacts"
	defaultPostgresMaxConns     = 8
	defaultMaxSessionsEnvValue  = 0
	defaultConnectTimeout       = 10 * time.Second
	defaultStatementTimeout     = 10 * time.Second
	defaultShutdownGrace        = 10 * time.Second
	defaultCamoufoxStartup      = 30 * time.Second
	defaultCamoufoxShutdown     = 5 * time.Second
	defaultCamoufoxTaskTimeout  = 2 * time.Minute
	defaultCloakBrowserStartup  = 30 * time.Second
	defaultCloakBrowserShutdown = 5 * time.Second
	defaultCloakBrowserTask     = 2 * time.Minute
	defaultCamoufoxWSPathPrefix = "browser-session-"
	defaultCamoufoxRuntime      = "camoufox"
	defaultCloakBrowserRuntime  = "cloakbrowser"
)

type config struct {
	ListenAddr               string
	HTTPListenAddr           string
	WebDir                   string
	PostgresDSN              string
	PostgresMaxConns         int32
	PostgresConnectTimeout   time.Duration
	PostgresStatementTimeout time.Duration
	ApplyMigrations          bool
	MigrationsDir            string
	ShutdownGrace            time.Duration

	Runtime               string
	MaxConcurrentSessions int

	CamoufoxPythonPath      string
	ArtifactsDir            string
	CamoufoxStartupTimeout  time.Duration
	CamoufoxShutdownTimeout time.Duration
	CamoufoxTaskTimeout     time.Duration
	CamoufoxHeadless        bool
	CamoufoxServerPort      int
	CamoufoxWSPathPrefix    string
	CamoufoxExtraEnv        []string

	CloakBrowserPythonPath      string
	CloakBrowserStartupTimeout  time.Duration
	CloakBrowserShutdownTimeout time.Duration
	CloakBrowserTaskTimeout     time.Duration
	CloakBrowserHeadless        bool
	CloakBrowserHumanize        bool
	CloakBrowserExtraEnv        []string
	ProxyRefs                   map[string]string
}

func main() {
	if err := run(); err != nil {
		slog.Error("browser automation service stopped", "error", err)
		os.Exit(1)
	}
}

func run() error {
	runtimeRegistry, err := newRuntimeRegistry()
	if err != nil {
		return err
	}
	cfg, err := loadConfig(runtimeRegistry)
	if err != nil {
		return err
	}

	rootCtx, stopSignals := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stopSignals()

	pool, err := postgres.NewPool(rootCtx, cfg.PostgresDSN, cfg.PostgresMaxConns, cfg.PostgresConnectTimeout)
	if err != nil {
		return fmt.Errorf("connect postgres: %w", err)
	}
	defer pool.Close()

	if cfg.ApplyMigrations {
		if err := applyMigrations(rootCtx, pool, cfg.MigrationsDir); err != nil {
			return err
		}
	}

	runtime, err := newRuntime(runtimeRegistry, cfg)
	if err != nil {
		return err
	}
	store := postgres.NewRepository(pool, cfg.PostgresStatementTimeout)
	service := app.NewAutomationService(store, runtime, app.SystemClock{}, app.RandomIDGenerator{})

	listener, err := net.Listen("tcp", cfg.ListenAddr)
	if err != nil {
		return fmt.Errorf("listen %s: %w", cfg.ListenAddr, err)
	}
	defer listener.Close()

	server := grpc.NewServer()
	browserautomationv1.RegisterBrowserAutomationServiceServer(server, grpcadapter.NewAutomationServer(service))

	healthServer := grpchealth.RegisterServing(server)

	httpServer := &http.Server{
		Addr:              cfg.HTTPListenAddr,
		Handler:           httpadapter.NewServer(service, cfg.WebDir),
		ReadHeaderTimeout: 5 * time.Second,
	}

	serveErr := make(chan error, 2)
	go func() {
		slog.Info("browser automation grpc listening", "addr", cfg.ListenAddr, "runtime", cfg.Runtime, "max_concurrent_sessions", cfg.MaxConcurrentSessions)
		serveErr <- server.Serve(listener)
	}()
	if strings.TrimSpace(cfg.HTTPListenAddr) != "" {
		go func() {
			slog.Info("browser automation http listening", "addr", cfg.HTTPListenAddr, "web_dir", cfg.WebDir)
			serveErr <- httpServer.ListenAndServe()
		}()
	}

	select {
	case <-rootCtx.Done():
		return shutdownServers(server, healthServer, httpServer, cfg.ShutdownGrace)
	case err := <-serveErr:
		if errors.Is(err, grpc.ErrServerStopped) || errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	}
}

func loadConfig(runtimeRegistry *runtimeplugin.Registry[config]) (config, error) {
	proxyRefs, err := envx.JSONStringMap("BROWSER_AUTOMATION_PROXY_REFS_JSON")
	if err != nil {
		return config{}, err
	}
	cfg := config{
		ListenAddr:               envx.StringDefault("BROWSER_AUTOMATION_LISTEN_ADDR", defaultListenAddr),
		HTTPListenAddr:           envx.StringDefault("BROWSER_AUTOMATION_HTTP_LISTEN_ADDR", defaultHTTPListenAddr),
		WebDir:                   envx.StringDefault("BROWSER_AUTOMATION_WEB_DIR", defaultWebDir),
		PostgresDSN:              envx.String("BROWSER_AUTOMATION_POSTGRES_DSN"),
		PostgresMaxConns:         int32(envx.Int("BROWSER_AUTOMATION_POSTGRES_MAX_CONNS", defaultPostgresMaxConns)),
		PostgresConnectTimeout:   envx.DurationSeconds("BROWSER_AUTOMATION_POSTGRES_CONNECT_TIMEOUT_SECONDS", defaultConnectTimeout),
		PostgresStatementTimeout: envx.DurationSeconds("BROWSER_AUTOMATION_POSTGRES_STATEMENT_TIMEOUT_SECONDS", defaultStatementTimeout),
		ApplyMigrations:          envx.Bool("BROWSER_AUTOMATION_APPLY_MIGRATIONS", false),
		MigrationsDir:            envx.StringDefault("BROWSER_AUTOMATION_MIGRATIONS_DIR", defaultMigrationsDir),
		ShutdownGrace:            envx.DurationSeconds("BROWSER_AUTOMATION_SHUTDOWN_GRACE_SECONDS", defaultShutdownGrace),
		Runtime:                  strings.ToLower(envx.StringDefault("BROWSER_AUTOMATION_RUNTIME", defaultRuntime)),
		MaxConcurrentSessions:    envx.Int("BROWSER_AUTOMATION_MAX_CONCURRENT_SESSIONS", defaultMaxSessionsEnvValue),

		ArtifactsDir:                envx.StringDefault("BROWSER_AUTOMATION_ARTIFACTS_DIR", defaultArtifactsDir),
		CamoufoxPythonPath:          envx.StringDefault("BROWSER_AUTOMATION_CAMOUFOX_PYTHON_PATH", "python3"),
		CamoufoxStartupTimeout:      envx.DurationSeconds("BROWSER_AUTOMATION_CAMOUFOX_STARTUP_TIMEOUT_SECONDS", defaultCamoufoxStartup),
		CamoufoxShutdownTimeout:     envx.DurationSeconds("BROWSER_AUTOMATION_CAMOUFOX_SHUTDOWN_TIMEOUT_SECONDS", defaultCamoufoxShutdown),
		CamoufoxTaskTimeout:         envx.DurationSeconds("BROWSER_AUTOMATION_CAMOUFOX_TASK_TIMEOUT_SECONDS", defaultCamoufoxTaskTimeout),
		CamoufoxHeadless:            envx.Bool("BROWSER_AUTOMATION_CAMOUFOX_HEADLESS", true),
		CamoufoxServerPort:          envx.Int("BROWSER_AUTOMATION_CAMOUFOX_SERVER_PORT", 0),
		CamoufoxWSPathPrefix:        envx.StringDefault("BROWSER_AUTOMATION_CAMOUFOX_WS_PATH_PREFIX", defaultCamoufoxWSPathPrefix),
		CamoufoxExtraEnv:            envx.List("BROWSER_AUTOMATION_CAMOUFOX_EXTRA_ENV"),
		CloakBrowserPythonPath:      envx.StringDefault("BROWSER_AUTOMATION_CLOAK_BROWSER_PYTHON_PATH", "python3"),
		CloakBrowserStartupTimeout:  envx.DurationSeconds("BROWSER_AUTOMATION_CLOAK_BROWSER_STARTUP_TIMEOUT_SECONDS", defaultCloakBrowserStartup),
		CloakBrowserShutdownTimeout: envx.DurationSeconds("BROWSER_AUTOMATION_CLOAK_BROWSER_SHUTDOWN_TIMEOUT_SECONDS", defaultCloakBrowserShutdown),
		CloakBrowserTaskTimeout:     envx.DurationSeconds("BROWSER_AUTOMATION_CLOAK_BROWSER_TASK_TIMEOUT_SECONDS", defaultCloakBrowserTask),
		CloakBrowserHeadless:        envx.Bool("BROWSER_AUTOMATION_CLOAK_BROWSER_HEADLESS", true),
		CloakBrowserHumanize:        envx.Bool("BROWSER_AUTOMATION_CLOAK_BROWSER_HUMANIZE", true),
		CloakBrowserExtraEnv:        envx.List("BROWSER_AUTOMATION_CLOAK_BROWSER_EXTRA_ENV"),
		ProxyRefs:                   proxyRefs,
	}
	if strings.TrimSpace(cfg.PostgresDSN) == "" {
		return cfg, fmt.Errorf("BROWSER_AUTOMATION_POSTGRES_DSN is required")
	}
	if cfg.PostgresMaxConns < 1 {
		return cfg, fmt.Errorf("BROWSER_AUTOMATION_POSTGRES_MAX_CONNS must be positive")
	}
	if cfg.MaxConcurrentSessions < 0 {
		return cfg, fmt.Errorf("BROWSER_AUTOMATION_MAX_CONCURRENT_SESSIONS cannot be negative")
	}
	cfg.MaxConcurrentSessions = deriveMaxConcurrentSessions(cfg.MaxConcurrentSessions)
	if _, ok := runtimeRegistry.Get(cfg.Runtime); !ok {
		return cfg, fmt.Errorf("unsupported BROWSER_AUTOMATION_RUNTIME %q", cfg.Runtime)
	}
	return cfg, nil
}

func applyMigrations(ctx context.Context, pool *pgxpool.Pool, dir string) error {
	files, err := filepath.Glob(filepath.Join(dir, "*.sql"))
	if err != nil {
		return fmt.Errorf("list browser automation migrations: %w", err)
	}
	sort.Strings(files)
	if len(files) == 0 {
		return fmt.Errorf("browser automation migrations not found in %s", dir)
	}
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return fmt.Errorf("acquire postgres connection for migrations: %w", err)
	}
	defer conn.Release()

	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", file, err)
		}
		result := conn.Conn().PgConn().Exec(ctx, string(data))
		if _, err := result.ReadAll(); err != nil {
			return fmt.Errorf("apply migration %s: %w", file, err)
		}
		slog.Info("applied browser automation migration", "file", filepath.Base(file))
	}
	return nil
}
