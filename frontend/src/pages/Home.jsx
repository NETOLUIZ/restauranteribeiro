import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiShoppingBag, FiTruck } from 'react-icons/fi';
import { GiKnifeFork } from 'react-icons/gi';
import Navbar from '../components/Navbar';
import Carrossel from '../components/Carrossel';
import WhatsAppButton from '../components/WhatsAppButton';
import Footer from '../components/Footer';
import homePatternBg from '../assets/home-pattern-bg.jpg';
import imagemCardMarmita from '../assets/marmita-card-home.png';
import { cardapioAPI, bannerAPI, marmitaAPI } from '../services/api';
import '../styles/home.css';

export default function Home() {
  const [cardapio, setCardapio] = useState([]);
  const [banners, setBanners] = useState([]);
  const [marmitas, setMarmitas] = useState([]);

  useEffect(() => {
    let ativo = true;

    Promise.allSettled([
      cardapioAPI.listarAtivos(),
      bannerAPI.listarAtivos(),
      marmitaAPI.listarAtivos()
    ])
      .then(([cardapioRes, bannersRes, marmitasRes]) => {
        if (!ativo) return;
        if (cardapioRes.status === 'fulfilled') setCardapio(cardapioRes.value.data);
        if (bannersRes.status === 'fulfilled') setBanners(bannersRes.value.data);
        if (marmitasRes.status === 'fulfilled') setMarmitas(marmitasRes.value.data);
      })
      .catch((err) => {
        console.error('Erro ao carregar dados:', err);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const normalizarNome = (nome = '') =>
    nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  const removerDuplicadosPorNome = (itens = []) => {
    const unicos = new Map();

    itens.forEach((item) => {
      const chave = normalizarNome(item.nome || '');
      if (chave && !unicos.has(chave)) {
        unicos.set(chave, item);
      }
    });

    return Array.from(unicos.values()).sort((a, b) =>
      normalizarNome(a.nome).localeCompare(normalizarNome(b.nome), 'pt-BR')
    );
  };

  const proteinas = removerDuplicadosPorNome(cardapio.filter(i => i.tipo === 'PROTEINA'));
  const complementos = removerDuplicadosPorNome(cardapio.filter(i => i.tipo === 'COMPLEMENTO'));
  const grande = marmitas.find(item => item.tamanho === 'GRANDE');
  const pequena = marmitas.find(item => item.tamanho === 'PEQUENA');

  const marmitaGrande = {
    titulo: grande?.titulo || 'Marmita Grande',
    preco: grande?.preco ?? 20,
    imagemUrl: grande?.imagemUrl || ''
  };

  const marmitaPequena = {
    titulo: pequena?.titulo || 'Marmita Pequena',
    preco: pequena?.preco ?? 16,
    imagemUrl: pequena?.imagemUrl || ''
  };

  const formatarMoeda = (valor) => Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  return (
    <>
      <Navbar />
      <div className="home-page-bg" style={{ backgroundImage: `url(${homePatternBg})` }}>
        <section className="hero" id="hero-section">
          <div className="container hero-content">
            <h1>Restaurante Ribeiro</h1>
            <div className="hero-buttons">
              <Link to="/pedido" className="btn btn-hero-primary" id="btn-fazer-pedido">
                <FiShoppingBag size={20} /> Fazer Pedido
              </Link>
              <Link to="/empresa/login" className="btn btn-hero-secondary" id="btn-area-empresa">
                <FiTruck size={20} /> Area da Empresa
              </Link>
            </div>
          </div>
        </section>

        <section className="carrossel-section" id="secao-carrossel">
          <div className="container">
            <div className="carrossel-center">
              <Carrossel banners={banners} />
            </div>
          </div>
        </section>

        <section className="cardapio-section" id="secao-cardapio">
          <div className="container">
            <p className="cardapio-subtitle chalk-subtitle">Confira as opcoes disponiveis hoje</p>

            {cardapio.length > 0 ? (
              <div className="cardapio-blocos">
                <div className="cardapio-bloco">
                  <div className="cardapio-bloco-header">
                    <h3>Proteinas</h3>
                    <span className="cardapio-badge-count">{proteinas.length} itens</span>
                  </div>
                  {proteinas.length > 0 ? (
                    <div className="cardapio-grid">
                      {proteinas.map(item => (
                        <div key={item.id} className="cardapio-card" id={`cardapio-proteina-${item.id}`}>
                          <div className="cardapio-icon proteina">P</div>
                          <div className="cardapio-info">
                            <h4>{item.nome}</h4>
                            <span>Proteina</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="cardapio-vazio-bloco">Sem proteinas cadastradas hoje.</p>
                  )}
                </div>

                <div className="cardapio-bloco">
                  <div className="cardapio-bloco-header">
                    <h3>Complementos</h3>
                    <span className="cardapio-badge-count">{complementos.length} itens</span>
                  </div>
                  {complementos.length > 0 ? (
                    <div className="cardapio-complementos-grid">
                      {complementos.map(item => (
                        <div key={item.id} className="cardapio-complemento-item" id={`cardapio-complemento-${item.id}`}>
                          <span className="cardapio-complemento-dot"></span>
                          <span className="cardapio-complemento-texto">{item.nome}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="cardapio-vazio-bloco">Sem complementos cadastrados hoje.</p>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--cinza-500)' }}>
                <GiKnifeFork size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p>O cardapio do dia sera atualizado em breve</p>
              </div>
            )}
          </div>
        </section>

        <section className="cards-section" id="secao-cards">
          <div className="container">
            <div className="section-header">
              <h2>Marmitas</h2>
              <p>Escolha o tamanho, confira o valor e abra a tela de pedido.</p>
            </div>

            <div className="marmitas-grid">
              <article className="marmita-card" id="card-marmita-grande">
                <img
                  src={imagemCardMarmita}
                  alt={marmitaGrande.titulo}
                  className="marmita-foto"
                />
                <div className="marmita-conteudo">
                  <h3>{marmitaGrande.titulo}</h3>
                  <p className="marmita-preco">{formatarMoeda(marmitaGrande.preco)}</p>
                  <Link
                    to={`/pedido?tamanho=GRANDE&valor=${encodeURIComponent(marmitaGrande.preco)}&titulo=${encodeURIComponent(marmitaGrande.titulo)}`}
                    state={{
                      tamanho: 'GRANDE',
                      valorUnitario: marmitaGrande.preco,
                      titulo: marmitaGrande.titulo
                    }}
                    className="btn btn-primary"
                  >
                    Ir para Pedido
                  </Link>
                </div>
              </article>

              <article className="marmita-card" id="card-marmita-pequena">
                <img
                  src={imagemCardMarmita}
                  alt={marmitaPequena.titulo}
                  className="marmita-foto"
                />
                <div className="marmita-conteudo">
                  <h3>{marmitaPequena.titulo}</h3>
                  <p className="marmita-preco">{formatarMoeda(marmitaPequena.preco)}</p>
                  <Link
                    to={`/pedido?tamanho=PEQUENA&valor=${encodeURIComponent(marmitaPequena.preco)}&titulo=${encodeURIComponent(marmitaPequena.titulo)}`}
                    state={{
                      tamanho: 'PEQUENA',
                      valorUnitario: marmitaPequena.preco,
                      titulo: marmitaPequena.titulo
                    }}
                    className="btn btn-primary"
                  >
                    Ir para Pedido
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <Footer />
      </div>
      <WhatsAppButton />
    </>
  );
}
