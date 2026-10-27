'use strict';
// CommonJS: usa require() e module.exports. A extensão .cjs faz o Node tratar o arquivo como CJS,
// mesmo com "type": "module" no package.json.
const fs = require('node:fs');
const path = require('node:path');

const raiz = path.resolve(__dirname, '..'); // no CommonJS, __dirname existe

function lerJSON(relativo) {
  return JSON.parse(fs.readFileSync(path.resolve(raiz, relativo), 'utf8'));
}

async function main() {
  const arquivo = process.argv[2] || 'data/agenda-exemplo.json';

  let agenda;
  let servicos;
  try {
    agenda = lerJSON(arquivo);
    servicos = lerJSON('data/servicos.json');
  } catch (erro) {
    console.error(`[ERRO] Não foi possível ler os dados: ${erro.message}`);
    process.exit(1);
  }
  if (!Array.isArray(agenda)) {
    console.error('[ERRO] O arquivo da agenda precisa conter uma lista.');
    process.exit(1);
  }

  // CJS não pode usar "import" no topo para carregar ESM: só o import() dinâmico, que devolve Promise
  const regras = await import('../js/dominio/regras.js');
  const { STATUS } = await import('../js/dominio/agendamento.js');
  const statusValidos = Object.values(STATUS);
  const obrigatorios = ['protocolo', 'tutor', 'telefone', 'pet', 'especie', 'servicoId', 'data', 'hora', 'status'];
  const erros = [];

  // 1) Cada item sozinho
  agenda.forEach((item, indice) => {
    const id = item.protocolo || `item ${indice + 1}`;

    for (const campo of obrigatorios) {
      if (!item[campo]) erros.push(`${id}: campo "${campo}" vazio ou ausente`);
    }
    if (item.status && !statusValidos.includes(item.status)) {
      erros.push(`${id}: status inválido "${item.status}"`);
    }
    if (item.data && !regras.dataValida(item.data)) {
      erros.push(`${id}: data inválida "${item.data}"`);
    }

    const servico = servicos.find((s) => s.id === item.servicoId);
    if (item.servicoId && !servico) {
      erros.push(`${id}: serviço inexistente "${item.servicoId}"`);
    }

    if (item.hora && !regras.horaValida(item.hora)) {
      erros.push(`${id}: hora inválida "${item.hora}"`);
    } else if (item.hora && !regras.dentroDoFuncionamento(item.hora, servico ? servico.duracaoMin : 0)) {
      erros.push(`${id}: horário ${item.hora} fora do funcionamento`);
    }

    if (item.domiciliar && !item.endereco) {
      erros.push(`${id}: atendimento domiciliar sem endereço`);
    }
    if (item.domiciliar && servico && !servico.domiciliar) {
      erros.push(`${id}: "${servico.nome}" é realizado somente na loja`);
    }
  });

  // 2) Conflitos entre pares de itens: LAÇO DUPLO (compara cada item com os seguintes)
  for (let i = 0; i < agenda.length; i += 1) {
    for (let j = i + 1; j < agenda.length; j += 1) {
      const a = agenda[i];
      const b = agenda[j];
      const ambosAtivos = a.status !== STATUS.CANCELADO && b.status !== STATUS.CANCELADO;
      if (ambosAtivos && a.data === b.data && a.hora === b.hora) {
        erros.push(`${a.protocolo} e ${b.protocolo}: conflito de horário (${a.data} às ${a.hora})`);
      }
    }
  }

  if (erros.length > 0) {
    console.error(`[ERRO] ${erros.length} problema(s) em ${arquivo}:`);
    erros.forEach((erro) => console.error(`  - ${erro}`));
    process.exit(1); // automações (CI, scripts) enxergam o "1" como falha
  }

  console.log(`[OK] ${arquivo}: ${agenda.length} agendamentos válidos.`);
}

main();