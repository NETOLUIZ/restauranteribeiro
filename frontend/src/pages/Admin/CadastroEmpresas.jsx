import { useState, useEffect } from 'react';
import { FiPlus, FiShoppingBag, FiX, FiUser, FiMapPin, FiPackage, FiSend } from 'react-icons/fi';
import CheckboxVerde from '../../components/CheckboxVerde';
import { empresaAPI, cardapioAPI, pedidoEmpresaAPI } from '../../services/api';

export default function CadastroEmpresas() {
  const [empresas, setEmpresas] = useState([]);
  const [cardapio, setCardapio] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [modalEmpresa, setModalEmpresa] = useState(false);
  const [modalEditar, setModalEditar] = useState(null);
  const [modalPedidoEmpresa, setModalPedidoEmpresa] = useState(null);

  const [formEmpresa, setFormEmpresa] = useState({ nome: '', sigla: '', senha: '', totalPedidos: 40 });
  const [formEditar, setFormEditar] = useState({ totalPedidos: 0 });
  const [quantidadeLote, setQuantidadeLote] = useState('1');
  const [enderecoLote, setEnderecoLote] = useState('');
  const [nomeAtual, setNomeAtual] = useState('');
  const [nomesLote, setNomesLote] = useState([]);
  const [lotesPedido, setLotesPedido] = useState([]);
  const [totalDiaInput, setTotalDiaInput] = useState('');
  const [mostrarInputNome, setMostrarInputNome] = useState(false);
  const [mensagemPedido, setMensagemPedido] = useState(null);
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [salvandoPedido, setSalvandoPedido] = useState(false);

  async function carregar() {
    try {
      const [empresasRes, cardapioRes] = await Promise.all([
        empresaAPI.listar(),
        cardapioAPI.listarAtivos()
      ]);
      setEmpresas(empresasRes.data || []);
      setCardapio(cardapioRes.data || []);
    } catch (err) {
      console.error('Erro:', err);
    }
    setCarregando(false);
  }

  useEffect(() => {
    let ativo = true;

    Promise.all([
      empresaAPI.listar(),
      cardapioAPI.listarAtivos()
    ])
      .then(([empresasRes, cardapioRes]) => {
        if (!ativo) return;
        setEmpresas(empresasRes.data || []);
        setCardapio(cardapioRes.data || []);
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

  const criarEmpresa = async () => {
    if (!formEmpresa.nome.trim() || !formEmpresa.sigla.trim() || !formEmpresa.senha.trim()) {
      alert('Preencha nome, sigla e senha da empresa.');
      return;
    }

    try {
      await empresaAPI.criar(formEmpresa);
      setFormEmpresa({ nome: '', sigla: '', senha: '', totalPedidos: 40 });
      setModalEmpresa(false);
      carregar();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao criar empresa');
    }
  };

  const abrirEditar = (empresa) => {
    setModalEditar(empresa);
    setFormEditar({ totalPedidos: empresa.totalPedidos || 0 });
  };

  const salvarEdicao = async () => {
    if (!modalEditar) return;

    try {
      await empresaAPI.atualizar(modalEditar.id, {
        totalPedidos: parseInt(formEditar.totalPedidos, 10) || 0
      });
      setModalEditar(null);
      carregar();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao atualizar total de pedidos');
    }
  };

  const abrirPedidoAdmin = (empresa) => {
    setModalPedidoEmpresa(empresa);
    setQuantidadeLote('1');
    setEnderecoLote('');
    setNomeAtual('');
    setNomesLote([]);
    setLotesPedido([]);
    setTotalDiaInput('');
    setMostrarInputNome(false);
    setMensagemPedido(null);
    setItensSelecionados([]);
  };

  const totalNosLotes = lotesPedido.reduce((soma, lote) => soma + lote.quantidade, 0);
  const totalDiaDigitado = totalDiaInput.trim() !== '' ? Math.max(0, parseInt(totalDiaInput, 10) || 0) : null;
  const totalDoDia = totalDiaDigitado === null ? totalNosLotes : Math.max(totalDiaDigitado, totalNosLotes);
  const falta = Math.max(totalDoDia - totalNosLotes, 0);

  const toggleItem = (item) => {
    setItensSelecionados((prev) =>
      prev.find((i) => i.id === item.id)
        ? prev.filter((i) => i.id !== item.id)
        : [...prev, item]
    );
  };

  const adicionarNome = () => {
    const qtdAtual = Math.max(1, parseInt(quantidadeLote, 10) || 1);
    if (!nomeAtual.trim()) return;
    if (nomesLote.length >= qtdAtual) {
      setMensagemPedido({ tipo: 'error', texto: `Limite de nomes atingido (${qtdAtual}).` });
      return;
    }
    setNomesLote((prev) => [...prev, nomeAtual.trim()]);
    setNomeAtual('');
  };

  const removerNome = (idx) => {
    setNomesLote((prev) => prev.filter((_, i) => i !== idx));
  };

  const adicionarLote = () => {
    const qtd = parseInt(quantidadeLote, 10);

    if (!itensSelecionados.length) {
      setMensagemPedido({ tipo: 'error', texto: 'Selecione pelo menos um item.' });
      return;
    }
    if (!enderecoLote.trim()) {
      setMensagemPedido({ tipo: 'error', texto: 'Informe o endereco de entrega.' });
      return;
    }
    if (!Number.isInteger(qtd) || qtd < 1) {
      setMensagemPedido({ tipo: 'error', texto: 'Quantidade invalida.' });
      return;
    }
    if (totalDiaDigitado !== null && totalNosLotes + qtd > totalDiaDigitado) {
      const excedente = totalNosLotes + qtd - totalDiaDigitado;
      setMensagemPedido({ tipo: 'error', texto: `Excede o total do dia em ${excedente}.` });
      return;
    }

    setLotesPedido((prev) => [
      ...prev,
      {
        itens: itensSelecionados.map((item) => ({
          id: item.id,
          nome: item.nome,
          tipo: item.tipo
        })),
        quantidade: qtd,
        endereco: enderecoLote.trim(),
        nomes: nomesLote.length > 0 ? nomesLote : null
      }
    ]);

    setItensSelecionados([]);
    setQuantidadeLote('1');
    setEnderecoLote('');
    setNomeAtual('');
    setNomesLote([]);
    setMostrarInputNome(false);
    setMensagemPedido({ tipo: 'success', texto: 'Lote adicionado com sucesso.' });
  };

  const removerLote = (idx) => {
    setLotesPedido((prev) => prev.filter((_, i) => i !== idx));
  };

  const criarPedidoAdmin = async () => {
    if (!modalPedidoEmpresa) return;

    if (!lotesPedido.length) {
      setMensagemPedido({ tipo: 'error', texto: 'Adicione pelo menos um lote.' });
      return;
    }

    if (totalDiaDigitado !== null && totalNosLotes !== totalDiaDigitado) {
      if (totalNosLotes < totalDiaDigitado) {
        setMensagemPedido({ tipo: 'error', texto: `Faltam ${totalDiaDigitado - totalNosLotes} pedidos para fechar o total do dia.` });
      } else {
        setMensagemPedido({ tipo: 'error', texto: 'Total do dia menor que os lotes cadastrados.' });
      }
      return;
    }

    const payload = {
      empresaId: modalPedidoEmpresa.id,
      lotes: lotesPedido,
      totalPedidosDia: totalDoDia
    };

    setSalvandoPedido(true);
    try {
      await pedidoEmpresaAPI.criar(payload);
      alert('Pedido criado com sucesso para a empresa.');
      setModalPedidoEmpresa(null);
      carregar();
    } catch (err) {
      setMensagemPedido({ tipo: 'error', texto: err.response?.data?.erro || 'Erro ao criar pedido para empresa' });
    }
    setSalvandoPedido(false);
  };

  if (carregando) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const proteinas = cardapio.filter((item) => item.tipo === 'PROTEINA');
  const complementos = cardapio.filter((item) => item.tipo === 'COMPLEMENTO');

  return (
    <div id="cadastro-empresas">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <p style={{ color: 'var(--cinza-600)' }}>Gerencie empresas e credenciais de acesso (sigla + senha)</p>
        <button className="btn btn-primary" onClick={() => setModalEmpresa(true)} id="btn-nova-empresa">
          <FiPlus size={18} /> Nova Empresa
        </button>
      </div>

      {modalEmpresa && (
        <div className="modal-overlay" onClick={() => setModalEmpresa(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Nova Empresa</h3>
              <button onClick={() => setModalEmpresa(false)} style={{ fontSize: '1.2rem', color: 'var(--cinza-500)' }}>x</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nome da Empresa</label>
                <input
                  className="form-input"
                  placeholder="Nome da empresa"
                  value={formEmpresa.nome}
                  onChange={e => setFormEmpresa({ ...formEmpresa, nome: e.target.value })}
                  id="input-nome-empresa"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Sigla (login da empresa)</label>
                <input
                  className="form-input"
                  placeholder="Ex: RIBEIRO"
                  value={formEmpresa.sigla}
                  onChange={e => setFormEmpresa({ ...formEmpresa, sigla: e.target.value.toUpperCase() })}
                  id="input-sigla-empresa"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Senha da Empresa</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Senha de acesso da empresa"
                  value={formEmpresa.senha}
                  onChange={e => setFormEmpresa({ ...formEmpresa, senha: e.target.value })}
                  id="input-senha-empresa"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Total de Pedidos Diarios</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  value={formEmpresa.totalPedidos}
                  onChange={e => setFormEmpresa({ ...formEmpresa, totalPedidos: parseInt(e.target.value, 10) || 1 })}
                  id="input-total-pedidos"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalEmpresa(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={criarEmpresa}>Criar Empresa</button>
            </div>
          </div>
        </div>
      )}

      {modalEditar && (
        <div className="modal-overlay" onClick={() => setModalEditar(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Total de Pedidos</h3>
              <button onClick={() => setModalEditar(null)} style={{ fontSize: '1.2rem', color: 'var(--cinza-500)' }}>x</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '12px', color: 'var(--cinza-600)' }}>
                Empresa: <strong>{modalEditar.nome}</strong>
              </p>
              <div className="form-group">
                <label className="form-label">Total de Pedidos Diarios</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  value={formEditar.totalPedidos}
                  onChange={e => setFormEditar({ totalPedidos: e.target.value })}
                  id="input-editar-total-pedidos"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalEditar(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarEdicao}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {modalPedidoEmpresa && (
        <div className="modal-overlay" onClick={() => setModalPedidoEmpresa(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '1040px' }}>
            <div className="modal-header">
              <h3>Fazer Pedido para {modalPedidoEmpresa.nome}</h3>
              <button onClick={() => setModalPedidoEmpresa(null)} style={{ fontSize: '1.2rem', color: 'var(--cinza-500)' }}>x</button>
            </div>

            <div className="modal-body">
              {mensagemPedido && (
                <div
                  style={{
                    marginBottom: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    background: mensagemPedido.tipo === 'error' ? 'var(--vermelho-light)' : mensagemPedido.tipo === 'warning' ? 'var(--amarelo-light)' : 'var(--verde-bg)',
                    color: mensagemPedido.tipo === 'error' ? 'var(--vermelho)' : mensagemPedido.tipo === 'warning' ? 'var(--amarelo)' : 'var(--verde-escuro)'
                  }}
                >
                  {mensagemPedido.texto}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '10px 14px',
                  border: '2px solid var(--verde-light)',
                  borderRadius: '12px',
                  marginBottom: '14px',
                  flexWrap: 'wrap',
                  background: 'var(--cinza-50)'
                }}
              >
                <div style={{ minWidth: '170px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--cinza-500)', textTransform: 'uppercase', marginBottom: '6px' }}>Total do Dia</div>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    value={totalDiaInput}
                    onChange={(e) => setTotalDiaInput(e.target.value)}
                    placeholder={modalPedidoEmpresa.totalPedidos ? `Padrao ${modalPedidoEmpresa.totalPedidos}` : 'Automatico'}
                    id="input-total-dia-admin"
                    style={{ height: '36px', textAlign: 'center', fontWeight: 700 }}
                  />
                </div>
                <div style={{ width: '1px', height: '40px', background: 'var(--cinza-300)' }}></div>
                <div style={{ textAlign: 'center', minWidth: '100px' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1, color: 'var(--verde-escuro)' }}>{totalNosLotes}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--cinza-500)', textTransform: 'uppercase' }}>Adicionados</div>
                </div>
                <div style={{ width: '1px', height: '40px', background: 'var(--cinza-300)' }}></div>
                <div
                  id="falta-pedidos-admin"
                  style={{
                    background: 'var(--amarelo-light)',
                    color: 'var(--amarelo)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontWeight: 700,
                    fontSize: '0.86rem'
                  }}
                >
                  {totalDiaDigitado === null ? `Total auto: ${totalDoDia}` : `Falta ${falta}`}
                </div>
              </div>

              <div className="pedido-admin-modal-layout">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ background: 'var(--cinza-50)', borderRadius: '12px', padding: '16px', border: '1px solid var(--cinza-200)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>Selecione os itens</h3>

                    {cardapio.length === 0 ? (
                      <p style={{ color: 'var(--cinza-500)' }}>Nenhum item ativo no cardapio.</p>
                    ) : (
                      <>
                        {proteinas.length > 0 && (
                          <>
                            <p style={{ fontSize: '0.8rem', color: 'var(--cinza-500)', marginBottom: '8px', fontWeight: 700 }}>PROTEINAS</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
                              {proteinas.map((item) => (
                                <CheckboxVerde
                                  key={item.id}
                                  id={`admin-item-${item.id}`}
                                  label={item.nome}
                                  selecionado={!!itensSelecionados.find((i) => i.id === item.id)}
                                  onChange={() => toggleItem(item)}
                                />
                              ))}
                            </div>
                          </>
                        )}

                        {complementos.length > 0 && (
                          <>
                            <p style={{ fontSize: '0.8rem', color: 'var(--cinza-500)', margin: '14px 0 8px', fontWeight: 700 }}>COMPLEMENTOS</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
                              {complementos.map((item) => (
                                <CheckboxVerde
                                  key={item.id}
                                  id={`admin-item-${item.id}`}
                                  label={item.nome}
                                  selecionado={!!itensSelecionados.find((i) => i.id === item.id)}
                                  onChange={() => toggleItem(item)}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  <div style={{ background: 'var(--cinza-50)', borderRadius: '12px', padding: '16px', border: '1px solid var(--cinza-200)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FiPackage /> Configurar lote
                    </h3>

                    <div className="form-row" style={{ marginBottom: '10px' }}>
                      <div className="form-group">
                        <label className="form-label">Quantidade</label>
                        <input
                          className="form-input"
                          type="number"
                          min="1"
                          value={quantidadeLote}
                          onChange={(e) => setQuantidadeLote(e.target.value)}
                          onFocus={(e) => {
                            if (e.target.value === '1') {
                              setQuantidadeLote('');
                            }
                          }}
                          id="input-pedido-admin-quantidade"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label"><FiMapPin size={14} /> Endereco de Entrega</label>
                        <input
                          className="form-input"
                          value={enderecoLote}
                          onChange={(e) => setEnderecoLote(e.target.value)}
                          placeholder="Rua, numero, bairro"
                          id="input-pedido-admin-endereco"
                        />
                      </div>
                    </div>

                    <div>
                      {!mostrarInputNome ? (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setMostrarInputNome(true)}
                          id="btn-admin-adicionar-nome"
                        >
                          <FiUser size={14} /> Adicionar Nome
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <input
                            className="form-input"
                            placeholder="Nome do funcionario"
                            value={nomeAtual}
                            onChange={(e) => setNomeAtual(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && adicionarNome()}
                            id="input-pedido-admin-nomes"
                          />
                          <button className="btn btn-primary btn-sm" onClick={adicionarNome}>Salvar</button>
                          <button
                            className="btn btn-sm"
                            onClick={() => setMostrarInputNome(false)}
                            style={{ color: 'var(--cinza-500)', minWidth: '44px' }}
                          >
                            <FiX />
                          </button>
                        </div>
                      )}

                      {nomesLote.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                          {nomesLote.map((nome, i) => (
                            <span
                              key={`${nome}-${i}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 10px',
                                borderRadius: '999px',
                                background: 'var(--verde-bg)',
                                color: 'var(--verde-escuro)',
                                fontSize: '0.8rem',
                                fontWeight: 600
                              }}
                            >
                              {nome}
                              <button onClick={() => removerNome(i)} style={{ fontWeight: 700, color: 'var(--verde-escuro)' }}>x</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <button className="btn btn-primary" onClick={adicionarLote} id="btn-admin-adicionar-lote">
                        <FiPlus size={16} /> Adicionar Lote
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pedido-admin-modal-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: 'var(--cinza-50)', borderRadius: '12px', padding: '14px', border: '1px solid var(--cinza-200)', maxHeight: '220px', overflowY: 'auto' }}>
                    <h4 style={{ marginBottom: '10px', fontWeight: 700, color: 'var(--verde-escuro)', fontSize: '0.95rem' }}>Cardapio do Dia</h4>
                    {cardapio.map((item) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.83rem', padding: '4px 0', borderBottom: '1px solid var(--cinza-100)' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: item.tipo === 'PROTEINA' ? '#FF9800' : 'var(--verde-accent)',
                            minWidth: '8px'
                          }}
                        ></span>
                        {item.nome}
                      </div>
                    ))}
                  </div>

                  <div style={{ background: 'var(--cinza-50)', borderRadius: '12px', padding: '14px', border: '1px solid var(--cinza-200)', maxHeight: '320px', overflowY: 'auto' }}>
                    <h4 style={{ marginBottom: '10px', fontWeight: 700, fontSize: '0.95rem' }}>Lotes Adicionados ({lotesPedido.length})</h4>
                    {lotesPedido.length > 0 ? (
                      lotesPedido.map((lote, i) => (
                        <div key={`lote-admin-${i}`} style={{ border: '1px solid var(--cinza-200)', borderRadius: '8px', padding: '10px', marginBottom: '10px', background: 'var(--branco)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <strong style={{ fontSize: '0.88rem', color: 'var(--verde-escuro)' }}>Lote {i + 1} - {lote.quantidade}x</strong>
                            <button className="btn btn-sm btn-danger" onClick={() => removerLote(i)} style={{ padding: '2px 7px', minHeight: '26px' }}>
                              <FiX size={12} />
                            </button>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {lote.itens.map((item, j) => (
                              <span key={`lote-item-${i}-${j}`} style={{ fontSize: '0.72rem', padding: '2px 7px', background: 'var(--cinza-100)', borderRadius: '999px' }}>
                                {item.nome}
                              </span>
                            ))}
                          </div>
                          <div style={{ marginTop: '6px', fontSize: '0.78rem', color: 'var(--cinza-600)' }}>Endereco: {lote.endereco}</div>
                          {lote.nomes && (
                            <div style={{ marginTop: '4px', fontSize: '0.78rem', color: 'var(--verde-escuro)', fontWeight: 600 }}>
                              Nomes: {lote.nomes.join(', ')}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--cinza-400)', fontSize: '0.85rem', padding: '14px' }}>
                        Nenhum lote adicionado
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalPedidoEmpresa(null)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={criarPedidoAdmin}
                disabled={!lotesPedido.length || salvandoPedido}
                id="btn-salvar-pedido-admin"
              >
                {salvandoPedido ? 'Salvando...' : <><FiSend size={16} /> Criar Pedido para Empresa</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {empresas.map(empresa => (
        <div key={empresa.id} className="card" style={{ marginBottom: '16px' }} id={`empresa-${empresa.id}`}>
          <div className="card-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h4 style={{ fontWeight: 700 }}>{empresa.nome}</h4>
              <span className={`badge ${empresa.ativo ? 'badge-success' : 'badge-danger'}`}>
                {empresa.ativo ? 'Ativa' : 'Inativa'}
              </span>
            </div>
          </div>

          <div className="card-body">
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span className="badge badge-info">SIGLA: {empresa.sigla || '-'}</span>
              <span className="badge badge-info">{empresa.totalPedidos} pedidos/dia</span>
              <span className="badge badge-warning">{empresa._count?.pedidos || 0} pedidos feitos</span>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-sm btn-secondary" onClick={() => abrirEditar(empresa)}>
                Editar Total de Pedidos
              </button>
            </div>

            <div
              style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px dashed var(--cinza-300)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap'
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--cinza-600)', fontWeight: 600 }}>
                Acoes do Admin
              </span>
              <button
                className="btn btn-primary"
                onClick={() => abrirPedidoAdmin(empresa)}
                id={`btn-admin-pedido-${empresa.id}`}
              >
                <FiShoppingBag size={16} /> Fazer Pedido para Esta Empresa
              </button>
            </div>
          </div>
        </div>
      ))}

      {empresas.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--cinza-400)' }}>
          <p>Nenhuma empresa cadastrada</p>
        </div>
      )}
    </div>
  );
}
