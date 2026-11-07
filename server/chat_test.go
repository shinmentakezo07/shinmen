package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

var testTime = time.Date(2026, 11, 7, 12, 0, 0, 0, time.UTC)

func testLogger() *log.Logger {
	return log.New(io.Discard, "", 0)
}

// fakeClock returns a now function whose value tests can advance.
type fakeClock struct{ t time.Time }

func (c *fakeClock) now() time.Time          { return c.t }
func (c *fakeClock) advance(d time.Duration) { c.t = c.t.Add(d) }

func testHandler(cfg config, client *http.Client, clock *fakeClock) http.Handler {
	return newRouter(cfg, client, newRateLimiter(10.0/60.0, 5, clock.now), clock.now, testLogger())
}

func doRequest(t *testing.T, h http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	var r *http.Request
	if body == "" {
		r = httptest.NewRequest(method, path, nil)
	} else {
		r = httptest.NewRequest(method, path, strings.NewReader(body))
	}
	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

func TestHealth(t *testing.T) {
	h := testHandler(config{}, &http.Client{}, &fakeClock{testTime})
	w := doRequest(t, h, http.MethodGet, "/api/health", "")
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
	if got := strings.TrimSpace(w.Body.String()); got != `{"ok":true}` {
		t.Fatalf("body = %s, want {\"ok\":true}", got)
	}
}

func TestMethodNotAllowed(t *testing.T) {
	h := testHandler(config{}, &http.Client{}, &fakeClock{testTime})
	for _, tc := range []struct{ method, path string }{
		{http.MethodPost, "/api/health"},
		{http.MethodPost, "/api/github"},
		{http.MethodGet, "/api/chat"},
	} {
		if w := doRequest(t, h, tc.method, tc.path, ""); w.Code != http.StatusMethodNotAllowed {
			t.Errorf("%s %s: status = %d, want 405", tc.method, tc.path, w.Code)
		}
	}
}

func TestChatValidation(t *testing.T) {
	cases := []struct {
		name string
		body string
	}{
		{"empty body", ""},
		{"malformed JSON", `{"message":`},
		{"missing message", `{}`},
		{"empty message", `{"message":""}`},
		{"whitespace only", `{"message":"   \n\t "}`},
		{"too long", `{"message":"` + strings.Repeat("x", 2001) + `"}`},
		{"too long multibyte", `{"message":"` + strings.Repeat("é", 2001) + `"}`},
		{"wrong type", `{"message":42}`},
		{"trailing junk", `{"message":"hi"} {"message":"bye"}`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			clock := &fakeClock{testTime}
			h := testHandler(config{}, &http.Client{}, clock)
			w := doRequest(t, h, http.MethodPost, "/api/chat", tc.body)
			if w.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want 400; body=%s", w.Code, w.Body.String())
			}
			var resp errorResponse
			if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil || resp.Error == "" {
				t.Fatalf("expected JSON error, got %s (err=%v)", w.Body.String(), err)
			}
		})
	}
}

func TestChatBoundaryLengths(t *testing.T) {
	for _, n := range []int{1, 2000} {
		clock := &fakeClock{testTime}
		h := testHandler(config{}, &http.Client{}, clock)
		w := doRequest(t, h, http.MethodPost, "/api/chat", `{"message":"`+strings.Repeat("x", n)+`"}`)
		if w.Code != http.StatusOK {
			t.Fatalf("len %d: status = %d, want 200", n, w.Code)
		}
	}
}

func TestChatCannedFallback(t *testing.T) {
	cases := []struct {
		message string
		want    []string // substrings the answer must contain
	}{
		{"what is your stack?", []string{"Go", "Rust", "Python", "TypeScript", "React", "Tailwind"}},
		{"Tell me about your projects", []string{"Atlas", "Ledger", "Sift", "Temporal", "1,800", "340ms"}},
		{"how do you use AI agents?", []string{"Claude Code", "Codex", "OpenCode", "oh-my-pi"}},
		{"are you available for hire?", []string{"hello@roshankhatri.dev", "availability"}},
		{"how can I contact you?", []string{"hello@roshankhatri.dev"}},
		{"tell me a joke", []string{"Roshan", "portfolio"}},
	}
	for _, tc := range cases {
		t.Run(tc.message, func(t *testing.T) {
			clock := &fakeClock{testTime}
			h := testHandler(config{}, &http.Client{}, clock)
			body, _ := json.Marshal(map[string]string{"message": tc.message})
			w := doRequest(t, h, http.MethodPost, "/api/chat", string(body))
			if w.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200", w.Code)
			}
			var resp chatResponse
			if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
				t.Fatalf("decode: %v", err)
			}
			if !resp.Degraded {
				t.Fatal("degraded flag missing; canned answers must be marked degraded")
			}
			if resp.Reply == "" {
				t.Fatal("empty reply")
			}
			for _, sub := range tc.want {
				if !strings.Contains(resp.Reply, sub) {
					t.Errorf("reply %q missing %q", resp.Reply, sub)
				}
			}
		})
	}
}

func TestChatRateLimit(t *testing.T) {
	clock := &fakeClock{testTime}
	h := testHandler(config{}, &http.Client{}, clock)

	send := func(ip string) int {
		r := httptest.NewRequest(http.MethodPost, "/api/chat", strings.NewReader(`{"message":"hello"}`))
		r.RemoteAddr = ip + ":12345"
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		return w.Code
	}

	// Burst of 5 allowed, 6th rejected.
	for i := range 5 {
		if code := send("10.0.0.1"); code != http.StatusOK {
			t.Fatalf("request %d: status = %d, want 200", i+1, code)
		}
	}
	if code := send("10.0.0.1"); code != http.StatusTooManyRequests {
		t.Fatalf("6th request: status = %d, want 429", code)
	}
	// Different IP has its own bucket.
	if code := send("10.0.0.2"); code != http.StatusOK {
		t.Fatalf("other IP: status = %d, want 200", code)
	}
	// Refill: 1 token every 6 seconds.
	clock.advance(6 * time.Second)
	if code := send("10.0.0.1"); code != http.StatusOK {
		t.Fatalf("after refill: status = %d, want 200", code)
	}
	if code := send("10.0.0.1"); code != http.StatusTooManyRequests {
		t.Fatalf("immediately after refill: status = %d, want 429", code)
	}
}
