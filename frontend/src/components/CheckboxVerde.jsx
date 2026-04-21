import { FiCheck } from 'react-icons/fi';

export default function CheckboxVerde({ label, selecionado, onChange, id }) {
  return (
    <div 
      className={`checkbox-verde ${selecionado ? 'ativo' : ''}`}
      onClick={onChange}
      id={id}
      role="checkbox"
      aria-checked={selecionado}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onChange()}
    >
      <div className="check-box">
        <FiCheck />
      </div>
      <span className="check-label">{label}</span>
    </div>
  );
}
