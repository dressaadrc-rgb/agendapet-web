import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  Servico, Agendamento, STATUS, criarAgendamento, criarGeradorProtocolo, maiorNumeroProtocolo,
} from '../js/dominio/agendamento.js';
import { temConflito } from '../js/dominio/regras.js';
import { calcularFechamento } from '../js/dominio/fechamento.js';

const lerDados = async (arquivo) => JSON.parse(await readFile(new URL(`../data/${arquivo}`, import.meta.url), 'utf8'));
const catalogo = (await lerDados('servicos.json')).map((s) => new Servico(s));
const agenda = (await lerDados('agenda-exemplo.json')).map((d) => criarAgendamento(d, catalogo));
const buscar = (protocolo) => agenda.find((a) => a.protocolo === protocolo);

test('closure: o protocolo é sequencial', () => {
  const proximo = criarGeradorProtocolo(7);
  assert.equal(proximo(), 'AP-0008');
  assert.equal(proximo(), 'AP-0009');
});

test('protocolo continua do maior número salvo', () => {
  assert.equal(maiorNumeroProtocolo(agenda), 11);
});

test('herança: domiciliar soma a taxa de deslocamento', () => {
  const emSaoPaulo = buscar('AP-0002'); // banho e tosa 120 + 15
  const emGuarulhos = buscar('AP-0005'); // tosa 80 + 30
  assert.ok(emSaoPaulo instanceof Agendamento);
  assert.equal(emSaoPaulo.calcularValor(), 135);
  assert.equal(emGuarulhos.calcularValor(), 110);
});

test('conflito: horário ocupado bloqueia e cancelado libera', () => {
  const novo = criarAgendamento({ ...buscar('AP-0001').paraJSON(), protocolo: 'AP-0099' }, catalogo);
  assert.equal(temConflito(agenda, novo).protocolo, 'AP-0001');

  // AP-0004 (cancelado) e AP-0010 estão às 10:30: não conflitam
  assert.equal(buscar('AP-0004').conflitaCom(buscar('AP-0010')), false);
});

test('status travado depois de concluído', () => {
  assert.throws(() => buscar('AP-0001').alterarStatus(STATUS.CANCELADO));
});

test('fechamento de 20/10 soma só os concluídos', () => {
  const f = calcularFechamento(agenda, '2026-10-20');
  assert.equal(f.total, 10);
  assert.equal(f.concluidos, 5);
  assert.equal(f.agendados, 4);
  assert.equal(f.cancelados, 1);
  assert.equal(f.faturamento, 515);
  assert.equal(f.aReceber, 385);
  assert.equal(f.porServico[0].servico, 'Banho');
  assert.equal(f.porServico[0].quantidade, 3);
});