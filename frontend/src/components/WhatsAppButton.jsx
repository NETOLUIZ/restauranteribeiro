import { FaWhatsapp } from 'react-icons/fa';

export default function WhatsAppButton({ numero, mensagem = 'Ola! Gostaria de mais informacoes.' }) {
  const numeroFinal = numero || import.meta.env.VITE_WHATSAPP_NUMERO || '5585996586824';
  const link = `https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensagem)}`;

  return (
    <div className="whatsapp-float">
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-btn"
        id="btn-whatsapp"
        aria-label="Contato via WhatsApp"
      >
        <FaWhatsapp />
      </a>
    </div>
  );
}

