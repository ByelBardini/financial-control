// Package ratelimit fornece um limitador token-bucket em memória, chaveado por
// string (ex.: IP do cliente), pra frear endpoints abusáveis como o login. É
// single-instance: o estado vive na memória do processo, então atrás de várias
// réplicas cada uma limita de forma independente.
package ratelimit

import (
	"net"
	"net/http"
	"strconv"
	"sync"
	"time"

	"financial-control/server/internal/httpx"
)

// Limiter é um token-bucket chaveado. Cada chave ganha um bucket de `burst`
// tokens que recarrega por completo ao longo de `window`. Allow gasta um token;
// quando zera, nega. Seguro pra uso concorrente.
type Limiter struct {
	burst    float64
	perToken time.Duration // tempo pra recarregar 1 token = window / burst
	ttl      time.Duration // buckets ociosos além do ttl são varridos
	now      func() time.Time

	mu        sync.Mutex
	buckets   map[string]*bucket
	lastSweep time.Time
}

// bucket guarda os tokens disponíveis e o instante da última recarga.
type bucket struct {
	tokens float64
	seen   time.Time
}

// New cria um limitador que libera `burst` requisições, recarregando por
// completo ao longo de `window`. `now` é injetado pra testabilidade (passe
// time.Now em produção). burst < 1 é saneado pra 1 (nunca trava 100%).
func New(burst int, window time.Duration, now func() time.Time) *Limiter {
	if burst < 1 {
		burst = 1
	}
	return &Limiter{
		burst:     float64(burst),
		perToken:  window / time.Duration(burst),
		ttl:       2 * window,
		now:       now,
		buckets:   make(map[string]*bucket),
		lastSweep: now(),
	}
}

// Allow gasta um token da chave e devolve true se havia saldo; false se o bucket
// está vazio (estourou o limite). Recarrega o bucket pelo tempo decorrido.
func (l *Limiter) Allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	t := l.now()
	l.sweep(t)

	b := l.buckets[key]
	if b == nil {
		b = &bucket{tokens: l.burst, seen: t}
		l.buckets[key] = b
	} else {
		refill := float64(t.Sub(b.seen)) / float64(l.perToken)
		b.tokens = min(l.burst, b.tokens+refill)
		b.seen = t
	}

	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

// sweep remove buckets sem atividade há mais que o ttl (já recarregados, então
// idênticos a um bucket novo). Roda no máximo uma vez por ttl pra não custar O(n)
// em toda chamada.
func (l *Limiter) sweep(t time.Time) {
	if t.Sub(l.lastSweep) < l.ttl {
		return
	}
	for k, b := range l.buckets {
		if t.Sub(b.seen) >= l.ttl {
			delete(l.buckets, k)
		}
	}
	l.lastSweep = t
}

// Middleware freia as requisições pela chave devolvida por keyOf (tipicamente
// ClientIP). Acima do limite → 429 genérico com Retry-After, sem chamar next.
//
//	mux.Handle("POST /auth/login", limiter.Middleware(ratelimit.ClientIP, h))
func (l *Limiter) Middleware(keyOf func(*http.Request) string, next http.Handler) http.Handler {
	retryAfter := strconv.Itoa(int(l.perToken.Seconds()))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !l.Allow(keyOf(r)) {
			w.Header().Set("Retry-After", retryAfter)
			httpx.WriteError(w, http.StatusTooManyRequests, "muitas tentativas, tente mais tarde")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ClientIP devolve o IP do cliente a partir do RemoteAddr (parte do host). Atenção:
// confia no RemoteAddr, NÃO no X-Forwarded-For (que o cliente pode forjar) — ponha
// um proxy confiável na frente se for terminar TLS/encaminhar.
func ClientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
