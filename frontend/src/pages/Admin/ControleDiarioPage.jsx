import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiPrinter, FiRefreshCw, FiSave, FiTrash2 } from 'react-icons/fi';
import PlanilhaRegiao from '../../components/controle/PlanilhaRegiao';
import ResumoControle from '../../components/controle/ResumoControle';
import {
  calcularTotaisControle,
  carregarControleDiario,
  carregarHistoricoControles,
  formatarDataControle,
  limparQuantidadesControle,
  localEhFixo,
  nomesSecoesControle,
  obterDataHojeISO,
  salvarControleDiario
} from '../../components/controle/controleDiarioStorage';
import '../../styles/controleDiario.css';

export default function ControleDiarioPage() {
  const [dataControle, setDataControle] = useState(() => obterDataHojeISO());
  const [estadoControle, setEstadoControle] = useState(() => ({
    data: obterDataHojeISO(),
    updatedAt: null,
    secoes: limparQuantidadesControle()
  }));
  const [historicoDatas, setHistoricoDatas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvandoAutomatico, setSalvandoAutomatico] = useState(false);
  const [statusOperacao, setStatusOperacao] = useState('');
  const autoSaveTimerRef = useRef(null);
  const snapshotUltimoSalvoRef = useRef('');
  const prontoParaAutoSaveRef = useRef(false);

  const atualizarHistoricoLocal = useCallback((dataIso, updatedAt) => {
    if (!dataIso) return;
    setHistoricoDatas((atual) => {
      const semAtual = atual.filter((item) => item.data !== dataIso);
      return [{ data: dataIso, updatedAt: updatedAt || null }, ...semAtual]
        .sort((a, b) => String(b.data).localeCompare(String(a.data)))
        .slice(0, 120);
    });
  }, []);

  const carregarHistorico = useCallback(async () => {
    const historico = await carregarHistoricoControles(120);
    setHistoricoDatas(historico);
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregarDadosIniciais() {
      prontoParaAutoSaveRef.current = false;
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
      setCarregando(true);
      const [carregado, historico] = await Promise.all([
        carregarControleDiario(dataControle),
        carregarHistoricoControles(120)
      ]);
      if (!ativo) return;
      setEstadoControle(carregado);
      setHistoricoDatas(historico);
      snapshotUltimoSalvoRef.current = JSON.stringify(carregado?.secoes || {});
      prontoParaAutoSaveRef.current = true;
      setCarregando(false);
    }

    carregarDadosIniciais();

    return () => {
      ativo = false;
    };
  }, [dataControle]);

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
    setStatusOperacao('Alteracoes pendentes. Salvamento automatico em andamento.');
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

    setStatusOperacao(`Local "${nome}" adicionado. Salvamento automatico em andamento.`);
  };

  const removerLocal = (secaoKey, indice, linha) => {
    const nomeLocal = String(linha?.local || '').trim();
    if (!nomeLocal) return;

    if (localEhFixo(secaoKey, nomeLocal)) {
      setStatusOperacao(`O local "${nomeLocal}" e fixo e nao pode ser excluido.`);
      return;
    }

    const confirmar = window.confirm(`Excluir o local "${nomeLocal}"?`);
    if (!confirmar) return;

    setEstadoControle((atual) => {
      const linhas = Array.isArray(atual?.secoes?.[secaoKey]) ? atual.secoes[secaoKey] : [];
      const proximaSecao = linhas.filter((_, idx) => idx !== indice);
      return {
        ...atual,
        secoes: {
          ...atual.secoes,
          [secaoKey]: proximaSecao
        }
      };
    });
    setStatusOperacao(`Local "${nomeLocal}" excluido. Salvamento automatico em andamento.`);
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

  const salvarControle = useCallback(async (secoesParaSalvar, { origem = 'manual' } = {}) => {
    try {
      if (origem === 'auto') {
        setSalvandoAutomatico(true);
      }
      const salvo = await salvarControleDiario({
        dataIso: dataControle,
        secoes: secoesParaSalvar
      });
      snapshotUltimoSalvoRef.current = JSON.stringify(salvo?.secoes || {});
      setEstadoControle((atual) => ({ ...atual, updatedAt: salvo.updatedAt, secoes: salvo.secoes }));
      atualizarHistoricoLocal(salvo?.data || dataControle, salvo?.updatedAt);

      if (origem === 'manual') {
        setStatusOperacao('Controle salvo com sucesso.');
      } else {
        const horario = new Date().toLocaleTimeString('pt-BR');
        setStatusOperacao(`Salvo automaticamente as ${horario}.`);
      }
    } catch (erro) {
      const controleLocal = erro?.localControle;
      if (controleLocal) {
        snapshotUltimoSalvoRef.current = JSON.stringify(controleLocal?.secoes || {});
        setEstadoControle(controleLocal);
      }
      setStatusOperacao('Erro ao sincronizar com o servidor. Controle salvo apenas neste aparelho.');
    } finally {
      if (origem === 'auto') {
        setSalvandoAutomatico(false);
      }
    }
  }, [atualizarHistoricoLocal, dataControle]);

  const limparControle = () => {
    const confirmar = window.confirm('Limpar todas as quantidades preenchidas de hoje?');
    if (!confirmar) return;

    setEstadoControle((atual) => ({
      ...atual,
      secoes: limparQuantidadesControle(atual.secoes)
    }));
    setStatusOperacao('Quantidades limpas. Salvamento automatico em andamento.');
  };

  const atualizarDados = async () => {
    setCarregando(true);
    const [carregado] = await Promise.all([
      carregarControleDiario(dataControle),
      carregarHistorico()
    ]);
    setEstadoControle(carregado);
    snapshotUltimoSalvoRef.current = JSON.stringify(carregado?.secoes || {});
    prontoParaAutoSaveRef.current = true;
    setCarregando(false);
    setStatusOperacao('Dados recarregados do ultimo salvamento.');
  };

  const imprimirControle = () => {
    document.body.classList.add('print-controle-diario');
    window.print();
    window.setTimeout(() => {
      document.body.classList.remove('print-controle-diario');
    }, 300);
  };

  const selecionarData = (proximaData) => {
    const valor = String(proximaData || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return;
    setDataControle(valor);
    setStatusOperacao('');
  };

  useEffect(() => {
    if (!prontoParaAutoSaveRef.current || carregando) return;

    const snapshotAtual = JSON.stringify(estadoControle?.secoes || {});
    if (snapshotAtual === snapshotUltimoSalvoRef.current) return;

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setTimeout(() => {
      salvarControle(estadoControle.secoes, { origem: 'auto' });
    }, 900);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [estadoControle.secoes, carregando, salvarControle]);

  return (
    <div id="controle-diario-admin" className="controle-diario-page">
      <div className="controle-diario-toolbar no-print">
        <div>
          <h2>Controle Diario de Producao</h2>
          <p className="controle-diario-meta">
            Data: <strong>{formatarDataControle(dataControle)}</strong>
            {estadoControle.updatedAt ? ` | Ultima atualizacao: ${new Date(estadoControle.updatedAt).toLocaleTimeString('pt-BR')}` : ''}
          </p>
          <div className="controle-diario-filtro-data no-print">
            <label htmlFor="controle-diario-data">Data</label>
            <input
              id="controle-diario-data"
              type="date"
              value={dataControle}
              onChange={(event) => selecionarData(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => selecionarData(obterDataHojeISO())}
            >
              Hoje
            </button>
            {historicoDatas.length > 0 && (
              <select
                value={dataControle}
                onChange={(event) => selecionarData(event.target.value)}
                aria-label="Historico de controles"
              >
                {historicoDatas.map((item) => (
                  <option key={item.data} value={item.data}>
                    {formatarDataControle(item.data)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="controle-diario-toolbar-acoes">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => salvarControle(estadoControle.secoes, { origem: 'manual' })}
            id="btn-salvar-controle-diario"
          >
            <FiSave size={16} /> Salvar Agora
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

      {salvandoAutomatico && (
        <div className="controle-diario-status no-print" role="status">
          Salvando automaticamente...
        </div>
      )}

      {carregando && (
        <div className="controle-diario-status no-print" role="status">
          Carregando controle diario...
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
            onExcluirLocal={(indice, linha) => removerLocal('fortaleza', indice, linha)}
            podeExcluirLocal={(_, linha) => !localEhFixo('fortaleza', linha?.local)}
            colunaLocalTitulo="Local"
          />

          <PlanilhaRegiao
            secaoKey="eusebio"
            titulo="Eusebio"
            linhas={secoes.eusebio}
            onAtualizarQuantidade={(indice, valor) => atualizarQuantidade('eusebio', indice, valor)}
            onEnterNoCampo={focarProximoCampo}
            onAdicionarLocal={() => adicionarLocal('eusebio')}
            onExcluirLocal={(indice, linha) => removerLocal('eusebio', indice, linha)}
            podeExcluirLocal={(_, linha) => !localEhFixo('eusebio', linha?.local)}
            colunaLocalTitulo="Local"
          />

          <PlanilhaRegiao
            secaoKey="entidades"
            titulo="Outros / Entidades"
            linhas={secoes.entidades}
            onAtualizarQuantidade={(indice, valor) => atualizarQuantidade('entidades', indice, valor)}
            onEnterNoCampo={focarProximoCampo}
            onAdicionarLocal={() => adicionarLocal('entidades')}
            onExcluirLocal={(indice, linha) => removerLocal('entidades', indice, linha)}
            podeExcluirLocal={(_, linha) => !localEhFixo('entidades', linha?.local)}
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
