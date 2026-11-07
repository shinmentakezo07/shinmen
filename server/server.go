package main

import (
	"encoding/json"
	"log"
	"net"
	"net/http"
	"time"
)

type errorResponse struct {
	Error string `json:"error"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// newRouter wires the API. The HTTP client, rate limiter, clock, and logger are
// injected so tests can substitute fakes.
func newRouter(cfg config, client *http.Client, limiter *rateLimiter, now func() time.Time, logger *log.Logger) http.Handler {
	mux := http.NewServeMux()

	gh := &githubService{
		client: client,
		user:   cfg.githubUser,
		token:  cfg.githubToken,
		ttl:    10 * time.Minute,
		now:    now,
		logger: logger,
	}
	chat := &chatHandler{
		client:      client,
		upstreamURL: cfg.chatURL,
		apiKey:      cfg.chatKey,
		model:       cfg.chatModel,
		limiter:     limiter,
		logger:      logger,
	}

	mux.HandleFunc("/api/health", requireMethod(http.MethodGet, handleHealth))
	mux.HandleFunc("/api/github", requireMethod(http.MethodGet, gh.handle))
	mux.HandleFunc("/api/chat", requireMethod(http.MethodPost, chat.ServeHTTP))

	// Everything under /api is JSON; in production the same process also serves
	// the built SPA from cfg.staticDir. Without a build it stays an API.
	if spa, ok := spaHandler(cfg.staticDir); ok {
		logger.Printf("serving static frontend from %s", cfg.staticDir)
		mux.Handle("/", spa)
	} else {
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			writeJSON(w, http.StatusNotFound, errorResponse{"not found"})
		})
	}

	return logRequests(logger, mux)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, struct {
		OK bool `json:"ok"`
	}{OK: true})
}

func requireMethod(method string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != method {
			w.Header().Set("Allow", method)
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{"method not allowed"})
			return
		}
		next(w, r)
	}
}

// clientIP extracts the host portion of RemoteAddr. Proxy headers are not
// trusted; behind the Vite dev proxy all callers share the proxy's IP.
func clientIP(r *http.Request) string {
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return r.RemoteAddr
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func logRequests(logger *log.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(sw, r)
		logger.Printf("%s %s %s %d %s", clientIP(r), r.Method, r.URL.Path, sw.status, time.Since(start).Round(time.Microsecond))
	})
}
