import { formatarMoeda } from './dominio/regras.js';

// Mostra "carregando", "erro" ou "sucesso" num elemento .status
export function mostrarEstado(elemento, tipo, texto, aoTentarNovamente) {
  elemento.replaceChildren();
  elemento.className = `status status--${tipo}`;

  const mensagem = document.createElement('p');
  mensagem.textContent = texto;
  elemento.append(mensagem);

  if (aoTentarNovamente) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'botao botao--secundario botao--pequeno';
    botao.textContent = 'Tentar novamente';
    botao.addEventListener('click', aoTentarNovamente);
    elemento.append(botao);
  }

  elemento.hidden = false;
}

export function esconderEstado(elemento) {
  elemento.hidden = true;
  elemento.replaceChildren();
}

export function renderizarServicos(lista, servicos) {
  lista.replaceChildren(...servicos.map(criarItemServico));
}

function criarItemServico(servico) {
  const item = document.createElement('li');
  item.className = 'servico';

  const topo = document.createElement('div');
  topo.className = 'servico__topo';

  const nome = document.createElement('strong');
  nome.textContent = servico.nome;

  const preco = document.createElement('span');
  preco.className = 'servico__preco';
  preco.textContent = formatarMoeda(servico.preco);

  topo.append(nome, preco);

  const descricao = document.createElement('p');
  descricao.className = 'servico__descricao';
  descricao.textContent = servico.descricao;

  const meta = document.createElement('p');
  meta.className = 'servico__meta';
  const local = servico.domiciliar ? 'faz atendimento domiciliar' : 'somente na loja';
  meta.textContent = `${servico.duracaoMin} min · ${local}`;

  item.append(topo, descricao, meta);
  return item;
}

export function popularSelectServicos(select, servicos) {
  const opcoes = servicos.map(
    (servico) => new Option(`${servico.nome} — ${formatarMoeda(servico.preco)}`, servico.id)
  );
  select.replaceChildren(new Option('Selecione...', ''), ...opcoes);
}