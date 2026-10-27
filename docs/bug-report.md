# Relatório de bug — BUG-01

| Campo | Valor |
|---|---|
| **Título** | O faturamento do dia somava atendimentos ainda não concluídos |
| **Ticket relacionado** | US07 – Regras de negócio e fechamento do dia (RN06) |
| **Onde apareceu** | `js/dominio/fechamento.js`, função `calcularFechamento`; visível em `npm run fechamento`, no painel "Fechamento do dia" da página e no `npm test` |
| **Branch da correção** | `docs/US12-depuracao` (PR #27) |
| **Gravidade** | Alta — o dono da loja veria um faturamento maior do que o dinheiro realmente recebido e fecharia o caixa com um valor errado |

> **Observação:** este é um **erro controlado**, introduzido de propósito (commit `f17d161`), como o Refinamento Técnico permite, para praticar o método de depuração: reproduzir → hipótese → evidência no depurador → causa raiz → correção. Um bug real encontrado durante a sprint está descrito no final deste relatório.

## Passos para reproduzir

1. Na branch `docs/US12-depuracao`, no commit `f17d161`, rodar `npm run fechamento` (usa `data/agenda-exemplo.json` e a data 20/10/2026).
2. Ler a linha "Faturamento (só concluídos)" no terminal.
3. Rodar `npm test` e observar o teste "fechamento de 20/10 soma só os concluídos".

## Resultado esperado × obtido

| | Esperado | Obtido (com o bug) |
|---|---|---|
| Faturamento de 20/10/2026 (`npm run fechamento`) | R$ 515,00 | R$ 900,00 |
| Teste "fechamento de 20/10 soma só os concluídos" | passa | falha com `900 !== 515` |
| Atendimentos somados no faturamento | 5 (só os concluídos) | 9 (concluídos + agendados) |

Evidência do teste falhando: o `npm test` mostrou `pass 5`, `fail 1` e `AssertionError: 900 !== 515` em `tests/dominio.test.js:51`.

## Investigação com o depurador

Configuração usada: **"Depurar fechamento do dia (Node)"** (tecla **F5**), definida em `.vscode/launch.json`, que roda `scripts/fechamento-dia.js --data=2026-10-20`.

**Hipótese inicial:** a diferença de R$ 385,00 é exatamente o valor "a receber". Então o faturamento devia estar somando também os atendimentos com status "Agendado".

1. **Breakpoint** em `js/dominio/fechamento.js`, linha `44` (o `return {` do `calcularFechamento`), ponto em que todas as variáveis da função já foram calculadas.
2. **Variables / Watch** com o programa pausado:

   | Expressão (Watch) | Valor |
   |---|---|
   | `concluidos.length` | 5 |
   | `doDia.filter((a) => a.ativo).length` | 9 |
   | `somarValores(concluidos)` | 515 |
   | `somarValores(doDia.filter((a) => a.ativo))` | 900 |

   O Watch confirmou a hipótese: o valor certo (515) existia, mas a linha 50 usava a lista dos **ativos** (9 itens, 900), e não a dos **concluídos** (5 itens, 515).

3. **Call Stack:** `calcularFechamento` (`js/dominio/fechamento.js`, linha 44) ← `main` (`scripts/fechamento-dia.js`, linha 32) ← `<anonymous>` (`scripts/fechamento-dia.js`, linha 40). Conclusão: o erro estava na **regra de negócio**, e não no script do terminal, que só chama a regra e imprime. Por isso a página também mostrava o valor errado: ela usa o mesmo módulo.

4. **Breakpoint condicional e logpoint:** durante a prática do depurador, usei um breakpoint condicional `a.status === 'Agendado'` no `reduce` do "por serviço" (pausou só nos 4 agendados: AP-0006 a AP-0009) e um logpoint `{a.protocolo} → {a.status}`, que listou no Console de Depuração cada atendimento ativo sem pausar o programa. Eles mostraram quais itens estavam com status "Agendado", que eram justamente os que estavam sendo somados a mais.

Evidências: [depuracao-bug.png](depuracao-bug.png) (pausado no `return`, com o Watch e a Call Stack) · [depuracao.png](depuracao.png) (breakpoint condicional e logpoint) · [depuracao-logpoint.png](depuracao-logpoint.png) (saída do logpoint)

## Causa raiz

O faturamento foi calculado com o critério **errado**: em vez de somar só os atendimentos com status "Concluído", ele somava todos os **ativos** (`a.ativo`), e ativo inclui "Agendado" e "Concluído". Ou seja, confundiu "atendimento que ocupa horário" (RN02) com "atendimento já realizado e pago" (RN06).

```js
// ANTES (bug)
faturamento: somarValores(doDia.filter((a) => a.ativo)),

// DEPOIS (correto)
faturamento: somarValores(concluidos), // RN06: SÓ concluídos
```

## Correção

- Commit: `6b7ce44` — `fix(US07): soma só atendimentos concluídos no faturamento` (PR #27)
- Como confirmar que foi corrigido:
  - `npm run fechamento` → "Faturamento (só concluídos): R$ 515,00"
  - `npm test` → 6 testes passando, 0 falhas

## Como evitar de novo

- Manter o teste automático do fechamento (`tests/dominio.test.js`): foi ele que acusou o erro na hora, antes de qualquer pessoa abrir a página.
- Dar nomes claros às listas (`concluidos`, `agendados`, `ativos`) e reaproveitar a lista certa, em vez de refiltrar no meio do `return`.
- Ler o comentário da regra (RN06) antes de alterar um cálculo de valor.

---

## Bug real encontrado durante a sprint (US08)

Durante a US08, a agenda passou a ser salva no `localStorage` com a chave **`undefined`**, e não `agendapet:agenda`. O sintoma apareceu no DevTools (Application → Local Storage); a causa era o nome de uma propriedade do objeto `CHAVES` escrito errado: em JavaScript, ler uma propriedade que não existe devolve `undefined` sem dar erro. Corrigi o nome antes de commitar, então não há um commit de correção separado. A lição foi a mesma deste relatório: conferir os nomes e testar o resultado de verdade (no caso, olhando o Application), em vez de confiar que "rodou sem erro".
