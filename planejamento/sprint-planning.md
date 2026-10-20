# Sprint Planning — AgendaPet Web

**Sprint:** 16/10/2026 a 02/11/2026 (Semanas 13 e 14) · **Cliente:** Patinhas & Cia · **Equipe:** 1 pessoa desenvolvedora (Andressa Rosa)

## Meta da sprint

> Entregar a primeira versão do AgendaPet Web: a atendente agenda pelo celular ou tablet com validação, CEP e aviso de feriado, e acompanha a agenda do dia; a dona da loja vê o fechamento do dia no navegador e no terminal, com os mesmos cálculos.

## Backlog estimado

Pontos de história: **1, 2, 3, 5 ou 8** (compare a complexidade entre os cartões; não é tempo em horas).

| Ordem | Ticket | História | Pts | Por que nessa ordem |
|---|---|---|---|---|
| 1 | US01 | Estrutura semântica | 2 | É a base da página: todos os ids e seções que os outros tickets usam. |
| 2 | US10 | Layout responsivo | 5 | O CSS base (variáveis, Flexbox, mobile-first) é feito junto com o HTML e depois refinado a cada ticket, para não acumular no fim. |
| 3 | US02 | Catálogo | 3 | O formulário e a agenda dependem dos serviços (preço, duração, domiciliar). |
| 4 | US03 | Formulário | 5 | Tem muitas regras (RN01, data passada, foco no 1º inválido) e é a entrada de todos os dados da agenda. |
| 5 | US04 | CEP | 3 | Complementa o formulário. É uma API externa com 4 tipos de erro, mas é independente das outras. |
| 6 | US05 | Feriados | 5 | Complementa o formulário. Exige a API, o cache com validade de 30 dias e o fluxo "Agendar mesmo assim". |
| 7 | US07 | Regras e fechamento | 8 | É o núcleo do projeto (classes, herança, conflito, closure, callbacks). Não usa DOM, então posso testar no Node antes de ligar na tela. A US06 e a US11 dependem dela. |
| 8 | US06 | Agenda do dia | 5 | Precisa das classes da US07 para listar, concluir e cancelar. Tem busca sem acento, filtros, atalhos e delegação de eventos. |
| 9 | US08 | Persistência | 3 | Depende do formato `paraJSON()` e da fábrica `criarAgendamento()` da US07. |
| 10 | US09 | Relógio e lembretes | 5 | Usa a agenda já pronta e persistida. O risco está em timers duplicados e no caso "Atrasado". |
| 11 | US11 | Node.js | 5 | Reaproveita o `js/dominio/` já testado. Cobre scripts npm, ESM, CommonJS e global vs local. |
| 12 | US12 | Depuração | 3 | Aproveita um bug real encontrado durante a sprint, que vou anotando desde o início. |
| | | **Total** | **52** | |

Tickets: US01 Estrutura semântica · US02 Catálogo · US03 Formulário · US04 CEP · US05 Feriados · US06 Agenda do dia · US07 Regras e fechamento · US08 Persistência · US09 Relógio e lembretes · US10 Layout responsivo · US11 Node.js · US12 Depuração.

## Riscos e plano B

| Risco | Plano |
|---|---|
| ViaCEP ou BrasilAPI fora do ar durante a apresentação | O sistema já trata a falha (mensagem e preenchimento manual). Uso isso a meu favor e mostro o modo offline do DevTools como parte da demonstração. O cache de feriados também ajuda: consulto 2026 antes da live. |
| US07 (8 pontos) demorar mais que o previsto e travar a US06 e a US11 | Começo a US07 cedo, só com a lógica, e testo no Node com `node` e `console.log` antes de existir tela. Se atrasar, peço ajuda na mentoria de 23/10. |
| Deixar o CSS e a acessibilidade para o fim e estourar o prazo | Confiro 360 px e a navegação por teclado ao fechar cada ticket (está na Definição de Pronto), e não só em 30/10. |
| Não saber explicar um trecho de código (próprio ou sugerido por IA) na live | Só faço merge do que sei explicar linha a linha. Anoto no README o que veio de IA e o que corrigi. |
| Não ter um bug real para a US12 | Anoto os bugs desde o primeiro dia. Se nenhum servir, crio um erro controlado numa branch, como o Refinamento sugere. |

## O que seria cortado se faltasse tempo

Os requisitos obrigatórios (US01 a US12) não entram nesta lista. Se faltar tempo, corto nesta ordem:

1. Estilos de impressão (`@media print`) — bônus
2. Baixar a agenda como arquivo (Blob) — bônus
3. Testes com `node --test` — bônus
4. Publicar no GitHub Pages — bônus
5. Refinamentos visuais além do que o Documento Funcional pede (animações, ícones extras)

## Definição de Pronto para Iniciar (cada cartão)

- [ ] História lida e critérios de aceite entendidos
- [ ] Ticket estimado em pontos
- [ ] Branch criada no padrão `tipo/US##-descricao`

## Cerimônias

| Data | O que | Resultado |
|---|---|---|
| 16/10 | Sprint Planning | Este documento + Kanban com 12 cartões |
| 20, 22 e 23/10 | Mentoria — Semana 13 | 20/10: US01, US10 (base) e US02 · 22/10: US03, US04 e US05 · 23/10: US07 e US06 |
| 27 e 29/10 | Mentoria — Semana 14 | 27/10: US08 e US09 · 29/10: US11 e US12 |
| 30/10 | Apresentação em live coding (Google Meet) + Retrospectiva | Demonstração de 15 min com código e tela funcionando; retrospectiva no README |
| 02/11 | Entrega no AVA (até 22h) | Links do repositório e do Kanban |