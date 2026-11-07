# Portfolio API server

Small stdlib-only Go service backing the Vite frontend (proxied at `/api`).

## Run

```sh
cd server && go run .    # or: npm run server (from the repo root)
```

## Configuration (environment)

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8080` | Listen port |
| `GITHUB_USER` | `roshankhatri` | GitHub login for `/api/github` |
| `GITHUB_TOKEN` | — | Optional bearer token for the GitHub REST API |
| `CHAT_UPSTREAM_URL` | — | OpenAI-compatible base URL or full `/chat/completions` endpoint |
| `CHAT_UPSTREAM_KEY` | — | API key; chat proxies upstream only when URL **and** key are set |
| `CHAT_MODEL` | `gpt-4o-mini` | Model for chat completions |

## Behavior notes

- `GET /api/health` → `{"ok":true}`.
- `GET /api/github` fetches the user profile and the 6 most recently pushed
  repos, caches the result in memory for 10 minutes, and collapses concurrent
  refreshes into one upstream fetch. On upstream failure it serves the stale
  cache (original `cachedAt`) if one exists, otherwise 502 with `{"error":...}`.
  `contributionsLastYear` is always `null`, even when `GITHUB_TOKEN` is set:
  that count is only available through GitHub's GraphQL API, which this
  service deliberately does not call.
- `POST /api/chat` accepts `{"message": "..."}` (1–2000 characters after
  trimming), rate-limited per client IP with a token bucket (10 requests/min,
  burst 5; excess → 429). With upstream config set it proxies to an
  OpenAI-compatible endpoint (20s timeout) with a system prompt restricted to
  known facts about Roshan. Without config, or on any upstream failure, it
  returns deterministic canned answers keyed by intent with `"degraded": true`.
  Behind the Vite dev proxy all browsers share the proxy's IP, so the bucket
  is effectively per-proxy there; proxy headers are intentionally not trusted.

## Test

```sh
go vet ./... && go test ./...
```
