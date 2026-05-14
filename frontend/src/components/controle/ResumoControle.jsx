export default function ResumoControle({
  totaisPorSecao = {},
  totalGeral = 0,
  nomesSecoes = {},
  ocultarTotalGeral = false
}) {
  const secoes = Object.keys(nomesSecoes);

  return (
    <aside className="controle-resumo">
      <h3>Resumo do Dia</h3>
      <div className="controle-resumo-grid">
        {secoes.map((secao) => (
          <div key={secao} className="controle-resumo-card">
            <span>{nomesSecoes[secao]}</span>
            <strong>{totaisPorSecao?.[secao] || 0}</strong>
          </div>
        ))}
      </div>
      {!ocultarTotalGeral && (
        <div className="controle-total-geral">
          <span>Total Geral</span>
          <strong>{totalGeral}</strong>
        </div>
      )}
    </aside>
  );
}
