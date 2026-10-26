import { STATUS, normalizarTexto } from './agendamento.js';

// CALLBACK
export function filtrarAgendamentos(lista, ...criterios) {
  return lista.filter((item) => criterios.every((criterio) => criterio(item)));
}

// cada uma devolve uma função pronta para usar como callback
export const porData = (data) => (a) => a.data === data;
export const porStatus = (status) => (a) => status === 'todos' || a.status === status;
export const porBusca = (texto) => {
  const termo = normalizarTexto(texto);
  return (a) => !termo || normalizarTexto(`${a.tutor} ${a.pet}`).includes(termo);
};

// Não altera a lista original
export function ordenarPorHorario(lista) {
  return [...lista].sort((a, b) => a.inicio.localeCompare(b.inicio));
}

// RN06
export function calcularFechamento(lista, data) {
  const doDia = lista.filter(porData(data));
  const concluidos = doDia.filter((a) => a.status === STATUS.CONCLUIDO);
  const agendados = doDia.filter((a) => a.status === STATUS.AGENDADO);
  const cancelados = doDia.filter((a) => a.status === STATUS.CANCELADO);
  const somarValores = (itens) => itens.reduce((total, a) => total + a.calcularValor(), 0);

  // "Por serviço" conta só os ATIVOS
  const grupos = doDia
    .filter((a) => a.ativo)
    .reduce((acumulado, a) => {
      const id = a.servico.id;
      if (!acumulado[id]) acumulado[id] = { servico: a.servico.nome, quantidade: 0, faturado: 0 };
      acumulado[id].quantidade += 1;
      if (a.status === STATUS.CONCLUIDO) acumulado[id].faturado += a.calcularValor();
      return acumulado;
    }, {});

  const porServico = Object.values(grupos)
    .sort((x, y) => y.quantidade - x.quantidade || x.servico.localeCompare(y.servico));

  return {
    data,
    total: doDia.length,
    concluidos: concluidos.length,
    agendados: agendados.length,
    cancelados: cancelados.length,
    faturamento: somarValores(concluidos), 
    aReceber: somarValores(agendados),
    porServico,
    encerrado: doDia.length > 0 && doDia.every((a) => a.status !== STATUS.AGENDADO),
    temDomiciliar: doDia.some((a) => a.tipo === 'Domiciliar'),
  };
}

// RN09: primeiro "Agendado" do dia a partir da hora informada
export function proximoAtendimento(lista, data, hora) {
  return ordenarPorHorario(lista)
    .find((a) => a.data === data && a.status === STATUS.AGENDADO && a.hora >= hora) ?? null;
}

// RN09: atrasado = ainda "Agendado" e o horário já passou
export function estaAtrasado(a, hoje, horaAgora) {
  return a.status === STATUS.AGENDADO
    && (a.data < hoje || (a.data === hoje && a.hora < horaAgora));
}