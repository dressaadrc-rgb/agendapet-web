import { carregarServicos } from './api.js';
import * as ui from './ui.js';
import { Servico } from './dominio/agendamento.js';
import { validarAgendamento, hojeISO, formatarData } from './dominio/regras.js';

const estado = {
  servicos: [], //Servicos
  agenda: [],   // agendamentos salvos
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
  return {
    tutor: valor('tutor'),
    telefone: valor('telefone'),
    pet: valor('pet'),
    especie: valor('especie'),
    servicoId: valor('servico'),
    data: valor('data'),
    hora: valor('hora'),
    domiciliar: $('domiciliar').checked,
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

  if (Object.keys(erros).length > 0) {
    ui.mostrarErros(erros);
    return;
  }

  estado.agenda.push({ ...dados, status: 'Agendado' });
  form.reset();
  ui.mostrarToast(`Agendamento salvo: ${dados.pet}, ${formatarData(dados.data)} às ${dados.hora}.`);
}

function iniciar() {
  $('data').min = hojeISO();
  $('form-agendamento').addEventListener('submit', aoEnviarFormulario);
  carregarCatalogo();
}

iniciar();