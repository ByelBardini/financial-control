// Package precojob roda o job diário de cotação (EOD): ao fim do pregão, busca o último preço de
// cada ativo cotável (em lote por classe) e grava o fechamento do dia. Orquestra o provider
// (internal/cotacao) e o store — por isso fica fora do cotacao, que continua um provider puro.
// Ver docs/context/cotacao.md.
package precojob

import (
	"context"
	"log"
	"time"

	"financial-control/server/internal/cotacao"
	"financial-control/server/internal/store"
)

// Cotador busca o último preço de vários tickers de uma classe, em lote. *cotacao.Resolver implementa.
type Cotador interface {
	UltimosPrecos(ctx context.Context, class string, tickers []string) (map[string]cotacao.Cotacao, error)
}

// Carteira é o acesso a dados que o job precisa. *store.Store implementa.
type Carteira interface {
	ListQuotableAssets(ctx context.Context) ([]store.QuotableAsset, error)
	RecordDailyClose(ctx context.Context, userID, assetID string, priceCents int64, observedOn time.Time, source string, asOf time.Time) error
}

// Agendador dispara a ingestão diária de preço no horário configurado (em Brasília).
type Agendador struct {
	carteira Carteira
	cotador  Cotador
	hora     int
	minuto   int
	now      func() time.Time
}

// NewAgendador cria o job pra rodar diariamente em hora:minuto (BRT). now é injetado p/ testes
// (passe time.Now em produção).
func NewAgendador(c Carteira, cot Cotador, hora, minuto int, now func() time.Time) *Agendador {
	return &Agendador{carteira: c, cotador: cot, hora: hora, minuto: minuto, now: now}
}

// Run roda o loop até o contexto cancelar: dorme até a próxima execução (HH:MM BRT) e ingere.
// O próximo disparo é calculado contra o relógio de parede de Brasília (não um tick fixo de 24h).
func (a *Agendador) Run(ctx context.Context) {
	for {
		espera := ProximaExecucao(a.now(), a.hora, a.minuto).Sub(a.now())
		timer := time.NewTimer(espera)
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
			a.RodarUmaVez(ctx)
		}
	}
}

// Resumo é o resultado de uma rodada (alimenta o log estruturado).
type Resumo struct {
	Tentados int
	Gravados int
	Falhas   int
}

// RodarUmaVez faz uma passada: agrupa os ativos por classe, busca o último preço em LOTE (1 request
// por classe) e grava o fechamento do dia (observed_on = hoje em BRT). Isola falhas — um ticker (ou
// uma classe) que erra não derruba o resto do lote.
func (a *Agendador) RodarUmaVez(ctx context.Context) Resumo {
	ativos, err := a.carteira.ListQuotableAssets(ctx)
	if err != nil {
		log.Printf("precojob: listar ativos cotáveis falhou: %v", err)
		return Resumo{}
	}
	observed := cotacao.DataBRT(a.now())
	res := Resumo{Tentados: len(ativos)}
	for class, doClasse := range agruparPorClasse(ativos) {
		precos, err := a.cotador.UltimosPrecos(ctx, class, tickersDe(doClasse))
		if err != nil {
			log.Printf("precojob: cotar classe %s falhou: %v", class, err)
			res.Falhas += len(doClasse)
			continue
		}
		a.gravarClasse(ctx, doClasse, precos, observed, &res)
	}
	log.Printf("precojob: rodada concluída tentados=%d gravados=%d falhas=%d", res.Tentados, res.Gravados, res.Falhas)
	return res
}

// gravarClasse grava o fechamento de cada ativo da classe; preço ausente ou erro de gravação contam
// como falha sem interromper os demais.
func (a *Agendador) gravarClasse(ctx context.Context, ativos []store.QuotableAsset, precos map[string]cotacao.Cotacao, observed time.Time, res *Resumo) {
	for _, at := range ativos {
		cot, ok := precos[at.Ticker]
		if !ok {
			log.Printf("precojob: sem preço para %s (%s)", at.Ticker, at.AssetClass)
			res.Falhas++
			continue
		}
		if err := a.carteira.RecordDailyClose(ctx, at.UserID, at.ID, cot.PriceCents, observed, cot.Source, cot.AsOf); err != nil {
			log.Printf("precojob: gravar fechamento de %s falhou: %v", at.Ticker, err)
			res.Falhas++
			continue
		}
		res.Gravados++
	}
}

// ProximaExecucao devolve o próximo instante em hora:minuto no fuso de Brasília a partir de now
// (hoje se ainda não passou, senão amanhã).
func ProximaExecucao(now time.Time, hora, minuto int) time.Time {
	n := now.In(cotacao.BRT)
	prox := time.Date(n.Year(), n.Month(), n.Day(), hora, minuto, 0, 0, cotacao.BRT)
	if !prox.After(n) {
		prox = prox.AddDate(0, 0, 1)
	}
	return prox
}

func agruparPorClasse(ativos []store.QuotableAsset) map[string][]store.QuotableAsset {
	m := make(map[string][]store.QuotableAsset)
	for _, at := range ativos {
		m[at.AssetClass] = append(m[at.AssetClass], at)
	}
	return m
}

func tickersDe(ativos []store.QuotableAsset) []string {
	out := make([]string, 0, len(ativos))
	for _, at := range ativos {
		out = append(out, at.Ticker)
	}
	return out
}
