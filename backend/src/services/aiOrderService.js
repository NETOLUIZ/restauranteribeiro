const fs = require('fs/promises');

const PROTEINAS_PERMITIDAS = [
  'Assado de panela',
  'Creme de Galinha',
  'Frango Forno',
  'Lingui\u00e7a-Brasa',
  'Su\u00edno-molho'
];

const COMPLEMENTOS_PERMITIDOS = [
  'Arroz Branco',
  'Feij\u00e3o',
  'Macarr\u00e3o',
  'Bai\u00e3o',
  'Batatinha Cozida',
  'Farofa',
  'Ma\u00e7\u00e3 picada',
  'Vinagrete',
  'Salada',
  'Ovo Cozido'
];

const REGRAS_ITENS = [
  {
    tipo: 'PROTEINA',
    nome: 'Assado de panela',
    aliases: ['assado de panela', 'carne de panela', 'assado', 'carne']
  },
  {
    tipo: 'PROTEINA',
    nome: 'Creme de Galinha',
    aliases: ['creme de galinha', 'creme', 'galinha']
  },
  {
    tipo: 'PROTEINA',
    nome: 'Frango Forno',
    aliases: ['frango forno', 'frango']
  },
  {
    tipo: 'PROTEINA',
    nome: 'Lingui\u00e7a-Brasa',
    aliases: ['linguica-brasa', 'linguica na brasa', 'lingui\u00e7a-brasa', 'lingui\u00e7a na brasa', 'linguica', 'lingui\u00e7a']
  },
  {
    tipo: 'PROTEINA',
    nome: 'Su\u00edno-molho',
    aliases: ['suino-molho', 'suino ao molho', 'su\u00edno-molho', 'su\u00edno ao molho', 'suino molho', 'su\u00edno molho', 'suino', 'su\u00edno', 'porco']
  },
  { tipo: 'COMPLEMENTO', nome: 'Arroz Branco', aliases: ['arroz branco', 'arroz'] },
  { tipo: 'COMPLEMENTO', nome: 'Bai\u00e3o', aliases: ['baiao', 'bai\u00e3o'] },
  { tipo: 'COMPLEMENTO', nome: 'Feij\u00e3o', aliases: ['feijao', 'feij\u00e3o'] },
  { tipo: 'COMPLEMENTO', nome: 'Macarr\u00e3o', aliases: ['macarrao', 'macarr\u00e3o'] },
  { tipo: 'COMPLEMENTO', nome: 'Batatinha Cozida', aliases: ['batatinha cozida', 'batatinha', 'batata cozida', 'batata'] },
  { tipo: 'COMPLEMENTO', nome: 'Farofa', aliases: ['farofa'] },
  { tipo: 'COMPLEMENTO', nome: 'Ma\u00e7\u00e3 picada', aliases: ['maca picada', 'ma\u00e7\u00e3 picada', 'maca', 'ma\u00e7\u00e3'] },
  { tipo: 'COMPLEMENTO', nome: 'Vinagrete', aliases: ['vinagrete'] },
  { tipo: 'COMPLEMENTO', nome: 'Salada', aliases: ['salada'] },
  { tipo: 'COMPLEMENTO', nome: 'Ovo Cozido', aliases: ['ovo cozido', 'ovo', 'ovos'] }
];

const REGRAS_PROTEINAS = REGRAS_ITENS.filter((regra) => regra.tipo === 'PROTEINA');
const REGRAS_ITEMS_ORDENADAS = REGRAS_ITENS.flatMap((regra) =>
  regra.aliases.map((alias) => ({ nome: regra.nome, tipo: regra.tipo, alias }))
).sort((a, b) => b.alias.length - a.alias.length);

const MAPA_REGRAS_POR_NOME = new Map(REGRAS_ITENS.map((regra) => [regra.nome, regra]));

const normalizarUrlBaseOpenAI = (valor = '') =>
  String(valor || '')
    .trim()
    .replace(/\/+$/, '');

const montarEndpointOpenAI = (baseUrl = '', caminho = '') =>
  `${normalizarUrlBaseOpenAI(baseUrl)}${String(caminho || '').startsWith('/') ? caminho : `/${caminho}`}`;

const normalizarUrlEndpointOpenAI = (valor = '') => {
  const url = normalizarUrlBaseOpenAI(valor);
  return url || '';
};

const DEFAULT_OPENAI_API_BASE_URL = 'https://api.openai.com/v1';
const OPENAI_API_BASE_URL = normalizarUrlBaseOpenAI(process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_API_BASE_URL);
const OPENAI_RESPONSES_URL = normalizarUrlEndpointOpenAI(process.env.OPENAI_RESPONSES_URL) || montarEndpointOpenAI(OPENAI_API_BASE_URL, '/responses');
const OPENAI_CHAT_COMPLETIONS_URL = normalizarUrlEndpointOpenAI(process.env.OPENAI_CHAT_COMPLETIONS_URL) || montarEndpointOpenAI(OPENAI_API_BASE_URL, '/chat/completions');
const OPENAI_AUDIO_TRANSCRIPTIONS_URL = normalizarUrlEndpointOpenAI(process.env.OPENAI_AUDIO_TRANSCRIPTIONS_URL) || montarEndpointOpenAI(OPENAI_API_BASE_URL, '/audio/transcriptions');
const OPENAI_ORDER_MODEL = process.env.OPENAI_ORDER_MODEL || 'gpt-4o-mini';
const OPENAI_TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe';
const DEFAULT_OPENAI_ORDER_PROMPT_ID = 'pmpt_69eff987fdd081978262248c75b1bde904a0be003e1d66d0';
const OPENAI_ORDER_PROMPT_ID = process.env.OPENAI_ORDER_PROMPT_ID || DEFAULT_OPENAI_ORDER_PROMPT_ID;
const OPENAI_ORDER_PROMPT_VERSION = process.env.OPENAI_ORDER_PROMPT_VERSION || '';

const PEDIDO_ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['nome', 'observacoes', 'proteinas', 'complementos', 'quantidade'],
  properties: {
    nome: { type: 'string' },
    observacoes: { type: 'string' },
    proteinas: {
      type: 'array',
      items: {
        type: 'string',
        enum: PROTEINAS_PERMITIDAS
      }
    },
    complementos: {
      type: 'array',
      items: {
        type: 'string',
        enum: COMPLEMENTOS_PERMITIDOS
      }
    },
    quantidade: {
      type: 'integer',
      minimum: 1,
      maximum: 100
    }
  }
};

const PEDIDO_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['nome', 'telefone', 'endereco', 'pagamento', 'observacoes', 'total_comandas', 'itens'],
  properties: {
    nome: { type: 'string' },
    telefone: { type: 'string' },
    endereco: { type: 'string' },
    pagamento: { type: 'string' },
    observacoes: { type: 'string' },
    total_comandas: {
      type: 'integer',
      minimum: 0,
      maximum: 100
    },
    itens: {
      type: 'array',
      minItems: 0,
      maxItems: 100,
      items: PEDIDO_ITEM_SCHEMA
    }
  }
};

const REGRAS_CRITICAS_ITENS = [
  'Regra critica: cada pedido individual, pessoa, linha, nome ou comanda precisa virar um objeto separado no array "itens".',
  'Nunca agrupe varias pessoas em um unico item.',
  'Nunca coloque varios nomes em uma unica observacao.',
  'Nunca use quantidade maior que 1 em um item final.',
  'Se vier quantidade maior que 1, expanda em varios itens separados com quantidade 1.',
  'Se o cliente mandar 30 pedidos, o array "itens" precisa ter 30 objetos.',
  'Se a lista vier numerada como "1 Paulo", "2 Everson", o numero inicial e so posicao da lista, nao quantidade.',
  'Se houver um numero final como "16" ou "Sao 4 hoje", ele serve como confirmacao do total de comandas.',
  'Nao crie item "outros pedidos" e nao resuma a lista.'
].join('\n');

class AiOrderError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'AiOrderError';
    this.statusCode = statusCode;
  }
}

const criarItemVazio = () => ({
  nome: '',
  observacoes: '',
  proteinas: [],
  complementos: [],
  quantidade: 1
});

const criarRespostaVazia = () => ({
  nome: '',
  telefone: '',
  endereco: '',
  pagamento: '',
  observacoes: '',
  total_comandas: 0,
  itens: []
});

const normalizarTexto = (valor = '') =>
  String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const normalizarCampo = (valor = '') =>
  String(valor)
    .replace(/\s+/g, ' ')
    .trim();

const normalizarMensagemPedido = (valor = '') =>
  String(valor)
    .replace(/\r/g, '')
    .split('\n')
    .map((linha) => normalizarCampo(linha))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const escaparRegExp = (valor = '') =>
  String(valor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const deduplicarStrings = (valores = []) => {
  const vistos = new Set();

  return valores.filter((valor) => {
    const chave = normalizarTexto(valor).trim();
    if (!chave || vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
};

const limparJsonTextual = (conteudo = '') => {
  const texto = String(conteudo || '').trim();
  if (!texto) return '';

  const blocoMarkdown = texto.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return blocoMarkdown ? blocoMarkdown[1].trim() : texto;
};

const capitalizarFrase = (valor = '') => {
  const texto = normalizarCampo(valor);
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const encontrarMelhorCorrespondencia = (valor = '', listaPermitida = []) => {
  const chave = normalizarTexto(valor);
  return listaPermitida.find((item) => normalizarTexto(item) === chave) || null;
};

const ordenarListaPorReferencia = (lista = [], listaPermitida = []) => {
  const posicoes = new Map(
    listaPermitida.map((item, indice) => [normalizarTexto(item), indice])
  );

  return [...lista].sort((a, b) => {
    const posicaoA = posicoes.get(normalizarTexto(a));
    const posicaoB = posicoes.get(normalizarTexto(b));
    return (posicaoA ?? Number.MAX_SAFE_INTEGER) - (posicaoB ?? Number.MAX_SAFE_INTEGER);
  });
};

const normalizarListaItens = (lista, listaPermitida) =>
  ordenarListaPorReferencia(
    deduplicarStrings(
      (Array.isArray(lista) ? lista : [])
        .map((item) => encontrarMelhorCorrespondencia(item, listaPermitida))
        .filter(Boolean)
    ),
    listaPermitida
  );

const juntarObservacoes = (...partes) =>
  deduplicarStrings(
    partes
      .flatMap((parte) => String(parte || '').split(/\s*;\s*/))
      .map((item) => normalizarCampo(item))
      .filter(Boolean)
  ).join('; ');

const construirRegexNegacao = (alias) =>
  new RegExp(
    `\\b(?:sem|tirar|retirar|nao quero|nao precisa(?: de)?|sem o|sem a|sem os|sem as)\\s+(?:de\\s+)?${escaparRegExp(normalizarTexto(alias))}\\b`,
    'i'
  );

const construirRegexPositivo = (alias) =>
  new RegExp(`\\b${escaparRegExp(normalizarTexto(alias))}\\b`, 'i');

const extrairSegmentosNegativos = (mensagem) =>
  Array.from(normalizarTexto(mensagem).matchAll(/\bsem\s+([^,.!\n;]+)/g)).map((match) => normalizarCampo(match[1]));

const detectarItensPorRegras = (mensagem) => {
  const textoNormalizado = normalizarTexto(mensagem);
  const segmentosNegativos = extrairSegmentosNegativos(mensagem);
  const proteinas = [];
  const complementos = [];
  const observacoesNegativas = [];

  REGRAS_ITENS.forEach((regra) => {
    const aliasesOrdenados = [...regra.aliases].sort((a, b) => b.length - a.length);
    const temNegacao = aliasesOrdenados.some((alias) => (
      construirRegexNegacao(alias).test(textoNormalizado) ||
      segmentosNegativos.some((segmento) => construirRegexPositivo(alias).test(segmento))
    ));
    const temPositivo = aliasesOrdenados.some((alias) => construirRegexPositivo(alias).test(textoNormalizado));

    if (temNegacao) {
      observacoesNegativas.push(`Sem ${regra.nome}`);
      return;
    }

    if (!temPositivo) {
      return;
    }

    if (PROTEINAS_PERMITIDAS.includes(regra.nome)) {
      proteinas.push(regra.nome);
      return;
    }

    if (COMPLEMENTOS_PERMITIDOS.includes(regra.nome)) {
      complementos.push(regra.nome);
    }
  });

  return {
    proteinas: normalizarListaItens(proteinas, PROTEINAS_PERMITIDAS),
    complementos: normalizarListaItens(complementos, COMPLEMENTOS_PERMITIDOS),
    observacoesNegativas: deduplicarStrings(observacoesNegativas)
  };
};

const extrairTelefone = (mensagem) => {
  const match = String(mensagem || '').match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9?\d{4})[-\s]?\d{4}/);
  return normalizarCampo(match?.[0] || '');
};

const extrairNome = (mensagem) => {
  const padroes = [
    /(?:meu nome e|meu nome \u00e9|nome[:\s-]+)\s*([A-Za-z\u00c0-\u00ff][A-Za-z\u00c0-\u00ff\s]{2,60}?)(?=$|[,.!\n]| telefone| fone| rua| avenida| av\.| travessa| pix| dinheiro| cartao| cart\u00e3o| quero| gostaria)/i,
    /(?:sou o|sou a)\s*([A-Za-z\u00c0-\u00ff][A-Za-z\u00c0-\u00ff\s]{2,60}?)(?=$|[,.!\n]| telefone| fone| rua| avenida| av\.| travessa| pix| dinheiro| cartao| cart\u00e3o| quero| gostaria)/i
  ];

  for (const padrao of padroes) {
    const match = String(mensagem || '').match(padrao);
    if (match?.[1]) {
      return normalizarCampo(match[1]);
    }
  }

  return '';
};

const limparTrechoEndereco = (valor = '') => {
  const trecho = normalizarCampo(valor);
  if (!trecho) return '';

  const delimitador = trecho.search(/\b(?:pix|dinheiro|carta[o\u0303]|credito|cr\u00e9dito|debito|d\u00e9bito|telefone|fone|whatsapp|zap|meu nome|nome)\b/i);
  return normalizarCampo(delimitador > 0 ? trecho.slice(0, delimitador) : trecho);
};

const extrairEndereco = (mensagem) => {
  const padroes = [
    /(?:entrega\s+(?:na|no|em)|manda\s+(?:na|no|em)|levar\s+(?:na|no|em)|endere(?:co|\u00e7o)[:\s-]*)\s*([^.!?\n]+)/i,
    /((?:Rua|R\.|Avenida|Av\.|Travessa|Tv\.|Alameda|Estrada|Rodovia)\s+[^.!?\n]+)/i
  ];

  for (const padrao of padroes) {
    const match = String(mensagem || '').match(padrao);
    if (match?.[1]) {
      const endereco = limparTrechoEndereco(match[1]);
      if (endereco) return endereco;
    }
  }

  return '';
};

const extrairPagamento = (mensagem) => {
  const opcoes = [
    { valor: 'Pix', regex: /\bpix\b/i },
    { valor: 'Dinheiro', regex: /\bdinheiro\b|\bgrana\b/i },
    { valor: 'Cartao de credito', regex: /\bcredito\b|\bcr\u00e9dito\b|\bcart[a\u00e3]o de cr[e\u00e9]dito\b/i },
    { valor: 'Cartao de debito', regex: /\bdebito\b|\bd\u00e9bito\b|\bcart[a\u00e3]o de d[e\u00e9]bito\b/i },
    { valor: 'Cartao', regex: /\bcart[a\u00e3]o\b/i }
  ];

  let melhorIndice = Infinity;
  let melhorValor = '';

  opcoes.forEach((opcao) => {
    const match = String(mensagem || '').match(opcao.regex);
    if (match?.index != null && match.index < melhorIndice) {
      melhorIndice = match.index;
      melhorValor = opcao.valor;
    }
  });

  return melhorValor;
};

const limparSufixoProteinaObservacao = (valor = '') => {
  let texto = normalizarCampo(valor);
  if (!texto) return '';

  REGRAS_PROTEINAS.forEach((regra) => {
    regra.aliases.forEach((alias) => {
      const regex = new RegExp(`\\s+(?:o|a|do|da)?\\s*${escaparRegExp(alias).replace(/\s+/g, '\\s+')}\\b`, 'i');
      texto = texto.replace(regex, '');
    });
  });

  return normalizarCampo(texto);
};

const extrairObservacoesLivresLinha = (mensagem) => {
  const observacoes = [];
  const texto = String(mensagem || '');
  const regras = [
    { prefixo: 'Sem', regex: /\b(?:sem|tirar|retirar)\s+([^,.;\n]+)/gi },
    { prefixo: 'Pouco', regex: /\bpouco\s+([^,.;\n]+)/gi }
  ];

  regras.forEach(({ prefixo, regex }) => {
    let match;
    while ((match = regex.exec(texto)) !== null) {
      const trecho = limparSufixoProteinaObservacao(match[1]);
      if (trecho) {
        observacoes.push(`${prefixo} ${trecho}`);
      }
    }
  });

  return deduplicarStrings(observacoes.map(capitalizarFrase));
};

const extrairObservacoes = (mensagem, observacoesNegativas = []) => {
  const match = String(mensagem || '').match(/(?:obs(?:ervac[a\u00e3]o)?[:\s-]*)([^.!?\n]+)/i);
  const observacaoExplicita = normalizarCampo(match?.[1] || '');
  return juntarObservacoes(
    observacaoExplicita,
    extrairObservacoesLivresLinha(mensagem).join('; '),
    observacoesNegativas.join('; ')
  );
};

const mensagemIndicaObservacao = (mensagem = '') =>
  /\b(?:obs|observa|sem|tirar|retirar|nao quero|nao precisa|pouco)\b/i.test(normalizarTexto(mensagem));

const normalizarQuantidade = (valor, padrao = 1) => {
  const quantidade = Number.parseInt(valor, 10);
  if (!Number.isInteger(quantidade) || quantidade < 1) return padrao;
  return Math.min(quantidade, 100);
};

const normalizarItemPedido = (item = {}, baseItem = null) => {
  const base = baseItem
    ? {
      nome: normalizarCampo(baseItem.nome),
      observacoes: normalizarCampo(baseItem.observacoes),
      proteinas: normalizarListaItens(baseItem.proteinas, PROTEINAS_PERMITIDAS),
      complementos: normalizarListaItens(baseItem.complementos, COMPLEMENTOS_PERMITIDOS)
    }
    : criarItemVazio();

  const proteinas = normalizarListaItens(
    [...base.proteinas, ...(Array.isArray(item.proteinas) ? item.proteinas : [])],
    PROTEINAS_PERMITIDAS
  );
  const complementos = normalizarListaItens(
    [...base.complementos, ...(Array.isArray(item.complementos) ? item.complementos : [])],
    COMPLEMENTOS_PERMITIDOS
  );

  return {
    nome: normalizarCampo(item.nome || base.nome),
    observacoes: juntarObservacoes(base.observacoes, item.observacoes),
    proteinas,
    complementos,
    quantidade: normalizarQuantidade(item.quantidade, 1)
  };
};

const removerObservacoesQueNegamProteinasSelecionadas = (item = criarItemVazio()) => {
  const observacoes = String(item.observacoes || '')
    .split(/\s*;\s*/)
    .map((observacao) => normalizarCampo(observacao))
    .filter(Boolean)
    .filter((observacao) => !item.proteinas.some((proteina) => normalizarTexto(observacao) === normalizarTexto(`Sem ${proteina}`)));

  return {
    ...item,
    observacoes: juntarObservacoes(observacoes.join('; '))
  };
};

const expandirItensPorQuantidade = (itens = []) => {
  const itensExpandidos = [];

  (Array.isArray(itens) ? itens : []).forEach((item) => {
    const itemNormalizado = removerObservacoesQueNegamProteinasSelecionadas(normalizarItemPedido(item));
    const quantidade = normalizarQuantidade(itemNormalizado.quantidade, 1);

    for (let indice = 0; indice < quantidade; indice += 1) {
      itensExpandidos.push({
        ...itemNormalizado,
        quantidade: 1
      });
    }
  });

  return itensExpandidos;
};

const migrarRespostaLegadaParaItens = (pedido = {}) => {
  if (Array.isArray(pedido.itens)) {
    return pedido.itens;
  }

  const itemLegado = normalizarItemPedido({
    nome: pedido.nome,
    observacoes: pedido.observacoes,
    proteinas: pedido.proteinas,
    complementos: pedido.complementos,
    quantidade: 1
  });

  if (!itemLegado.nome && !itemLegado.observacoes && !itemLegado.proteinas.length && !itemLegado.complementos.length) {
    return [];
  }

  return [itemLegado];
};

const normalizarResultadoPedido = (pedido = {}) => {
  const itens = expandirItensPorQuantidade(migrarRespostaLegadaParaItens(pedido));

  return {
    nome: normalizarCampo(pedido.nome),
    telefone: normalizarCampo(pedido.telefone),
    endereco: normalizarCampo(pedido.endereco),
    pagamento: normalizarCampo(pedido.pagamento),
    observacoes: normalizarCampo(pedido.observacoes),
    total_comandas: itens.length,
    itens
  };
};

const limparPrefixoLista = (linha = '') =>
  normalizarCampo(linha).replace(/^\d{1,3}\s*(?:[.)-]|)\s+/, '');

const extrairTotalComandasInformado = (mensagem = '') => {
  const linhas = String(mensagem || '')
    .split('\n')
    .map((linha) => normalizarCampo(linha))
    .filter(Boolean);

  const ultimaLinha = linhas.at(-1) || '';
  const textoUltimaLinha = normalizarTexto(ultimaLinha);

  if (/^\d{1,3}$/.test(textoUltimaLinha)) {
    return Number.parseInt(textoUltimaLinha, 10);
  }

  const matchUltimaLinha = textoUltimaLinha.match(/\b(?:sao|s[o\u0303]o|sao)\s+(\d{1,3})(?:\s*(?:hj|hoje))?\b/);
  if (matchUltimaLinha?.[1]) {
    return Number.parseInt(matchUltimaLinha[1], 10);
  }

  const matchTexto = normalizarTexto(mensagem).match(/\btotal\s*:?\s*(\d{1,3})\b/);
  if (matchTexto?.[1]) {
    return Number.parseInt(matchTexto[1], 10);
  }

  return null;
};

const ehLinhaConfirmacaoTotal = (linha = '') => {
  const texto = normalizarTexto(linha);
  return (
    /^\d{1,3}$/.test(texto) ||
    /^(?:sao|s[o\u0303]o|sao)\s+\d{1,3}(?:\s*(?:hj|hoje))?$/.test(texto) ||
    /^total\s*:?\s*\d{1,3}$/.test(texto)
  );
};

const encontrarPrimeiroIngrediente = (linha = '') => {
  let melhorMatch = null;

  REGRAS_ITEMS_ORDENADAS.forEach((regra) => {
    const regex = new RegExp(`\\b${escaparRegExp(regra.alias).replace(/\s+/g, '\\s+')}\\b`, 'i');
    const match = regex.exec(linha);

    if (!match) return;

    if (!melhorMatch || match.index < melhorMatch.index) {
      melhorMatch = { index: match.index, alias: regra.alias, nome: regra.nome, tipo: regra.tipo };
      return;
    }

    if (match.index === melhorMatch.index && regra.alias.length > melhorMatch.alias.length) {
      melhorMatch = { index: match.index, alias: regra.alias, nome: regra.nome, tipo: regra.tipo };
    }
  });

  return melhorMatch;
};

const limparConectoresFinaisNome = (valor = '') =>
  normalizarCampo(valor).replace(/\b(?:com|e|de|do|da|dos|das)\b$/i, '').trim();

const ehLinhaProvavelNome = (linha = '') => {
  const texto = normalizarCampo(linha);
  if (!texto || /\d/.test(texto)) return false;
  if (encontrarPrimeiroIngrediente(texto)) return false;
  return /^[A-Za-z\u00c0-\u00ff'\- ]+$/.test(texto) && texto.split(/\s+/).length <= 4;
};

const extrairNomeDaLinha = (linha = '') => {
  const texto = limparPrefixoLista(linha);
  if (!texto) return '';

  const primeiroIngrediente = encontrarPrimeiroIngrediente(texto);

  if (!primeiroIngrediente) {
    return ehLinhaProvavelNome(texto) ? texto : '';
  }

  const prefixo = limparConectoresFinaisNome(texto.slice(0, primeiroIngrediente.index));
  if (!prefixo) return '';

  return ehLinhaProvavelNome(prefixo) ? prefixo : '';
};

const parseLinhaComoItem = (linha, opcoes = {}) => {
  const baseItem = opcoes.baseItem ? normalizarItemPedido(opcoes.baseItem) : null;
  const linhaSemPrefixo = opcoes.removerPrefixoLista === false ? normalizarCampo(linha) : limparPrefixoLista(linha);

  if (!linhaSemPrefixo || ehLinhaConfirmacaoTotal(linhaSemPrefixo)) {
    return null;
  }

  const detectado = detectarItensPorRegras(linhaSemPrefixo);
  const nome = extrairNomeDaLinha(linhaSemPrefixo);
  const observacoes = juntarObservacoes(
    baseItem?.observacoes,
    detectado.observacoesNegativas.join('; '),
    extrairObservacoesLivresLinha(linhaSemPrefixo).join('; ')
  );

  const item = normalizarItemPedido({
    nome,
    observacoes,
    proteinas: detectado.proteinas,
    complementos: detectado.complementos,
    quantidade: 1
  }, baseItem);

  if (!item.nome && !item.observacoes && !item.proteinas.length && !item.complementos.length) {
    return null;
  }

  if (!baseItem && !item.proteinas.length && !item.complementos.length && !item.observacoes) {
    return null;
  }

  return item;
};

const dividirParagrafos = (mensagem = '') =>
  String(mensagem || '')
    .split(/\n\s*\n/)
    .map((bloco) => bloco
      .split('\n')
      .map((linha) => normalizarCampo(linha))
      .filter(Boolean))
    .filter((linhas) => linhas.length);

const paragrafoPareceBlocoPorProteina = (linhas = []) => {
  if (linhas.length < 2) return false;

  const primeiraLinha = normalizarCampo(linhas[0]);
  if (!primeiraLinha || /^\d/.test(primeiraLinha)) return false;

  const cabecalho = parseLinhaComoItem(primeiraLinha, { removerPrefixoLista: false });
  if (!cabecalho) return false;
  if (cabecalho.nome) return false;
  if (!cabecalho.proteinas.length && !cabecalho.complementos.length) return false;

  return linhas.slice(1).some((linha) => ehLinhaProvavelNome(limparPrefixoLista(linha)));
};

const extrairItensPorLinhas = (mensagem = '') => {
  const paragrafos = dividirParagrafos(mensagem);
  const itens = [];

  paragrafos.forEach((linhas) => {
    if (paragrafoPareceBlocoPorProteina(linhas)) {
      const baseItem = parseLinhaComoItem(linhas[0], { removerPrefixoLista: false });

      linhas.slice(1).forEach((linha) => {
        const item = parseLinhaComoItem(linha, { baseItem });
        if (item) itens.push(item);
      });

      return;
    }

    linhas.forEach((linha) => {
      const item = parseLinhaComoItem(linha, { removerPrefixoLista: linhas.length > 1 });
      if (item) itens.push(item);
    });
  });

  return expandirItensPorQuantidade(itens);
};

const extrairObservacoesParaProteina = (mensagem, nomeProteina) => {
  const regra = MAPA_REGRAS_POR_NOME.get(nomeProteina);
  if (!regra) return '';

  const observacoes = [];
  const segmentos = String(mensagem || '')
    .split(/[,\n;]/)
    .map((parte) => normalizarCampo(parte))
    .filter(Boolean);

  segmentos.forEach((segmento) => {
    const textoNormalizado = normalizarTexto(segmento);
    const mencionaProteina = regra.aliases.some((alias) => construirRegexPositivo(alias).test(textoNormalizado));
    if (!mencionaProteina) return;

    observacoes.push(...extrairObservacoesLivresLinha(segmento));
    observacoes.push(...detectarItensPorRegras(segmento).observacoesNegativas);
  });

  return juntarObservacoes(observacoes.join('; '));
};

const extrairItensPorContagemAgregada = (mensagem = '') => {
  const itens = [];
  const ocorrencias = [];

  REGRAS_PROTEINAS.forEach((regra) => {
    regra.aliases.forEach((alias) => {
      const regex = new RegExp(
        `(\\d+)\\s+(?:quentinhas?\\s*(?:de|do|da)?\\s*)?${escaparRegExp(alias).replace(/\s+/g, '\\s+')}\\b`,
        'gi'
      );

      let match;
      while ((match = regex.exec(String(mensagem || ''))) !== null) {
        const inicio = match.index;
        const fim = regex.lastIndex;
        const colide = ocorrencias.some((ocorrencia) => !(fim <= ocorrencia.inicio || inicio >= ocorrencia.fim));
        if (colide) continue;

        ocorrencias.push({
          inicio,
          fim,
          nome: regra.nome,
          quantidade: normalizarQuantidade(match[1], 1)
        });
      }
    });
  });

  ocorrencias
    .sort((a, b) => a.inicio - b.inicio)
    .forEach((ocorrencia) => {
      const observacoes = extrairObservacoesParaProteina(mensagem, ocorrencia.nome);
      for (let indice = 0; indice < ocorrencia.quantidade; indice += 1) {
        itens.push(normalizarItemPedido({
          proteinas: [ocorrencia.nome],
          observacoes,
          quantidade: 1
        }));
      }
    });

  return itens;
};

const construirItensFallback = (mensagem = '') => {
  const itensPorLinhas = extrairItensPorLinhas(mensagem);
  const itensPorContagem = extrairItensPorContagemAgregada(mensagem);
  const totalConfirmado = extrairTotalComandasInformado(mensagem);
  const candidatos = [itensPorLinhas, itensPorContagem].filter((lista) => lista.length > 0);

  if (!candidatos.length) {
    const itemUnico = parseLinhaComoItem(mensagem, { removerPrefixoLista: false });
    return itemUnico ? [itemUnico] : [];
  }

  const pontuar = (lista) => {
    let pontuacao = lista.length;
    if (totalConfirmado && lista.length === totalConfirmado) {
      pontuacao += 1000;
    }
    if (lista.some((item) => item.nome)) {
      pontuacao += 10;
    }
    return pontuacao;
  };

  return [...candidatos].sort((a, b) => pontuar(b) - pontuar(a))[0];
};

const construirFallbackPorRegras = (mensagem) => {
  const itemUnicoDetectado = detectarItensPorRegras(mensagem);
  const observacoesNegativas = extrairObservacoesLivresLinha(mensagem);
  const itens = construirItensFallback(mensagem);

  return {
    nome: extrairNome(mensagem),
    telefone: extrairTelefone(mensagem),
    endereco: extrairEndereco(mensagem),
    pagamento: extrairPagamento(mensagem),
    observacoes: extrairObservacoes(mensagem, observacoesNegativas),
    total_comandas: itens.length,
    itens: itens.length
      ? itens
      : [
        normalizarItemPedido({
          observacoes: extrairObservacoes(mensagem, itemUnicoDetectado.observacoesNegativas),
          proteinas: itemUnicoDetectado.proteinas,
          complementos: itemUnicoDetectado.complementos,
          quantidade: 1
        })
      ].filter((item) => item.proteinas.length || item.complementos.length || item.observacoes)
  };
};

const consolidarPedido = (pedidoPrincipal, pedidoApoio, mensagemOriginal = '') => {
  const principal = normalizarResultadoPedido(pedidoPrincipal);
  const apoio = normalizarResultadoPedido(pedidoApoio);
  const totalConfirmado = extrairTotalComandasInformado(mensagemOriginal);

  const candidatosItens = [principal.itens, apoio.itens].filter((lista) => lista.length > 0);
  const pontuar = (lista) => {
    let pontuacao = lista.length;
    if (totalConfirmado && lista.length === totalConfirmado) {
      pontuacao += 1000;
    }
    if (lista.some((item) => item.nome)) {
      pontuacao += 10;
    }
    return pontuacao;
  };

  const itensConsolidados = candidatosItens.length
    ? [...candidatosItens].sort((a, b) => pontuar(b) - pontuar(a))[0]
    : [];
  const observacoesConsolidadas = apoio.observacoes
    || (mensagemIndicaObservacao(mensagemOriginal) ? principal.observacoes : '');

  return {
    nome: principal.nome || apoio.nome,
    telefone: principal.telefone || apoio.telefone,
    endereco: principal.endereco || apoio.endereco,
    pagamento: principal.pagamento || apoio.pagamento,
    observacoes: observacoesConsolidadas,
    total_comandas: itensConsolidados.length,
    itens: itensConsolidados
  };
};

const openAIConfigurado = () => !!process.env.OPENAI_API_KEY;

const tratarErroOpenAI = async (response) => {
  const texto = await response.text();
  let mensagem = texto;

  try {
    const json = JSON.parse(texto);
    mensagem = json?.error?.message || json?.message || texto;
  } catch (err) {
    mensagem = texto;
  }

  throw new AiOrderError(`Falha ao consultar a IA: ${mensagem || response.statusText}`, response.status);
};

const extrairTextoRespostaResponses = (resposta = {}) => {
  const textos = [];

  for (const item of Array.isArray(resposta.output) ? resposta.output : []) {
    for (const contentItem of Array.isArray(item?.content) ? item.content : []) {
      if (contentItem?.type === 'output_text' && typeof contentItem.text === 'string') {
        textos.push(contentItem.text);
      }
    }
  }

  return textos.join('\n').trim();
};

const montarPromptVariablesPedido = (mensagem) => ({
  mensagem,
  texto: mensagem,
  pedido: mensagem,
  user_message: mensagem,
  input_text: mensagem
});

const organizarPedidoComPromptOpenAI = async (mensagem) => {
  const prompt = {
    id: OPENAI_ORDER_PROMPT_ID,
    variables: montarPromptVariablesPedido(mensagem)
  };

  if (OPENAI_ORDER_PROMPT_VERSION) {
    prompt.version = OPENAI_ORDER_PROMPT_VERSION;
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_ORDER_MODEL,
      prompt,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: REGRAS_CRITICAS_ITENS
            }
          ]
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: mensagem
            }
          ]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'pedido_marmitaria',
          strict: true,
          schema: PEDIDO_OUTPUT_SCHEMA
        }
      }
    })
  });

  if (!response.ok) {
    await tratarErroOpenAI(response);
  }

  const json = await response.json();
  const content = extrairTextoRespostaResponses(json);

  if (!content) {
    throw new AiOrderError('A IA nao retornou um JSON utilizavel.', 502);
  }

  try {
    return JSON.parse(content);
  } catch (err) {
    throw new AiOrderError('Nao foi possivel interpretar o JSON retornado pela IA.', 502);
  }
};

const organizarPedidoComMensagensOpenAI = async (mensagem) => {
  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_ORDER_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            'Voce organiza pedidos de marmitaria em JSON.',
            'Retorne somente JSON valido, sem markdown e sem texto extra.',
            'Use exatamente este formato:',
            '{"nome":"","telefone":"","endereco":"","pagamento":"","observacoes":"","total_comandas":0,"itens":[{"nome":"","observacoes":"","proteinas":[],"complementos":[],"quantidade":1}]}',
            'Cada pessoa, linha, nome ou pedido individual precisa virar um item separado em "itens".',
            'Nunca agrupe varios pedidos dentro do mesmo item.',
            'Nunca coloque varios nomes dentro da mesma observacao.',
            'Todo item final precisa ter "quantidade": 1.',
            'Se houver quantidade maior que 1, expanda em varios itens separados.',
            'Se a lista vier numerada como "1 Paulo", "2 Everson", o numero inicial e so posicao da lista.',
            'Um numero final como "16" ou "Sao 4 hoje" confirma total de comandas; nao e um item.',
            'Mapeie somente itens desta lista de proteinas:',
            PROTEINAS_PERMITIDAS.join(', '),
            'Mapeie somente itens desta lista de complementos:',
            COMPLEMENTOS_PERMITIDOS.join(', '),
            'A ordem fixa obrigatoria dos complementos em cada item deve ser:',
            COMPLEMENTOS_PERMITIDOS.join(' > '),
            'Regras obrigatorias:',
            '- frango -> Frango Forno',
            '- linguica ou lingui\u00e7a -> Lingui\u00e7a-Brasa',
            '- porco, suino ou su\u00edno -> Su\u00edno-molho',
            '- carne, carne de panela ou assado -> Assado de panela',
            '- creme, creme de galinha ou galinha -> Creme de Galinha',
            '- arroz -> Arroz Branco',
            '- macarrao ou macarr\u00e3o -> Macarr\u00e3o',
            '- maca, ma\u00e7a ou ma\u00e7a picada -> Ma\u00e7\u00e3 picada',
            '- ovo -> Ovo Cozido',
            '- Se o cliente disser "sem farofa", "sem feijao" etc., nao marque o item e registre em observacoes do item correto.',
            '- Se um campo nao for informado, devolva string vazia.',
            '- Nao crie itens fora das listas permitidas.',
            '- Nao crie item "outros pedidos".',
            '- total_comandas deve ser exatamente igual a itens.length.'
          ].join('\n')
        },
        {
          role: 'user',
          content: mensagem
        }
      ]
    })
  });

  if (!response.ok) {
    await tratarErroOpenAI(response);
  }

  const json = await response.json();
  const content = limparJsonTextual(json?.choices?.[0]?.message?.content || '');

  if (!content) {
    throw new AiOrderError('A IA nao retornou um JSON utilizavel.', 502);
  }

  try {
    return JSON.parse(content);
  } catch (err) {
    throw new AiOrderError('Nao foi possivel interpretar o JSON retornado pela IA.', 502);
  }
};

const organizarPedidoComOpenAI = async (mensagem) => {
  if (OPENAI_ORDER_PROMPT_ID) {
    try {
      return await organizarPedidoComPromptOpenAI(mensagem);
    } catch (err) {
      console.error('Erro ao organizar pedido com prompt reutilizavel, tentando fallback por mensagens:', err);
    }
  }

  return organizarPedidoComMensagensOpenAI(mensagem);
};

const transcreverAudioComOpenAI = async (arquivo) => {
  const buffer = await fs.readFile(arquivo.path);
  const formData = new FormData();
  const blob = new Blob([buffer], { type: arquivo.mimetype || 'application/octet-stream' });

  formData.append('file', blob, arquivo.originalname || 'pedido-audio.webm');
  formData.append('model', OPENAI_TRANSCRIPTION_MODEL);
  formData.append('response_format', 'json');
  formData.append('language', 'pt');
  formData.append('prompt', 'Transcreva fielmente um pedido de marmitaria em portugues do Brasil.');

  const response = await fetch(OPENAI_AUDIO_TRANSCRIPTIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: formData
  });

  if (!response.ok) {
    await tratarErroOpenAI(response);
  }

  const json = await response.json();
  const texto = normalizarCampo(json?.text || json?.transcript || '');

  if (!texto) {
    throw new AiOrderError('Nao foi possivel transcrever o audio enviado.', 502);
  }

  return texto;
};

async function organizarPedidoTexto(mensagem) {
  const mensagemLimpa = normalizarMensagemPedido(mensagem);

  if (!mensagemLimpa) {
    throw new AiOrderError('Informe a mensagem para organizar o pedido.', 400);
  }

  const fallback = construirFallbackPorRegras(mensagemLimpa);

  if (!openAIConfigurado()) {
    return normalizarResultadoPedido(fallback);
  }

  try {
    const respostaIA = await organizarPedidoComOpenAI(mensagemLimpa);
    return consolidarPedido(respostaIA, fallback, mensagemLimpa);
  } catch (err) {
    console.error('Erro ao organizar pedido com IA, usando fallback local:', err);
    return normalizarResultadoPedido(fallback);
  }
}

async function transcreverEOrganizarPedidoAudio(arquivo) {
  if (!arquivo?.path) {
    throw new AiOrderError('Arquivo de audio nao enviado.', 400);
  }

  if (!openAIConfigurado()) {
    throw new AiOrderError('Configure OPENAI_API_KEY no backend para habilitar transcricao de audio.', 503);
  }

  const transcricao = await transcreverAudioComOpenAI(arquivo);
  return organizarPedidoTexto(transcricao);
}

module.exports = {
  AiOrderError,
  PROTEINAS_PERMITIDAS,
  COMPLEMENTOS_PERMITIDOS,
  criarRespostaVazia,
  organizarPedidoTexto,
  transcreverEOrganizarPedidoAudio
};
