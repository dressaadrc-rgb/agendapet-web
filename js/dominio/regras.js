const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// 60 → "R$ 60,00"
export function formatarMoeda(valor) {
  return formatoMoeda.format(valor);
}