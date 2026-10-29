const PREFIXO = 'agendapet:';

export const CHAVES = Object.freeze({
  agenda: `${PREFIXO}agenda`,
  filtro: `${PREFIXO}filtro`,
  tema: `${PREFIXO}tema`,
});

export function lerJSON(chave, padrao) {
  try {
    const bruto = localStorage.getItem(chave); // null na primeira visita
    return bruto === null ? padrao : JSON.parse(bruto);
  } catch {
    return padrao; // dado corrompido não derruba a página
  }
}

export function salvarJSON(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    return false; // ex.: armazenamento cheio ou bloqueado
  }
}

export function limparDados() {
  try {
    const nossas = Object.keys(localStorage).filter((chave) => chave.startsWith(PREFIXO));
    nossas.forEach((chave) => localStorage.removeItem(chave));
    return nossas.length;
  } catch {
    return 0;
  }
}

// cache de feriados (US05): 30 dias, uma chave por ano 

const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;
const chaveFeriados = (ano) => `${PREFIXO}feriados:${ano}`;

// devolve a lista do cache se ainda for válida; senão, null
export function lerFeriadosCache(ano, agora = Date.now()) {
  const cache = lerJSON(chaveFeriados(ano), null);
  const valido = cache && Array.isArray(cache.feriados) && agora - cache.salvoEm < TRINTA_DIAS_MS;
  return valido ? cache.feriados : null;
}

export function salvarFeriadosCache(ano, feriados) {
  return salvarJSON(chaveFeriados(ano), { salvoEm: Date.now(), feriados });
}