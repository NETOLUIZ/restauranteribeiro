export const PROTEINAS_COMANDA = [
  'Assado de panela',
  'Creme de Galinha',
  'Frango Forno',
  'Lingui\u00e7a-Brasa',
  'Su\u00edno-molho'
];

export const COMPLEMENTOS_COMANDA = [
  'Arroz Branco',
  'Bai\u00e3o',
  'Feij\u00e3o',
  'Macarr\u00e3o',
  'Batatinha Cozida',
  'Farofa',
  'Ma\u00e7\u00e3 picada',
  'Vinagrete'
];

export const normalizarChaveComanda = (valor = '') =>
  String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const obterNomeItem = (item) => (typeof item === 'string' ? item : item?.nome || '');

export const ordenarItensComanda = (itens = [], referencia = []) => {
  const posicoes = new Map(
    referencia.map((item, indice) => [normalizarChaveComanda(item), indice])
  );

  return [...itens].sort((a, b) => {
    const nomeA = obterNomeItem(a);
    const nomeB = obterNomeItem(b);
    const chaveA = normalizarChaveComanda(nomeA);
    const chaveB = normalizarChaveComanda(nomeB);
    const posicaoA = posicoes.get(chaveA);
    const posicaoB = posicoes.get(chaveB);
    const aConhecido = posicaoA !== undefined;
    const bConhecido = posicaoB !== undefined;

    if (aConhecido && bConhecido) {
      return posicaoA - posicaoB;
    }

    if (aConhecido) return -1;
    if (bConhecido) return 1;

    return nomeA.localeCompare(nomeB, 'pt-BR');
  });
};
