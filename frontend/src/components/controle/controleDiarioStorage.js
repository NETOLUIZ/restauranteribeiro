const CONTROLE_DIARIO_STORAGE_KEY = 'ribeiro.controle.diario.v2';

const LOCAIS_FIXOS = {
  fortaleza: [
    '65', '75', '108', '300', '393', '435', '600', '673', '870',
    '1112', '1312', '1343', '2070', '2160',
    '3579', '393 MM', 'Damas', 'ME', 'Parquelandia', 'Riomar'
  ],
  eusebio: [
    '91', '237', 'Area Gourmet', 'BRL 12', 'BRL 2', 'BRL 7', 'C1 L17',
    'C2 L11', 'C2 L8', 'CS FIP', 'Eusebio', 'Lago 15', 'T1 Clube', 'T1 L12',
    'T1 L22', 'T2 L8', 'T3 309', 'T3 Clube', 'VL4'
  ],
  entidades: ['Outros / Entidades']
};

const NOMES_SECOES = {
  fortaleza: 'Fortaleza',
  eusebio: 'Eusebio',
  entidades: 'Outros / Entidades'
};

const normalizarQuantidade = (valor = '') => String(valor || '').trim();
const normalizarLocal = (valor = '') => String(valor || '').trim();
const normalizarChaveLocal = (valor = '') => normalizarLocal(valor).toLowerCase();

const criarSecaoBase = (listaLocais = []) =>
  listaLocais.map((local) => ({ local, quantidade: '' }));

export const criarControleBase = () => ({
  fortaleza: criarSecaoBase(LOCAIS_FIXOS.fortaleza),
  eusebio: criarSecaoBase(LOCAIS_FIXOS.eusebio),
  entidades: criarSecaoBase(LOCAIS_FIXOS.entidades)
});

export const obterDataHojeISO = () => {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

export const formatarDataControle = (dataIso = obterDataHojeISO()) => {
  const [ano, mes, dia] = String(dataIso).split('-');
  if (!ano || !mes || !dia) return dataIso;
  return `${dia}/${mes}/${ano}`;
};

const lerStorageBruto = () => {
  if (typeof window === 'undefined') return { controlesPorData: {} };

  try {
    const bruto = window.localStorage.getItem(CONTROLE_DIARIO_STORAGE_KEY);
    if (!bruto) return { controlesPorData: {} };
    const payload = JSON.parse(bruto);
    return payload && typeof payload === 'object' ? payload : { controlesPorData: {} };
  } catch {
    return { controlesPorData: {} };
  }
};

const salvarStorageBruto = (payload) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CONTROLE_DIARIO_STORAGE_KEY, JSON.stringify(payload));
};

const mergearComBase = (controleSalvo = {}) => {
  const base = criarControleBase();

  return Object.keys(base).reduce((acc, secao) => {
    const itensSalvos = Array.isArray(controleSalvo?.[secao]) ? controleSalvo[secao] : [];
    const mapaSalvo = new Map();

    itensSalvos.forEach((item) => {
      const local = normalizarLocal(item?.local);
      if (!local) return;
      mapaSalvo.set(normalizarChaveLocal(local), {
        local,
        quantidade: normalizarQuantidade(item?.quantidade)
      });
    });

    const chavesFixas = new Set(base[secao].map((item) => normalizarChaveLocal(item.local)));

    const linhasFixas = base[secao].map((itemBase) => ({
      local: itemBase.local,
      quantidade: mapaSalvo.get(normalizarChaveLocal(itemBase.local))?.quantidade ?? ''
    }));

    const linhasExtras = Array.from(mapaSalvo.entries())
      .filter(([chave]) => !chavesFixas.has(chave))
      .map(([, item]) => ({
        local: item.local,
        quantidade: item.quantidade
      }));

    acc[secao] = [...linhasFixas, ...linhasExtras];
    return acc;
  }, {});
};

export const carregarControleDiario = (dataIso = obterDataHojeISO()) => {
  const payload = lerStorageBruto();
  const controleSalvo = payload?.controlesPorData?.[dataIso];

  return {
    data: dataIso,
    updatedAt: controleSalvo?.updatedAt || null,
    secoes: mergearComBase(controleSalvo?.secoes || {})
  };
};

export const carregarControleDiarioMaisRecente = () => {
  const payload = lerStorageBruto();
  const controlesPorData = payload?.controlesPorData || {};
  const datas = Object.keys(controlesPorData).sort();
  const dataMaisRecente = datas[datas.length - 1];
  if (!dataMaisRecente) {
    return carregarControleDiario(obterDataHojeISO());
  }
  return carregarControleDiario(dataMaisRecente);
};

export const salvarControleDiario = ({ dataIso = obterDataHojeISO(), secoes }) => {
  const payload = lerStorageBruto();
  const secoesSanitizadas = mergearComBase(secoes || {});
  const atualizadoEm = new Date().toISOString();

  const proximoPayload = {
    ...payload,
    controlesPorData: {
      ...(payload.controlesPorData || {}),
      [dataIso]: {
        secoes: secoesSanitizadas,
        updatedAt: atualizadoEm
      }
    }
  };

  salvarStorageBruto(proximoPayload);
  return { data: dataIso, updatedAt: atualizadoEm, secoes: secoesSanitizadas };
};

export const limparQuantidadesControle = (secoes = criarControleBase()) =>
  Object.keys(secoes).reduce((acc, secao) => {
    const itens = Array.isArray(secoes[secao]) ? secoes[secao] : [];
    acc[secao] = itens.map((item) => ({ local: item.local, quantidade: '' }));
    return acc;
  }, {});

export const linhaPreenchida = (quantidade = '') => normalizarQuantidade(quantidade) !== '';

export const parseQuantidadeParaTotal = (quantidade = '') => {
  const valor = normalizarQuantidade(quantidade).toLowerCase();
  if (!valor || valor === 'x') return 0;

  if (/^\d+$/.test(valor)) {
    return Number.parseInt(valor, 10) || 0;
  }

  if (/^\d+(\s*\+\s*\d+)+$/.test(valor)) {
    return valor
      .split('+')
      .map((parte) => Number.parseInt(parte.trim(), 10) || 0)
      .reduce((soma, atual) => soma + atual, 0);
  }

  return 0;
};

export const calcularTotaisControle = (secoes = {}) => {
  const totaisPorSecao = Object.keys(criarControleBase()).reduce((acc, secao) => {
    const itens = Array.isArray(secoes?.[secao]) ? secoes[secao] : [];
    acc[secao] = itens.reduce((soma, item) => soma + parseQuantidadeParaTotal(item?.quantidade), 0);
    return acc;
  }, {});

  const totalGeral = Object.values(totaisPorSecao).reduce((soma, atual) => soma + atual, 0);
  return { totaisPorSecao, totalGeral };
};

export const filtrarSomenteLinhasPreenchidas = (secoes = {}) =>
  Object.keys(criarControleBase()).reduce((acc, secao) => {
    const itens = Array.isArray(secoes?.[secao]) ? secoes[secao] : [];
    acc[secao] = itens.filter((item) => linhaPreenchida(item?.quantidade));
    return acc;
  }, {});

export const nomesSecoesControle = NOMES_SECOES;
