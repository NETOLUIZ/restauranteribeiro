import { controleDiarioAPI } from '../../services/api';

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

const dataIsoValida = (dataIso = '') => /^\d{4}-\d{2}-\d{2}$/.test(String(dataIso || '').trim());

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

const montarControle = ({ dataIso = obterDataHojeISO(), updatedAt = null, secoes = {} } = {}) => ({
  data: dataIso,
  updatedAt: updatedAt || null,
  secoes: mergearComBase(secoes)
});

const salvarControleLocal = ({ dataIso = obterDataHojeISO(), secoes, updatedAt } = {}) => {
  const data = dataIsoValida(dataIso) ? dataIso : obterDataHojeISO();
  const payload = lerStorageBruto();
  const secoesSanitizadas = mergearComBase(secoes || {});
  const atualizadoEm = updatedAt || new Date().toISOString();

  const proximoPayload = {
    ...payload,
    controlesPorData: {
      ...(payload.controlesPorData || {}),
      [data]: {
        secoes: secoesSanitizadas,
        updatedAt: atualizadoEm
      }
    }
  };

  salvarStorageBruto(proximoPayload);
  return montarControle({ dataIso: data, updatedAt: atualizadoEm, secoes: secoesSanitizadas });
};

const carregarControleDiarioLocal = (dataIso = obterDataHojeISO()) => {
  const data = dataIsoValida(dataIso) ? dataIso : obterDataHojeISO();
  const payload = lerStorageBruto();
  const controleSalvo = payload?.controlesPorData?.[data];

  return montarControle({
    dataIso: data,
    updatedAt: controleSalvo?.updatedAt || null,
    secoes: controleSalvo?.secoes || {}
  });
};

const carregarControleDiarioMaisRecenteLocal = () => {
  const payload = lerStorageBruto();
  const controlesPorData = payload?.controlesPorData || {};
  const datas = Object.keys(controlesPorData).sort();
  const dataMaisRecente = datas[datas.length - 1];
  if (!dataMaisRecente) {
    return montarControle({ dataIso: obterDataHojeISO() });
  }
  return carregarControleDiarioLocal(dataMaisRecente);
};

const carregarHistoricoControlesLocal = (limit = 90) => {
  const limiteFinal = Number.isInteger(limit) && limit > 0 ? limit : 90;
  const payload = lerStorageBruto();
  const controlesPorData = payload?.controlesPorData || {};

  return Object.entries(controlesPorData)
    .map(([data, controle]) => ({
      data,
      updatedAt: controle?.updatedAt || null
    }))
    .sort((a, b) => String(b.data).localeCompare(String(a.data)))
    .slice(0, limiteFinal);
};

export const carregarControleDiario = async (dataIso = obterDataHojeISO()) => {
  const data = dataIsoValida(dataIso) ? dataIso : obterDataHojeISO();

  try {
    const { data: resposta } = await controleDiarioAPI.obterPorData(data);
    const controle = resposta?.controle;

    if (!controle) {
      return montarControle({ dataIso: data });
    }

    const controleFinal = montarControle({
      dataIso: controle?.data || data,
      updatedAt: controle?.updatedAt || null,
      secoes: controle?.secoes || {}
    });

    salvarControleLocal({
      dataIso: controleFinal.data,
      updatedAt: controleFinal.updatedAt,
      secoes: controleFinal.secoes
    });

    return controleFinal;
  } catch {
    return carregarControleDiarioLocal(data);
  }
};

export const carregarControleDiarioMaisRecente = async () => {
  try {
    const { data: resposta } = await controleDiarioAPI.obterMaisRecente();
    const controle = resposta?.controle;

    if (!controle) {
      return montarControle({ dataIso: obterDataHojeISO() });
    }

    const controleFinal = montarControle({
      dataIso: controle?.data || obterDataHojeISO(),
      updatedAt: controle?.updatedAt || null,
      secoes: controle?.secoes || {}
    });

    salvarControleLocal({
      dataIso: controleFinal.data,
      updatedAt: controleFinal.updatedAt,
      secoes: controleFinal.secoes
    });

    return controleFinal;
  } catch {
    return carregarControleDiarioMaisRecenteLocal();
  }
};

export const carregarHistoricoControles = async (limit = 90) => {
  const limiteFinal = Number.isInteger(limit) && limit > 0 ? limit : 90;
  try {
    const { data: resposta } = await controleDiarioAPI.historico(limiteFinal);
    const historico = Array.isArray(resposta?.historico) ? resposta.historico : [];
    return historico
      .map((item) => ({
        data: String(item?.data || ''),
        updatedAt: item?.updatedAt || null
      }))
      .filter((item) => dataIsoValida(item.data))
      .sort((a, b) => String(b.data).localeCompare(String(a.data)));
  } catch {
    return carregarHistoricoControlesLocal(limiteFinal);
  }
};

export const salvarControleDiario = async ({ dataIso = obterDataHojeISO(), secoes }) => {
  const data = dataIsoValida(dataIso) ? dataIso : obterDataHojeISO();
  const secoesSanitizadas = mergearComBase(secoes || {});

  try {
    const { data: resposta } = await controleDiarioAPI.salvar(data, secoesSanitizadas);
    const controle = resposta?.controle;

    if (!controle) {
      return salvarControleLocal({ dataIso: data, secoes: secoesSanitizadas });
    }

    const controleFinal = montarControle({
      dataIso: controle?.data || data,
      updatedAt: controle?.updatedAt || null,
      secoes: controle?.secoes || secoesSanitizadas
    });

    salvarControleLocal({
      dataIso: controleFinal.data,
      updatedAt: controleFinal.updatedAt,
      secoes: controleFinal.secoes
    });

    return controleFinal;
  } catch (erro) {
    const controleLocal = salvarControleLocal({ dataIso: data, secoes: secoesSanitizadas });
    const erroSync = new Error('Falha ao sincronizar controle diario com servidor.');
    erroSync.code = 'CONTROLE_DIARIO_SYNC_FAILED';
    erroSync.cause = erro;
    erroSync.localControle = controleLocal;
    throw erroSync;
  }
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

export const localEhFixo = (secaoKey = '', local = '') => {
  const locaisSecao = Array.isArray(LOCAIS_FIXOS?.[secaoKey]) ? LOCAIS_FIXOS[secaoKey] : [];
  const chaveLocal = normalizarChaveLocal(local);
  return locaisSecao.some((item) => normalizarChaveLocal(item) === chaveLocal);
};

export const nomesSecoesControle = NOMES_SECOES;
