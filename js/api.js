// Erro com "tipo", para a tela saber qual mensagem mostrar.
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