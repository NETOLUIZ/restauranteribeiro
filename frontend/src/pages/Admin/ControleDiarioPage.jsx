import { useMemo, useState } from 'react';
import { FiPrinter, FiRefreshCw, FiSave, FiTrash2 } from 'react-icons/fi';
import PlanilhaRegiao from '../../components/controle/PlanilhaRegiao';
import ResumoControle from '../../components/controle/ResumoControle';
import {
  calcularTotaisControle,
  carregarControleDiario,
  formatarDataControle,
  limparQuantidadesControle,
  nomesSecoesControle,
  obterDataHojeISO,
  salvarControleDiario
} from '../../components/controle/controleDiarioStorage';
import '../../styles/controleDiario.css';

export default function ControleDiarioPage() {
  const [dataControle] = useState(() => obterDataHojeISO());
  const [estadoControle, setEstadoControle] = useState(() => carregarControleDiario(dataControle));
  const [statusOperacao, setStatusOperacao] = useState('');

  const secoes = estadoControle.secoes;
  const { totaisPorSecao, totalGeral } = useMemo(
    () => calcularTotaisControle(secoes),
    [secoes]
  );

  const atualizarQuantidade = (secaoKey, indice, valor) => {
    setEstadoControle((atual) => {
      const linhas = Array.isArray(atual?.secoes?.[secaoKey]) ? atual.secoes[secaoKey] : [];
      const proximaSecao = linhas.map((item, idx) =>
        idx === indice ? { ...item, quantidade: String(valor || '').slice(0, 10) } : item
      );

      return {
        ...atual,
        secoes: {
          ...atual.secoes,
          [secaoKey]: proximaSecao
        }
      };
    });
    setStatusOperacao('');
  };

  const adicionarLocal = (secaoKey) => {
    const nomeInformado = window.prompt('Digite o nome/codigo do novo local:');
    const nome = String(nomeInformado || '').trim();
    if (!nome) return;

    let localDuplicado = false;
    setEstadoControle((atual) => {
      const linhas = Array.isArray(atual?.secoes?.[secaoKey]) ? atual.secoes[secaoKey] : [];
      const chaveNovo = nome.toLowerCase();
      const jaExiste = linhas.some((item) => String(item?.local || '').trim().toLowerCase() === chaveNovo);
      if (jaExiste) {
        localDuplicado = true;
        return atual;
      }

      return {
        ...atual,
        secoes: {
          ...atual.secoes,
          [secaoKey]: [...linhas, { local: nome, quantidade: '' }]
        }
      };
    });

    if (localDuplicado) {
      setStatusOperacao(`O local "${nome}" ja existe em ${nomesSecoesControle[secaoKey] || secaoKey}.`);
      return;
    }

    setStatusOperacao(`Local "${nome}" adicionado. Clique em Salvar Controle para persistir.`);
  };

  const focarProximoCampo = (inputKeyAtual) => {
    const selector = '[data-input-key]';
    const campos = Array.from(document.querySelectorAll(selector));
    const indiceAtual = campos.findIndex((campo) => campo.getAttribute('data-input-key') === inputKeyAtual);
    const proximoCampo = indiceAtual >= 0 ? campos[indiceAtual + 1] : null;
    if (proximoCampo) {
      proximoCampo.focus();
      proximoCampo.select?.();
    }
  };

  const salvarControle = () => {
    const salvo = salvarControleDiario({
      dataIso: dataControle,
      secoes: estadoControle.secoes
    });
    setEstadoControle((atual) => ({ ...atual, updatedAt: salvo.updatedAt, secoes: salvo.secoes }));
    setStatusOperacao('Controle salvo com sucesso.');
  };

  const limparControle = () => {
    const confirmar = window.confirm('Limpar todas as quantidades preenchidas de hoje?');
    if (!confirmar) return;

    setEstadoControle((atual) => ({
      ...atual,
      secoes: limparQuantidadesControle(atual.secoes)
    }));
    setStatusOperacao('Quantidades limpas. Clique em Salvar Controle para persistir.');
  };

  const atualizarDados = () => {
    setEstadoControle(carregarControleDiario(dataControle));
    setStatusOperacao('Dados recarregados do ultimo salvamento.');
  };

  const imprimirControle = () => {
    document.body.classList.add('print-controle-diario');
    window.print();
    window.setTimeout(() => {
      document.body.classList.remove('print-controle-diario');
    }, 300);
  };

  return (
    <div id="controle-diario-admin" className="controle-diario-page">
      <div className="controle-diario-toolbar no-print">
        <div>
          <h2>Controle Diario de Producao</h2>
          <p className="controle-diario-meta">
            Data: <strong>{formatarDataControle(dataControle)}</strong>
            {estadoControle.updatedAt ? ` | Ultima atualizacao: ${new Date(estadoControle.updatedAt).toLocaleTimeString('pt-BR')}` : ''}
          </p>
        </div>
        <div className="controle-diario-toolbar-acoes">
          <button type="button" className="btn btn-primary" onClick={salvarControle} id="btn-salvar-controle-diario">
            <FiSave size={16} /> Salvar Controle
          </button>
          <button type="button" className="btn btn-secondary" onClick={limparControle} id="btn-limpar-controle-diario">
            <FiTrash2 size={16} /> Limpar Quantidades
          </button>
          <button type="button" className="btn btn-secondary" onClick={imprimirControle} id="btn-imprimir-controle-diario">
            <FiPrinter size={16} /> Imprimir Controle
          </button>
          <button type="button" className="btn btn-secondary" onClick={atualizarDados} id="btn-atualizar-controle-diario">
            <FiRefreshCw size={16} /> Atualizar
          </button>
        </div>
      </div>

      {statusOperacao && (
        <div className="controle-diario-status no-print" role="status">
          {statusOperacao}
        </div>
      )}

      <div className="controle-diario-content print-area">
        <div className="controle-diario-planilhas">
          <PlanilhaRegiao
            secaoKey="fortaleza"
            titulo="Fortaleza"
            linhas={secoes.fortaleza}
            onAtualizarQuantidade={(indice, valor) => atualizarQuantidade('fortaleza', indice, valor)}
            onEnterNoCampo={focarProximoCampo}
            onAdicionarLocal={() => adicionarLocal('fortaleza')}
            colunaLocalTitulo="Local"
          />

          <PlanilhaRegiao
            secaoKey="eusebio"
            titulo="Eusebio"
            linhas={secoes.eusebio}
            onAtualizarQuantidade={(indice, valor) => atualizarQuantidade('eusebio', indice, valor)}
            onEnterNoCampo={focarProximoCampo}
            onAdicionarLocal={() => adicionarLocal('eusebio')}
            colunaLocalTitulo="Local"
          />

          <PlanilhaRegiao
            secaoKey="entidades"
            titulo="Outros / Entidades"
            linhas={secoes.entidades}
            onAtualizarQuantidade={(indice, valor) => atualizarQuantidade('entidades', indice, valor)}
            onEnterNoCampo={focarProximoCampo}
            onAdicionarLocal={() => adicionarLocal('entidades')}
            colunaLocalTitulo="Entidade"
          />
        </div>

        <ResumoControle
          totaisPorSecao={totaisPorSecao}
          totalGeral={totalGeral}
          nomesSecoes={nomesSecoesControle}
        />
      </div>
    </div>
  );
}
