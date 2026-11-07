package main

import (
	"sync"
	"time"
)

// rateLimiter is a per-key token bucket. Buckets refill at rate tokens per
// second up to burst, and each allowed request costs one token.
type rateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*bucket
	rate    float64
	burst   float64
	now     func() time.Time
}

type bucket struct {
	tokens float64
	last   time.Time
}

func newRateLimiter(ratePerSecond, burst float64, now func() time.Time) *rateLimiter {
	return &rateLimiter{
		buckets: make(map[string]*bucket),
		rate:    ratePerSecond,
		burst:   burst,
		now:     now,
	}
}

func (rl *rateLimiter) allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := rl.now()
	b, ok := rl.buckets[key]
	if !ok {
		b = &bucket{tokens: rl.burst, last: now}
		rl.buckets[key] = b
	}
	b.tokens = min(rl.burst, b.tokens+now.Sub(b.last).Seconds()*rl.rate)
	b.last = now
	if b.tokens >= 1 {
		b.tokens--
		return true
	}
	return false
}

// sweep drops buckets idle longer than maxIdle so the map cannot grow without
// bound under IP churn.
func (rl *rateLimiter) sweep(maxIdle time.Duration) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := rl.now()
	for key, b := range rl.buckets {
		if now.Sub(b.last) > maxIdle {
			delete(rl.buckets, key)
		}
	}
}

func (rl *rateLimiter) runJanitor(done <-chan struct{}, every, maxIdle time.Duration) {
	ticker := time.NewTicker(every)
	defer ticker.Stop()
	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			rl.sweep(maxIdle)
		}
	}
}
