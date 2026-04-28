import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiCpu,
  FiFileText,
  FiMic,
  FiPauseCircle,
  FiPlus,
  FiPrinter,
  FiRefreshCw,
  FiSend,
  FiTrash2,
  FiTruck,
  FiUploadCloud
} from 'react-icons/fi';
import CheckboxVerde from '../../components/CheckboxVerde';
import { aiOrderAPI, empresaAPI, pedidoEmpresaAPI } from '../../services/api';
import { abrirImpressaoComandasChecklist } from '../../utils/comandaChecklistPrint';
import './PedidoIA.css';

const PROTEINAS = [
  'Assado de panela',
  'Creme de Galinha',
  'Frango Forno',
  'Lingui\u00e7a-Brasa',
  'Su\u00edno-molho'
];

const COMPLEMENTOS = [
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

const criarComandaVazia = () => ({
  nome: '',
  observacoes: '',
  proteinas: [],
  complementos: [],
  quantidade: 1
});

const criarPedidoVazio = () => ({
  nome: '',
  telefone: '',
  endereco: '',
  pagamento: '',
  observacoes: '',
  total_comandas: 0,
  itens: []
});

const normalizarChave = (valor = '') =>
  String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizarCampo = (valor = '') =>
  String(valor)
    .trim()
    .replace(/\s+/g, ' ');

const juntarObservacoes = (...partes) => {
  const vistos = new Set();

  return partes
    .flatMap((parte) => String(parte || '').split(/\s*;\s*/))
    .map((parte) => normalizarCampo(parte))
    .filter((parte) => {
      const chave = normalizarChave(parte);
      if (!chave || vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    })
    .join('; ');
};

const ordenarListaPorReferencia = (lista = [], referencia = []) => {
  const posicoes = new Map(referencia.map((item, indice) => [normalizarChave(item), indice]));

  return [...lista].sort((a, b) => {
    const posicaoA = posicoes.get(normalizarChave(a));
    const posicaoB = posicoes.get(normalizarChave(b));
    return (posicaoA ?? Number.MAX_SAFE_INTEGER) - (posicaoB ?? Number.MAX_SAFE_INTEGER);
  });
};

const normalizarListaRecebida = (lista = [], referencia = []) => {
  const itensPermitidos = new Map(referencia.map((item) => [normalizarChave(item), item]));

  return ordenarListaPorReferencia(
    (Array.isArray(lista) ? lista : [])
      .map((item) => itensPermitidos.get(normalizarChave(item)))
      .filter(Boolean)
      .filter((item, indice, array) => array.findIndex((valor) => normalizarChave(valor) === normalizarChave(item)) === indice),
    referencia
  );
};

const normalizarComandaRecebida = (item = {}) => ({
  nome: normalizarCampo(item?.nome || ''),
  observacoes: normalizarCampo(item?.observacoes || ''),
  proteinas: normalizarListaRecebida(item?.proteinas, PROTEINAS),
  complementos: normalizarListaRecebida(item?.complementos, COMPLEMENTOS),
  quantidade: 1
});

const temConteudoComanda = (comanda = {}) =>
  !!normalizarCampo(comanda?.nome)
  || !!normalizarCampo(comanda?.observacoes)
  || Array.isArray(comanda?.proteinas) && comanda.proteinas.length > 0
  || Array.isArray(comanda?.complementos) && comanda.complementos.length > 0;

const normalizarPedidoRecebido = (pedido = {}) => {
  const itensOriginais = Array.isArray(pedido?.itens) ? pedido.itens : [];
  const itensLegados = !itensOriginais.length && (
    Array.isArray(pedido?.proteinas) && pedido.proteinas.length
    || Array.isArray(pedido?.complementos) && pedido.complementos.length
    || normalizarCampo(pedido?.nome)
    || normalizarCampo(pedido?.observacoes)
  )
    ? [{
      nome: pedido?.nome || '',
      observacoes: pedido?.observacoes || '',
      proteinas: pedido?.proteinas || [],
      complementos: pedido?.complementos || [],
      quantidade: 1
    }]
    : [];

  const itens = [...itensOriginais, ...itensLegados]
    .flatMap((item) => {
      const comandaNormalizada = normalizarComandaRecebida(item);
      const quantidade = Math.max(1, Math.min(100, Number.parseInt(item?.quantidade, 10) || 1));
      return Array.from({ length: quantidade }, () => ({ ...comandaNormalizada, quantidade: 1 }));
    })
    .filter(temConteudoComanda);

  return {
    nome: normalizarCampo(pedido?.nome || ''),
    telefone: normalizarCampo(pedido?.telefone || ''),
    endereco: normalizarCampo(pedido?.endereco || ''),
    pagamento: normalizarCampo(pedido?.pagamento || ''),
    observacoes: normalizarCampo(pedido?.observacoes || ''),
    total_comandas: itens.length,
    itens
  };
};

const montarItensPedidoEmpresa = (comanda = {}) => [
  ...(comanda.proteinas || []).map((nome) => ({ nome, tipo: 'PROTEINA' })),
  ...(comanda.complementos || []).map((nome) => ({ nome, tipo: 'COMPLEMENTO' }))
];

const montarResumoComandasObservacao = (pedido = {}) =>
  (pedido.itens || [])
    .map((comanda, indice) => {
      const nome = normalizarCampo(comanda.nome) || 'Sem nome';
      const itens = [...(comanda.proteinas || []), ...(comanda.complementos || [])].join(', ') || 'Sem itens';
      const observacoes = normalizarCampo(comanda.observacoes);
      return `${indice + 1}) ${nome} - ${itens}${observacoes ? ` - Obs: ${observacoes}` : ''}`;
    })
    .join(' || ');

const montarObservacaoFluxoEmpresa = (pedido = {}) => {
  const partes = [
    'Origem: Pedido por IA',
    `Total comandas: ${pedido.itens?.length || 0}`
  ];

  if (normalizarCampo(pedido.nome)) {
    partes.push(`Contato: ${normalizarCampo(pedido.nome)}`);
  }

  if (normalizarCampo(pedido.telefone)) {
    partes.push(`Tel: ${normalizarCampo(pedido.telefone)}`);
  }

  if (normalizarCampo(pedido.pagamento)) {
    partes.push(`Pgto: ${normalizarCampo(pedido.pagamento)}`);
  }

  if (normalizarCampo(pedido.observacoes)) {
    partes.push(`Obs geral: ${normalizarCampo(pedido.observacoes)}`);
  }

  const resumoComandas = montarResumoComandasObservacao(pedido);
  if (resumoComandas) {
    partes.push(`Comandas: ${resumoComandas}`);
  }

  return partes.join(' | ');
};

const montarDadosImpressaoComanda = (pedido = {}, comanda = {}, indice = 0, total = 0) => ({
  tituloJanela: `Pedido por IA - Comanda ${indice + 1}/${total}`,
  nome: normalizarCampo(comanda.nome) || normalizarCampo(pedido.nome),
  telefone: normalizarCampo(pedido.telefone),
  endereco: normalizarCampo(pedido.endereco),
  pagamento: normalizarCampo(pedido.pagamento),
  observacoes: juntarObservacoes(pedido.observacoes, comanda.observacoes),
  itensProteina: PROTEINAS,
  itensComplemento: COMPLEMENTOS,
  proteinasSelecionadas: comanda.proteinas,
  complementosSelecionados: comanda.complementos
});

export default function PedidoIA() {
  const [mensagemTexto, setMensagemTexto] = useState('');
  const [arquivoAudio, setArquivoAudio] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('');
  const [pedido, setPedido] = useState(() => criarPedidoVazio());
  const [resultadoDisponivel, setResultadoDisponivel] = useState(false);
  const [carregandoTexto, setCarregandoTexto] = useState(false);
  const [carregandoAudio, setCarregandoAudio] = useState(false);
  const [gravandoAudio, setGravandoAudio] = useState(false);
  const [preparandoGravacao, setPreparandoGravacao] = useState(false);
  const [duracaoGravacao, setDuracaoGravacao] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionadaId, setEmpresaSelecionadaId] = useState('');
  const [carregandoEmpresas, setCarregandoEmpresas] = useState(true);
  const [enviandoFluxo, setEnviandoFluxo] = useState(false);
  const [pedidoCriadoInfo, setPedidoCriadoInfo] = useState(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const gravacaoChunksRef = useRef([]);
  const cronometroRef = useRef(null);
  const descartarAoPararRef = useRef(false);

  const suporteGravacao =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== 'undefined';

  const totalComandas = useMemo(() => pedido.itens.length, [pedido.itens]);

  const totalMarcados = useMemo(
    () => pedido.itens.reduce(
      (total, comanda) => total + (comanda.proteinas?.length || 0) + (comanda.complementos?.length || 0),
      0
    ),
    [pedido.itens]
  );

  const empresaSelecionada = useMemo(
    () => empresas.find((empresa) => String(empresa.id) === String(empresaSelecionadaId)) || null,
    [empresas, empresaSelecionadaId]
  );

  useEffect(() => {
    let ativo = true;

    empresaAPI.listar()
      .then(({ data }) => {
        if (!ativo) return;

        const listaEmpresas = (data || []).filter((empresa) => empresa.ativo !== false);
        setEmpresas(listaEmpresas);
        setEmpresaSelecionadaId((atual) => atual || String(listaEmpresas[0]?.id || ''));
      })
      .catch((err) => {
        if (!ativo) return;

        console.error('Erro ao carregar empresas para Pedido IA:', err);
        setFeedback({
          tipo: 'error',
          texto: 'Nao foi possivel carregar as empresas para o fluxo empresarial.'
        });
      })
      .finally(() => {
        if (ativo) setCarregandoEmpresas(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => () => {
    if (cronometroRef.current) {
      window.clearInterval(cronometroRef.current);
    }

    if (audioPreviewUrl) {
      window.URL.revokeObjectURL(audioPreviewUrl);
    }

    mediaStreamRef.current?.getTracks()?.forEach((track) => track.stop());
  }, [audioPreviewUrl]);

  const aplicarResultado = (data, tipoOrigem) => {
    const pedidoNormalizado = normalizarPedidoRecebido(data);

    setPedido(pedidoNormalizado);
    setResultadoDisponivel(true);
    setPedidoCriadoInfo(null);
    setFeedback({
      tipo: 'success',
      texto: tipoOrigem === 'audio'
        ? `Audio transcrito e pedido organizado com sucesso. Total de comandas detectadas: ${pedidoNormalizado.itens.length}.`
        : `Pedido organizado com sucesso. Total de comandas detectadas: ${pedidoNormalizado.itens.length}.`
    });
  };

  const processarArquivoAudio = async (audioFile, { automatico = false } = {}) => {
    if (!audioFile) {
      setFeedback({ tipo: 'error', texto: 'Selecione um arquivo de audio antes de transcrever.' });
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioFile);

    setCarregandoAudio(true);
    setFeedback(
      automatico
        ? { tipo: 'success', texto: 'Gravacao concluida. Transcrevendo audio...' }
        : null
    );

    try {
      const { data } = await aiOrderAPI.organizarAudio(formData);
      aplicarResultado(data, 'audio');
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.erro || 'Nao foi possivel transcrever o audio.'
      });
    } finally {
      setCarregandoAudio(false);
    }
  };

  const organizarTexto = async () => {
    if (!mensagemTexto.trim()) {
      setFeedback({ tipo: 'error', texto: 'Cole a mensagem do cliente antes de organizar.' });
      return;
    }

    setCarregandoTexto(true);
    setFeedback(null);

    try {
      const { data } = await aiOrderAPI.organizarTexto({ mensagem: mensagemTexto });
      aplicarResultado(data, 'texto');
    } catch (err) {
      setFeedback({ tipo: 'error', texto: err.response?.data?.erro || 'Nao foi possivel organizar o pedido.' });
    } finally {
      setCarregandoTexto(false);
    }
  };

  const organizarAudio = async () => {
    await processarArquivoAudio(arquivoAudio);
  };

  const obterConfiguracaoGravacao = () => {
    if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
      return { mimeType: '', extensao: 'webm' };
    }

    const opcoes = [
      { mimeType: 'audio/webm;codecs=opus', extensao: 'webm' },
      { mimeType: 'audio/webm', extensao: 'webm' },
      { mimeType: 'audio/mp4', extensao: 'mp4' },
      { mimeType: 'audio/ogg;codecs=opus', extensao: 'ogg' }
    ];

    const suportada = opcoes.find((opcao) => window.MediaRecorder.isTypeSupported?.(opcao.mimeType));
    return suportada || { mimeType: '', extensao: 'webm' };
  };

  const iniciarGravacao = async () => {
    if (!suporteGravacao || gravandoAudio || preparandoGravacao) return;

    setPreparandoGravacao(true);
    setFeedback(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const { mimeType, extensao } = obterConfiguracaoGravacao();
      const mediaRecorder = mimeType
        ? new window.MediaRecorder(stream, { mimeType })
        : new window.MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;
      gravacaoChunksRef.current = [];
      setDuracaoGravacao(0);
      setArquivoAudio(null);

      if (audioPreviewUrl) {
        window.URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl('');
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          gravacaoChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (cronometroRef.current) {
          window.clearInterval(cronometroRef.current);
          cronometroRef.current = null;
        }

        const blobType = mediaRecorder.mimeType || mimeType || gravacaoChunksRef.current[0]?.type || 'audio/webm';
        const blob = new Blob(gravacaoChunksRef.current, { type: blobType });
        const audioFile = new File([blob], `pedido-ia-${Date.now()}.${extensao}`, { type: blobType });
        const previewUrl = window.URL.createObjectURL(blob);

        if (descartarAoPararRef.current) {
          descartarAoPararRef.current = false;
          window.URL.revokeObjectURL(previewUrl);
          setGravandoAudio(false);
          setPreparandoGravacao(false);
          setDuracaoGravacao(0);
          mediaStreamRef.current?.getTracks()?.forEach((track) => track.stop());
          mediaStreamRef.current = null;
          mediaRecorderRef.current = null;
          gravacaoChunksRef.current = [];
          return;
        }

        setArquivoAudio(audioFile);
        setAudioPreviewUrl(previewUrl);
        setGravandoAudio(false);
        setPreparandoGravacao(false);

        mediaStreamRef.current?.getTracks()?.forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        gravacaoChunksRef.current = [];

        void processarArquivoAudio(audioFile, { automatico: true });
      };

      mediaRecorder.start();
      setGravandoAudio(true);
      setPreparandoGravacao(false);

      cronometroRef.current = window.setInterval(() => {
        setDuracaoGravacao((atual) => atual + 1);
      }, 1000);
    } catch (err) {
      console.error('Erro ao iniciar gravacao no Pedido IA:', err);
      mediaStreamRef.current?.getTracks()?.forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      gravacaoChunksRef.current = [];
      setPreparandoGravacao(false);
      setGravandoAudio(false);
      setFeedback({
        tipo: 'error',
        texto: 'Nao foi possivel acessar o microfone. Libere a permissao no navegador e tente novamente.'
      });
    }
  };

  const pararGravacao = () => {
    if (!gravandoAudio || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
  };

  const descartarAudio = () => {
    setArquivoAudio(null);
    setDuracaoGravacao(0);

    if (audioPreviewUrl) {
      window.URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl('');
    }
  };

  const formatarDuracao = (totalSegundos) => {
    const minutos = Math.floor(totalSegundos / 60);
    const segundos = totalSegundos % 60;
    return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  };

  const atualizarCampo = (campo, valor) => {
    setPedido((anterior) => ({ ...anterior, [campo]: valor }));
    setPedidoCriadoInfo(null);
  };

  const atualizarCampoComanda = (indice, campo, valor) => {
    setPedido((anterior) => {
      const itens = anterior.itens.map((comanda, itemIndice) => (
        itemIndice === indice
          ? {
            ...comanda,
            [campo]: campo === 'nome' || campo === 'observacoes' ? valor : comanda[campo]
          }
          : comanda
      ));

      return { ...anterior, itens, total_comandas: itens.length };
    });

    setPedidoCriadoInfo(null);
  };

  const alternarItemComanda = (indice, campo, item) => {
    setPedido((anterior) => {
      const itens = anterior.itens.map((comanda, itemIndice) => {
        if (itemIndice !== indice) return comanda;

        const listaAtual = comanda[campo] || [];
        const jaSelecionado = listaAtual.some((valor) => normalizarChave(valor) === normalizarChave(item));
        const proximaLista = jaSelecionado
          ? listaAtual.filter((valor) => normalizarChave(valor) !== normalizarChave(item))
          : campo === 'complementos'
            ? ordenarListaPorReferencia([...listaAtual, item], COMPLEMENTOS)
            : [...listaAtual, item];

        return {
          ...comanda,
          [campo]: proximaLista
        };
      });

      return { ...anterior, itens, total_comandas: itens.length };
    });

    setPedidoCriadoInfo(null);
  };

  const adicionarComanda = () => {
    setPedido((anterior) => {
      const itens = [...anterior.itens, criarComandaVazia()];
      return { ...anterior, itens, total_comandas: itens.length };
    });
    setPedidoCriadoInfo(null);
  };

  const removerComanda = (indice) => {
    setPedido((anterior) => {
      const itens = anterior.itens.filter((_, itemIndice) => itemIndice !== indice);
      return { ...anterior, itens, total_comandas: itens.length };
    });
    setPedidoCriadoInfo(null);
  };

  const limparTudo = () => {
    if (gravandoAudio && mediaRecorderRef.current) {
      descartarAoPararRef.current = true;
      mediaRecorderRef.current.stop();
    }

    setMensagemTexto('');
    descartarAudio();
    setPedido(criarPedidoVazio());
    setResultadoDisponivel(false);
    setFeedback(null);
    setPedidoCriadoInfo(null);
  };

  const imprimirChecklist = () => {
    const comandasValidas = pedido.itens.filter(temConteudoComanda);

    if (!comandasValidas.length) {
      setFeedback({
        tipo: 'error',
        texto: 'Nao existe nenhuma comanda valida para imprimir.'
      });
      return;
    }

    try {
      abrirImpressaoComandasChecklist(
        comandasValidas.map((comanda, indice) => montarDadosImpressaoComanda(pedido, comanda, indice, comandasValidas.length))
      );

      setFeedback({
        tipo: 'success',
        texto: `${comandasValidas.length} comandas enviadas para impressao.`
      });
    } catch {
      setFeedback({
        tipo: 'error',
        texto: 'Nao foi possivel abrir a impressao. Verifique o bloqueador de pop-up do navegador.'
      });
    }
  };

  const enviarParaFluxoEmpresa = async () => {
    if (pedidoCriadoInfo?.id) {
      setFeedback({
        tipo: 'success',
        texto: `Pedido empresarial #${pedidoCriadoInfo.id} ja foi criado.`
      });
      return;
    }

    if (!empresaSelecionadaId) {
      setFeedback({
        tipo: 'error',
        texto: 'Selecione a empresa destino antes de enviar.'
      });
      return;
    }

    if (!normalizarCampo(pedido.endereco)) {
      setFeedback({
        tipo: 'error',
        texto: 'Preencha o endereco antes de enviar para o fluxo empresarial.'
      });
      return;
    }

    const comandasValidas = pedido.itens.filter(temConteudoComanda);

    if (!comandasValidas.length) {
      setFeedback({
        tipo: 'error',
        texto: 'Nao existe nenhuma comanda valida para criar no fluxo empresarial.'
      });
      return;
    }

    const existeComandaSemItens = comandasValidas.some((comanda) => !montarItensPedidoEmpresa(comanda).length);
    if (existeComandaSemItens) {
      setFeedback({
        tipo: 'error',
        texto: 'Cada comanda precisa ter ao menos um item marcado antes do envio.'
      });
      return;
    }

    const pedidoParaEnvio = {
      ...pedido,
      itens: comandasValidas,
      total_comandas: comandasValidas.length
    };

    setEnviandoFluxo(true);
    setFeedback(null);

    try {
      const { data } = await pedidoEmpresaAPI.criar({
        empresaId: Number(empresaSelecionadaId),
        lotes: comandasValidas.map((comanda) => ({
          itens: montarItensPedidoEmpresa(comanda),
          quantidade: 1,
          endereco: normalizarCampo(pedido.endereco),
          nomes: normalizarCampo(comanda.nome) ? [normalizarCampo(comanda.nome)] : null
        })),
        totalPedidosDia: comandasValidas.length,
        observacao: montarObservacaoFluxoEmpresa(pedidoParaEnvio)
      });

      setPedidoCriadoInfo({
        id: data?.id,
        status: data?.status || 'ENVIADO',
        empresaNome: data?.empresa?.nome || empresaSelecionada?.nome || '',
        totalComandas: comandasValidas.length
      });
      setFeedback({
        tipo: 'success',
        texto: `Pedido empresarial #${data?.id} criado com ${comandasValidas.length} comandas e status ${data?.status || 'ENVIADO'}.`
      });
    } catch (err) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.erro || 'Nao foi possivel criar o pedido no fluxo empresarial.'
      });
    } finally {
      setEnviandoFluxo(false);
    }
  };

  return (
    <div className="pedido-ia-page" id="pedido-ia-page">
      <section className="pedido-ia-hero">
        <div>
          <span className="pedido-ia-badge"><FiCpu size={14} /> Fluxo empresarial</span>
          <h1>Pedido por IA</h1>
          <p>
            Cole mensagens do WhatsApp ou envie um audio para a IA estruturar o pedido.
            Agora cada pessoa vira uma comanda individual em <code>pedido.itens</code>,
            sem juntar varios pedidos na mesma impressao.
          </p>
        </div>
        <div className="pedido-ia-summary">
          <span>Comandas detectadas</span>
          <strong>{totalComandas}</strong>
          <small>{totalMarcados} itens marcados nas comandas atuais</small>
        </div>
      </section>

      {feedback && (
        <div className={`pedido-ia-feedback ${feedback.tipo}`} role="status">
          {feedback.texto}
        </div>
      )}

      <div className="pedido-ia-grid">
        <section className="pedido-ia-card">
          <div className="pedido-ia-card-header">
            <h2><FiFileText size={18} /> Entrada por texto</h2>
            <span>Cole a mensagem do cliente</span>
          </div>

          <label className="form-label" htmlFor="pedido-ia-texto">Mensagem</label>
          <textarea
            id="pedido-ia-texto"
            className="pedido-ia-textarea"
            value={mensagemTexto}
            onChange={(e) => setMensagemTexto(e.target.value)}
            placeholder="Ex: 1 Paulo baiao ovo e salada&#10;2 Everson assado creme pouco arroz batata vinagrete maca&#10;3 Isabele arroz macarrao farofa"
            rows={11}
          />

          <button
            type="button"
            className="btn btn-primary"
            onClick={organizarTexto}
            disabled={carregandoTexto || carregandoAudio}
            id="btn-organizar-pedido-ia-texto"
          >
            {carregandoTexto ? <FiRefreshCw className="spin" size={16} /> : <FiCpu size={16} />}
            Organizar pedido
          </button>
        </section>

        <section className="pedido-ia-card">
          <div className="pedido-ia-card-header">
            <h2><FiMic size={18} /> Entrada por audio</h2>
            <span>Gravacao, upload e transcricao</span>
          </div>

          {gravandoAudio && (
            <div className="pedido-ia-recording-indicator" role="status" aria-live="polite">
              <span className="pedido-ia-recording-dot"></span>
              <strong>Microfone ouvindo agora</strong>
              <small>Gravando pedido em tempo real - {formatarDuracao(duracaoGravacao)}</small>
            </div>
          )}

          <label className="pedido-ia-upload" htmlFor="pedido-ia-audio">
            <FiUploadCloud size={18} />
            <span>{arquivoAudio ? arquivoAudio.name : 'Selecionar arquivo de audio'}</span>
          </label>
          <input
            id="pedido-ia-audio"
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const arquivoSelecionado = e.target.files?.[0] || null;

              if (audioPreviewUrl) {
                window.URL.revokeObjectURL(audioPreviewUrl);
                setAudioPreviewUrl('');
              }

              setArquivoAudio(arquivoSelecionado);
              setDuracaoGravacao(0);
            }}
          />

          <div className="pedido-ia-audio-actions">
            <button
              type="button"
              className={`btn ${gravandoAudio ? 'btn-danger' : 'btn-secondary'}`}
              onClick={gravandoAudio ? pararGravacao : iniciarGravacao}
              disabled={!suporteGravacao || preparandoGravacao || carregandoAudio}
              id={gravandoAudio ? 'btn-parar-gravacao-pedido-ia' : 'btn-gravar-pedido-ia'}
            >
              {preparandoGravacao ? (
                <>
                  <FiRefreshCw className="spin" size={16} /> Preparando microfone...
                </>
              ) : gravandoAudio ? (
                <>
                  <FiPauseCircle size={16} /> Parar gravacao ({formatarDuracao(duracaoGravacao)})
                </>
              ) : (
                <>
                  <FiMic size={16} /> Gravar pedido agora
                </>
              )}
            </button>

            {arquivoAudio && !gravandoAudio && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={descartarAudio}
                disabled={carregandoAudio}
                id="btn-descartar-audio-pedido-ia"
              >
                <FiTrash2 size={16} /> Limpar audio
              </button>
            )}
          </div>

          {!suporteGravacao && (
            <div className="pedido-ia-audio-warning">
              Seu navegador nao oferece gravacao direta aqui. Use o upload do audio gravado no celular ou computador.
            </div>
          )}

          {audioPreviewUrl && (
            <div className="pedido-ia-audio-preview">
              <span>Audio pronto para transcrever</span>
              <audio controls src={audioPreviewUrl} />
            </div>
          )}

          <div className="pedido-ia-audio-hint">
            No PC ou no celular, voce pode gravar pelo microfone ou enviar um arquivo. Formatos comuns como MP3, WAV, M4A e WEBM sao aceitos.
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={organizarAudio}
            disabled={carregandoTexto || carregandoAudio || gravandoAudio || !arquivoAudio}
            id="btn-organizar-pedido-ia-audio"
          >
            {carregandoAudio ? <FiRefreshCw className="spin" size={16} /> : <FiMic size={16} />}
            Transcrever e organizar
          </button>
        </section>
      </div>

      {resultadoDisponivel && (
        <section className="pedido-ia-card pedido-ia-resultado">
          <div className="pedido-ia-card-header">
            <h2>Conferencia editavel</h2>
            <span>Revise cada comanda antes de enviar para Pedidos Empresas</span>
          </div>

          <div className="pedido-ia-flow-box">
            <div className="pedido-ia-flow-header">
              <div>
                <strong><FiTruck size={16} /> Destino no fluxo empresarial</strong>
                <p>Este envio cria 1 pedido empresarial com {totalComandas} lotes e {totalComandas} comandas individuais.</p>
              </div>
              <span className="pedido-ia-flow-status">
                ENVIADO {'>'} AUTORIZADO {'>'} IMPRESSO
              </span>
            </div>

            <div className="pedido-ia-flow-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="pedido-ia-empresa">Empresa destino</label>
                <select
                  id="pedido-ia-empresa"
                  className="form-select pedido-ia-select"
                  value={empresaSelecionadaId}
                  onChange={(e) => {
                    setEmpresaSelecionadaId(e.target.value);
                    setPedidoCriadoInfo(null);
                  }}
                  disabled={carregandoEmpresas || enviandoFluxo || !empresas.length}
                >
                  <option value="">
                    {carregandoEmpresas ? 'Carregando empresas...' : 'Selecione uma empresa'}
                  </option>
                  {empresas.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nome} ({empresa.sigla || 'SEM SIGLA'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pedido-ia-total-box">
                <span>Total de comandas</span>
                <strong>{totalComandas}</strong>
                <small>Esse total acompanha pedido.itens.length</small>
              </div>

              {pedidoCriadoInfo && (
                <div className="pedido-ia-created-box">
                  <span>Pedido criado</span>
                  <strong>#{pedidoCriadoInfo.id}</strong>
                  <small>{pedidoCriadoInfo.empresaNome || 'Empresa selecionada'} - {pedidoCriadoInfo.status} - {pedidoCriadoInfo.totalComandas} comandas</small>
                </div>
              )}
            </div>
          </div>

          <div className="pedido-ia-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="pedido-ia-nome">Contato / responsavel</label>
              <input
                id="pedido-ia-nome"
                className="form-input"
                value={pedido.nome}
                onChange={(e) => atualizarCampo('nome', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pedido-ia-telefone">Telefone</label>
              <input
                id="pedido-ia-telefone"
                className="form-input"
                value={pedido.telefone}
                onChange={(e) => atualizarCampo('telefone', e.target.value)}
              />
            </div>

            <div className="form-group full">
              <label className="form-label" htmlFor="pedido-ia-endereco">Endereco</label>
              <input
                id="pedido-ia-endereco"
                className="form-input"
                value={pedido.endereco}
                onChange={(e) => atualizarCampo('endereco', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pedido-ia-pagamento">Pagamento</label>
              <input
                id="pedido-ia-pagamento"
                className="form-input"
                value={pedido.pagamento}
                onChange={(e) => atualizarCampo('pagamento', e.target.value)}
              />
            </div>

            <div className="form-group full">
              <label className="form-label" htmlFor="pedido-ia-observacoes">Observacoes gerais</label>
              <textarea
                id="pedido-ia-observacoes"
                className="pedido-ia-textarea pedido-ia-textarea-sm"
                value={pedido.observacoes}
                onChange={(e) => atualizarCampo('observacoes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="pedido-ia-comandas-header">
            <div>
              <h3>Comandas individuais</h3>
              <p>Total de comandas: {totalComandas}</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={adicionarComanda}
              id="btn-adicionar-comanda-pedido-ia"
            >
              <FiPlus size={16} /> Adicionar comanda
            </button>
          </div>

          <div className="pedido-ia-comandas-grid">
            {pedido.itens.map((comanda, indice) => (
              <article className="pedido-ia-comanda-card" key={`pedido-ia-comanda-${indice}`}>
                <div className="pedido-ia-comanda-topo">
                  <div>
                    <span className="pedido-ia-comanda-index">Comanda {indice + 1} de {totalComandas}</span>
                    <strong>{normalizarCampo(comanda.nome) || 'Sem nome informado'}</strong>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary pedido-ia-comanda-remove"
                    onClick={() => removerComanda(indice)}
                    disabled={enviandoFluxo}
                    id={`btn-remover-comanda-pedido-ia-${indice + 1}`}
                  >
                    <FiTrash2 size={15} /> Remover
                  </button>
                </div>

                <div className="pedido-ia-form-grid pedido-ia-comanda-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor={`pedido-ia-comanda-nome-${indice}`}>Nome</label>
                    <input
                      id={`pedido-ia-comanda-nome-${indice}`}
                      className="form-input"
                      value={comanda.nome}
                      onChange={(e) => atualizarCampoComanda(indice, 'nome', e.target.value)}
                    />
                  </div>

                  <div className="form-group full">
                    <label className="form-label" htmlFor={`pedido-ia-comanda-obs-${indice}`}>Observacoes da comanda</label>
                    <textarea
                      id={`pedido-ia-comanda-obs-${indice}`}
                      className="pedido-ia-textarea pedido-ia-textarea-sm"
                      value={comanda.observacoes}
                      onChange={(e) => atualizarCampoComanda(indice, 'observacoes', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <div className="pedido-ia-comanda-listas">
                  <div>
                    <h4>Proteinas</h4>
                    <div className="pedido-ia-check-grid">
                      {PROTEINAS.map((item) => (
                        <CheckboxVerde
                          key={`${item}-${indice}-proteina`}
                          id={`pedido-ia-comanda-${indice}-proteina-${normalizarChave(item)}`}
                          label={item}
                          selecionado={comanda.proteinas.some((valor) => normalizarChave(valor) === normalizarChave(item))}
                          onChange={() => alternarItemComanda(indice, 'proteinas', item)}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4>Complementos</h4>
                    <div className="pedido-ia-check-grid">
                      {COMPLEMENTOS.map((item) => (
                        <CheckboxVerde
                          key={`${item}-${indice}-complemento`}
                          id={`pedido-ia-comanda-${indice}-complemento-${normalizarChave(item)}`}
                          label={item}
                          selecionado={comanda.complementos.some((valor) => normalizarChave(valor) === normalizarChave(item))}
                          onChange={() => alternarItemComanda(indice, 'complementos', item)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {!pedido.itens.length && (
            <div className="pedido-ia-empty-state">
              Nenhuma comanda detectada ainda. Adicione uma comanda manualmente para continuar.
            </div>
          )}

          <div className="pedido-ia-actions">
            <button type="button" className="btn btn-secondary" onClick={limparTudo} id="btn-limpar-pedido-ia">
              <FiTrash2 size={16} /> Limpar
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={imprimirChecklist}
              id="btn-imprimir-pedido-ia"
            >
              <FiPrinter size={16} /> Imprimir {totalComandas || ''} comandas
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={enviarParaFluxoEmpresa}
              disabled={enviandoFluxo || carregandoEmpresas || !empresas.length || !!pedidoCriadoInfo?.id}
              id="btn-enviar-fluxo-empresa-pedido-ia"
            >
              {enviandoFluxo ? (
                <>
                  <FiRefreshCw className="spin" size={16} /> Enviando...
                </>
              ) : pedidoCriadoInfo?.id ? (
                <>
                  <FiTruck size={16} /> Pedido empresarial criado
                </>
              ) : (
                <>
                  <FiSend size={16} /> Enviar {totalComandas || 0} comandas para Pedidos Empresas
                </>
              )}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
