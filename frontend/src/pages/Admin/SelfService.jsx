import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiCheck,
  FiCopy,
  FiEye,
  FiFilter,
  FiX
} from 'react-icons/fi';
import SelfServiceReceipt from '../../components/SelfServiceReceipt';
import { selfServiceAPI } from '../../services/api';
import {
  formatarDataHora,
  formatarMoeda,
  formatarWhatsApp,
  obterClasseStatusSelfService,
  obterTextoStatusSelfService
} from '../../utils/selfService';

function dataHojeISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export default function SelfService() {
  const [reservas, setReservas] = useState([]);
  const [filtroData, setFiltroData] = useState(() => dataHojeISO());
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState(null);
  const [comprovanteAberto, setComprovanteAberto] = useState(null);
  const componenteMontadoRef = useRef(false);
  const carregandoRef = useRef(false);

  useEffect(() => {
    componenteMontadoRef.current = true;
    return () => {
      componenteMontadoRef.current = false;
    };
  }, []);

  const carregar = useCallback(async (silencioso = false) => {
    if (carregandoRef.current) return;

    carregandoRef.current = true;
    if (!silencioso && componenteMontadoRef.current) {
      setCarregando(true);
    }

    try {
      const { data } = await selfServiceAPI.listar({
        data: filtroData,
        status: filtroStatus || undefined,
        busca: busca || undefined
      });

      if (!componenteMontadoRef.current) return;
      setReservas(data || []);
    } catch (err) {
      console.error('Erro ao carregar reservas self-service:', err);
      if (componenteMontadoRef.current) {
        setMensagem({
          tipo: 'error',
          texto: err.response?.data?.erro || 'Nao foi possivel carregar as reservas self-service.'
        });
      }
    } finally {
      if (!silencioso && componenteMontadoRef.current) {
        setCarregando(false);
      }
      carregandoRef.current = false;
    }
  }, [busca, filtroData, filtroStatus]);

  useEffect(() => {
    const initTimer = window.setTimeout(() => {
      void carregar();
    }, 0);

    const intervalo = window.setInterval(() => {
      carregar(true);
    }, 8000);

    return () => {
      window.clearTimeout(initTimer);
      window.clearInterval(intervalo);
    };
  }, [carregar]);

  const totais = useMemo(() => ({
    aguardando: reservas.filter((item) => item.status === 'AGUARDANDO_PAGAMENTO').length,
    pago: reservas.filter((item) => item.status === 'PAGO').length,
    retirado: reservas.filter((item) => item.status === 'RETIRADO').length,
    cancelado: reservas.filter((item) => item.status === 'CANCELADO').length
  }), [reservas]);

  const copiarCodigo = async (codigo) => {
    if (!codigo) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(codigo);
      } else {
        const campo = document.createElement('textarea');
        campo.value = codigo;
        campo.setAttribute('readonly', '');
        campo.style.position = 'fixed';
        campo.style.opacity = '0';
        document.body.appendChild(campo);
        campo.select();
        document.execCommand('copy');
        document.body.removeChild(campo);
      }

      setMensagem({ tipo: 'success', texto: 'Codigo copiado.' });
    } catch {
      setMensagem({ tipo: 'error', texto: 'Nao foi possivel copiar o codigo.' });
    }
  };

  const marcarRetirado = async (reserva) => {
    try {
      const { data } = await selfServiceAPI.marcarRetirado(reserva.id);
      setReservas((atual) => atual.map((item) => (item.id === data.id ? data : item)));
      setMensagem({ tipo: 'success', texto: `Reserva ${data.codigoRetirada} marcada como retirada.` });
    } catch (err) {
      setMensagem({
        tipo: 'error',
        texto: err.response?.data?.erro || 'Nao foi possivel marcar a reserva como retirada.'
      });
    }
  };

  const descricaoComprovanteIndisponivel = (reserva) => {
    if (!reserva) {
      return 'O comprovante ainda nao esta disponivel.';
    }

    if (reserva.status === 'AGUARDANDO_PAGAMENTO') {
      return 'O comprovante so fica disponivel depois que o pagamento Pix e aprovado.';
    }

    if (reserva.status === 'CANCELADO') {
      return 'Esta reserva foi cancelada e nao possui comprovante liberado.';
    }

    return 'O comprovante ainda nao esta disponivel para esta reserva.';
  };

  if (carregando) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  return (
    <div id="self-service-admin">
      {mensagem && (
        <div className={`toast toast-${mensagem.tipo}`}>
          {mensagem.texto}
        </div>
      )}

      <div className="admin-form-card">
        <div className="admin-form-card-header">
          <div>
            <h3>Reservas Self-service do Dia</h3>
            <p style={{ color: 'var(--cinza-600)', marginTop: '6px' }}>
              Consulte codigos de retirada, pagamentos aprovados e reservas ja retiradas.
            </p>
          </div>
        </div>

        <div className="dashboard-cards" style={{ marginBottom: '20px' }}>
          <div className="dash-card">
            <div className="dash-label">Aguardando pagamento</div>
            <div className="dash-value">{totais.aguardando}</div>
          </div>
          <div className="dash-card">
            <div className="dash-label">Pago</div>
            <div className="dash-value">{totais.pago}</div>
          </div>
          <div className="dash-card">
            <div className="dash-label">Retirado</div>
            <div className="dash-value">{totais.retirado}</div>
          </div>
          <div className="dash-card">
            <div className="dash-label">Cancelado</div>
            <div className="dash-value">{totais.cancelado}</div>
          </div>
        </div>

        <div className="admin-table-filters">
          <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
            <label className="form-label">Data</label>
            <input
              className="form-input"
              type="date"
              value={filtroData}
              onChange={(event) => setFiltroData(event.target.value)}
              id="filtro-self-service-data"
            />
          </div>

          <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={filtroStatus}
              onChange={(event) => setFiltroStatus(event.target.value)}
              id="filtro-self-service-status"
            >
              <option value="">Todos</option>
              <option value="AGUARDANDO_PAGAMENTO">Aguardando pagamento</option>
              <option value="PAGO">Pago</option>
              <option value="RETIRADO">Retirado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, minWidth: '280px', flex: 1 }}>
            <label className="form-label">Buscar</label>
            <input
              className="form-input"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Nome, WhatsApp ou codigo"
              id="filtro-self-service-busca"
            />
          </div>
        </div>
      </div>

      <div className="admin-table-wrapper">
        <div className="admin-table-header">
          <h3>Reservas encontradas</h3>
          <span className="badge badge-info">{reservas.length} registro(s)</span>
        </div>

        {reservas.length > 0 ? (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Cliente</th>
                  <th>WhatsApp</th>
                  <th>Prato</th>
                  <th>Taxa</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Compra</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((reserva) => (
                  <tr key={reserva.id}>
                    <td style={{ fontWeight: 700 }}>{reserva.codigoRetirada || '-'}</td>
                    <td>{reserva.nomeCliente}</td>
                    <td>{formatarWhatsApp(reserva.whatsapp)}</td>
                    <td>{reserva.resumoPrato || reserva.pratoEscolhido}</td>
                    <td>{formatarMoeda(reserva.taxaServico)}</td>
                    <td>{formatarMoeda(reserva.valorPago ?? reserva.valorTotal)}</td>
                    <td>
                      <span className={`badge badge-${obterClasseStatusSelfService(reserva.status)}`}>
                        {obterTextoStatusSelfService(reserva.status)}
                      </span>
                    </td>
                    <td>{formatarDataHora(reserva.createdAt)}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="table-action-btn table-action-edit"
                        onClick={() => setComprovanteAberto(reserva)}
                      >
                        <FiEye size={14} /> Ver comprovante
                      </button>
                      <button
                        type="button"
                        className="table-action-btn table-action-toggle is-active"
                        onClick={() => copiarCodigo(reserva.codigoRetirada)}
                        disabled={!reserva.codigoRetirada}
                      >
                        <FiCopy size={14} /> Copiar codigo
                      </button>
                      <button
                        type="button"
                        className="table-action-btn table-action-delete"
                        onClick={() => marcarRetirado(reserva)}
                        disabled={reserva.status !== 'PAGO'}
                      >
                        <FiCheck size={14} /> Marcar como retirado
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--cinza-400)' }}>
            <FiFilter size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <p>Nenhuma reserva self-service encontrada</p>
          </div>
        )}
      </div>

      {comprovanteAberto && (
        <div className="modal-overlay" onClick={() => setComprovanteAberto(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: '760px' }}>
            <div className="modal-header">
              <h3>Comprovante Self-service</h3>
              <button type="button" onClick={() => setComprovanteAberto(null)}>
                <FiX size={20} />
              </button>
            </div>

            <div className="modal-body">
              {comprovanteAberto.comprovante ? (
                <SelfServiceReceipt reserva={comprovanteAberto} />
              ) : (
                <div style={{ color: 'var(--cinza-600)' }}>
                  <p style={{ marginBottom: '8px' }}>
                    {descricaoComprovanteIndisponivel(comprovanteAberto)}
                  </p>
                  <p>
                    <strong>Status atual:</strong> {obterTextoStatusSelfService(comprovanteAberto.status)}
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {comprovanteAberto.codigoRetirada && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => copiarCodigo(comprovanteAberto.codigoRetirada)}
                >
                  <FiCopy size={16} /> Copiar codigo
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={() => setComprovanteAberto(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
