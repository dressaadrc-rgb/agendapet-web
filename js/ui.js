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

// ---------- Erros do formulário ----------

export function limparErros(form) {
  form.querySelectorAll('[aria-invalid="true"]').forEach((campo) => campo.removeAttribute('aria-invalid'));
  form.querySelectorAll('.campo__erro').forEach((mensagem) => { mensagem.textContent = ''; });
}

// erros = { tutor: 'mensagem', data: 'mensagem', ... }
export function mostrarErros(erros) {
  const campos = Object.keys(erros);

  campos.forEach((id) => {
    document.getElementById(id).setAttribute('aria-invalid', 'true');
    document.getElementById(`erro-${id}`).textContent = erros[id];
  });

  if (campos.length > 0) document.getElementById(campos[0]).focus(); // foco no 1º inválido
}

// ---------- Toast (aviso que some sozinho) ----------

let timerToast = null;

export function mostrarToast(texto, tipo = 'sucesso', duracaoMs = 4000) {
  const toast = document.getElementById('toast');
  clearTimeout(timerToast); // um toast novo cancela o timer do anterior
  toast.textContent = texto;
  toast.className = `toast toast--${tipo}`;
  toast.hidden = false;
  timerToast = setTimeout(() => { toast.hidden = true; }, duracaoMs);
}