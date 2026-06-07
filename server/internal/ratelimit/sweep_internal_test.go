package ratelimit

import (
	"testing"
	"time"
)

// Teste white-box (mesmo pacote): a varredura é detalhe interno de memória, então
// inspeciona o mapa direto. Buckets ociosos por mais que o TTL são removidos —
// senão uma enxurrada de IPs distintos cresceria o mapa sem limite.
func TestSweepRemoveBucketsOciosos(t *testing.T) {
	t0 := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	now := t0
	l := New(5, time.Minute, func() time.Time { return now }) // ttl interno = 2*janela = 2min

	l.Allow("ip-a")
	l.Allow("ip-b")
	if len(l.buckets) != 2 {
		t.Fatalf("buckets = %d, quero 2 após dois IPs", len(l.buckets))
	}

	now = t0.Add(3 * time.Minute) // a e b ficam ociosos além do TTL
	l.Allow("ip-c")               // dispara a varredura e adiciona c

	if len(l.buckets) != 1 {
		t.Fatalf("buckets = %d, quero 1 (a/b varridos, só c sobra)", len(l.buckets))
	}
	if _, ok := l.buckets["ip-c"]; !ok {
		t.Fatal("ip-c deveria permanecer após a varredura")
	}
}
