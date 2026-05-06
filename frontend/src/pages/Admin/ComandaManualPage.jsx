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

          <article id="comanda-manual-print" className="comanda-manual-card">
            <header className="comanda-manual-topo">
              <div className="comanda-manual-titulo">R.Ribeiro</div>
              <div className="comanda-manual-subinfo">WhatsApp: (85) 99658-6824</div>
              <div className="comanda-manual-subinfo">Delivery: ribeirorestaurante.com</div>
            </header>

            <section className="comanda-manual-campos">
              <div className="comanda-manual-campo">
                <span className="comanda-manual-label">NOME</span>
                <span className="comanda-manual-valor">{nome.trim() || '-'}</span>
              </div>
              <div className="comanda-manual-campo">
                <span className="comanda-manual-label">ENDERECO</span>
                <span className="comanda-manual-valor">{endereco.trim() || '-'}</span>
              </div>
            </section>

            <section className="comanda-manual-colunas">
              <div className="comanda-manual-coluna">
                <div className="comanda-manual-coluna-titulo">PROTEINAS</div>
                <div className="comanda-manual-lista">
                  {itensProteina.map((item) => {
                    const chave = `PROTEINA-${item.id}`;
                    return (
                      <label key={chave} className="comanda-manual-item">
                        <input
                          type="checkbox"
                          checked={selecionados.has(chave)}
                          onChange={() => alternarItem(chave)}
                        />
                        <span>{item.nome || '-'}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="comanda-manual-divisor" />

              <div className="comanda-manual-coluna">
                <div className="comanda-manual-coluna-titulo">COMPLEMENTOS</div>
                <div className="comanda-manual-lista">
                  {itensComplemento.map((item) => {
                    const chave = `COMPLEMENTO-${item.id}`;
                    return (
                      <label key={chave} className="comanda-manual-item">
                        <input
                          type="checkbox"
                          checked={selecionados.has(chave)}
                          onChange={() => alternarItem(chave)}
                        />
                        <span>{item.nome || '-'}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </section>
          </article>
        </>
      )}
    </div>
  );
}

