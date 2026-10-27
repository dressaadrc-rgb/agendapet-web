// ESM: usa import/export (o "type": "module" do package.json faz o Node tratar .js como ESM)
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Servico, criarAgendamento } from '../js/dominio/agendamento.js'; // MESMOS módulos da página
import { dataValida } from '../js/dominio/regras.js';
import { calcularFechamento, montarLinhasRelatorio } from '../js/dominio/fechamento.js';

// ESM não tem __dirname: calculamos a pasta do projeto a partir de import.meta.url
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lerJSON = async (relativo) => JSON.parse(await readFile(path.resolve(raiz, relativo), 'utf8'));

// Lê argumentos no formato --nome=valor
function lerArgumento(nome, padrao) {
  const argumento = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return argumento ? argumento.slice(nome.length + 3) : padrao; // +3 = "--" e "="
}

async function main() {
  const data = lerArgumento('data', null);
  const arquivo = lerArgumento('arquivo', 'data/agenda-exemplo.json');

  if (!data || !dataValida(data)) {
    console.error('[ERRO] Informe uma data válida no formato --data=AAAA-MM-DD');
    process.exitCode = 1;
    return;
  }

  try {
    const catalogo = (await lerJSON('data/servicos.json')).map((s) => new Servico(s));
    const agenda = (await lerJSON(arquivo)).map((item) => criarAgendamento(item, catalogo));
    const fechamento = calcularFechamento(agenda, data);
    montarLinhasRelatorio(fechamento).forEach((linha) => console.log(linha));
  } catch (erro) {
    console.error(`[ERRO] Não foi possível gerar o fechamento: ${erro.message}`);
    process.exitCode = 1; // código de saída diferente de 0 = falhou
  }
}

main();