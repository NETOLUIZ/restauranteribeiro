import { useState, useEffect } from 'react';
import { FiDollarSign, FiCheck } from 'react-icons/fi';
import { pedidoAvulsoAPI } from '../../services/api';

export default function ControleDinheiro() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState({});

  async function carregar() {
    try {
      const { data } = await pedidoAvulsoAPI.listar({ status: 'PENDENTE' });
      setPedidos(data.filter((pedido) => pedido.formaPagamento === 'DINHEIRO'));
    } catch (err) {
      console.error('Erro:', err);
    }
    setCarregando(false);
  }

  useEffect(() => {
    let ativo = true;

    pedidoAvulsoAPI.listar({ status: 'PENDENTE' })
      .then(({ data }) => {
        if (!ativo) return;
        setPedidos(data.filter((pedido) => pedido.formaPagamento === 'DINHEIRO'));
      })
      .catch((err) => {
        console.error('Erro:', err);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const confirmar = async (pedido) => {
    const dados = editando[pedido.id] || {};
    const valorTrocoInformado = String(dados.valorTroco || '').trim().replace(',', '.');
    const payload = {
      statusPagamento: 'CONFIRMADO',
      motoqueiro: dados.motoqueiro || ''
    };

    if (valorTrocoInformado) {
      payload.valorTroco = parseFloat(valorTrocoInformado) || 0;
    }

    try {
      await pedidoAvulsoAPI.atualizarStatus(pedido.id, payload);
      carregar();
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  const updateEdit = (id, field, value) => {
    setEditando((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  if (carregando) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div id="controle-dinheiro">
      <p style={{ color: 'var(--cinza-600)', marginBottom: '24px' }}>
        Pedidos em dinheiro pendentes de confirmacao. Confira o troco solicitado pelo cliente e ajuste se necessario antes de confirmar.
      </p>

      {pedidos.map((pedido) => (
        <div key={pedido.id} className="dinheiro-card" id={`dinheiro-${pedido.id}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div>
              <strong>Pedido #{pedido.id}</strong>
              <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: 'var(--cinza-500)' }}>
                {new Date(pedido.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>
            <span className="badge badge-warning">DINHEIRO</span>
          </div>

          <div style={{ fontSize: '0.9rem', color: 'var(--cinza-600)', marginBottom: '12px' }}>
            <p><strong>Cliente:</strong> {pedido.nomeCliente} | <strong>Tel:</strong> {pedido.telefone}</p>
            <p><strong>Endereco:</strong> {pedido.endereco}</p>
            <p><strong>Itens:</strong> {Array.isArray(pedido.itens) ? pedido.itens.map((item) => item.nome).join(', ') : '-'}</p>
            {pedido.valorTroco != null && <p><strong>Troco para:</strong> R$ {pedido.valorTroco.toFixed(2)}</p>}
          </div>

          <div className="dinheiro-form">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Motoqueiro</label>
              <input
                className="form-input"
                placeholder="Nome do motoqueiro"
                value={editando[pedido.id]?.motoqueiro || ''}
                onChange={(e) => updateEdit(pedido.id, 'motoqueiro', e.target.value)}
                id={`input-motoqueiro-${pedido.id}`}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Troco para (opcional)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={editando[pedido.id]?.valorTroco ?? (pedido.valorTroco != null ? String(pedido.valorTroco) : '')}
                onChange={(e) => updateEdit(pedido.id, 'valorTroco', e.target.value)}
                id={`input-troco-${pedido.id}`}
              />
            </div>
            <button className="btn btn-primary" onClick={() => confirmar(pedido)} id={`btn-confirmar-${pedido.id}`}>
              <FiCheck size={16} /> Confirmar
            </button>
          </div>
        </div>
      ))}

      {pedidos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--cinza-400)' }}>
          <FiDollarSign size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <p>Nenhum pedido em dinheiro pendente</p>
        </div>
      )}
    </div>
  );
}
