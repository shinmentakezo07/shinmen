package main

import (
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
)

// spaHandler serves the pre-built frontend from dir. It mirrors the Vite dev
// proxy locally: /api/* is handled by the API mux, everything else is a static
// file, and unknown paths without a file extension return index.html so the
// client router can resolve /work/:slug and /resume.
//
// If dir is missing or empty (e.g. `go run .` without a build), the mount is a
// no-op so the API still comes up on its own.
func spaHandler(dir string) (http.Handler, bool) {
	if dir == "" {
		return nil, false
	}
	if fi, err := os.Stat(dir); err != nil || !fi.IsDir() {
		return nil, false
	}

	files := http.FileServer(http.Dir(dir))
	index := filepath.Join(dir, "index.html")

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		clean := path.Clean(r.URL.Path)
		if clean == "/" {
			// The shell must be revalidated, or clients keep an old asset graph.
			w.Header().Set("Cache-Control", "no-cache")
			http.ServeFile(w, r, index)
			return
		}
		if path.Ext(clean) != "" {
			// Vite emits content-hashed files under /assets/; cache forever.
			if strings.HasPrefix(clean, "/assets/") {
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			}
			files.ServeHTTP(w, r)
			return
		}

		// Extensionless path: a client-side route. Serve the shell.
		w.Header().Set("Cache-Control", "no-cache")
		http.ServeFile(w, r, index)
	}), true
}
