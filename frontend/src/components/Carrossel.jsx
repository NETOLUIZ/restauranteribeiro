import { useState, useEffect, useCallback } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function Carrossel({ banners = [] }) {
  const [slideAtual, setSlideAtual] = useState(0);

  const proximoSlide = useCallback(() => {
    setSlideAtual((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const slideAnterior = () => {
    setSlideAtual((prev) => (prev - 1 + banners.length) % banners.length);
  };

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(proximoSlide, 5000);
    return () => clearInterval(timer);
  }, [banners.length, proximoSlide]);

  if (!banners.length) {
    return (
      <div className="carrossel" id="carrossel-banners">
        <div className="carrossel-slide ativo" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, var(--verde-escuro), var(--verde-lima))',
          color: 'white', fontSize: '1.2rem', fontWeight: '600'
        }}>
          Bem-vindo ao Restaurante Ribeiro!
        </div>
      </div>
    );
  }

  const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

  return (
    <div className="carrossel" id="carrossel-banners">
      {banners.map((banner, i) => (
        <div key={banner.id} className={`carrossel-slide ${i === slideAtual ? 'ativo' : ''}`}>
          <img 
            src={banner.imagemUrl.startsWith('http') ? banner.imagemUrl : `${apiUrl}${banner.imagemUrl}`} 
            alt={banner.titulo || 'Banner'}
            loading="lazy"
          />
          {(banner.titulo || banner.texto) && (
            <div className="slide-overlay">
              {banner.titulo && <h3>{banner.titulo}</h3>}
              {banner.texto && <p>{banner.texto}</p>}
            </div>
          )}
        </div>
      ))}
      
      {banners.length > 1 && (
        <>
          <button className="carrossel-nav prev" onClick={slideAnterior} aria-label="Anterior">
            <FiChevronLeft size={20} />
          </button>
          <button className="carrossel-nav next" onClick={proximoSlide} aria-label="Próximo">
            <FiChevronRight size={20} />
          </button>
        </>
      )}
      
      {banners.length > 1 && (
        <div className="carrossel-dots">
          {banners.map((_, i) => (
            <button 
              key={i} 
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
