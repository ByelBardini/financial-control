package ratelimit_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"financial-control/server/internal/ratelimit"
)

// clock é um relógio controlável: deixa os testes de recarga determinísticos
// (sem depender do tempo real). É o "fake nomeado" que substitui time.Now.
type clock struct{ t time.Time }

func (c *clock) now() time.Time          { return c.t }
func (c *clock) advance(d time.Duration) { c.t = c.t.Add(d) }

func newClock() *clock {
	return &clock{t: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)}
}

func TestAllowGastaOBurstDepoisNega(t *testing.T) {
	cl := newClock()
	l := ratelimit.New(3, time.Minute, cl.now)

	for i := 1; i <= 3; i++ {
		if !l.Allow("ip-a") {
			t.Fatalf("tentativa %d deveria passar (dentro do burst)", i)
		}
	}
	if l.Allow("ip-a") {
		t.Fatal("4ª tentativa deveria ser negada (burst esgotado)")
	}
}

func TestAllowRecarregaAposAJanela(t *testing.T) {
	cl := newClock()
	l := ratelimit.New(3, time.Minute, cl.now)
	for i := 0; i < 3; i++ {
		l.Allow("ip-a")
	}
	if l.Allow("ip-a") {
		t.Fatal("burst deveria estar esgotado antes de avançar o relógio")
	}

	cl.advance(time.Minute) // janela inteira → bucket cheio de novo
	for i := 1; i <= 3; i++ {
		if !l.Allow("ip-a") {
			t.Fatalf("após a janela, tentativa %d deveria passar", i)
		}
	}
}

func TestAllowRecargaParcialLiberaUmToken(t *testing.T) {
	cl := newClock()
	l := ratelimit.New(3, 3*time.Minute, cl.now) // 1 token a cada 1min
	for i := 0; i < 3; i++ {
		l.Allow("ip-a")
	}

	cl.advance(time.Minute) // recarrega exatamente 1 token
	if !l.Allow("ip-a") {
		t.Fatal("após 1 token recarregado, 1 tentativa deveria passar")
	}
	if l.Allow("ip-a") {
		t.Fatal("o token recarregado já foi gasto; a próxima deveria negar")
	}
}

func TestAllowChavesSaoIndependentes(t *testing.T) {
	cl := newClock()
	l := ratelimit.New(1, time.Minute, cl.now)
	if !l.Allow("ip-a") || l.Allow("ip-a") {
		t.Fatal("ip-a: 1 passa, 2ª nega")
	}
	if !l.Allow("ip-b") {
		t.Fatal("ip-b tem bucket próprio — não pode herdar o esgotamento de ip-a")
	}
}

func TestNewBurstMinimoUm(t *testing.T) {
	cl := newClock()
	l := ratelimit.New(0, time.Minute, cl.now) // burst inválido vira 1 (fail-safe)
	if !l.Allow("ip-a") {
		t.Fatal("burst saneado para 1 deveria permitir a 1ª")
	}
	if l.Allow("ip-a") {
		t.Fatal("burst 1 deveria negar a 2ª")
	}
}

func TestMiddlewarePassaAbaixoDoLimite(t *testing.T) {
	cl := newClock()
	l := ratelimit.New(2, time.Minute, cl.now)
	called := 0
	h := l.Middleware(staticKey, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		called++
		w.WriteHeader(http.StatusOK)
	}))

	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/auth/login", nil))
	if rec.Code != http.StatusOK || called != 1 {
		t.Fatalf("abaixo do limite: status=%d called=%d, quero 200/1", rec.Code, called)
	}
}

func TestMiddleware429AoExceder(t *testing.T) {
	cl := newClock()
	l := ratelimit.New(1, time.Minute, cl.now)
	called := 0
	next := http.HandlerFunc(func(http.ResponseWriter, *http.Request) { called++ })
	h := l.Middleware(staticKey, next)

	first := httptest.NewRecorder()
	h.ServeHTTP(first, httptest.NewRequest(http.MethodPost, "/auth/login", nil))

	blocked := httptest.NewRecorder()
	h.ServeHTTP(blocked, httptest.NewRequest(http.MethodPost, "/auth/login", nil))

	if blocked.Code != http.StatusTooManyRequests {
		t.Fatalf("ao exceder, status = %d, quero 429", blocked.Code)
	}
	if called != 1 {
		t.Fatalf("next chamado %d vezes; a 2ª (bloqueada) não pode chegar no handler", called)
	}
	if blocked.Header().Get("Retry-After") != "60" {
		t.Fatalf("Retry-After = %q, quero 60 (janela 1min / burst 1)", blocked.Header().Get("Retry-After"))
	}
}

func TestClientIP(t *testing.T) {
	tests := []struct {
		name       string
		remoteAddr string
		want       string
	}{
		{"ipv4 com porta", "203.0.113.7:5555", "203.0.113.7"},
		{"ipv6 com porta", "[2001:db8::1]:5555", "2001:db8::1"},
		{"sem porta (fallback)", "203.0.113.7", "203.0.113.7"},
		{"vazio", "", ""},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/auth/login", nil)
			req.RemoteAddr = tc.remoteAddr
			if got := ratelimit.ClientIP(req); got != tc.want {
				t.Fatalf("ClientIP(%q) = %q, quero %q", tc.remoteAddr, got, tc.want)
			}
		})
	}
}

func staticKey(*http.Request) string { return "k" }
