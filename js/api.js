import { lerFeriadosCache, salvarFeriadosCache } from './storage.js';

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
    resposta = await fetch(url); 
  } catch {
    throw new ErroApi('rede', 'Sem conexão.');
  }

  if (!resposta.ok) {
    
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

// ---------- Feriados (BrasilAPI) — o cache de 30 dias fica no storage.js ----------

export async function buscarFeriados(ano) {
  const emCache = lerFeriadosCache(ano);
  if (emCache) return emCache; // cache válido: nem vai à internet

  const feriados = await buscarJSON(`https://brasilapi.com.br/api/feriados/v1/${ano}`);
  salvarFeriadosCache(ano, feriados);
  return feriados;
}

export function carregarAgendaExemplo() {
  return buscarJSON('data/agenda-exemplo.json');
}