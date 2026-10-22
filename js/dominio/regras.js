const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// 60 → "R$ 60,00"
export function formatarMoeda(valor) {
  return formatoMoeda.format(valor);
}

import { CONFIG } from './agendamento.js';


const doisDigitos = (n) => String(n).padStart(2, '0');

// Data de hoje no fuso local, no formato do input date: "AAAA-MM-DD"
export function hojeISO(agora = new Date()) {
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

// Hora atual: "HH:MM"
export function horaAtual(agora = new Date()) {
  return `${doisDigitos(agora.getHours())}:${doisDigitos(agora.getMinutes())}`;
}

// "09:30" → 570 (minutos desde a meia-noite)
export function paraMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

// "2026-10-22" → "22/10/2026"
export function formatarData(dataISO) {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

// RN01: 08:00–18:00, de 30 em 30 min, e o serviço precisa terminar até o fechamento
export function dentroDoFuncionamento(hora, duracaoMin = 0) {
  const inicio = paraMinutos(hora);
  const abertura = paraMinutos(CONFIG.abertura);
  const fechamento = paraMinutos(CONFIG.fechamento);
  const noPasso = (inicio - abertura) % CONFIG.passoMin === 0;
  return inicio >= abertura && noPasso && inicio + duracaoMin <= fechamento;
}

// Devolve um objeto { campo: mensagem }. Vazio = tudo certo.
export function validarAgendamento(dados, servico, agora = new Date()) {
  const erros = {};
  const hoje = hojeISO(agora);
  const digitosTelefone = dados.telefone.replace(/\D/g, '');

  if (dados.tutor.length < 3) erros.tutor = 'Informe o nome do tutor (mínimo 3 letras).';
  if (digitosTelefone.length < 10 || digitosTelefone.length > 11) {
    erros.telefone = 'Informe um telefone com DDD (10 ou 11 dígitos).';
  }
  if (!dados.pet) erros.pet = 'Informe o nome do pet.';
  if (!dados.especie) erros.especie = 'Escolha a espécie.';
  if (!servico) erros.servico = 'Escolha um serviço.';

  if (!dados.data) {
    erros.data = 'Informe a data.';
  } else if (dados.data < hoje) {
    erros.data = 'Não é possível agendar em uma data que já passou.';
  }

  if (!dados.hora) {
    erros.hora = 'Informe o horário.';
  } else if (!dentroDoFuncionamento(dados.hora, servico ? servico.duracaoMin : 0)) {
    erros.hora = 'Fora do funcionamento: atendemos das 08:00 às 18:00, em horários de 30 em 30 minutos, e o serviço precisa terminar até o fechamento.';
  } else if (dados.data === hoje && dados.hora <= horaAtual(agora)) {
    erros.hora = 'Esse horário de hoje já passou.';
  }

  return erros;
}