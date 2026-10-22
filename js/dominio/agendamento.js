// Regras de funcionamento da loja (RN01). Object.freeze impede alterar sem querer.
export const CONFIG = Object.freeze({
  abertura: '08:00',
  fechamento: '18:00',
  passoMin: 30,
});

// Representa um serviço do catálogo (vem do servicos.json).
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