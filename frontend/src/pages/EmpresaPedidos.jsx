import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiSend, FiX, FiUser, FiMapPin, FiPackage } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import CheckboxVerde from '../components/CheckboxVerde';
import { useAuth } from '../context/useAuth';
import { cardapioAPI, pedidoEmpresaAPI } from '../services/api';
import '../styles/empresa.css';

export default function EmpresaPedidos() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [cardapio, setCardapio] = useState([]);
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [quantidadeLote, setQuantidadeLote] = useState('1');
  const [endereco, setEndereco] = useState('');
  const [enderecosSalvos, setEnderecosSalvos] = useState([]);
  const [nomeAtual, setNomeAtual] = useState('');
  const [nomes, setNomes] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [totalDiaInput, setTotalDiaInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [mostarInputNome, setMostrarInputNome] = useState(false);

  const totalContratado = usuario?.empresa?.totalPedidos || 0;
  const totalNosLotes = lotes.reduce((s, l) => s + l.quantidade, 0);

  const totalDiaDigitado = totalDiaInput.trim() !== '' ? Math.max(0, parseInt(totalDiaInput, 10) || 0) : null;
  const totalDoDia = totalDiaDigitado === null ? totalNosLotes : Math.max(totalDiaDigitado, totalNosLotes);
  const falta = Math.max(totalDoDia - totalNosLotes, 0);

  const whatsappNumero = import.meta.env.VITE_WHATSAPP_NUMERO || '5500000000000';
  const whatsappLink = `https://wa.me/${whatsappNumero}`;

  useEffect(() => {
    if (!usuario || usuario.role !== 'EMPRESA_FUNC') {
      navigate('/empresa/login');
      return;
    }

    cardapioAPI.listarAtivos().then(res => setCardapio(res.data)).catch(() => {});
  }, [usuario, navigate]);

  const toggleItem = (item) => {
    setItensSelecionados(prev =>
      prev.find(i => i.id === item.id)
        ? prev.filter(i => i.id !== item.id)
        : [...prev, item]
    );
  };

  const adicionarNome = () => {
    const quantidadeAtual = Math.max(1, parseInt(quantidadeLote, 10) || 1);
    if (nomeAtual.trim() && nomes.length < quantidadeAtual) {
      setNomes([...nomes, nomeAtual.trim()]);
      setNomeAtual('');
    }
  };

  const removerNome = (idx) => {
    setNomes(nomes.filter((_, i) => i !== idx));
  };

  const normalizarEndereco = (valor = '') =>
    valor.trim().replace(/\s+/g, ' ');

  const salvarEnderecoTemporario = (valor) => {
    const enderecoNormalizado = normalizarEndereco(valor);
    if (!enderecoNormalizado) return;

    setEnderecosSalvos((anteriores) => {
      const jaExiste = anteriores.some(
        (item) => normalizarEndereco(item).toLowerCase() === enderecoNormalizado.toLowerCase()
      );

      return jaExiste ? anteriores : [...anteriores, enderecoNormalizado];
    });
  };

  const usarEnderecoSalvo = (valor) => {
    setEndereco(valor);
    setMensagem({ tipo: 'success', texto: 'Endereco preenchido.' });
  };

  const adicionarLote = () => {
    const qtd = parseInt(quantidadeLote, 10);
    const enderecoNormalizado = normalizarEndereco(endereco);

    if (!itensSelecionados.length) {
      setMensagem({ tipo: 'error', texto: 'Selecione pelo menos um item' });
      return;
    }
    if (!enderecoNormalizado) {
      setMensagem({ tipo: 'error', texto: 'Informe o endereco de entrega' });
      return;
    }
    if (!Number.isInteger(qtd) || qtd < 1) {
      setMensagem({ tipo: 'error', texto: 'Quantidade invalida' });
      return;
    }

    if (totalDiaDigitado !== null && totalNosLotes + qtd > totalDiaDigitado) {
      const excedente = (totalNosLotes + qtd) - totalDiaDigitado;
      setMensagem({ tipo: 'error', texto: `Excede o total do dia em ${excedente}.` });
      return;
    }

    setLotes([...lotes, {
      itens: itensSelecionados.map(i => ({ id: i.id, nome: i.nome, tipo: i.tipo })),
      quantidade: qtd,
      endereco: enderecoNormalizado,
      nomes: nomes.length > 0 ? nomes : null
    }]);

    salvarEnderecoTemporario(enderecoNormalizado);
    setItensSelecionados([]);
    setQuantidadeLote('1');
    setEndereco(enderecoNormalizado);
    setNomes([]);
    setMostrarInputNome(false);
    setMensagem({ tipo: 'success', texto: 'Lote adicionado! Endereco mantido para o proximo lote.' });
  };

  const removerLote = (idx) => {
    setLotes(lotes.filter((_, i) => i !== idx));
  };

  const enviarPedido = async () => {
    if (!lotes.length) {
      setMensagem({ tipo: 'error', texto: 'Adicione pelo menos um lote' });
      return;
    }

    if (totalDiaDigitado !== null && totalNosLotes !== totalDiaDigitado) {
      if (totalNosLotes < totalDiaDigitado) {
        setMensagem({ tipo: 'error', texto: `Faltam ${totalDiaDigitado - totalNosLotes} pedidos para fechar o total do dia.` });
      } else {
        setMensagem({ tipo: 'error', texto: 'Total do dia menor que os lotes ja cadastrados.' });
      }
      return;
    }

    setEnviando(true);
    try {
      await pedidoEmpresaAPI.criar({
        lotes,
        totalPedidosDia: totalDoDia
      });
      setMensagem({ tipo: 'success', texto: 'Pedido enviado com sucesso! Aguarde a autorizacao.' });
      setLotes([]);
      setEnderecosSalvos([]);
      setEndereco('');
      setItensSelecionados([]);
      setQuantidadeLote('1');
      setNomes([]);
      setMostrarInputNome(false);
      setTotalDiaInput('');
    } catch (err) {
      setMensagem({ tipo: 'error', texto: err.response?.data?.erro || 'Erro ao enviar pedido' });
    }
    setEnviando(false);
  };

  const proteinas = cardapio.filter(i => i.tipo === 'PROTEINA');
  const complementos = cardapio.filter(i => i.tipo === 'COMPLEMENTO');

  return (
    <>
      <Navbar />
      {mensagem && (
        <div className={`toast toast-${mensagem.tipo}`} onAnimationEnd={() => setTimeout(() => setMensagem(null), 100)}>
          {mensagem.texto}
        </div>
      )}

      <div className="empresa-page">
        <div className="container">
          <div className="empresa-header">
            <div>
              <h1>{usuario?.empresa?.nome || 'Empresa'}</h1>
              <p className="empresa-subtitle">Monte os pedidos do dia</p>
            </div>

            <div className="empresa-counter" id="contador-pedidos">
              <div className="counter-item" style={{ minWidth: '120px' }}>
                <div className="counter-label" style={{ marginBottom: '6px' }}>Total do Dia</div>
                <input
                  type="number"
                  min="0"
                  placeholder={totalContratado ? `Padrao ${totalContratado}` : 'Automatico'}
                  value={totalDiaInput}
                  onChange={(e) => setTotalDiaInput(e.target.value)}
                  className="form-input"
                  id="input-total-do-dia"
                  style={{ height: '36px', textAlign: 'center', fontWeight: 700 }}
                />
              </div>

              <div className="counter-divider"></div>

              <div className="counter-item">
                <div className="counter-number">{totalNosLotes}</div>
                <div className="counter-label">Adicionados</div>
              </div>

              <div className="counter-divider"></div>

              <div className="counter-falta" id="falta-pedidos">
                {totalDiaDigitado === null ? `Total auto: ${totalDoDia}` : `Falta ${falta}`}
              </div>
            </div>
          </div>

          <div className="empresa-layout">
            <div className="lote-form">
              <div className="lote-section" id="secao-itens-empresa">
                <h3><span className="icon">???</span> Selecione os itens</h3>

                {proteinas.length > 0 && (
                  <>
                    <p style={{ fontSize: '0.8rem', color: 'var(--cinza-500)', marginBottom: '8px', fontWeight: '600' }}>PROTEINAS</p>
                    <div className="itens-grid">
                      {proteinas.map(item => (
                        <CheckboxVerde
                          key={item.id}
                          id={`emp-item-${item.id}`}
                          label={item.nome}
                          selecionado={!!itensSelecionados.find(i => i.id === item.id)}
                          onChange={() => toggleItem(item)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {complementos.length > 0 && (
                  <>
                    <p style={{ fontSize: '0.8rem', color: 'var(--cinza-500)', margin: '16px 0 8px', fontWeight: '600' }}>COMPLEMENTOS</p>
                    <div className="itens-grid">
                      {complementos.map(item => (
                        <CheckboxVerde
                          key={item.id}
                          id={`emp-item-${item.id}`}
                          label={item.nome}
                          selecionado={!!itensSelecionados.find(i => i.id === item.id)}
                          onChange={() => toggleItem(item)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="lote-section" id="secao-lote-config">
                <h3><FiPackage /> Configurar Lote</h3>
                <div className="dados-grid">
                  <div className="form-group">
                    <label className="form-label">Quantidade</label>
                    <input
                      className="form-input"
                      type="number"
                      min="1"
                      value={quantidadeLote}
                      onChange={e => setQuantidadeLote(e.target.value)}
                      id="input-qtd-lote"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label"><FiMapPin size={14} /> Endereco de Entrega</label>
                    <input
                      className="form-input"
                      placeholder="Rua, numero, bairro"
                      value={endereco}
                      onChange={e => setEndereco(e.target.value)}
                      id="input-endereco-lote"
                    />
                    {enderecosSalvos.length > 0 && (
                      <div className="enderecos-salvos" id="enderecos-salvos-empresa">
                        <span className="enderecos-salvos-label">Enderecos usados neste pedido:</span>
                        <div className="enderecos-salvos-lista">
                          {enderecosSalvos.map((item) => (
                            <button
                              key={item}
                              type="button"
                              className={`endereco-salvo-chip${normalizarEndereco(endereco).toLowerCase() === normalizarEndereco(item).toLowerCase() ? ' ativo' : ''}`}
                              onClick={() => usarEnderecoSalvo(item)}
                              title={`Usar ${item}`}
                            >
                              <FiMapPin size={12} /> {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  {!mostarInputNome ? (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setMostrarInputNome(true)}
                      id="btn-adicionar-nome"
                    >
                      <FiUser size={14} /> Adicionar Nome
                    </button>
                  ) : (
                    <div className="nome-input-inline">
                      <input
                        className="form-input"
                        placeholder="Nome do funcionario"
                        value={nomeAtual}
                        onChange={e => setNomeAtual(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && adicionarNome()}
                        id="input-nome-func"
                      />
                      <button className="btn btn-primary btn-sm" onClick={adicionarNome} id="btn-salvar-nome">
                        Salvar
                      </button>
                      <button className="btn btn-sm" onClick={() => setMostrarInputNome(false)} style={{ color: 'var(--cinza-500)' }}>
                        <FiX />
                      </button>
                    </div>
                  )}

                  {nomes.length > 0 && (
                    <div className="nomes-lista">
                      {nomes.map((nome, i) => (
                        <span key={i} className="nome-tag">
                          {nome}
                          <button onClick={() => removerNome(i)} aria-label="Remover">x</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="lote-actions" id="lote-acoes">
                <button
                  className="btn btn-primary"
                  onClick={adicionarLote}
                  id="btn-adicionar-lote"
                >
                  <FiPlus size={18} /> Adicionar Lote
                </button>
                <button
                  className="btn btn-primary"
                  onClick={enviarPedido}
                  disabled={!lotes.length || enviando}
                  id="btn-enviar-empresa"
                  style={{ background: 'linear-gradient(135deg, #1B7A3D, #A8BF12)' }}
                >
                  {enviando ? (
                    <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span>
                  ) : (
                    <>
                      <FiSend size={18} /> Enviar Pedido
                    </>
                  )}
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm"
                  style={{ color: '#25D366', gap: '6px' }}
                  id="link-whatsapp-empresa"
                >
                  <FaWhatsapp size={18} /> Duvidas? Fale no WhatsApp
                </a>
              </div>
            </div>

            <div className="empresa-sidebar">
              <div className="sidebar-cardapio" id="sidebar-cardapio">
                <h4>?? Cardapio do Dia</h4>
                {cardapio.map(item => (
                  <div key={item.id} className="sidebar-item">
                    <span className={`tipo-dot ${item.tipo.toLowerCase()}`}></span>
                    {item.nome}
                  </div>
                ))}
                {!cardapio.length && <p style={{ color: 'var(--cinza-400)', fontSize: '0.85rem' }}>Cardapio sera atualizado em breve</p>}
              </div>

              <div className="lotes-lista" id="lotes-adicionados">
                <h4>?? Lotes Adicionados ({lotes.length})</h4>
                {lotes.length > 0 ? (
                  lotes.map((lote, i) => (
                    <div key={i} className="lote-card">
                      <div className="lote-card-header">
                        <strong>Lote {i + 1} - {lote.quantidade}x</strong>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => removerLote(i)}
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                      <div className="lote-card-body">
                        <div className="lote-itens">
                          {lote.itens.map((item, j) => (
                            <span key={j} className="lote-item-tag">{item.nome}</span>
                          ))}
                        </div>
                        <div className="lote-endereco">?? {lote.endereco}</div>
                        {lote.nomes && (
                          <div className="lote-nomes">
                            ?? {lote.nomes.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="lotes-vazio">Nenhum lote adicionado</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

