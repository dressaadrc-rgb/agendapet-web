import { carregarServicos, buscarCep, buscarFeriados, carregarAgendaExemplo } from './api.js';
import * as ui from './ui.js';
import { Servico, STATUS, criarAgendamento, criarGeradorProtocolo, maiorNumeroProtocolo } from './dominio/agendamento.js';
import { validarAgendamento, hojeISO, horaAtual, formatarData, encontrarFeriado, temConflito } from './dominio/regras.js';
import {
  calcularFechamento, filtrarAgendamentos, porData, porStatus, porBusca, ordenarPorHorario, proximoAtendimento,
} from './dominio/fechamento.js';
import { lerJSON, salvarJSON, limparDados, CHAVES } from './storage.js';

const estado = {
  servicos: [],                              // Servico[]
  agenda: [],                                // Agendamento[] e AgendamentoDomiciliar[]
  dataAgenda: hojeISO(),                     // dia exibido na agenda e no fechamento
  filtroStatus: 'todos',
  busca: '',
  expandidos: new Set(),                     // protocolos com detalhes abertos
  feriado: null,                             // { date, name } se a data escolhida for feriado
  gerarProtocolo: criarGeradorProtocolo(0),  // closure: AP-0001, AP-0002...
};

const $ = (id) => document.getElementById(id);

function mensagemErroCatalogo(erro) {
  if (erro.tipo === 'rede') return 'Sem conexão para carregar os serviços.';
  if (erro.tipo === 'http') return 'Não foi possível carregar os serviços (${erro.message}).';
  return 'Não foi possível carregar os serviços.';
}

async function carregarCatalogo() {
  const aviso = $('estado-servicos');
  ui.mostrarEstado(aviso, 'carregando', 'Carregando serviços…');
  

  try {
    const dados = await carregarServicos();
    estado.servicos = dados.map((item) => new Servico(item));
  } catch (erro) {
    ui.mostrarEstado(aviso, 'erro', mensagemErroCatalogo(erro), carregarCatalogo);
    return;
  }

  ui.esconderEstado(aviso);
  ui.renderizarServicos($('lista-servicos'), estado.servicos);
  ui.popularSelectServicos($('servico'), estado.servicos);
  restaurarAgenda();
}


function lerFormulario() {
  const valor = (id) => $(id).value.trim();
  const domiciliar = $('domiciliar').checked;
  return {
    tutor: valor('tutor'),
    telefone: valor('telefone'),
    pet: valor('pet'),
    especie: valor('especie'),
    servicoId: valor('servico'),
    data: valor('data'),
    hora: valor('hora'),
    confirmarFeriado: $('confirmar-feriado').checked,
    domiciliar,
    endereco: domiciliar
      ? {
          cep: valor('cep'),
          logradouro: valor('logradouro'),
          numero: valor('numero'),
          complemento: valor('complemento'),
          bairro: valor('bairro'),
          cidade: valor('cidade'),
          uf: valor('uf').toUpperCase(),
        }
      : null, 
    observacoes: valor('observacoes'),
  };
}

function aoEnviarFormulario(evento) {
  evento.preventDefault(); // impede a página de recarregar
  const form = evento.target;
  ui.limparErros(form);

  const dados = lerFormulario();
  const servico = estado.servicos.find((s) => s.id === dados.servicoId);
  const erros = validarAgendamento(dados, servico);

  // RN08: em feriado, só agenda se marcou "Agendar mesmo assim"
  if (estado.feriado && !dados.confirmarFeriado && !erros.data) {
    erros.data = 'Marque "Agendar mesmo assim" para agendar em um feriado.';
  }

  if (Object.keys(erros).length > 0) {
    ui.mostrarErros(erros);
    return;
  }

  // A fábrica escolhe a classe: Agendamento ou AgendamentoDomiciliar
  const novo = criarAgendamento(dados, estado.servicos);

  // RN02: conflito de horário
  if (temConflito(estado.agenda, novo)) {
    ui.mostrarErros({
      hora: `Já existe um atendimento às ${novo.hora} em ${formatarData(novo.data)}. Escolha outro horário.`,
    });
    return;
  }

  novo.protocolo = estado.gerarProtocolo(); 
  estado.agenda.push(novo); salvarAgenda();
  estado.dataAgenda = novo.data; 
  $('data-agenda').value = novo.data;

  form.reset();
  limparEndereco();
  estado.feriado = null;
  ui.esconderAvisoFeriado();
  atualizarTela();
  ui.mostrarToast(`Agendamento ${novo.protocolo} salvo: ${novo.pet}, ${formatarData(novo.data)} às ${novo.hora}.`);
}


function atualizarOpcaoDomiciliar() {
  const servico = estado.servicos.find((s) => s.id === $('servico').value);
  const caixa = $('domiciliar');
  const dica = $('dica-domiciliar');

  if (!servico) {
    caixa.disabled = false;
    dica.textContent = 'Escolha um serviço para ver se ele pode ser feito na casa do tutor.';
  } else if (servico.domiciliar) {
    caixa.disabled = false;
    dica.textContent = `"${servico.nome}" pode ser feito na casa do tutor.`;
  } else {
    caixa.checked = false;
    caixa.disabled = true;
    dica.textContent = `"${servico.nome}" é realizado somente na loja.`;
  }
  mostrarOuEsconderEndereco();
}

function mostrarOuEsconderEndereco() {
  $('grupo-endereco').hidden = !$('domiciliar').checked;
}

let ultimoCep = '';

const digitosDoCep = () => $('cep').value.replace(/\D/g, '');

function mensagemErroCep(erro) {
  if (erro.tipo === 'formato') return 'O CEP deve ter 8 dígitos.';
  if (erro.tipo === 'nao-encontrado') return 'CEP não encontrado. Preencha o endereço manualmente.';
  if (erro.tipo === 'rede') return 'Sem conexão com o serviço de CEP. Preencha o endereço manualmente.';
  return 'O serviço de CEP está indisponível agora. Preencha o endereço manualmente.';
}

async function aoDigitarCep() {
  const status = $('status-cep');
  const cep = digitosDoCep();

  if (cep.length < 8) {
    ultimoCep = '';
    ui.esconderEstado(status);
    return;
  }
  if (cep === ultimoCep) return;
  ultimoCep = cep;

  ui.mostrarEstado(status, 'carregando', 'Buscando endereço…');
  try {
    const endereco = await buscarCep(cep);
    if (digitosDoCep() !== cep) return; // a pessoa mudou o CEP enquanto esperava: descarta

    $('logradouro').value = endereco.logradouro;
    $('bairro').value = endereco.bairro;
    $('cidade').value = endereco.cidade;
    $('uf').value = endereco.uf;
    ui.mostrarEstado(status, 'sucesso', 'Endereço preenchido. Confira e informe o número.');
    $('numero').focus();
  } catch (erro) {
    if (digitosDoCep() !== cep) return;
    ui.mostrarEstado(status, 'erro', mensagemErroCep(erro));
  }
}

function aoSairDoCep() {
  const cep = digitosDoCep();
  if (cep.length > 0 && cep.length < 8) {
    ui.mostrarEstado($('status-cep'), 'erro', mensagemErroCep({ tipo: 'formato' }));
  }
}

function limparEndereco() {
  ultimoCep = '';
  ui.esconderEstado($('status-cep'));
  atualizarOpcaoDomiciliar();
}

async function aoEscolherData() {
  const data = $('data').value;
  estado.feriado = null;
  ui.esconderAvisoFeriado();
  if (!data) return;

  try {
    const feriados = await buscarFeriados(data.slice(0, 4)); // "2026-12-25" → "2026"
    if ($('data').value !== data) return; // trocou a data enquanto esperava: descarta

    estado.feriado = encontrarFeriado(feriados, data);
    if (estado.feriado) {
      ui.mostrarAvisoFeriado(
        `${formatarData(data)} é feriado: ${estado.feriado.name}. Confirme com o tutor antes de agendar.`,
        true
      );
    }
  } catch {
    if ($('data').value !== data) return;
    ui.mostrarAvisoFeriado(
      'Não foi possível verificar se a data é feriado agora. Você pode continuar o agendamento.',
      false // não bloqueia
    );
  }
}

// tela

function atualizarTela() {
  const doDia = estado.agenda.filter(porData(estado.dataAgenda));
  const itens = ordenarPorHorario(
    filtrarAgendamentos(doDia, porStatus(estado.filtroStatus), porBusca(estado.busca))
  );

  ui.renderizarAgenda({
    itens,
    totalDoDia: doDia.length,
    expandidos: estado.expandidos,
    proximo: proximoAtendimento(estado.agenda, hojeISO(), horaAtual()),
  });
  ui.renderizarFechamento(calcularFechamento(estado.agenda, estado.dataAgenda));
}

function aoTrocarDiaAgenda() {
  estado.dataAgenda = $('data-agenda').value || hojeISO();
  atualizarTela();
}

async function aoCarregarExemplo() {
  try {
    const dados = await carregarAgendaExemplo();
    estado.agenda = dados.map((item) => criarAgendamento(item, estado.servicos)); salvarAgenda();
    estado.gerarProtocolo = criarGeradorProtocolo(maiorNumeroProtocolo(estado.agenda)); // RN07
    estado.dataAgenda = '2026-10-20';
    $('data-agenda').value = estado.dataAgenda;
    atualizarTela();
    ui.mostrarToast(`${estado.agenda.length} agendamentos de exemplo carregados.`, 'info');
  } catch {
    ui.mostrarToast('Não foi possível carregar os dados de exemplo.', 'erro');
  }
}

// agenda do dia US06

function aoBuscar() {
  estado.busca = $('busca').value;
  atualizarTela();
}

function aoFiltrarStatus() {
  estado.filtroStatus = $('filtro-status').value;
  salvarJSON(CHAVES.filtro, estado.filtroStatus);
  atualizarTela();
}

// Depois de redesenhar, devolve o foco ao item
function focarItem(protocolo) {
  const botao = document.querySelector(`[data-protocolo="${protocolo}"] .item__toggle`);
  if (botao) botao.focus();
}

function alterarStatusDoItem(protocolo, novoStatus) {
  const agendamento = estado.agenda.find((a) => a.protocolo === protocolo);
  if (!agendamento) return;

  try {
    agendamento.alterarStatus(novoStatus); // a regra (RN05) está na classe
  } catch (erro) {
    ui.mostrarToast(erro.message, 'erro');
    return;
  }
  salvarAgenda();

  atualizarTela();
  focarItem(protocolo);
  const concluiu = novoStatus === STATUS.CONCLUIDO;
  ui.mostrarToast(
    concluiu
      ? `${protocolo} (${agendamento.pet}) concluído.`
      : `${protocolo} (${agendamento.pet}) cancelado. O horário foi liberado.`,
    concluiu ? 'sucesso' : 'info'
  );
}

// DELEGAÇÃO: um único listener na <ul>, mesmo com os itens sendo recriados a cada renderização
function aoClicarNaLista(evento) {
  const botao = evento.target.closest('[data-acao]'); // qual botão?
  if (!botao) return;
  const protocolo = botao.closest('.item').dataset.protocolo; // qual item?

  switch (botao.dataset.acao) {
    case 'concluir':
      alterarStatusDoItem(protocolo, STATUS.CONCLUIDO);
      break;
    case 'cancelar':
      alterarStatusDoItem(protocolo, STATUS.CANCELADO);
      break;
    case 'alternar':
      if (estado.expandidos.has(protocolo)) estado.expandidos.delete(protocolo);
      else estado.expandidos.add(protocolo);
      atualizarTela();
      focarItem(protocolo);
      break;
    default:
      break;
  }
}

// Mouse: realça o item (mouseover/mouseout "borbulham" dos filhos até a <ul>)
function aoPassarMouse(evento) {
  const item = evento.target.closest('.item');
  if (item) item.classList.toggle('item--realce', evento.type === 'mouseover');
}

// Atalhos de teclado: N, / e Esc
function aoApertarTecla(evento) {
  if (evento.key === 'Escape' && evento.target.id === 'busca') {
    $('busca').value = '';
    aoBuscar();
    return;
  }
  if (evento.target.matches('input, textarea, select')) return; 
  if (evento.ctrlKey || evento.metaKey || evento.altKey) return; 

  if (evento.key === '/') {
    evento.preventDefault(); // senão o "/" seria digitado na busca
    $('busca').focus();
  }
  if (evento.key.toLowerCase() === 'n') {
    evento.preventDefault();
    $('tutor').focus(); // 
  }
}

// persistencia US08

// Grava objetos simples (paraJSON)
function salvarAgenda() {
  salvarJSON(CHAVES.agenda, estado.agenda.map((a) => a.paraJSON()));
}


// Lê do localStorage e recria as instâncias com a fábrica
function restaurarAgenda() {
  const salvos = lerJSON(CHAVES.agenda, []);
  const lista = Array.isArray(salvos) ? salvos : []; // dado estranho → começa vazio

  estado.agenda = [];
  for (const dados of lista) {
    try {
      if (!dados || typeof dados.protocolo !== 'string') throw new Error('Item sem protocolo');
      estado.agenda.push(criarAgendamento(dados, estado.servicos));
    } catch {
      // item inválido é ignorado; o resto da agenda carrega
    }
  }

  estado.gerarProtocolo = criarGeradorProtocolo(maiorNumeroProtocolo(estado.agenda)); // RN07
  atualizarTela();
}

// tema

function aplicarTema(tema) {
  const escuro = tema === 'escuro';
  document.documentElement.dataset.tema = escuro ? 'escuro' : 'claro'; // <html data-tema="...">
  $('btn-tema').textContent = escuro ? 'Tema claro' : 'Tema escuro';
  $('btn-tema').setAttribute('aria-pressed', String(escuro));
}

function aoTrocarTema() {
  const novo = document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro';
  aplicarTema(novo);
  salvarJSON(CHAVES.tema, novo);
}

// exportar e limpar

function aoExportar() {
  const conteudo = JSON.stringify(estado.agenda.map((a) => a.paraJSON()), null, 2);
  ui.baixarArquivo(`agendapet-${hojeISO()}.json`, conteudo);
  ui.mostrarToast(`Agenda exportada (${estado.agenda.length} agendamentos).`, 'info');
}

// Duas etapas: o 1º clique pede confirmação; se não confirmar em 4 s, o botão volta
let timerConfirmarLimpeza = null;

function aoLimparDados() {
  const botao = $('btn-limpar');

  if (!timerConfirmarLimpeza) {
    botao.textContent = 'Clique de novo para confirmar';
    timerConfirmarLimpeza = setTimeout(() => {
      botao.textContent = 'Limpar meus dados';
      timerConfirmarLimpeza = null;
    }, 4000);
    return;
  }

  clearTimeout(timerConfirmarLimpeza);
  timerConfirmarLimpeza = null;
  botao.textContent = 'Limpar meus dados';

  const removidos = limparDados();
  estado.agenda = [];
  estado.gerarProtocolo = criarGeradorProtocolo(0);
  estado.filtroStatus = 'todos';
  $('filtro-status').value = 'todos';
  estado.expandidos.clear();
  aplicarTema('claro');
  atualizarTela();
  ui.mostrarToast(`Dados da AgendaPet removidos (${removidos} itens).`, 'info');
}

const FILTROS_VALIDOS = ['todos', 'Agendado', 'Concluído', 'Cancelado'];

function iniciar() {
  // 1. Preferências salvas (seção 6.1 do Refinamento)
  aplicarTema(lerJSON(CHAVES.tema, 'claro'));
  const filtroSalvo = lerJSON(CHAVES.filtro, 'todos');
  estado.filtroStatus = FILTROS_VALIDOS.includes(filtroSalvo) ? filtroSalvo : 'todos';
  $('filtro-status').value = estado.filtroStatus;

  $('data').min = hojeISO();
  $('data-agenda').value = estado.dataAgenda;

  // Cabeçalho
  $('btn-tema').addEventListener('click', aoTrocarTema);

  // Formulário
  $('form-agendamento').addEventListener('submit', aoEnviarFormulario);
  $('data').addEventListener('change', aoEscolherData);
  $('servico').addEventListener('change', atualizarOpcaoDomiciliar);
  $('domiciliar').addEventListener('change', mostrarOuEsconderEndereco);
  $('cep').addEventListener('input', aoDigitarCep);
  $('cep').addEventListener('blur', aoSairDoCep);

  // Agenda
  $('data-agenda').addEventListener('change', aoTrocarDiaAgenda);
  $('busca').addEventListener('input', aoBuscar);
  $('filtro-status').addEventListener('change', aoFiltrarStatus);
  $('lista-agenda').addEventListener('click', aoClicarNaLista);
  $('lista-agenda').addEventListener('mouseover', aoPassarMouse);
  $('lista-agenda').addEventListener('mouseout', aoPassarMouse);
  document.addEventListener('keydown', aoApertarTecla);

  // Dados
  $('btn-exemplo').addEventListener('click', aoCarregarExemplo);
  $('btn-exportar').addEventListener('click', aoExportar);
  $('btn-limpar').addEventListener('click', aoLimparDados);

  carregarCatalogo(); // ao terminar, restaura a agenda salva
  atualizarTela();
}

iniciar();