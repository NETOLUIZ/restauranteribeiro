import { useEffect, useMemo, useState } from 'react';
import { cardapioAPI } from '../../services/api';
import '../../styles/comandaManualPage.css';

const INTERVALO_ATUALIZACAO_MS = 8000;

const normalizarTexto = (valor = '') =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const ehProteina = (item = {}) => {
  const tipo = normalizarTexto(item.tipo);
  const categoria = normalizarTexto(item.categoria);
  return tipo === 'proteina' || categoria === 'proteinas';
};

const ehComplemento = (item = {}) => {
  const tipo = normalizarTexto(item.tipo);
  const categoria = normalizarTexto(item.categoria);
  return tipo === 'complemento' || categoria === 'complementos';
};

export default function ComandaManualPage() {
  const [carregando, setCarregando] = useState(true);
  const [itensCardapio, setItensCardapio] = useState([]);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [selecionados, setSelecionados] = useState(() => new Set());

  useEffect(() => {
    let ativo = true;

    const carregarCardapio = async (silencioso = false) => {
      if (!silencioso && ativo) setCarregando(true);

      try {
        const { data } = await cardapioAPI.listarAtivos();
        if (!ativo) return;
        setItensCardapio(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Erro ao carregar cardapio manual:', err);
        if (ativo) setItensCardapio([]);
      } finally {
        if (!silencioso && ativo) setCarregando(false);
      }
    };

    carregarCardapio(false);
    const intervalo = window.setInterval(() => {
      carregarCardapio(true);
    }, INTERVALO_ATUALIZACAO_MS);

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, []);

  const itensProteina = useMemo(
    () => itensCardapio.filter((item) => ehProteina(item)),
    [itensCardapio]
  );
  const itensComplemento = useMemo(
    () => itensCardapio.filter((item) => ehComplemento(item)),
    [itensCardapio]
  );
  const semCardapio = !itensProteina.length && !itensComplemento.length;

  const alternarItem = (chaveItem) => {
    setSelecionados((anterior) => {
      const proximo = new Set(anterior);
      if (proximo.has(chaveItem)) {
        proximo.delete(chaveItem);
      } else {
        proximo.add(chaveItem);
      }
      return proximo;
    });
  };

  if (carregando) {
    return (
      <div id="comanda-manual-page">
        <p className="comanda-manual-loading">Carregando cardapio...</p>
      </div>
    );
  }

  return (
    <div id="comanda-manual-page">
      {semCardapio ? (
        <div className="comanda-manual-empty">
          Nenhum cardapio do dia cadastrado. Atualize o cardapio no admin.
        </div>
      ) : (
        <>
          <div className="comanda-manual-actions no-print">
            <div className="comanda-manual-fields">
              <label htmlFor="comanda-manual-nome">
                Nome
                <input
                  id="comanda-manual-nome"
                  className="form-input"
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  placeholder="Digite o nome"
                />
              </label>
              <label htmlFor="comanda-manual-endereco">
                Endereco
                <input
                  id="comanda-manual-endereco"
                  className="form-input"
                  value={endereco}
                  onChange={(event) => setEndereco(event.target.value)}
                  placeholder="Digite o endereco"
                />
              </label>
            </div>
            <button className="btn btn-primary" onClick={() => window.print()} id="btn-imprimir-comanda-manual">
              Imprimir Comanda
            </button>
          </div>

          <div className="comanda-manual-preview">
            <div className="comanda-manual-stage">
              <article id="comanda-manual-print" className="comanda-manual-print comanda comanda-vazia">
                <div className="comanda-vazia-conteudo">
                <header className="comanda-vazia-topo">
                  <div className="comanda-vazia-titulo">R.Ribeiro</div>
                  <div className="comanda-vazia-subinfo">WhatsApp: (85) 99658-6824</div>
                  <div className="comanda-vazia-subinfo">Delivery: ribeirorestaurante.com</div>
                </header>

                <section className="comanda-vazia-campos">
                  <div className="comanda-vazia-campo">
                    <span className="comanda-vazia-label">Nome:</span>
                    {nome.trim()
                      ? <span className="comanda-vazia-valor">{nome.trim()}</span>
                      : <span className="comanda-vazia-linha"></span>}
                  </div>
                  <div className="comanda-vazia-campo">
                    <span className="comanda-vazia-label">Endereco:</span>
                    {endereco.trim()
                      ? <span className="comanda-vazia-valor">{endereco.trim()}</span>
                      : <span className="comanda-vazia-linha"></span>}
                  </div>
                </section>

                <section className="comanda-vazia-colunas">
                  <div className="comanda-vazia-coluna">
                    <div className="comanda-vazia-coluna-titulo">PROTEINAS</div>
                    <div className="comanda-vazia-lista">
                      {itensProteina.map((item) => {
                        const chave = `PROTEINA-${item.id}`;
                        return (
                          <label key={chave} className="comanda-vazia-item comanda-vazia-item-input">
                            <input
                              type="checkbox"
                              checked={selecionados.has(chave)}
                              onChange={() => alternarItem(chave)}
                            />
                            <span className="comanda-vazia-nome">{item.nome || '-'}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="comanda-vazia-divisor"></div>

                  <div className="comanda-vazia-coluna">
                    <div className="comanda-vazia-coluna-titulo">COMPLEMENTOS</div>
                    <div className="comanda-vazia-lista">
                      {itensComplemento.map((item) => {
                        const chave = `COMPLEMENTO-${item.id}`;
                        return (
                          <label key={chave} className="comanda-vazia-item comanda-vazia-item-input">
                            <input
                              type="checkbox"
                              checked={selecionados.has(chave)}
                              onChange={() => alternarItem(chave)}
                            />
                            <span className="comanda-vazia-nome">{item.nome || '-'}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </section>
                </div>
              </article>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
