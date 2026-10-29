import { formatarMoeda, formatarData } from './dominio/regras.js';
import { STATUS } from './dominio/agendamento.js';

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

// agenda do dia

const CLASSE_STATUS = { 'Agendado': 'agendado', 'Concluído': 'concluido', 'Cancelado': 'cancelado' };

// Atalho para criar elemento com classe e texto
function criar(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

export function renderizarAgenda({ itens, totalDoDia, expandidos, atrasados }) {
  const lista = document.getElementById('lista-agenda');
  lista.replaceChildren(
    ...itens.map((a) => criarItemAgenda(a, expandidos.has(a.protocolo), atrasados.has(a.protocolo)))
  );

  const quantidade = itens.length;
  document.getElementById('contador-agenda').textContent =
    `${quantidade} ${quantidade === 1 ? 'agendamento' : 'agendamentos'}`;

  const vazio = document.getElementById('lista-vazia');
  vazio.hidden = quantidade > 0;
  vazio.textContent = totalDoDia === 0
    ? 'Nenhum agendamento para este dia. Use o formulário para criar o primeiro.'
    : 'Nenhum agendamento corresponde à busca ou ao filtro.';
}

function criarItemAgenda(a, expandido, atrasado) {
  const item = criar('li', `item item--${CLASSE_STATUS[a.status]}`);
  if (expandido) item.classList.add('item--expandido');
  if (atrasado) item.classList.add('item--atrasado');
  item.dataset.protocolo = a.protocolo; // vira data-protocolo="AP-0001" no HTML

  // Botão que abre/fecha os detalhes (acessível por teclado)
  const idDetalhes = `detalhes-${a.protocolo}`;
  const alternar = criar('button', 'item__toggle');
  alternar.type = 'button';
  alternar.dataset.acao = 'alternar';
  alternar.setAttribute('aria-expanded', String(expandido));
  alternar.setAttribute('aria-controls', idDetalhes);
  alternar.append(
    criar('span', 'item__hora', a.hora),
    criar('span', 'item__titulo', `${a.pet} · ${a.servico.nome}`),
    criar('span', 'item__tutor', `${a.tutor} (${a.tipo})`),
  );

  // Selo de status (texto + cor) e valor
  const selos = criar('div', 'item__selos');
  selos.append(
    atrasado
    ? criar('span', 'selo selo--atrasado', 'Atrasado')
    : criar('span', `selo selo--${CLASSE_STATUS[a.status]}`, a.status),
    criar('span', 'item__valor', formatarMoeda(a.calcularValor())),
  );

  const linha = criar('div', 'item__linha');
  linha.append(alternar, selos);

  // RN05: Concluído e Cancelado ficam travados
  const travado = a.status !== STATUS.AGENDADO;
  const acoes = criar('div', 'item__acoes');
  acoes.append(
    criarBotaoAcao('concluir', 'Concluir', 'botao--secundario', travado, a),
    criarBotaoAcao('cancelar', 'Cancelar', 'botao--perigo', travado, a),
  );

  // Detalhes expansíveis
  const detalhes = criar('dl', 'item__detalhes');
  detalhes.id = idDetalhes;
  detalhes.hidden = !expandido;
  const informacoes = [['Protocolo', a.protocolo], ['Telefone', a.telefone], ['Espécie', a.especie]];
  if (a.tipo === 'Domiciliar') informacoes.push(['Endereço', a.enderecoCompleto()]);
  if (a.observacoes) informacoes.push(['Observações', a.observacoes]);
  informacoes.forEach(([termo, valor]) => detalhes.append(criar('dt', '', termo), criar('dd', '', valor)));

  item.append(linha, acoes, detalhes);
  return item;
}

function criarBotaoAcao(acao, texto, variante, desabilitado, a) {
  const botao = criar('button', `botao botao--pequeno ${variante}`, texto);
  botao.type = 'button';
  botao.dataset.acao = acao;
  botao.disabled = desabilitado;
  botao.setAttribute('aria-label', `${texto} ${a.protocolo} (${a.pet})`);
  return botao;
}

export function baixarArquivo(nome, conteudo, tipo = 'application/json') {
  const arquivo = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(arquivo); // endereço temporário para o arquivo em memória
  const link = document.createElement('a');
  link.href = url;
  link.download = nome; // faz o navegador BAIXAR em vez de abrir
  link.click();
  URL.revokeObjectURL(url); // libera a memória
}

// relógio, próximo atendimento e lembrete 

export function mostrarRelogio(hora) {
  document.getElementById('relogio').textContent = hora;
}

export function mostrarProximo(proximo, minutos) {
  const texto = document.getElementById('proximo-atendimento');
  if (!proximo) {
    texto.textContent = 'Próximo atendimento de hoje: nenhum pendente';
    return;
  }
  const quando = minutos <= 0 ? 'agora' : `em ${minutos} min`;
  texto.textContent = `Próximo atendimento de hoje: ${proximo.hora} — ${proximo.pet} (${proximo.servico.nome}), ${quando}`;
}

// texto = null esconde o lembrete
export function mostrarLembrete(texto) {
  const lembrete = document.getElementById('lembrete');
  lembrete.textContent = texto ?? '';
  lembrete.hidden = !texto;
}

// exportaçao na tela

export function exibirExportacao(json) {
  const texto = document.getElementById('texto-exportacao');
  texto.value = json;
  document.getElementById('bloco-exportacao').hidden = false;
  texto.focus();
  texto.select(); // já deixa selecionado para copiar
}

// Pode falhar (permissão negada, navegador antigo): quem chama trata o erro
export async function copiarExportacao() {
  const texto = document.getElementById('texto-exportacao').value;
  await navigator.clipboard.writeText(texto);
}