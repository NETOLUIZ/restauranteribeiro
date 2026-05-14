import { linhaPreenchida } from './controleDiarioStorage';

export default function LinhaControle({
  secaoKey,
  indice,
  local,
  quantidade,
  somenteLeitura = false,
  onQuantidadeChange,
  onEnterNoCampo
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
    </tr>
  );
}
