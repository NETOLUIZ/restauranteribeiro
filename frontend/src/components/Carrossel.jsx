import { useState, useEffect, useCallback, useMemo } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function Carrossel({ banners = [] }) {
  const [slideAtual, setSlideAtual] = useState(0);

  const bannersVisiveis = useMemo(() => {
    const urls = new Set();

    return banners.filter((banner) => {
      const imagemUrl = String(banner?.imagemUrl || '').trim();
      if (!imagemUrl || urls.has(imagemUrl)) return false;
      urls.add(imagemUrl);
      return true;
    });
  }, [banners]);

  const totalSlides = bannersVisiveis.length;
  const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

  const resolverImagem = (imagemUrl) =>
    imagemUrl.startsWith('http') ? imagemUrl : `${apiUrl}${imagemUrl}`;

  const proximoSlide = useCallback(() => {
    setSlideAtual((prev) => (totalSlides <= 1 ? 0 : (prev + 1) % totalSlides));
  }, [totalSlides]);

  const slideAnterior = useCallback(() => {
    setSlideAtual((prev) => (totalSlides <= 1 ? 0 : (prev - 1 + totalSlides) % totalSlides));
  }, [totalSlides]);

  useEffect(() => {
    setSlideAtual(0);
  }, [totalSlides]);

  useEffect(() => {
    if (totalSlides <= 1) return undefined;
    const timer = setInterval(proximoSlide, 5000);
    return () => clearInterval(timer);
  }, [totalSlides, proximoSlide]);

  if (!totalSlides) {
    return (
      <div className="carrossel" id="carrossel-banners">
        <div
          className="carrossel-slide ativo"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--verde-escuro), var(--verde-lima))',
            color: 'white',
            fontSize: '1.2rem',
            fontWeight: '600'
          }}
        >
          Bem-vindo ao Restaurante Ribeiro!
        </div>
      </div>
    );
  }

  return (
    <div className="carrossel" id="carrossel-banners">
      {bannersVisiveis.map((banner, i) => (
        <div key={banner.id} className={`carrossel-slide ${i === slideAtual ? 'ativo' : ''}`}>
          <img
            src={resolverImagem(banner.imagemUrl)}
            alt={banner.titulo || 'Banner'}
            loading="eager"
            decoding="async"
          />
          {(banner.titulo || banner.texto) && (
            <div className="slide-overlay">
              {banner.titulo && <h3>{banner.titulo}</h3>}
              {banner.texto && <p>{banner.texto}</p>}
            </div>
          )}
        </div>
      ))}

      {totalSlides > 1 && (
        <>
          <button className="carrossel-nav prev" onClick={slideAnterior} aria-label="Anterior">
            <FiChevronLeft size={20} />
          </button>
          <button className="carrossel-nav next" onClick={proximoSlide} aria-label="Proximo">
            <FiChevronRight size={20} />
          </button>
        </>
      )}

      {totalSlides > 1 && (
        <div className="carrossel-dots">
          {bannersVisiveis.map((banner, i) => (
            <button
              key={banner.id}
              className={`carrossel-dot ${i === slideAtual ? 'ativo' : ''}`}
              onClick={() => setSlideAtual(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
