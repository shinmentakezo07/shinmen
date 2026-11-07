package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"sync"
	"time"
)

type githubRepo struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
	Language    *string `json:"language"`
	Stars       int     `json:"stars"`
	Forks       int     `json:"forks"`
	URL         string  `json:"url"`
	UpdatedAt   string  `json:"updatedAt"`
}

type githubPayload struct {
	User        string `json:"user"`
	PublicRepos int    `json:"publicRepos"`
	Followers   int    `json:"followers"`
	// ContributionsLastYear is always null: the count requires GitHub's
	// GraphQL API, which this service deliberately does not call, even when
	// GITHUB_TOKEN is set (see README.md).
	ContributionsLastYear *int         `json:"contributionsLastYear"`
	Repos                 []githubRepo `json:"repos"`
	CachedAt              string       `json:"cachedAt"`
}

// githubService caches the GitHub profile for ttl and collapses concurrent
// refreshes into a single upstream fetch (single-flight). On upstream failure
// it serves the stale cache, if any, with its original cachedAt.
type githubService struct {
	client *http.Client
	user   string
	token  string
	ttl    time.Duration
	now    func() time.Time
	logger *log.Logger

	mu       sync.Mutex
	cached   *githubPayload
	cachedAt time.Time
	inflight chan struct{}
	fetchErr error
}

func (g *githubService) handle(w http.ResponseWriter, r *http.Request) {
	p, err := g.get(r.Context())
	if err != nil {
		g.logger.Printf("github fetch failed: %v", err)
		writeJSON(w, http.StatusBadGateway, errorResponse{"github upstream unavailable"})
		return
	}
	writeJSON(w, http.StatusOK, p)
}

func (g *githubService) get(ctx context.Context) (*githubPayload, error) {
	g.mu.Lock()
	if g.cached != nil && g.now().Sub(g.cachedAt) < g.ttl {
		p := g.cached
		g.mu.Unlock()
		return p, nil
	}
	if g.inflight != nil {
		// Another request is already refreshing; wait for its result.
		ch := g.inflight
		g.mu.Unlock()
		select {
		case <-ch:
		case <-ctx.Done():
			return nil, ctx.Err()
		}
		g.mu.Lock()
		p, err := g.cached, g.fetchErr
		g.mu.Unlock()
		if p != nil {
			return p, nil // fresh or stale-on-failure
		}
		return nil, err
	}

	ch := make(chan struct{})
	g.inflight = ch
	g.mu.Unlock()

	p, err := g.fetch(ctx)

	g.mu.Lock()
	g.fetchErr = err
	if err == nil {
		at := g.now()
		p.CachedAt = at.UTC().Format(time.RFC3339)
		g.cached = p
		g.cachedAt = at
	}
	g.inflight = nil
	close(ch)
	stale := g.cached
	g.mu.Unlock()

	if err != nil {
		if stale != nil {
			g.logger.Printf("github fetch failed, serving stale cache: %v", err)
			return stale, nil
		}
		return nil, err
	}
	return p, nil
}

func (g *githubService) fetch(ctx context.Context) (*githubPayload, error) {
	// Detach from the initiating request so one client disconnecting does not
	// fail the fetch for everyone waiting on it.
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 15*time.Second)
	defer cancel()

	base := "https://api.github.com/users/" + url.PathEscape(g.user)
	var user struct {
		Login       string `json:"login"`
		PublicRepos int    `json:"public_repos"`
		Followers   int    `json:"followers"`
	}
	if err := g.getJSON(ctx, base, &user); err != nil {
		return nil, err
	}

	var repos []struct {
		Name            string  `json:"name"`
		Description     *string `json:"description"`
		Language        *string `json:"language"`
		StargazersCount int     `json:"stargazers_count"`
		ForksCount      int     `json:"forks_count"`
		HTMLURL         string  `json:"html_url"`
		PushedAt        string  `json:"pushed_at"`
		UpdatedAt       string  `json:"updated_at"`
	}
	if err := g.getJSON(ctx, base+"/repos?sort=pushed&per_page=6", &repos); err != nil {
		return nil, err
	}

	p := &githubPayload{
		User:        user.Login,
		PublicRepos: user.PublicRepos,
		Followers:   user.Followers,
		Repos:       make([]githubRepo, 0, len(repos)),
	}
	for _, r := range repos {
		at := r.PushedAt
		if at == "" {
			at = r.UpdatedAt
		}
		p.Repos = append(p.Repos, githubRepo{
			Name:        r.Name,
			Description: r.Description,
			Language:    r.Language,
			Stars:       r.StargazersCount,
			Forks:       r.ForksCount,
			URL:         r.HTMLURL,
			UpdatedAt:   at,
		})
	}
	return p, nil
}

func (g *githubService) getJSON(ctx context.Context, endpoint string, out any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "roshan-portfolio-server")
	req.Header.Set("Accept", "application/vnd.github+json")
	if g.token != "" {
		req.Header.Set("Authorization", "Bearer "+g.token)
	}
	resp, err := g.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("github %s: status %d", req.URL.Path, resp.StatusCode)
	}
	return json.NewDecoder(io.LimitReader(resp.Body, 2<<20)).Decode(out)
}
