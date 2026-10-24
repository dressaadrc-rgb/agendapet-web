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