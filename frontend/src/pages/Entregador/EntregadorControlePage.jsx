import { useEffect, useMemo, useState } from 'react';
import { FiLogOut, FiPrinter, FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import PlanilhaRegiao from '../../components/controle/PlanilhaRegiao';
import {
  calcularTotaisControle,
  carregarControleDiario,
  carregarControleDiarioMaisRecente,
  filtrarSomenteLinhasPreenchidas,
  formatarDataControle,
  obterDataHojeISO
} from '../../components/controle/controleDiarioStorage';
import { sairAreaEntregador } from '../../components/controle/entregadorAccess';
import '../../styles/controleDiario.css';

export default function EntregadorControlePage() {
  const navigate = useNavigate();
  const [estadoControle, setEstadoControle] = useState(() => ({
    data: obterDataHojeISO(),
    updatedAt: null,
    secoes: {}
  }));
  const [carregando, setCarregando] = useState(true);

  const carregarControleParaEntregador = async () => {
    const hoje = obterDataHojeISO();
    const controleHoje = await carregarControleDiario(hoje);
    const secoesHoje = filtrarSomenteLinhasPreenchidas(controleHoje.secoes);
    const temDadosHoje =
      (secoesHoje.fortaleza?.length || 0) +
      (secoesHoje.eusebio?.length || 0) +
      (secoesHoje.entidades?.length || 0) > 0;

    if (temDadosHoje) return controleHoje;
    return carregarControleDiarioMaisRecente();
  };

  useEffect(() => {
    let ativo = true;

    async function carregarInicial() {
      setCarregando(true);
      const controle = await carregarControleParaEntregador();
      if (!ativo) return;
      setEstadoControle(controle);
      setCarregando(false);
    }

    carregarInicial();

    return () => {
      ativo = false;
    };
  }, []);

  const secoesPreenchidas = useMemo(
    () => filtrarSomenteLinhasPreenchidas(estadoControle.secoes),
    [estadoControle.secoes]
  );

  const { totaisPorSecao } = useMemo(
    () => calcularTotaisControle(estadoControle.secoes),
    [estadoControle.secoes]
  );

  const atualizar = async () => {
    setCarregando(true);
    const controle = await carregarControleParaEntregador();
    setEstadoControle(controle);
    setCarregando(false);
  };

  const imprimirControle = () => {
    document.body.classList.add('print-controle-diario');
    window.print();
    window.setTimeout(() => {
      document.body.classList.remove('print-controle-diario');
    }, 300);
  };

  const sair = () => {
    sairAreaEntregador();
    navigate('/entregador/login', { replace: true });
  };

  const linhasFortaleza = secoesPreenchidas.fortaleza || [];
  const linhasEusebio = secoesPreenchidas.eusebio || [];
  const linhasEntidades = secoesPreenchidas.entidades || [];
  const temDados = linhasFortaleza.length || linhasEusebio.length || linhasEntidades.length;

  return (
    <>
      <Navbar />
      <div id="controle-diario-entregador" className="controle-diario-page controle-diario-page-entregador">
        <div className="container">
          <div className="controle-diario-toolbar no-print">
            <div>
              <h2>Controle de Entrega</h2>
              <p className="controle-diario-meta">
                Data: <strong>{formatarDataControle(estadoControle.data)}</strong>
              </p>
            </div>
            <div className="controle-diario-toolbar-acoes">
              <button type="button" className="btn btn-secondary" onClick={imprimirControle} id="btn-imprimir-rota-entregador">
                <FiPrinter size={16} /> Imprimir Rota
              </button>
              <button type="button" className="btn btn-primary" onClick={atualizar} id="btn-atualizar-rota-entregador">
                <FiRefreshCw size={16} /> Atualizar
              </button>
              <button type="button" className="btn btn-secondary" onClick={sair} id="btn-sair-rota-entregador">
                <FiLogOut size={16} /> Sair
              </button>
            </div>
          </div>

          <div className="controle-diario-content controle-diario-content-somente-lista print-area">
            <div className="controle-diario-planilhas">
              {carregando ? (
                <div className="controle-vazio">
                  Carregando controle diario...
                </div>
              ) : temDados ? (
                <>
                  {linhasFortaleza.length > 0 && (
                    <>
                      <PlanilhaRegiao
                        secaoKey="fortaleza-view"
                        titulo="Fortaleza"
                        linhas={linhasFortaleza}
                        somenteLeitura
                        colunaLocalTitulo="Local"
                      />
                    </>
                  )}

                  {linhasEusebio.length > 0 && (
                    <>
                      <PlanilhaRegiao
                        secaoKey="eusebio-view"
                        titulo="Eusebio"
                        linhas={linhasEusebio}
                        somenteLeitura
                        colunaLocalTitulo="Local"
                      />
                    </>
                  )}

                  {linhasEntidades.length > 0 && (
                    <>
                      <PlanilhaRegiao
                        secaoKey="entidades-view"
                        titulo="Outros / Entidades"
                        linhas={linhasEntidades}
                        somenteLeitura
                        colunaLocalTitulo="Entidade"
                      />
                      <div className="controle-total-secao">Total Entidades: <strong>{totaisPorSecao.entidades || 0}</strong></div>
                    </>
                  )}
                </>
              ) : (
                <div className="controle-vazio">
                  Nenhuma quantidade preenchida para hoje. Aguarde o admin salvar o controle diario.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
