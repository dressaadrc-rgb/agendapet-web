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