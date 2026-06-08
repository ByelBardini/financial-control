import type { ContasSnapshot } from '../types/contas';

// FIXTURE DE TESTE da tela de Contas (igual ao dashboardSnapshot: sem importador em
// runtime — a API real vive em src/api/contas). Injetado nos testes dos componentes
// apresentacionais e no mockContasApi. Valores monetários em centavos (inteiro).
export const contasSnapshot: ContasSnapshot = {
  banks: [
    {
      id: 'nubank',
      name: 'Nubank',
      subtitle: 'Conta Corrente • Final 4022',
      balanceCents: 84220,
      icon: 'account_balance_wallet',
      brandColor: '#8a05be',
      note: 'Sincronizado há 2 minutos - Infelizmente',
      noteTone: 'secondary',
    },
    {
      id: 'inter',
      name: 'Inter',
      subtitle: 'Conta Digital • Final 9921',
      balanceCents: 32000,
      icon: 'payments',
      brandColor: '#ff7a00',
      note: 'Último movimento: -R$ 45,90 (Ifood)',
      noteTone: 'neutral',
    },
    {
      id: 'itau',
      name: 'Itaú Personnalité',
      subtitle: 'Conta Salário • Final 0012',
      balanceCents: 0,
      icon: 'corporate_fare',
      brandColor: '#004990',
      note: 'Vazio como minha alma',
      noteTone: 'error',
    },
  ],
  cards: [
    {
      id: 'nubank-cartao',
      name: 'Nubank Roxinho',
      invoiceCents: 32000,
      limitCents: 150000,
      availableCents: 118000,
      usedPercent: 21,
      icon: 'credit_card',
      brandColor: '#8a05be',
      note: 'Ainda fingindo controle',
      noteTone: 'secondary',
    },
    {
      id: 'itau-click',
      name: 'Itaú Click',
      invoiceCents: 135000,
      limitCents: 150000,
      availableCents: 15000,
      usedPercent: 90,
      icon: 'credit_card',
      brandColor: '#004990',
      note: 'Beirando o estouro',
      noteTone: 'error',
    },
  ],
  vouchers: [
    {
      id: 'alelo',
      name: 'Alelo Refeição',
      valueCents: 21500,
      icon: 'restaurant',
      status: 'ativo',
      remainingPercent: 15,
      note: 'Dura mais 3 almoços (estimado)',
      noteTone: 'neutral',
    },
    {
      id: 'ticket',
      name: 'Ticket Alimentação',
      valueCents: 1230,
      icon: 'shopping_basket',
      status: 'critico',
      remainingPercent: 2,
      note: 'Socorro, cadê o RH?',
      noteTone: 'error',
    },
  ],
  cash: {
    balanceCents: 12230,
    quip: 'Notas amassadas e moedas de 5 centavos que o caixa não quis.',
    confidenceLabel: 'Confiança Financeira',
    confidencePercent: 4,
  },
  xray: {
    title: 'Raio-X de Pobreza',
    rows: [
      { label: 'Dívidas no Nubank', cents: 420000, tone: 'error' },
      { label: 'Limite Disponível', cents: 4210, tone: 'neutral' },
    ],
    panic: {
      percent: 85,
      levelLabel: 'Crítico',
      levelTone: 'error',
      lowLabel: 'Tranquilo',
      highLabel: 'Colapso',
      note: '4 dias restantes até a falência total.',
    },
  },
  tip: {
    title: 'Dica de Gestão',
    body: 'Se você não abrir o aplicativo do banco, o saldo tecnicamente pode ser infinito. Efeito Schrödinger Financeiro.',
  },
};
