// Regras da loja

// RN01 (funcionamento) e RN03 (taxa domiciliar). Object.freeze: ninguém altera sem querer.
export const CONFIG = Object.freeze({  lembreteMin: 15, // RN09: avisa quando faltarem 15 min ou menos
  abertura: '08:00',
  fechamento: '18:00',
  passoMin: 30,
  cidadeLoja: 'São Paulo',
  taxaMesmaCidade: 15,
  taxaOutraCidade: 30,
});

// RN05: os três status possíveis
export const STATUS = Object.freeze({
  AGENDADO: 'Agendado',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
});

// "São Paulo " → "sao paulo" (sem acento, minúsculo): para comparar cidades e buscar nomes
export function normalizarTexto(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

// Classes

export class Servico {
  constructor({ id, nome, descricao, preco, duracaoMin, domiciliar }) {
    this.id = id;
    this.nome = nome;
    this.descricao = descricao;
    this.preco = preco;
    this.duracaoMin = duracaoMin;
    this.domiciliar = domiciliar;
  }
}

export class Agendamento {
  constructor({ protocolo, tutor, telefone, pet, especie, servico, data, hora, status = STATUS.AGENDADO, observacoes = '' }) {
    this.protocolo = protocolo;
    this.tutor = tutor;
    this.telefone = telefone;
    this.pet = pet;
    this.especie = especie;
    this.servico = servico; // objeto Servico (não só o id)
    this.data = data;       // "AAAA-MM-DD"
    this.hora = hora;       // "HH:MM"
    this.status = status;   // RN05: nasce "Agendado"
    this.observacoes = observacoes;
  }

  // RN02: cancelado não ocupa horário
  get ativo() {
    return this.status !== STATUS.CANCELADO;
  }

  // "2026-10-20T09:00": ordena por data e hora comparando texto
  get inicio() {
    return `${this.data}T${this.hora}`;
  }

  get tipo() {
    return 'Na loja';
  }

  // RN04: valor = preço do serviço
  calcularValor() {
    return this.servico.preco;
  }

  resumo() {
    return `${this.pet} · ${this.servico.nome} (${this.tipo})`;
  }

  // RN02: dois ATIVOS no mesmo dia e horário, e que não sejam o mesmo objeto
  conflitaCom(outro) {
    return this !== outro
      && this.ativo
      && outro.ativo
      && this.data === outro.data
      && this.hora === outro.hora;
  }

  // RN05: só "Agendado" pode mudar; Concluído e Cancelado ficam travados
  alterarStatus(novo) {
    if (this.status !== STATUS.AGENDADO) {
      throw new Error(`O agendamento ${this.protocolo} já está ${this.status.toLowerCase()}.`);
    }
    if (novo !== STATUS.CONCLUIDO && novo !== STATUS.CANCELADO) {
      throw new Error(`Status inválido: ${novo}`);
    }
    this.status = novo;
  }

  // Objeto simples para o localStorage/JSON (contrato 4.3): guarda o ID do serviço, não o objeto
  paraJSON() {
    return {
      protocolo: this.protocolo,
      tutor: this.tutor,
      telefone: this.telefone,
      pet: this.pet,
      especie: this.especie,
      servicoId: this.servico.id,
      data: this.data,
      hora: this.hora,
      status: this.status,
      observacoes: this.observacoes,
      domiciliar: false,
      endereco: null,
    };
  }
}

// HERANÇA: um domiciliar É UM agendamento, com endereço a mais e taxa no valor
export class AgendamentoDomiciliar extends Agendamento {
  constructor({ endereco, ...dados }) {
    super(dados);            // 1º chama o construtor da classe-mãe...
    this.endereco = endereco; // ...só depois pode usar this
  }

  get tipo() {
    return 'Domiciliar';
  }

  // RN03: R$ 15 na cidade da loja, R$ 30 em outra cidade
  taxaDeslocamento() {
    const mesmaCidade = normalizarTexto(this.endereco.cidade) === normalizarTexto(CONFIG.cidadeLoja);
    return mesmaCidade ? CONFIG.taxaMesmaCidade : CONFIG.taxaOutraCidade;
  }

  // Sobrescreve: reaproveita o cálculo da mãe (super) e soma a taxa
  calcularValor() {
    return super.calcularValor() + this.taxaDeslocamento();
  }

  enderecoCompleto() {
    const e = this.endereco;
    const complemento = e.complemento ? `, ${e.complemento}` : '';
    return `${e.logradouro}, ${e.numero}${complemento} - ${e.bairro}, ${e.cidade}/${e.uf}`;
  }

  resumo() {
    return `${super.resumo()} — ${this.enderecoCompleto()}`;
  }

  paraJSON() {
    return { ...super.paraJSON(), domiciliar: true, endereco: { ...this.endereco } };
  }
}

// Fábrica
// Recebe o objeto simples (do formulário, do localStorage ou do JSON) e decide qual classe criar
export function criarAgendamento(dados, catalogo) {
  const servico = catalogo.find((s) => s.id === dados.servicoId);
  if (!servico) throw new Error(`Serviço inexistente: ${dados.servicoId}`);
  if (dados.domiciliar && !dados.endereco) throw new Error(`Agendamento ${dados.protocolo} domiciliar sem endereço.`);

  const comServico = { ...dados, servico };
  return dados.domiciliar ? new AgendamentoDomiciliar(comServico) : new Agendamento(comServico);
}

// Protocolo (CLOSURE)
// `contador` fica "presa" dentro da função devolvida: não é global e ninguém a altera por fora
export function criarGeradorProtocolo(ultimo = 0) {
  let contador = ultimo;
  return function proximoProtocolo() {
    contador += 1;
    return `AP-${String(contador).padStart(4, '0')}`; // 1 → "AP-0001"
  };
}

// RN07: continua do maior número já salvo ("AP-0011" → 11)
export function maiorNumeroProtocolo(lista) {
  return lista.reduce((maior, a) => Math.max(maior, Number(a.protocolo.replace('AP-', '')) || 0), 0);
}

