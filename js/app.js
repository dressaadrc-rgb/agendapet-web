import { carregarServicos } from './api.js';
import * as ui from './ui.js';
import { Servico } from './dominio/agendamento.js';

const estado = {
  servicos: [], //Servicos
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

function iniciar() {
  carregarCatalogo();
}

iniciar();