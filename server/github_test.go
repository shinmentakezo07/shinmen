package main

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

// fakeTransport is an injected http.RoundTripper serving canned GitHub
// responses and counting calls, so cache and single-flight behavior is
// observable.
type fakeTransport struct {
	mu       sync.Mutex
	calls    map[string]int
	fail     bool
	gate     chan struct{} // if set, each RoundTrip waits for it before responding
	requests []*http.Request
}

func (f *fakeTransport) RoundTrip(r *http.Request) (*http.Response, error) {
	if f.gate != nil {
		<-f.gate
	}
	f.mu.Lock()
	f.calls[r.URL.Path]++
	f.requests = append(f.requests, r.Clone(r.Context()))
	fail := f.fail
	f.mu.Unlock()

	status := http.StatusOK
	body := ""
	switch {
	case fail:
		return nil, errors.New("upstream down")
	case r.URL.Path == "/users/roshankhatri":
		body = `{"login":"roshankhatri","public_repos":12,"followers":34}`
	case r.URL.Path == "/users/roshankhatri/repos":
		if q := r.URL.Query(); q.Get("sort") != "pushed" || q.Get("per_page") != "6" {
			status = http.StatusBadRequest
			body = `{"message":"bad query"}`
		} else {
			body = `[
				{"name":"atlas","description":"Real-time dispatch","language":"Go","stargazers_count":42,"forks_count":7,"html_url":"https://github.com/roshankhatri/atlas","pushed_at":"2026-10-01T10:00:00Z","updated_at":"2026-09-01T10:00:00Z"},
				{"name":"sift","description":null,"language":null,"stargazers_count":3,"forks_count":0,"html_url":"https://github.com/roshankhatri/sift","pushed_at":"2026-09-15T08:00:00Z","updated_at":"2026-09-15T08:00:00Z"}
			]`
		}
	default:
		status = http.StatusNotFound
		body = `{"message":"Not Found"}`
	}
	return &http.Response{
		StatusCode: status,
		Header:     http.Header{"Content-Type": {"application/json"}},
		Body:       io.NopCloser(strings.NewReader(body)),
		Request:    r,
	}, nil
}

func (f *fakeTransport) callCount(path string) int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.calls[path]
}

func (f *fakeTransport) setFail(v bool) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.fail = v
}

func TestGitHubMappingAndCache(t *testing.T) {
	ft := &fakeTransport{calls: map[string]int{}}
	clock := &fakeClock{testTime}
	h := testHandler(config{githubUser: "roshankhatri", githubToken: "tok"}, &http.Client{Transport: ft}, clock)

	w := doRequest(t, h, http.MethodGet, "/api/github", "")
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, body=%s", w.Code, w.Body.String())
	}
	var p githubPayload
	if err := json.Unmarshal(w.Body.Bytes(), &p); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if p.User != "roshankhatri" || p.PublicRepos != 12 || p.Followers != 34 {
		t.Errorf("profile mapping wrong: %+v", p)
	}
	if p.ContributionsLastYear != nil {
		t.Errorf("contributionsLastYear = %v, want null", *p.ContributionsLastYear)
	}
	if !strings.Contains(w.Body.String(), `"contributionsLastYear":null`) {
		t.Error("contributionsLastYear must serialize as null, not be omitted")
	}
	if _, err := time.Parse(time.RFC3339, p.CachedAt); err != nil {
		t.Errorf("cachedAt not RFC3339: %q", p.CachedAt)
	}
	if len(p.Repos) != 2 {
		t.Fatalf("repos = %d, want 2", len(p.Repos))
	}
	r := p.Repos[0]
	if r.Name != "atlas" || r.Description == nil || *r.Description != "Real-time dispatch" ||
		r.Language == nil || *r.Language != "Go" || r.Stars != 42 || r.Forks != 7 ||
		r.URL != "https://github.com/roshankhatri/atlas" || r.UpdatedAt != "2026-10-01T10:00:00Z" {
		t.Errorf("repo mapping wrong: %+v", r)
	}
	if p.Repos[1].Description != nil || p.Repos[1].Language != nil {
		t.Errorf("null description/language not preserved: %+v", p.Repos[1])
	}

	// Required headers.
	ft.mu.Lock()
	for _, req := range ft.requests {
		if req.Header.Get("User-Agent") == "" {
			t.Error("missing User-Agent header")
		}
		if req.Header.Get("Authorization") != "Bearer tok" {
			t.Errorf("Authorization = %q, want Bearer tok", req.Header.Get("Authorization"))
		}
	}
	ft.mu.Unlock()

	// Cache hit within TTL: no extra upstream calls.
	firstCachedAt := p.CachedAt
	clock.advance(9 * time.Minute)
	w = doRequest(t, h, http.MethodGet, "/api/github", "")
	if w.Code != http.StatusOK {
		t.Fatalf("cached request: status = %d", w.Code)
	}
	if ft.callCount("/users/roshankhatri") != 1 || ft.callCount("/users/roshankhatri/repos") != 1 {
		t.Errorf("cache miss: upstream calls = %v", ft.calls)
	}
	if !strings.Contains(w.Body.String(), firstCachedAt) {
		t.Error("cached response should keep original cachedAt")
	}

	// After TTL: refetch.
	clock.advance(2 * time.Minute)
	w = doRequest(t, h, http.MethodGet, "/api/github", "")
	if w.Code != http.StatusOK {
		t.Fatalf("expired request: status = %d", w.Code)
	}
	if ft.callCount("/users/roshankhatri") != 2 {
		t.Errorf("expected refetch after TTL, calls = %d", ft.callCount("/users/roshankhatri"))
	}
}

func TestGitHubUpstreamFailure(t *testing.T) {
	t.Run("no cache gives 502 JSON", func(t *testing.T) {
		ft := &fakeTransport{calls: map[string]int{}, fail: true}
		h := testHandler(config{githubUser: "roshankhatri"}, &http.Client{Transport: ft}, &fakeClock{testTime})
		w := doRequest(t, h, http.MethodGet, "/api/github", "")
		if w.Code != http.StatusBadGateway {
			t.Fatalf("status = %d, want 502", w.Code)
		}
		var resp errorResponse
		if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil || resp.Error == "" {
			t.Fatalf("expected JSON error, got %s", w.Body.String())
		}
	})

	t.Run("stale cache served on failure", func(t *testing.T) {
		ft := &fakeTransport{calls: map[string]int{}}
		clock := &fakeClock{testTime}
		h := testHandler(config{githubUser: "roshankhatri"}, &http.Client{Transport: ft}, clock)
		w := doRequest(t, h, http.MethodGet, "/api/github", "")
		if w.Code != http.StatusOK {
			t.Fatalf("warm-up status = %d", w.Code)
		}
		var first githubPayload
		_ = json.Unmarshal(w.Body.Bytes(), &first)

		ft.setFail(true)
		clock.advance(11 * time.Minute)
		w = doRequest(t, h, http.MethodGet, "/api/github", "")
		if w.Code != http.StatusOK {
			t.Fatalf("stale serve status = %d, want 200", w.Code)
		}
		var stale githubPayload
		_ = json.Unmarshal(w.Body.Bytes(), &stale)
		if stale.CachedAt != first.CachedAt {
			t.Errorf("stale cachedAt = %s, want original %s", stale.CachedAt, first.CachedAt)
		}
	})
}

func TestGitHubSingleFlight(t *testing.T) {
	ft := &fakeTransport{calls: map[string]int{}, gate: make(chan struct{})}
	clock := &fakeClock{testTime}
	h := testHandler(config{githubUser: "roshankhatri"}, &http.Client{Transport: ft}, clock)

	const n = 8
	results := make(chan int, n)
	var wg sync.WaitGroup
	for range n {
		wg.Add(1)
		go func() {
			defer wg.Done()
			results <- doRequest(t, h, http.MethodGet, "/api/github", "").Code
		}()
	}

	// Wait until the leader's first upstream call is in flight, then let all
	// concurrent requests pile up before releasing the gate.
	deadline := time.Now().Add(2 * time.Second)
	for ft.callCount("/users/roshankhatri") == 0 && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	time.Sleep(20 * time.Millisecond)
	close(ft.gate)
	wg.Wait()
	close(results)

	for code := range results {
		if code != http.StatusOK {
			t.Errorf("status = %d, want 200", code)
		}
	}
	if got := ft.callCount("/users/roshankhatri"); got != 1 {
		t.Errorf("single-flight violated: %d profile fetches for %d concurrent requests", got, n)
	}
}

func TestChatUpstreamProxy(t *testing.T) {
	var gotBody map[string]any
	var gotAuth string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		_ = json.NewDecoder(r.Body).Decode(&gotBody)
		if !strings.HasSuffix(r.URL.Path, "/chat/completions") {
			t.Errorf("unexpected upstream path %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"choices":[{"message":{"role":"assistant","content":"Live model answer."}}]}`))
	}))
	defer upstream.Close()

	cfg := config{chatURL: upstream.URL + "/v1", chatKey: "sk-test", chatModel: "test-model"}
	h := testHandler(cfg, upstream.Client(), &fakeClock{testTime})
	w := doRequest(t, h, http.MethodPost, "/api/chat", `{"message":"hello there"}`)
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, body=%s", w.Code, w.Body.String())
	}
	var resp map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["reply"] != "Live model answer." {
		t.Errorf("reply = %v", resp["reply"])
	}
	if _, ok := resp["degraded"]; ok {
		t.Error("live upstream answer must not be marked degraded")
	}
	if gotAuth != "Bearer sk-test" {
		t.Errorf("Authorization = %q", gotAuth)
	}
	if gotBody["model"] != "test-model" {
		t.Errorf("model = %v", gotBody["model"])
	}
	msgs, _ := gotBody["messages"].([]any)
	if len(msgs) != 2 {
		t.Fatalf("messages = %v", gotBody["messages"])
	}
	sys := msgs[0].(map[string]any)
	if sys["role"] != "system" || !strings.Contains(sys["content"].(string), "hello@roshankhatri.dev") {
		t.Errorf("system prompt missing or wrong: %v", sys)
	}
}

func TestChatUpstreamFailureFallsBack(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "boom", http.StatusInternalServerError)
	}))
	defer upstream.Close()

	cfg := config{chatURL: upstream.URL, chatKey: "sk-test"}
	h := testHandler(cfg, upstream.Client(), &fakeClock{testTime})
	w := doRequest(t, h, http.MethodPost, "/api/chat", `{"message":"what is your stack?"}`)
	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
	var resp chatResponse
	_ = json.Unmarshal(w.Body.Bytes(), &resp)
	if !resp.Degraded || !strings.Contains(resp.Reply, "Go") {
		t.Errorf("expected degraded canned stack answer, got %+v", resp)
	}
}
