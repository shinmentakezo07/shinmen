package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	maxMessageChars     = 2000
	maxChatBodyBytes    = 32 << 10 // 2000 runes worst-case JSON-escaped, plus headroom
	chatUpstreamTimeout = 20 * time.Second
)

const systemPrompt = `You are the portfolio assistant for Roshan Khatri, answering visitors on his personal site. Be concise (a few sentences) and friendly.

Facts you may state:
- Roshan is a backend-focused full-stack engineer, expert in Go, Python, Rust, TypeScript, React, Node, and Tailwind.
- He is a power user of AI coding agents and builds with Claude Code, Codex, OpenCode, and oh-my-pi (omp).
- Case studies on this site: Atlas — a real-time dispatch platform built with Go, Temporal, and Postgres, coordinating 1,800 drivers at 340ms p95; Ledger — a double-entry ledger service; Sift — a local-first semantic search tool built with Rust, WASM, and SQLite that sends zero bytes to a server.
- Contact: hello@roshankhatri.dev.

Never invent facts, employers, dates, metrics, or availability details beyond what is listed here. If asked something these facts do not cover, say you don't know and suggest emailing hello@roshankhatri.dev.`

type chatHandler struct {
	client      *http.Client
	upstreamURL string
	apiKey      string
	model       string
	limiter     *rateLimiter
	logger      *log.Logger
}

type chatResponse struct {
	Reply    string `json:"reply"`
	Degraded bool   `json:"degraded,omitempty"`
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

func (c *chatHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Message string `json:"message"`
	}
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxChatBodyBytes))
	if err := dec.Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{"invalid JSON body"})
		return
	}
	var extra json.RawMessage
	if err := dec.Decode(&extra); err != io.EOF {
		writeJSON(w, http.StatusBadRequest, errorResponse{"invalid JSON body"})
		return
	}
	message := strings.TrimSpace(req.Message)
	if n := utf8.RuneCountInString(message); n < 1 || n > maxMessageChars {
		writeJSON(w, http.StatusBadRequest, errorResponse{"message must be 1..2000 characters after trimming"})
		return
	}

	// Rate limit only well-formed requests; malformed bodies are cheap to reject.
	if !c.limiter.allow(clientIP(r)) {
		w.Header().Set("Retry-After", "6")
		writeJSON(w, http.StatusTooManyRequests, errorResponse{"rate limit exceeded; try again shortly"})
		return
	}

	if c.upstreamURL != "" && c.apiKey != "" {
		reply, err := c.upstream(r.Context(), message)
		if err == nil {
			writeJSON(w, http.StatusOK, chatResponse{Reply: reply})
			return
		}
		c.logger.Printf("chat upstream failed, using canned answer: %v", err)
	}
	writeJSON(w, http.StatusOK, chatResponse{Reply: cannedAnswer(message), Degraded: true})
}

// upstream calls an OpenAI-compatible chat completions endpoint. upstreamURL
// may be a base URL (e.g. https://api.openai.com/v1) or the full endpoint.
func (c *chatHandler) upstream(ctx context.Context, message string) (string, error) {
	endpoint := strings.TrimRight(c.upstreamURL, "/")
	if !strings.HasSuffix(endpoint, "/chat/completions") {
		endpoint += "/chat/completions"
	}

	body, err := json.Marshal(struct {
		Model       string        `json:"model"`
		Messages    []chatMessage `json:"messages"`
		MaxTokens   int           `json:"max_tokens"`
		Temperature float64       `json:"temperature"`
	}{
		Model: c.model,
		Messages: []chatMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: message},
		},
		MaxTokens:   400,
		Temperature: 0.3,
	})
	if err != nil {
		return "", err
	}

	ctx, cancel := context.WithTimeout(ctx, chatUpstreamTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("upstream status %d", resp.StatusCode)
	}

	var out struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&out); err != nil {
		return "", err
	}
	if len(out.Choices) == 0 || strings.TrimSpace(out.Choices[0].Message.Content) == "" {
		return "", errors.New("empty completion")
	}
	return strings.TrimSpace(out.Choices[0].Message.Content), nil
}

// Intent patterns are checked in order; the first match wins. Word boundaries
// keep short tokens ("go", "ai") from matching inside unrelated words.
var intentPatterns = []struct {
	intent string
	re     *regexp.Regexp
}{
	{"availability", regexp.MustCompile(`(?i)\b(available|availability|hire|hiring|freelance|contract|consulting|consultant|open to work|rates?)\b`)},
	{"contact", regexp.MustCompile(`(?i)\b(contact|email|e-mail|reach|get in touch|linkedin|twitter|socials?)\b`)},
	{"agents", regexp.MustCompile(`(?i)\b(ai|agents?|claude|codex|opencode|oh-my-pi|omp|llms?|copilot|cursor|workflow)\b`)},
	{"stack", regexp.MustCompile(`(?i)\b(stack|skills?|tech|technolog\w*|languages?|go|golang|rust|python|typescript|javascript|react|node|nodejs|tailwind|frameworks?|tools?|backend|frontend|full[- ]?stack|experience|expertise)\b`)},
	{"projects", regexp.MustCompile(`(?i)\b(projects?|atlas|ledger|sift|built|build|portfolio|case stud\w*|dispatch|work\w*|ship|shipped)\b`)},
}

var cannedAnswers = map[string]string{
	"availability": "For current availability, email hello@roshankhatri.dev — that's the fastest way to get a direct answer. Roshan focuses on backend-heavy full-stack work: Go services, APIs, and data-intensive systems in Go, Rust, Python, and TypeScript/React.",
	"contact":      "The direct line is hello@roshankhatri.dev. Tell Roshan what you're building and what you need — backend systems, APIs, or full-stack product work.",
	"agents":       "Roshan is a power user of AI coding agents — Claude Code, Codex, OpenCode, and oh-my-pi (omp) — and builds with them regularly. Ask about his projects (Atlas, Ledger, Sift) to see the kind of systems he ships.",
	"stack":        "Roshan is backend-leaning full-stack: Go, Rust, and Python on the server; TypeScript, React, Node, and Tailwind on the web. This site is a working example — a Vite + React frontend talking to a small Go API.",
	"projects":     "Three case studies live on this site: Atlas — a real-time dispatch platform (Go + Temporal + Postgres) coordinating 1,800 drivers at 340ms p95; Ledger — a double-entry ledger service; and Sift — a local-first semantic search tool (Rust + WASM + SQLite) that sends zero bytes to a server. Each one is backend-heavy, which is where Roshan does his best work.",
	"default":      "I'm the assistant for Roshan Khatri's portfolio (currently in offline mode, so answers are canned). Roshan is a backend-leaning full-stack engineer — Go, Rust, Python, TypeScript, React, Node, Tailwind — who builds with AI coding agents. Ask about his stack, his projects (Atlas, Ledger, Sift), his AI-agent workflow, availability, or contact info.",
}

func cannedAnswer(message string) string {
	for _, p := range intentPatterns {
		if p.re.MatchString(message) {
			return cannedAnswers[p.intent]
		}
	}
	return cannedAnswers["default"]
}
