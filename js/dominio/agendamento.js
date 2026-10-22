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