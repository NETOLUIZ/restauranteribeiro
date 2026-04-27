import { useMemo, useState } from 'react';
import { FiCpu, FiFileText, FiMic, FiPrinter, FiRefreshCw, FiTrash2, FiUploadCloud } from 'react-icons/fi';
import CheckboxVerde from '../../components/CheckboxVerde';
import { aiOrderAPI } from '../../services/api';
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
    nome: String(pedido?.nome || '').trim(),
    telefone: String(pedido?.telefone || '').trim(),
    endereco: String(pedido?.endereco || '').trim(),
    pagamento: String(pedido?.pagamento || '').trim(),
    observacoes: String(pedido?.observacoes || '').trim(),
    proteinas: filtrarLista(pedido?.proteinas, proteinasSet),
    complementos: ordenarListaPorReferencia(
      filtrarLista(pedido?.complementos, complementosSet),
      COMPLEMENTOS
    )
  };
};

export default function PedidoIA() {
  const [mensagemTexto, setMensagemTexto] = useState('');
  const [arquivoAudio, setArquivoAudio] = useState(null);
  const [pedido, setPedido] = useState(() => criarPedidoVazio());
  const [resultadoDisponivel, setResultadoDisponivel] = useState(false);
  const [carregandoTexto, setCarregandoTexto] = useState(false);
  const [carregandoAudio, setCarregandoAudio] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const totalMarcados = useMemo(
    () => pedido.proteinas.length + pedido.complementos.length,
    [pedido.complementos.length, pedido.proteinas.length]
  );

  const aplicarResultado = (data, tipoOrigem) => {
    setPedido(normalizarPedidoRecebido(data));
    setResultadoDisponivel(true);
    setFeedback({
      tipo: 'success',
      texto: tipoOrigem === 'audio'
        ? 'Audio transcrito e pedido organizado com sucesso.'
        : 'Pedido organizado com sucesso.'
    });
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
    if (!arquivoAudio) {
      setFeedback({ tipo: 'error', texto: 'Selecione um arquivo de audio antes de transcrever.' });
      return;
    }

    const formData = new FormData();
    formData.append('audio', arquivoAudio);

    setCarregandoAudio(true);
    setFeedback(null);

    try {
      const { data } = await aiOrderAPI.organizarAudio(formData);
      aplicarResultado(data, 'audio');
    } catch (err) {
      setFeedback({ tipo: 'error', texto: err.response?.data?.erro || 'Nao foi possivel transcrever o audio.' });
    } finally {
      setCarregandoAudio(false);
    }
  };

  const atualizarCampo = (campo, valor) => {
    setPedido((anterior) => ({ ...anterior, [campo]: valor }));
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
  };

  const limparTudo = () => {
    setMensagemTexto('');
    setArquivoAudio(null);
    setPedido(criarPedidoVazio());
    setResultadoDisponivel(false);
    setFeedback(null);
  };

  const confirmarEImprimir = () => {
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

      setFeedback({ tipo: 'success', texto: 'Comanda enviada para impressao.' });
    } catch {
      setFeedback({
        tipo: 'error',
        texto: 'Nao foi possivel abrir a impressao. Verifique o bloqueador de pop-up do navegador.'
      });
    }
  };

  return (
    <div className="pedido-ia-page" id="pedido-ia-page">
      <section className="pedido-ia-hero">
        <div>
          <span className="pedido-ia-badge"><FiCpu size={14} /> Novo modulo</span>
          <h1>Pedido por IA</h1>
          <p>
            Cole mensagens do WhatsApp ou envie um audio para a IA estruturar o pedido
            antes da impressao da comanda.
          </p>
        </div>
        <div className="pedido-ia-summary">
          <span>Itens marcados</span>
          <strong>{totalMarcados}</strong>
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
            placeholder="Ex: Quero uma quentinha de frango com baião, feijao e macarrao. Sem farofa. Entrega na Rua 10, numero 55. Pix."
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
            <span>Upload e transcricao</span>
          </div>

          <label className="pedido-ia-upload" htmlFor="pedido-ia-audio">
            <FiUploadCloud size={18} />
            <span>{arquivoAudio ? arquivoAudio.name : 'Selecionar arquivo de audio'}</span>
          </label>
          <input
            id="pedido-ia-audio"
            type="file"
            accept="audio/*"
            onChange={(e) => setArquivoAudio(e.target.files?.[0] || null)}
          />

          <div className="pedido-ia-audio-hint">
            Formatos comuns como MP3, WAV, M4A e WEBM sao aceitos.
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={organizarAudio}
            disabled={carregandoTexto || carregandoAudio}
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
            <span>Revise antes da impressao</span>
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
            <button type="button" className="btn btn-primary" onClick={confirmarEImprimir} id="btn-imprimir-pedido-ia">
              <FiPrinter size={16} /> Confirmar e imprimir
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
