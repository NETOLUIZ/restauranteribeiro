import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClipboard, FiDownload, FiList, FiMapPin, FiPackage, FiPlus, FiSend, FiUser, FiX } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import Navbar from '../components/Navbar';
import CheckboxVerde from '../components/CheckboxVerde';
import { useAuth } from '../context/useAuth';
import { cardapioAPI, empresaAPI, pedidoEmpresaAPI } from '../services/api';
import { escapeHtml } from '../utils/comandaPrint';
import '../styles/empresa.css';

const gerarHtmlLotesPdf = ({ empresaNome, lotes, totalNosLotes, totalDoDia, observacao }) => {
  const lotesHtml = lotes.map((lote, index) => {
    const itensHtml = Array.isArray(lote.itens) && lote.itens.length
      ? lote.itens.map((item) => `<li>${escapeHtml(item?.nome || '-')}</li>`).join('')
      : '<li>-</li>';

    return `
      <section class="pdf-lote">
        <div class="pdf-lote-topo">
          <h2>Lote ${index + 1}</h2>
          <span>${escapeHtml(String(lote.quantidade || 0))} refeicao(oes)</span>
        </div>
        <p><strong>Endereco:</strong> ${escapeHtml(lote.endereco || '-')}</p>
        ${Array.isArray(lote.nomes) && lote.nomes.length ? `<p><strong>Nomes:</strong> ${escapeHtml(lote.nomes.join(', '))}</p>` : ''}
        <div class="pdf-itens">
          <strong>Itens</strong>
          <ul>${itensHtml}</ul>
        </div>
      </section>
    `;
  }).join('');

  return `
    <html>
      <head>
        <title>Pedido Empresa - ${escapeHtml(empresaNome || 'Restaurante Ribeiro')}</title>
        <style>
          @page {
            size: A4;
            margin: 12mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            color: #163023;
            font-family: Arial, Helvetica, sans-serif;
            background: #ffffff;
          }

          .pdf-pedido {
            display: grid;
            gap: 12px;
          }

          .pdf-topo {
            padding-bottom: 10px;
            border-bottom: 2px solid #1b7a3d;
          }

          .pdf-topo h1 {
            margin: 0 0 4px;
            font-size: 22px;
            color: #1b7a3d;
          }

          .pdf-topo p {
            margin: 0;
            font-size: 13px;
            color: #466255;
          }

          .pdf-resumo {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
          }

          .pdf-resumo-card {
            padding: 10px 12px;
            border: 1px solid #cfe7d6;
            border-radius: 10px;
            background: #f6fbf7;
          }

          .pdf-resumo-card span {
            display: block;
            margin-bottom: 4px;
            font-size: 11px;
            font-weight: 700;
            color: #466255;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }

          .pdf-resumo-card strong {
            font-size: 18px;
            color: #163023;
          }

          .pdf-observacao {
            padding: 12px;
            border-radius: 10px;
            border: 1px solid #cfe7d6;
            background: #f6fbf7;
            line-height: 1.5;
          }

          .pdf-observacao strong {
            color: #1b7a3d;
          }

          .pdf-lotes {
            display: grid;
            gap: 12px;
          }

          .pdf-lote {
            padding: 12px;
            border: 1px solid #d8e2db;
            border-radius: 12px;
            page-break-inside: avoid;
          }

          .pdf-lote-topo {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
          }

          .pdf-lote-topo h2 {
            margin: 0;
            font-size: 16px;
            color: #1b7a3d;
          }

          .pdf-lote-topo span {
            font-size: 12px;
            font-weight: 700;
            color: #466255;
          }

          .pdf-lote p {
            margin: 6px 0;
            line-height: 1.45;
          }

          .pdf-itens strong {
            display: block;
            margin: 10px 0 6px;
          }

          .pdf-itens ul {
            margin: 0;
            padding-left: 18px;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <main class="pdf-pedido">
          <header class="pdf-topo">
            <h1>${escapeHtml(empresaNome || 'Restaurante Ribeiro')}</h1>
            <p>Pedido exportado em ${escapeHtml(new Date().toLocaleString('pt-BR'))}</p>
          </header>

          <section class="pdf-resumo">
            <div class="pdf-resumo-card">
              <span>Lotes</span>
              <strong>${escapeHtml(String(lotes.length))}</strong>
            </div>
            <div class="pdf-resumo-card">
              <span>Adicionados</span>
              <strong>${escapeHtml(String(totalNosLotes))}</strong>
            </div>
            <div class="pdf-resumo-card">
              <span>Total do Dia</span>
              <strong>${escapeHtml(String(totalDoDia))}</strong>
            </div>
          </section>

          ${observacao ? `<section class="pdf-observacao"><strong>Observacao:</strong> ${escapeHtml(observacao)}</section>` : ''}

          <section class="pdf-lotes">
            ${lotesHtml}
          </section>
        </main>
      </body>
    </html>
  `;
};

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
  const [funcionariosSalvos, setFuncionariosSalvos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [totalDiaInput, setTotalDiaInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [mostarInputNome, setMostrarInputNome] = useState(false);
  const [observacaoPedido, setObservacaoPedido] = useState('');

  const totalContratado = usuario?.empresa?.totalPedidos || 0;
  const totalNosLotes = lotes.reduce((s, l) => s + l.quantidade, 0);

  const totalDiaDigitado = totalDiaInput.trim() !== '' ? Math.max(0, parseInt(totalDiaInput, 10) || 0) : null;
  const totalDoDia = totalDiaDigitado === null ? totalNosLotes : Math.max(totalDiaDigitado, totalNosLotes);
  const falta = Math.max(totalDoDia - totalNosLotes, 0);

  const whatsappNumero = import.meta.env.VITE_WHATSAPP_NUMERO || '5585996586824';
  const whatsappLink = `https://wa.me/${whatsappNumero}`;

  useEffect(() => {
    if (!usuario || usuario.role !== 'EMPRESA_FUNC') {
      navigate('/empresa/login');
      return;
    }

    let ativo = true;

    Promise.allSettled([
      cardapioAPI.listarAtivos(),
      empresaAPI.listarFuncionariosMinhaEmpresa()
    ]).then(([cardapioRes, funcionariosRes]) => {
      if (!ativo) return;
      if (cardapioRes.status === 'fulfilled') setCardapio(cardapioRes.value.data);
      if (funcionariosRes.status === 'fulfilled') setFuncionariosSalvos(funcionariosRes.value.data || []);
    }).catch(() => {});

    return () => {
      ativo = false;
    };
  }, [usuario, navigate]);

  const toggleItem = (item) => {
    setItensSelecionados(prev =>
      prev.find(i => i.id === item.id)
        ? prev.filter(i => i.id !== item.id)
        : [...prev, item]
    );
  };

  const normalizarNomeFuncionario = (valor = '') =>
    valor.trim().replace(/\s+/g, ' ');

  const nomeJaEstaNoLote = (nome) =>
    nomes.some((item) => normalizarNomeFuncionario(item).toLowerCase() === nome.toLowerCase());

  const adicionarNomeAoLote = (valor, mostrarErro = true) => {
    const nome = normalizarNomeFuncionario(valor);
    const quantidadeAtual = Math.max(1, parseInt(quantidadeLote, 10) || 1);

    if (!nome) return false;

    if (nomeJaEstaNoLote(nome)) {
      if (mostrarErro) setMensagem({ tipo: 'error', texto: 'Nome ja esta neste lote.' });
      return false;
    }

    if (nomes.length >= quantidadeAtual) {
      if (mostrarErro) setMensagem({ tipo: 'error', texto: 'Quantidade de nomes ja atingiu o limite do lote.' });
      return false;
    }

    setNomes((anteriores) => [...anteriores, nome]);
    return true;
  };

  const ordenarFuncionarios = (lista) =>
    [...lista].sort((a, b) => normalizarNomeFuncionario(a.nome).localeCompare(normalizarNomeFuncionario(b.nome), 'pt-BR'));

  const salvarNomeFuncionario = async () => {
    const nome = normalizarNomeFuncionario(nomeAtual);
    if (!nome) {
      setMensagem({ tipo: 'error', texto: 'Informe o nome do funcionario.' });
      return;
    }

    setSalvandoNome(true);
    try {
      const { data } = await empresaAPI.salvarFuncionarioMinhaEmpresa({ nome });
      setFuncionariosSalvos((anteriores) => {
        const semDuplicado = anteriores.filter(
          (item) => normalizarNomeFuncionario(item.nome).toLowerCase() !== normalizarNomeFuncionario(data.nome).toLowerCase()
        );
        return ordenarFuncionarios([...semDuplicado, data]);
      });
      adicionarNomeAoLote(data.nome, false);
      setNomeAtual('');
      setMensagem({ tipo: 'success', texto: 'Nome salvo para esta empresa.' });
    } catch (err) {
      setMensagem({ tipo: 'error', texto: err.response?.data?.erro || 'Erro ao salvar nome' });
    }
    setSalvandoNome(false);
  };

  const usarFuncionarioSalvo = (nome) => {
    if (adicionarNomeAoLote(nome)) {
      setMensagem({ tipo: 'success', texto: 'Nome adicionado ao lote.' });
    }
  };

  const removerNome = (idx) => {
    setNomes(nomes.filter((_, i) => i !== idx));
  };

  const normalizarEndereco = (valor = '') =>
    valor.trim().replace(/\s+/g, ' ');

  const normalizarObservacao = (valor = '') =>
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

  const salvarLotesEmPdf = () => {
    if (!lotes.length) {
      setMensagem({ tipo: 'error', texto: 'Adicione pelo menos um lote antes de salvar em PDF.' });
      return;
    }

    const observacao = normalizarObservacao(observacaoPedido);
    const janelaPdf = window.open('', '_blank');

    if (!janelaPdf) {
      setMensagem({ tipo: 'error', texto: 'Nao foi possivel abrir a janela para salvar em PDF.' });
      return;
    }

    janelaPdf.document.write(gerarHtmlLotesPdf({
      empresaNome: usuario?.empresa?.nome || 'Restaurante Ribeiro',
      lotes,
      totalNosLotes,
      totalDoDia,
      observacao
    }));
    janelaPdf.document.close();
    janelaPdf.focus();

    window.setTimeout(() => {
      janelaPdf.print();
    }, 250);
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
        totalPedidosDia: totalDoDia,
        observacao: normalizarObservacao(observacaoPedido)
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
      setObservacaoPedido('');
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
        <div
          className={`toast toast-${mensagem.tipo}`}
          onAnimationEnd={(event) => {
            if (event.animationName === 'slideOut') {
              setMensagem(null);
            }
          }}
        >
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
                <h3><FiList /> Selecione os itens</h3>

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
                        onKeyDown={e => e.key === 'Enter' && salvarNomeFuncionario()}
                        id="input-nome-func"
                      />
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={salvarNomeFuncionario}
                        disabled={salvandoNome}
                        id="btn-salvar-nome"
                      >
                        {salvandoNome ? 'Salvando...' : 'Salvar Nome'}
                      </button>
                      <button className="btn btn-sm" onClick={() => setMostrarInputNome(false)} style={{ color: 'var(--cinza-500)' }}>
                        <FiX />
                      </button>
                    </div>
                  )}

                  {funcionariosSalvos.length > 0 && (
                    <div className="funcionarios-salvos" id="funcionarios-salvos-empresa">
                      <span className="funcionarios-salvos-label">Funcionarios salvos da empresa:</span>
                      <div className="funcionarios-salvos-lista">
                        {funcionariosSalvos.map((funcionario) => (
                          <button
                            key={funcionario.id}
                            type="button"
                            className={`funcionario-salvo-chip${nomeJaEstaNoLote(normalizarNomeFuncionario(funcionario.nome)) ? ' ativo' : ''}`}
                            onClick={() => usarFuncionarioSalvo(funcionario.nome)}
                            title={`Adicionar ${funcionario.nome} ao lote`}
                          >
                            <FiUser size={12} /> {funcionario.nome}
                          </button>
                        ))}
                      </div>
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

                <div className="observacao-pedido-box">
                  <label className="form-label" htmlFor="input-observacao-pedido-empresa">
                    <FiClipboard size={14} /> Observacao do Pedido
                  </label>
                  <textarea
                    className="form-input observacao-pedido-input"
                    id="input-observacao-pedido-empresa"
                    placeholder="Ex: entregar na portaria, ligar ao chegar, sem cebola..."
                    value={observacaoPedido}
                    onChange={e => setObservacaoPedido(e.target.value)}
                    rows={3}
                  />
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
              <div className="lotes-lista" id="lotes-adicionados">
                <div className="lotes-lista-header">
                  <h4><FiPackage /> Lotes Adicionados ({lotes.length})</h4>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={salvarLotesEmPdf}
                    disabled={!lotes.length}
                    id="btn-salvar-pdf-lotes"
                  >
                    <FiDownload size={14} /> Salvar PDF
                  </button>
                </div>
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
                        <div className="lote-endereco"><FiMapPin size={13} /> {lote.endereco}</div>
                        {lote.nomes && (
                          <div className="lote-nomes">
                            <FiUser size={13} /> {lote.nomes.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="lotes-vazio">Nenhum lote adicionado</div>
                )}
                {normalizarObservacao(observacaoPedido) && (
                  <div className="pedido-observacao-resumo">
                    <strong>Observacao:</strong> {normalizarObservacao(observacaoPedido)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

