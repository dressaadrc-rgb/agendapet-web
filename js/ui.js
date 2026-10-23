import { formatarMoeda, formatarData } from './dominio/regras.js';

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

// Erros do formulario

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

// Toast e avisos

let timerToast = null;

export function mostrarToast(texto, tipo = 'sucesso', duracaoMs = 4000) {
  const toast = document.getElementById('toast');
  clearTimeout(timerToast); // um toast novo cancela o timer do anterior
  toast.textContent = texto;
  toast.className = `toast toast--${tipo}`;
  toast.hidden = false;
  timerToast = setTimeout(() => { toast.hidden = true; }, duracaoMs);
}
// aviso de feriado
export function mostrarAvisoFeriado(texto, pedirConfirmacao) {
  document.getElementById('texto-feriado').textContent = texto;
  document.getElementById('caixa-confirmar-feriado').hidden = !pedirConfirmacao;
  document.getElementById('confirmar-feriado').checked = false;
  document.getElementById('aviso-feriado').hidden = false;
}

export function esconderAvisoFeriado() {
  document.getElementById('aviso-feriado').hidden = true;
  document.getElementById('confirmar-feriado').checked = false;
}

// Fechamento do dia

export function renderizarFechamento(f) {
  const escrever = (id, valor) => { document.getElementById(id).textContent = valor; };

  let situacao = 'sem atendimentos';
  if (f.total > 0) situacao = f.encerrado ? 'dia encerrado' : 'dia em andamento';

  escrever('resumo-dia', `${formatarData(f.data)} · ${situacao}`);
  escrever('total-atendimentos', f.total);
  escrever('total-concluidos', f.concluidos);
  escrever('total-agendados', f.agendados);
  escrever('total-cancelados', f.cancelados);
  escrever('total-faturamento', formatarMoeda(f.faturamento));
  escrever('total-receber', formatarMoeda(f.aReceber));

  const corpo = document.getElementById('corpo-por-servico');
  if (f.porServico.length === 0) {
    corpo.replaceChildren(criarLinhaTabela(['Nenhum atendimento ativo neste dia.'], 3));
    return;
  }
  corpo.replaceChildren(
    ...f.porServico.map((linha) => criarLinhaTabela([linha.servico, linha.quantidade, formatarMoeda(linha.faturado)]))
  );
}

function criarLinhaTabela(valores, colunasOcupadas = 1) {
  const linha = document.createElement('tr');
  valores.forEach((valor) => {
    const celula = document.createElement('td');
    celula.textContent = valor;
    if (colunasOcupadas > 1) celula.colSpan = colunasOcupadas;
    linha.append(celula);
  });
  return linha;
}