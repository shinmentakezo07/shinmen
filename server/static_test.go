package main

import (
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func testRouter(t *testing.T, staticDir string) http.Handler {
	t.Helper()
	cfg := config{githubUser: "u", staticDir: staticDir}
	return newRouter(cfg, &http.Client{}, newRateLimiter(1, 1, time.Now), time.Now, log.New(io.Discard, "", 0))
}

func TestStaticServesSPAAndAPI(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "assets"), 0o755); err != nil {
		t.Fatal(err)
	}
	files := map[string]string{
		"index.html":         "<div id=root></div>",
		"assets/app-abc1.js": "console.log(1)",
		"favicon.svg":        "<svg/>",
	}
	for name, body := range files {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}

	h := testRouter(t, dir)
	cases := []struct {
		path     string
		wantCode int
		wantBody string
		cacheRe  string
	}{
		{"/", 200, "<div id=root></div>", "no-cache"},
		{"/work/atlas", 200, "<div id=root></div>", "no-cache"},
		{"/resume", 200, "<div id=root></div>", "no-cache"},
		{"/assets/app-abc1.js", 200, "console.log(1)", "immutable"},
		{"/favicon.svg", 200, "<svg/>", ""},
		{"/assets/missing.js", 404, "", ""},
	}
	for _, c := range cases {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, c.path, nil))
		if rec.Code != c.wantCode {
			t.Errorf("%s: code = %d, want %d", c.path, rec.Code, c.wantCode)
		}
		if c.wantBody != "" && rec.Body.String() != c.wantBody {
			t.Errorf("%s: body = %q, want %q", c.path, rec.Body.String(), c.wantBody)
		}
		if cc := rec.Header().Get("Cache-Control"); c.cacheRe != "" && !strings.Contains(cc, c.cacheRe) {
			t.Errorf("%s: Cache-Control = %q, want containing %q", c.path, cc, c.cacheRe)
		}
	}

	// API routes keep priority over the SPA fallback.
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	if rec.Code != http.StatusOK || rec.Body.String() != "{\"ok\":true}\n" {
		t.Errorf("/api/health: %d %q", rec.Code, rec.Body.String())
	}
}

func TestStaticExposedAsMethodRestricted(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	rec := httptest.NewRecorder()
	testRouter(t, dir).ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/work/atlas", nil))
	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("POST static = %d, want 405", rec.Code)
	}
}

func TestNoStaticFallsBackToJSON404(t *testing.T) {
	for _, dir := range []string{"", filepath.Join(t.TempDir(), "missing")} {
		rec := httptest.NewRecorder()
		testRouter(t, dir).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
		if rec.Code != http.StatusNotFound {
			t.Errorf("dir %q: code = %d, want 404", dir, rec.Code)
		}
	}
}
