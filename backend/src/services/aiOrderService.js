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
  'Vinagrete'
];

const REGRAS_ITENS = [
  { nome: 'Assado de panela', aliases: ['assado de panela', 'carne de panela', 'assado', 'carne'] },
  { nome: 'Creme de Galinha', aliases: ['creme de galinha', 'creme', 'galinha'] },
  { nome: 'Frango Forno', aliases: ['frango forno', 'frango'] },
  { nome: 'Lingui\u00e7a-Brasa', aliases: ['linguica-brasa', 'linguica', 'lingui\u00e7a-brasa', 'lingui\u00e7a'] },
  { nome: 'Su\u00edno-molho', aliases: ['suino-molho', 'suino', 'su\u00edno-molho', 'su\u00edno', 'porco'] },
  { nome: 'Arroz Branco', aliases: ['arroz branco', 'arroz'] },
  { nome: 'Bai\u00e3o', aliases: ['baiao', 'bai\u00e3o'] },
  { nome: 'Feij\u00e3o', aliases: ['feijao', 'feij\u00e3o'] },
  { nome: 'Macarr\u00e3o', aliases: ['macarrao', 'macarr\u00e3o'] },
  { nome: 'Batatinha Cozida', aliases: ['batatinha cozida', 'batatinha'] },
  { nome: 'Farofa', aliases: ['farofa'] },
  { nome: 'Ma\u00e7\u00e3 picada', aliases: ['maca picada', 'ma\u00e7\u00e3 picada', 'maca', 'ma\u00e7\u00e3'] },
  { nome: 'Vinagrete', aliases: ['vinagrete'] }
];

const OPENAI_API_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_ORDER_MODEL = process.env.OPENAI_ORDER_MODEL || 'gpt-4o-mini';
const OPENAI_TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe';
const DEFAULT_OPENAI_ORDER_PROMPT_ID = 'pmpt_69eff987fdd081978262248c75b1bde904a0be003e1d66d0';
const OPENAI_ORDER_PROMPT_ID = process.env.OPENAI_ORDER_PROMPT_ID || DEFAULT_OPENAI_ORDER_PROMPT_ID;
const OPENAI_ORDER_PROMPT_VERSION = process.env.OPENAI_ORDER_PROMPT_VERSION || '';

const PEDIDO_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['nome', 'telefone', 'endereco', 'pagamento', 'observacoes', 'proteinas', 'complementos'],
  properties: {
    nome: { type: 'string' },
    telefone: { type: 'string' },
    endereco: { type: 'string' },
    pagamento: { type: 'string' },
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
    }
  }
};

class AiOrderError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'AiOrderError';
    this.statusCode = statusCode;
  }
}

const criarRespostaVazia = () => ({
  nome: '',
  telefone: '',
  endereco: '',
  pagamento: '',
  observacoes: '',
  proteinas: [],
  complementos: []
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
    /(?:meu nome e|meu nome é|nome[:\s-]+)\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{2,60}?)(?=$|[,.!\n]| telefone| fone| rua| avenida| av\.| travessa| pix| dinheiro| cartao| cartão| quero| gostaria)/i,
    /(?:sou o|sou a)\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{2,60}?)(?=$|[,.!\n]| telefone| fone| rua| avenida| av\.| travessa| pix| dinheiro| cartao| cartão| quero| gostaria)/i
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

  const delimitador = trecho.search(/\b(?:pix|dinheiro|cart[aã]o|credito|crédito|debito|débito|telefone|fone|whatsapp|zap|meu nome|nome)\b/i);
  return normalizarCampo(delimitador > 0 ? trecho.slice(0, delimitador) : trecho);
};

const extrairEndereco = (mensagem) => {
  const padroes = [
    /(?:entrega\s+(?:na|no|em)|manda\s+(?:na|no|em)|levar\s+(?:na|no|em)|endere(?:co|ço)[:\s-]*)\s*([^.!?\n]+)/i,
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
    { valor: 'Cartao de credito', regex: /\bcredito\b|\bcrédito\b|\bcart[aã]o de cr[eé]dito\b/i },
    { valor: 'Cartao de debito', regex: /\bdebito\b|\bdébito\b|\bcart[aã]o de d[eé]bito\b/i },
    { valor: 'Cartao', regex: /\bcart[aã]o\b/i }
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

const extrairObservacoes = (mensagem, observacoesNegativas = []) => {
  const match = String(mensagem || '').match(/(?:obs(?:ervac[aã]o)?[:\s-]*)([^.!?\n]+)/i);
  const observacaoExplicita = normalizarCampo(match?.[1] || '');
  return juntarObservacoes(observacaoExplicita, observacoesNegativas.join('; '));
};

const mensagemIndicaObservacao = (mensagem = '') =>
  /\b(?:obs|observa|sem|tirar|retirar|nao quero|nao precisa)\b/i.test(normalizarTexto(mensagem));

const normalizarResultadoPedido = (pedido = {}) => ({
  nome: normalizarCampo(pedido.nome),
  telefone: normalizarCampo(pedido.telefone),
  endereco: normalizarCampo(pedido.endereco),
  pagamento: normalizarCampo(pedido.pagamento),
  observacoes: normalizarCampo(pedido.observacoes),
  proteinas: normalizarListaItens(pedido.proteinas, PROTEINAS_PERMITIDAS),
  complementos: normalizarListaItens(pedido.complementos, COMPLEMENTOS_PERMITIDOS)
});

const construirFallbackPorRegras = (mensagem) => {
  const { proteinas, complementos, observacoesNegativas } = detectarItensPorRegras(mensagem);

  return {
    nome: extrairNome(mensagem),
    telefone: extrairTelefone(mensagem),
    endereco: extrairEndereco(mensagem),
    pagamento: extrairPagamento(mensagem),
    observacoes: extrairObservacoes(mensagem, observacoesNegativas),
    proteinas,
    complementos
  };
};

const consolidarPedido = (pedidoPrincipal, pedidoApoio, mensagemOriginal = '') => {
  const principal = normalizarResultadoPedido(pedidoPrincipal);
  const apoio = normalizarResultadoPedido(pedidoApoio);

  const proteinasConsolidadas = apoio.proteinas.length ? apoio.proteinas : principal.proteinas;
  const complementosConsolidados = apoio.complementos.length ? apoio.complementos : principal.complementos;
  const observacoesConsolidadas = apoio.observacoes
    || (mensagemIndicaObservacao(mensagemOriginal) ? principal.observacoes : '');

  return {
    nome: principal.nome || apoio.nome,
    telefone: principal.telefone || apoio.telefone,
    endereco: principal.endereco || apoio.endereco,
    pagamento: principal.pagamento || apoio.pagamento,
    observacoes: observacoesConsolidadas,
    proteinas: proteinasConsolidadas,
    complementos: complementosConsolidados
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

  const response = await fetch(`${OPENAI_API_BASE_URL}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_ORDER_MODEL,
      prompt,
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
  const response = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
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
            '{"nome":"","telefone":"","endereco":"","pagamento":"","observacoes":"","proteinas":[],"complementos":[]}',
            'Nunca invente dados ausentes.',
            'Mapeie somente itens desta lista de proteinas:',
            PROTEINAS_PERMITIDAS.join(', '),
            'Mapeie somente itens desta lista de complementos:',
            COMPLEMENTOS_PERMITIDOS.join(', '),
            'A ordem fixa obrigatoria dos complementos no retorno deve ser:',
            COMPLEMENTOS_PERMITIDOS.join(' > '),
            'Regras obrigatorias:',
            '- frango -> Frango Forno',
            '- linguica ou linguiça -> Linguiça-Brasa',
            '- porco, suino ou suíno -> Suíno-molho',
            '- carne, carne de panela ou assado -> Assado de panela',
            '- creme, creme de galinha ou galinha -> Creme de Galinha',
            '- arroz -> Arroz Branco',
            '- macarrao ou macarrão -> Macarrão',
            '- maca, maçã ou maçã picada -> Maçã picada',
            '- Se o cliente disser "sem farofa", "sem feijao" etc., nao marque o item e registre em observacoes.',
            '- Se um campo nao for informado, devolva string vazia.',
            '- Nao crie itens fora das listas permitidas.'
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

  const response = await fetch(`${OPENAI_API_BASE_URL}/audio/transcriptions`, {
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
  const mensagemLimpa = normalizarCampo(mensagem);

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
