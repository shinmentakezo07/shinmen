package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"testing"
	"time"
)

// The site's pipelines claim composure; these tests pin the machines behind
// it. Every state a chat request can end in is named, and the transitions are
// asserted directly rather than inferred from whichever assertion is nearby.

type logSink struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (l *logSink) Write(p []byte) (int, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.buf.Write(p)
}

func (l *logSink) String() string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.buf.String()
}

func handlerWithLog(cfg config, client *http.Client, clock *fakeClock) (http.Handler, *logSink) {
	sink := &logSink{}
	logger := log.New(sink, "", 0)
	return newRouter(cfg, client, newRateLimiter(10.0/60.0, 5, clock.now), clock.now, logger), sink
}

// staticTransport answers every upstream call with a fixed JSON body.
type staticTransport string

func (s staticTransport) RoundTrip(r *http.Request) (*http.Response, error) {
	return &http.Response{
		StatusCode: http.StatusOK,
		Header:     http.Header{"Content-Type": {"application/json"}},
		Body:       io.NopCloser(strings.NewReader(string(s))),
		Request:    r,
	}, nil
}

const hiReq = `{"message":"hi"}`

func TestChatOutcomesAreNamedInTheLog(t *testing.T) {
	liveBody := `{"choices":[{"message":{"role":"assistant","content":"ok"}}]}`

	cases := []struct {
		name   string
		cfg    config
		client *http.Client
		want   string
		status int
		act    func(t *testing.T, h http.Handler) int
	}{
		{
			name:   "live",
			cfg:    config{chatURL: "http://upstream.invalid/v1", chatKey: "k"},
			client: &http.Client{Transport: staticTransport(liveBody)},
			want:   "outcome=live",
			status: http.StatusOK,
			act: func(t *testing.T, h http.Handler) int {
				return doRequest(t, h, http.MethodPost, "/api/chat", hiReq).Code
			},
		},
		{
			name:   "fallback not configured",
			cfg:    config{},
			client: &http.Client{},
			want:   `outcome=fallback reason="not configured"`,
			status: http.StatusOK,
			act: func(t *testing.T, h http.Handler) int {
				return doRequest(t, h, http.MethodPost, "/api/chat", hiReq).Code
			},
		},
		{
			name:   "rejected",
			cfg:    config{},
			client: &http.Client{},
			want:   "outcome=rejected",
			status: http.StatusBadRequest,
			act: func(t *testing.T, h http.Handler) int {
				return doRequest(t, h, http.MethodPost, "/api/chat", `{"message":""}`).Code
			},
		},
		{
			name:   "throttled",
			cfg:    config{},
			client: &http.Client{},
			want:   "outcome=throttled",
			status: http.StatusTooManyRequests,
			act: func(t *testing.T, h http.Handler) int {
				for range 5 { // drain the burst
					if code := doRequest(t, h, http.MethodPost, "/api/chat", hiReq).Code; code != http.StatusOK {
						t.Fatalf("burst request refused early: %d", code)
					}
				}
				return doRequest(t, h, http.MethodPost, "/api/chat", hiReq).Code
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			h, sink := handlerWithLog(tc.cfg, tc.client, &fakeClock{testTime})
			if got := tc.act(t, h); got != tc.status {
				t.Fatalf("status = %d, want %d", got, tc.status)
			}
			if log := sink.String(); !strings.Contains(log, tc.want) {
				t.Fatalf("log missing %q:\n%s", tc.want, log)
			}
		})
	}
}

// TestGitHubStaleServeIsWhole proves the cached payload is shared whole: the
// stale-on-error path returns the same complete record that was cached, not a
// partially-assembled struct a waiter happened to catch mid-fetch.
func TestGitHubStaleServeIsWhole(t *testing.T) {
	ft := &fakeTransport{calls: map[string]int{}}
	clock := &fakeClock{testTime}
	h := testHandler(config{githubUser: "roshankhatri"}, &http.Client{Transport: ft}, clock)

	var cold githubPayload
	if err := json.NewDecoder(doRequest(t, h, http.MethodGet, "/api/github", "").Body).Decode(&cold); err != nil {
		t.Fatal(err)
	}
	if cold.User == "" || cold.CachedAt == "" || len(cold.Repos) == 0 {
		t.Fatalf("cold payload incomplete: %+v", cold)
	}

	ft.setFail(true)
	clock.advance(11 * time.Minute)

	var stale githubPayload
	if err := json.NewDecoder(doRequest(t, h, http.MethodGet, "/api/github", "").Body).Decode(&stale); err != nil {
		t.Fatal(err)
	}
	if stale.User != cold.User || stale.CachedAt != cold.CachedAt || len(stale.Repos) != len(cold.Repos) {
		t.Fatalf("stale payload differs from what was cached:\n got %+v\nwant %+v", stale, cold)
	}
}
