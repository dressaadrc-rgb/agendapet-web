import { carregarServicos, buscarCep, buscarFeriados } from './api.js';
import * as ui from './ui.js';
import { Servico } from './dominio/agendamento.js';
import { validarAgendamento, hojeISO, formatarData, encontrarFeriado } from './dominio/regras.js';

const estado = {
  servicos: [], //Servicos
  agenda: [],   // agendamentos salvos
  feriado: null, // { date, name } se a data escolhida for feriado
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
  if (estado.feriado && !dados.confirmarFeriado && !erros.data) {
    erros.data = 'Marque "Agendar mesmo assim" para agendar em um feriado.';
  }

  if (Object.keys(erros).length > 0) {
    ui.mostrarErros(erros);
    return;
  }

  estado.agenda.push({ ...dados, status: 'Agendado' });
  form.reset();  limparEndereco(); estado.feriado = null;
  ui.esconderAvisoFeriado();
  ui.mostrarToast(`Agendamento salvo: ${dados.pet}, ${formatarData(dados.data)} às ${dados.hora}.`);
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

function iniciar() {
  $('data').min = hojeISO();
  $('form-agendamento').addEventListener('submit', aoEnviarFormulario);
  $('data').addEventListener('change', aoEscolherData);
  $('servico').addEventListener('change', atualizarOpcaoDomiciliar);
  $('domiciliar').addEventListener('change', mostrarOuEsconderEndereco);
  $('cep').addEventListener('input', aoDigitarCep);
  $('cep').addEventListener('blur', aoSairDoCep);
  carregarCatalogo();
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
      false // sem caixa de confirmação: não bloqueia
    );
  }
}

iniciar();