# syntax=docker/dockerfile:1
#
# Single image for the whole site: the Go API plus the built React bundle,
# served same-origin from one process (no nginx, no sidecar). The Go binary
# serves /api/* and falls through to the embedded SPA files for everything else.

# ── 1. Build the frontend ───────────────────────────────────────────────────
FROM node:22-alpine AS web
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Full tree needed: `npm run build` runs the grounding gate over content.
COPY . .
RUN npm run build

# ── 2. Build the Go API ─────────────────────────────────────────────────────
FROM golang:1.27-alpine AS api
WORKDIR /src

COPY server/go.mod ./
COPY server/*.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/server .

# ── 3. Runtime ──────────────────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /srv
COPY --from=api /out/server /srv/server
COPY --from=web /app/dist /srv/public

ENV PORT=8080 \
    PORTFOLIO_DIST=/srv/public

USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/srv/server"]
