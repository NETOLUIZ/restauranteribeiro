import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FiCpu,
  FiFileText,
  FiMic,
  FiPauseCircle,
  FiPrinter,
  FiRefreshCw,
  FiSend,
  FiTrash2,
  FiTruck,
  FiUploadCloud
} from 'react-icons/fi';
import CheckboxVerde from '../../components/CheckboxVerde';
import { aiOrderAPI, empresaAPI, pedidoEmpresaAPI } from '../../services/api';
import { abrirImpressaoComandaChecklist } from '../../utils/comandaChecklistPrint';
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
  'Vinagrete'
];

const criarPedidoVazio = () => ({
  nome: '',
  telefone: '',
  endereco: '',
  pagamento: '',
  observacoes: '',
  proteinas: [],
  complementos: []
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

const ordenarListaPorReferencia = (lista = [], referencia = []) => {
  const posicoes = new Map(referencia.map((item, indice) => [normalizarChave(item), indice]));

  return [...lista].sort((a, b) => {
    const posicaoA = posicoes.get(normalizarChave(a));
    const posicaoB = posicoes.get(normalizarChave(b));
    return (posicaoA ?? Number.MAX_SAFE_INTEGER) - (posicaoB ?? Number.MAX_SAFE_INTEGER);
  });
};

const normalizarPedidoRecebido = (pedido = {}) => {
  const proteinasSet = new Set(PROTEINAS.map((item) => normalizarChave(item)));
  const complementosSet = new Set(COMPLEMENTOS.map((item) => normalizarChave(item)));

  const filtrarLista = (lista, setPermitido) =>
    Array.isArray(lista)
      ? lista.filter((item) => setPermitido.has(normalizarChave(item)))
      : [];

  return {
    nome: normalizarCampo(pedido?.nome || ''),
    telefone: normalizarCampo(pedido?.telefone || ''),
    endereco: normalizarCampo(pedido?.endereco || ''),
    pagamento: normalizarCampo(pedido?.pagamento || ''),
    observacoes: normalizarCampo(pedido?.observacoes || ''),
    proteinas: filtrarLista(pedido?.proteinas, proteinasSet),
    complementos: ordenarListaPorReferencia(
      filtrarLista(pedido?.complementos, complementosSet),
      COMPLEMENTOS
    )
  };
};

const montarItensPedidoEmpresa = (pedido = {}) => [
  ...(pedido.proteinas || []).map((nome) => ({ nome, tipo: 'PROTEINA' })),
  ...(pedido.complementos || []).map((nome) => ({ nome, tipo: 'COMPLEMENTO' }))
];

const montarObservacaoFluxoEmpresa = (pedido = {}) => {
  const partes = ['Origem: Pedido por IA'];

  if (normalizarCampo(pedido.telefone)) {
    partes.push(`Tel: ${normalizarCampo(pedido.telefone)}`);
  }

  if (normalizarCampo(pedido.pagamento)) {
    partes.push(`Pgto: ${normalizarCampo(pedido.pagamento)}`);
  }

  if (normalizarCampo(pedido.observacoes)) {
    partes.push(`Obs: ${normalizarCampo(pedido.observacoes)}`);
  }

  return partes.join(' | ');
};

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

  const totalMarcados = useMemo(
    () => pedido.proteinas.length + pedido.complementos.length,
    [pedido.complementos.length, pedido.proteinas.length]
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
    setPedido(normalizarPedidoRecebido(data));
    setResultadoDisponivel(true);
    setPedidoCriadoInfo(null);
    setFeedback({
      tipo: 'success',
      texto: tipoOrigem === 'audio'
        ? 'Audio transcrito e pedido organizado com sucesso.'
        : 'Pedido organizado com sucesso.'
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

  const alternarItem = (campo, item) => {
    setPedido((anterior) => {
      const listaAtual = anterior[campo] || [];
      const jaSelecionado = listaAtual.some((valor) => normalizarChave(valor) === normalizarChave(item));

      return {
        ...anterior,
        [campo]: jaSelecionado
          ? listaAtual.filter((valor) => normalizarChave(valor) !== normalizarChave(item))
          : campo === 'complementos'
            ? ordenarListaPorReferencia([...listaAtual, item], COMPLEMENTOS)
            : [...listaAtual, item]
      };
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
    if (totalMarcados === 0) {
      setFeedback({
        tipo: 'error',
        texto: 'Marque ao menos um item antes de imprimir a comanda.'
      });
      return;
    }

    try {
      abrirImpressaoComandaChecklist({
        tituloJanela: 'Pedido por IA',
        nome: pedido.nome,
        telefone: pedido.telefone,
        endereco: pedido.endereco,
        pagamento: pedido.pagamento,
        observacoes: pedido.observacoes,
        itensProteina: PROTEINAS,
        itensComplemento: COMPLEMENTOS,
        proteinasSelecionadas: pedido.proteinas,
        complementosSelecionados: pedido.complementos
      });

      setFeedback({ tipo: 'success', texto: 'Checklist enviado para impressao.' });
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

    const itens = montarItensPedidoEmpresa(pedido);

    if (!itens.length) {
      setFeedback({
        tipo: 'error',
        texto: 'Selecione ao menos um item antes de criar o pedido empresarial.'
      });
      return;
    }

    setEnviandoFluxo(true);
    setFeedback(null);

    try {
      const { data } = await pedidoEmpresaAPI.criar({
        empresaId: Number(empresaSelecionadaId),
        lotes: [
          {
            itens,
            quantidade: 1,
            endereco: normalizarCampo(pedido.endereco),
            nomes: normalizarCampo(pedido.nome) ? [normalizarCampo(pedido.nome)] : null
          }
        ],
        totalPedidosDia: 1,
        observacao: montarObservacaoFluxoEmpresa(pedido)
      });

      setPedidoCriadoInfo({
        id: data?.id,
        status: data?.status || 'ENVIADO',
        empresaNome: data?.empresa?.nome || empresaSelecionada?.nome || ''
      });
      setFeedback({
        tipo: 'success',
        texto: `Pedido empresarial #${data?.id} criado com status ${data?.status || 'ENVIADO'}. Agora ele segue o mesmo fluxo de Pedidos Empresas.`
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
            Depois da conferencia, o pedido entra no mesmo fluxo de Pedidos Empresas:
            ENVIADO, AUTORIZADO e IMPRESSO.
          </p>
        </div>
        <div className="pedido-ia-summary">
          <span>Itens marcados</span>
          <strong>{totalMarcados}</strong>
          <small>1 lote / 1 refeicao por envio</small>
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
            placeholder="Ex: Quero uma quentinha de frango com baiao, feijao e macarrao. Entrega na Rua 10, numero 55. Pix."
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
              <small>Gravando pedido em tempo real • {formatarDuracao(duracaoGravacao)}</small>
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
            <span>Revise antes de enviar para Pedidos Empresas</span>
          </div>

          <div className="pedido-ia-flow-box">
            <div className="pedido-ia-flow-header">
              <div>
                <strong><FiTruck size={16} /> Destino no fluxo empresarial</strong>
                <p>Este envio cria 1 pedido empresarial com 1 lote e 1 refeicao.</p>
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

              {pedidoCriadoInfo && (
                <div className="pedido-ia-created-box">
                  <span>Pedido criado</span>
                  <strong>#{pedidoCriadoInfo.id}</strong>
                  <small>{pedidoCriadoInfo.empresaNome || 'Empresa selecionada'} - {pedidoCriadoInfo.status}</small>
                </div>
              )}
            </div>
          </div>

          <div className="pedido-ia-form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="pedido-ia-nome">Nome</label>
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
              <label className="form-label" htmlFor="pedido-ia-observacoes">Observacoes</label>
              <textarea
                id="pedido-ia-observacoes"
                className="pedido-ia-textarea pedido-ia-textarea-sm"
                value={pedido.observacoes}
                onChange={(e) => atualizarCampo('observacoes', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="pedido-ia-listas">
            <div>
              <h3>Proteinas</h3>
              <div className="pedido-ia-check-grid">
                {PROTEINAS.map((item) => (
                  <CheckboxVerde
                    key={item}
                    id={`pedido-ia-proteina-${normalizarChave(item)}`}
                    label={item}
                    selecionado={pedido.proteinas.some((valor) => normalizarChave(valor) === normalizarChave(item))}
                    onChange={() => alternarItem('proteinas', item)}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3>Complementos</h3>
              <div className="pedido-ia-check-grid">
                {COMPLEMENTOS.map((item) => (
                  <CheckboxVerde
                    key={item}
                    id={`pedido-ia-complemento-${normalizarChave(item)}`}
                    label={item}
                    selecionado={pedido.complementos.some((valor) => normalizarChave(valor) === normalizarChave(item))}
                    onChange={() => alternarItem('complementos', item)}
                  />
                ))}
              </div>
            </div>
          </div>

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
              <FiPrinter size={16} /> Imprimir checklist
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
                  <FiSend size={16} /> Enviar para Pedidos Empresas
                </>
              )}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
