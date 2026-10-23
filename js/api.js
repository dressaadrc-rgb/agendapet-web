import { lerJSON, salvarJSON } from './storage.js';

export class ErroApi extends Error {
  constructor(tipo, mensagem) {
    super(mensagem);
    this.name = 'ErroApi';
    this.tipo = tipo; // 'rede' | 'http' | 'formato' | 'nao-encontrado'
  }
}

async function buscarJSON(url) {
  let resposta;
  try {
    resposta = await fetch(url); // só falha aqui se nem chegou ao servidor (sem rede)
  } catch {
    throw new ErroApi('rede', 'Sem conexão.');
  }

  if (!resposta.ok) {
    // 404, 500... NÃO fazem o fetch falhar: precisamos conferir resposta.ok
    throw new ErroApi('http', `erro HTTP ${resposta.status}`);
  }

  return resposta.json(); // .json() também é uma Promise
}

export function carregarServicos() {
  return buscarJSON('data/servicos.json');
}

export async function buscarCep(cep) {
  const digitos = cep.replace(/\D/g, '');
  if (digitos.length !== 8) {
    throw new ErroApi('formato', 'O CEP deve ter 8 dígitos.'); // nem chama a rede
  }

  const dados = await buscarJSON(`https://viacep.com.br/ws/${digitos}/json/`);

  // CEP bem formatado, mas inexistente: o ViaCEP responde 200 com { "erro": true }
  if (dados.erro) {
    throw new ErroApi('nao-encontrado', 'CEP não encontrado.');
  }

  return {
    cep: dados.cep,
    logradouro: dados.logradouro,
    bairro: dados.bairro,
    cidade: dados.localidade, // o ViaCEP chama a cidade de "localidade"
    uf: dados.uf,
  };
}

const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;

export async function buscarFeriados(ano) {
  const chave = `agendapet:feriados:${ano}`;
  const cache = lerJSON(chave, null);

  if (cache && Array.isArray(cache.feriados) && Date.now() - cache.salvoEm < TRINTA_DIAS_MS) {
    return cache.feriados; // cache válido: nem vai à internet
  }

  const feriados = await buscarJSON(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
  salvarJSON(chave, { salvoEm: Date.now(), feriados });
  return feriados;
}