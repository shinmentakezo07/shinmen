package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

type config struct {
	port        string
	githubUser  string
	githubToken string
	chatURL     string
	chatKey     string
	chatModel   string
	staticDir   string // pre-built SPA to serve; "" disables static hosting
}

func loadConfig() config {
	return config{
		port:        envOr("PORT", "8080"),
		githubUser:  envOr("GITHUB_USER", "roshankhatri"),
		githubToken: os.Getenv("GITHUB_TOKEN"),
		chatURL:     os.Getenv("CHAT_UPSTREAM_URL"),
		chatKey:     os.Getenv("CHAT_UPSTREAM_KEY"),
		chatModel:   envOr("CHAT_MODEL", "gpt-4o-mini"),
		staticDir:   os.Getenv("PORTFOLIO_DIST"),
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	logger := log.New(os.Stdout, "", log.LstdFlags)
	cfg := loadConfig()

	client := &http.Client{Timeout: 25 * time.Second}
	limiter := newRateLimiter(10.0/60.0, 5, time.Now) // 10 requests/min, burst 5
	handler := newRouter(cfg, client, limiter, time.Now, logger)

	srv := &http.Server{
		Addr:              ":" + cfg.port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go limiter.runJanitor(ctx.Done(), 5*time.Minute, 10*time.Minute)

	errCh := make(chan error, 1)
	go func() {
		logger.Printf("listening on %s", srv.Addr)
		errCh <- srv.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Fatalf("server: %v", err)
		}
	case <-ctx.Done():
		logger.Print("shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			logger.Printf("shutdown: %v", err)
		}
	}
}
