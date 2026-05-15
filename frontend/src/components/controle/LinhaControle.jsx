import { linhaPreenchida } from './controleDiarioStorage';
import { FiTrash2 } from 'react-icons/fi';

export default function LinhaControle({
  secaoKey,
  indice,
  local,
  quantidade,
  somenteLeitura = false,
  onQuantidadeChange,
  onEnterNoCampo,
  podeExcluir = false,
  onExcluirLocal
}) {
  const linhaAtiva = linhaPreenchida(quantidade);
  const inputKey = `${secaoKey}-${indice}`;

  return (
    <tr className={`controle-linha ${linhaAtiva ? 'preenchida' : ''}`}>
      <td className="controle-col-local">{local}</td>
      <td className="controle-col-quantidade">
        {somenteLeitura ? (
          <span className="controle-quantidade-view">{String(quantidade || '').trim() || '-'}</span>
        ) : (
          <input
            type="text"
            value={quantidade}
            onChange={(event) => onQuantidadeChange?.(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === 'NumpadEnter') {
                event.preventDefault();
                onEnterNoCampo?.(inputKey);
              }
            }}
            className="controle-quantidade-input"
            data-input-key={inputKey}
            inputMode="numeric"
            pattern="[0-9xX+ ]*"
            enterKeyHint="next"
            autoComplete="off"
          />
        )}
      </td>
      {!somenteLeitura && (
        <td className="controle-col-acoes">
          {podeExcluir ? (
            <button
              type="button"
              className="controle-remover-local-btn no-print"
              onClick={() => onExcluirLocal?.()}
              aria-label={`Excluir local ${local}`}
              title="Excluir local"
            >
              <FiTrash2 size={14} />
            </button>
          ) : (
            <span className="controle-sem-acao">-</span>
          )}
        </td>
      )}
    </tr>
  );
}
