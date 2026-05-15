import LinhaControle from './LinhaControle';

export default function PlanilhaRegiao({
  secaoKey,
  titulo,
  linhas = [],
  somenteLeitura = false,
  onAtualizarQuantidade,
  onEnterNoCampo,
  colunaLocalTitulo = 'Local',
  onAdicionarLocal,
  onExcluirLocal,
  podeExcluirLocal
}) {
  return (
    <section className="controle-regiao">
      <div className="controle-regiao-header">
        <h3>{titulo}</h3>
        {!somenteLeitura && (
          <button
            type="button"
            className="controle-add-local-btn no-print"
            onClick={() => onAdicionarLocal?.()}
          >
            + Adicionar Local
          </button>
        )}
      </div>

      <div className="controle-tabela-wrapper">
        <table className="controle-tabela" aria-label={`Tabela ${titulo}`}>
          <thead>
            <tr>
              <th>{colunaLocalTitulo}</th>
              <th>Quantidade</th>
              {!somenteLeitura && <th>Acoes</th>}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, indice) => (
              <LinhaControle
                key={`${secaoKey}-${linha.local}-${indice}`}
                secaoKey={secaoKey}
                indice={indice}
                local={linha.local}
                quantidade={linha.quantidade}
                somenteLeitura={somenteLeitura}
                onQuantidadeChange={(valor) => onAtualizarQuantidade?.(indice, valor)}
                onEnterNoCampo={onEnterNoCampo}
                podeExcluir={Boolean(podeExcluirLocal?.(indice, linha))}
                onExcluirLocal={() => onExcluirLocal?.(indice, linha)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
