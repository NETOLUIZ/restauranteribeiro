import { COMANDA_PRINT_CSS, TELEFONE_RESTAURANTE, escapeHtml } from './comandaPrint';
import {
  COMPLEMENTOS_COMANDA,
  PROTEINAS_COMANDA,
  normalizarChaveComanda,
  ordenarItensComanda
} from '../constants/comandaOrder';

const LINK_DELIVERY_COMANDA = 'ribeirorestaurante.com';

const formatarTelefoneComanda = (telefone = '') => {
  const digitos = String(telefone).replace(/\D/g, '');

  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }

  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }

  return telefone;
};

const criarSetMarcados = (itens = []) =>
  new Set(
    (Array.isArray(itens) ? itens : [])
      .map((item) => (typeof item === 'string' ? item : item?.nome || ''))
      .filter(Boolean)
      .map((item) => normalizarChaveComanda(item))
  );

const obterNomeItem = (item) => (typeof item === 'string' ? item : item?.nome || '');

const renderizarCampo = (label, valor) => `
  <div class="comanda-vazia-campo">
    <span class="comanda-vazia-label">${escapeHtml(label)}</span>
    ${
      valor
        ? `<span class="comanda-vazia-valor">${escapeHtml(valor)}</span>`
        : '<span class="comanda-vazia-linha"></span>'
    }
  </div>
`;

const gerarItensChecklist = (itens, selecionados) => {
  if (!itens.length) {
    return '<div class="comanda-vazia-item comanda-vazia-item-vazio"><span class="comanda-vazia-check"></span><span class="comanda-vazia-nome">&nbsp;</span></div>';
  }

  return itens
    .map((item) => {
      const nome = obterNomeItem(item);
      const marcado = selecionados.has(normalizarChaveComanda(nome));

      return `
        <div class="comanda-vazia-item">
          <span class="comanda-vazia-check${marcado ? ' marcado' : ''}">${marcado ? '&#10003;' : ''}</span>
          <span class="comanda-vazia-nome">${escapeHtml(nome || '-')}</span>
        </div>
      `;
    })
    .join('');
};

export const gerarHtmlComandaChecklist = ({
  tituloJanela = 'Comanda',
  nome = '',
  telefone = '',
  endereco = '',
  pagamento = '',
  observacoes = '',
  itensProteina = [],
  itensComplemento = [],
  proteinasSelecionadas = [],
  complementosSelecionados = []
} = {}) => {
  const totalLinhas = Math.max(itensProteina.length, itensComplemento.length);
  const possuiRodape = !!telefone || !!pagamento || !!observacoes;
  const densidade = totalLinhas > 10 || (possuiRodape && totalLinhas > 8)
    ? 'micro'
    : totalLinhas > 8 || (possuiRodape && totalLinhas > 6)
      ? 'compacta'
      : totalLinhas > 6
        ? 'media'
        : '';
  const whatsappComanda = formatarTelefoneComanda(TELEFONE_RESTAURANTE);
  const proteinasMarcadas = criarSetMarcados(proteinasSelecionadas);
  const complementosMarcados = criarSetMarcados(complementosSelecionados);
  const itensProteinaOrdenados = ordenarItensComanda(itensProteina, PROTEINAS_COMANDA);
  const itensComplementoOrdenados = ordenarItensComanda(itensComplemento, COMPLEMENTOS_COMANDA);

  return `
    <html>
      <head>
        <title>${escapeHtml(tituloJanela)}</title>
        <style>
          ${COMANDA_PRINT_CSS}

          .comanda-vazia-conteudo {
            width: 101mm;
            height: 66mm;
            margin: 0 auto;
            padding: 1.7mm 2.2mm;
            overflow: hidden;
            background: var(--branco);
            border: 0.45mm solid var(--preto-termico);
            border-radius: 1.5mm;
            color: var(--preto-termico);
            font-family: Arial, Helvetica, sans-serif;
            display: flex;
            flex-direction: column;
            gap: 1.05mm;
            box-shadow: none;
          }

          .comanda-vazia-topo {
            flex: 0 0 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.35mm;
            padding-bottom: 0.8mm;
            border-bottom: 0.35mm solid var(--preto-termico);
          }

          .comanda-vazia-titulo {
            font-size: 7.6mm;
            font-weight: 900;
            line-height: 0.9;
            letter-spacing: 0.35mm;
            white-space: nowrap;
          }

          .comanda-vazia-subinfo {
            font-size: 2.55mm;
            font-weight: 700;
            line-height: 1.05;
            letter-spacing: 0.08mm;
            text-align: center;
            white-space: nowrap;
          }

          .comanda-vazia-campos {
            flex: 0 0 auto;
            display: grid;
            gap: 1.1mm;
          }

          .comanda-vazia-campo {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            align-items: end;
            gap: 2mm;
          }

          .comanda-vazia-label {
            font-size: 4.1mm;
            font-weight: 900;
            line-height: 1;
          }

          .comanda-vazia-linha,
          .comanda-vazia-valor {
            min-width: 0;
            height: 3.5mm;
            border-bottom: 0.3mm solid var(--preto-termico);
          }

          .comanda-vazia-valor {
            display: flex;
            align-items: flex-end;
            overflow: hidden;
            font-size: 3.1mm;
            font-weight: 800;
            line-height: 1;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .comanda-vazia-colunas {
            flex: 1 1 auto;
            min-height: 0;
            display: grid;
            grid-template-columns: minmax(0, 1fr) 0.35mm minmax(0, 1fr);
            gap: 1.7mm;
          }

          .comanda-vazia-divisor {
            background: var(--preto-termico);
            width: 0.35mm;
            min-height: 100%;
          }

          .comanda-vazia-coluna {
            min-width: 0;
            min-height: 0;
            display: flex;
            flex-direction: column;
          }

          .comanda-vazia-coluna-titulo {
            flex: 0 0 auto;
            min-height: 5.8mm;
            border: 0.35mm solid var(--preto-termico);
            border-radius: 0.9mm;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3.55mm;
            font-weight: 900;
            line-height: 1;
            letter-spacing: 0.45mm;
            text-transform: uppercase;
            text-align: center;
          }

          .comanda-vazia-lista {
            flex: 1 1 auto;
            min-height: 0;
            display: flex;
            flex-direction: column;
            padding: 0.8mm 0.7mm 0;
          }

          .comanda-vazia-item {
            flex: 1 1 0;
            min-height: 4.7mm;
            display: grid;
            grid-template-columns: 4.8mm minmax(0, 1fr);
            align-items: center;
            gap: 1.6mm;
            border-bottom: 0.28mm dotted var(--preto-termico);
          }

          .comanda-vazia-check {
            width: 4.4mm;
            height: 4.4mm;
            border: 0.35mm solid var(--preto-termico);
            border-radius: 0.45mm;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3.3mm;
            font-weight: 900;
            line-height: 1;
          }

          .comanda-vazia-check.marcado {
            background: var(--preto-termico);
            color: var(--branco);
          }

          .comanda-vazia-nome {
            min-width: 0;
            overflow: hidden;
            color: var(--preto-termico);
            font-size: 3.55mm;
            font-weight: 900;
            line-height: 1;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .comanda-vazia-rodape {
            flex: 0 0 auto;
            display: grid;
            gap: 0.5mm;
            padding-top: 0.65mm;
            border-top: 0.3mm dotted var(--preto-termico);
          }

          .comanda-vazia-info-linha {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, 0.7fr);
            gap: 1.4mm;
          }

          .comanda-vazia-info,
          .comanda-vazia-obs {
            min-width: 0;
            overflow: hidden;
            font-size: 2.35mm;
            font-weight: 800;
            line-height: 1.1;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .comanda-vazia-obs {
            white-space: normal;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          .comanda-vazia.media .comanda-vazia-titulo {
            font-size: 7mm;
          }

          .comanda-vazia.media .comanda-vazia-subinfo {
            font-size: 2.3mm;
          }

          .comanda-vazia.media .comanda-vazia-label {
            font-size: 3.85mm;
          }

          .comanda-vazia.media .comanda-vazia-valor {
            font-size: 2.9mm;
          }

          .comanda-vazia.media .comanda-vazia-coluna-titulo {
            min-height: 5.2mm;
            font-size: 3.1mm;
            letter-spacing: 0.35mm;
          }

          .comanda-vazia.media .comanda-vazia-item {
            min-height: 4.2mm;
            grid-template-columns: 4.2mm minmax(0, 1fr);
            gap: 1.2mm;
          }

          .comanda-vazia.media .comanda-vazia-check {
            width: 3.9mm;
            height: 3.9mm;
            font-size: 2.9mm;
          }

          .comanda-vazia.media .comanda-vazia-nome {
            font-size: 3.1mm;
          }

          .comanda-vazia.compacta .comanda-vazia-conteudo {
            gap: 0.8mm;
          }

          .comanda-vazia.compacta .comanda-vazia-topo {
            gap: 0.25mm;
            padding-bottom: 0.6mm;
          }

          .comanda-vazia.compacta .comanda-vazia-titulo {
            font-size: 6.35mm;
          }

          .comanda-vazia.compacta .comanda-vazia-subinfo {
            font-size: 2.05mm;
          }

          .comanda-vazia.compacta .comanda-vazia-campos {
            gap: 0.95mm;
          }

          .comanda-vazia.compacta .comanda-vazia-label {
            font-size: 3.4mm;
          }

          .comanda-vazia.compacta .comanda-vazia-linha,
          .comanda-vazia.compacta .comanda-vazia-valor {
            height: 2.9mm;
          }

          .comanda-vazia.compacta .comanda-vazia-valor {
            font-size: 2.5mm;
          }

          .comanda-vazia.compacta .comanda-vazia-coluna-titulo {
            min-height: 4.6mm;
            font-size: 2.75mm;
            letter-spacing: 0.2mm;
          }

          .comanda-vazia.compacta .comanda-vazia-lista {
            padding-top: 0.55mm;
          }

          .comanda-vazia.compacta .comanda-vazia-item {
            min-height: 3.45mm;
            grid-template-columns: 3.5mm minmax(0, 1fr);
            gap: 0.95mm;
          }

          .comanda-vazia.compacta .comanda-vazia-check {
            width: 3.1mm;
            height: 3.1mm;
            font-size: 2.35mm;
          }

          .comanda-vazia.compacta .comanda-vazia-nome {
            font-size: 2.6mm;
          }

          .comanda-vazia.compacta .comanda-vazia-info,
          .comanda-vazia.compacta .comanda-vazia-obs {
            font-size: 2.05mm;
          }

          .comanda-vazia.micro .comanda-vazia-conteudo {
            padding: 1.35mm 1.8mm;
            gap: 0.55mm;
          }

          .comanda-vazia.micro .comanda-vazia-topo {
            gap: 0.2mm;
            padding-bottom: 0.45mm;
          }

          .comanda-vazia.micro .comanda-vazia-titulo {
            font-size: 5.75mm;
          }

          .comanda-vazia.micro .comanda-vazia-subinfo {
            font-size: 1.85mm;
          }

          .comanda-vazia.micro .comanda-vazia-campos {
            gap: 0.65mm;
          }

          .comanda-vazia.micro .comanda-vazia-label {
            font-size: 3.05mm;
          }

          .comanda-vazia.micro .comanda-vazia-linha,
          .comanda-vazia.micro .comanda-vazia-valor {
            height: 2.45mm;
          }

          .comanda-vazia.micro .comanda-vazia-valor {
            font-size: 2.2mm;
          }

          .comanda-vazia.micro .comanda-vazia-colunas {
            gap: 1.2mm;
          }

          .comanda-vazia.micro .comanda-vazia-coluna-titulo {
            min-height: 4mm;
            font-size: 2.3mm;
            letter-spacing: 0.08mm;
          }

          .comanda-vazia.micro .comanda-vazia-lista {
            padding: 0.35mm 0.3mm 0;
          }

          .comanda-vazia.micro .comanda-vazia-item {
            min-height: 0;
            grid-template-columns: 2.85mm minmax(0, 1fr);
            gap: 0.7mm;
          }

          .comanda-vazia.micro .comanda-vazia-check {
            width: 2.5mm;
            height: 2.5mm;
            border-width: 0.28mm;
            font-size: 1.8mm;
          }

          .comanda-vazia.micro .comanda-vazia-nome {
            font-size: 2.1mm;
          }

          .comanda-vazia.micro .comanda-vazia-info,
          .comanda-vazia.micro .comanda-vazia-obs {
            font-size: 1.8mm;
          }

          @media print {
            .comanda-vazia-conteudo {
              width: 101mm !important;
              height: 66mm !important;
              margin: 0 auto !important;
              overflow: hidden !important;
              border-color: var(--preto-termico) !important;
              background: var(--branco) !important;
              box-shadow: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-area">
          <article class="comanda comanda-vazia ${densidade}">
            <div class="comanda-vazia-conteudo">
              <header class="comanda-vazia-topo">
                <div class="comanda-vazia-titulo">R.Ribeiro</div>
                <div class="comanda-vazia-subinfo">WhatsApp: ${escapeHtml(whatsappComanda)}</div>
                <div class="comanda-vazia-subinfo">Delivery: ${escapeHtml(LINK_DELIVERY_COMANDA)}</div>
              </header>

              <section class="comanda-vazia-campos">
                ${renderizarCampo('Nome:', nome)}
                ${renderizarCampo('Endereco:', endereco)}
              </section>

              <section class="comanda-vazia-colunas">
                <div class="comanda-vazia-coluna">
                  <div class="comanda-vazia-coluna-titulo">PROTEINAS</div>
                  <div class="comanda-vazia-lista">
                    ${gerarItensChecklist(itensProteinaOrdenados, proteinasMarcadas)}
                  </div>
                </div>
                <div class="comanda-vazia-divisor"></div>
                <div class="comanda-vazia-coluna">
                  <div class="comanda-vazia-coluna-titulo">COMPLEMENTOS</div>
                  <div class="comanda-vazia-lista">
                    ${gerarItensChecklist(itensComplementoOrdenados, complementosMarcados)}
                  </div>
                </div>
              </section>

              ${
                possuiRodape
                  ? `
                    <footer class="comanda-vazia-rodape">
                      <div class="comanda-vazia-info-linha">
                        <div class="comanda-vazia-info"><strong>Tel:</strong> ${escapeHtml(telefone || '-')}</div>
                        <div class="comanda-vazia-info"><strong>Pgto:</strong> ${escapeHtml(pagamento || '-')}</div>
                      </div>
                      ${
                        observacoes
                          ? `<div class="comanda-vazia-obs"><strong>Obs:</strong> ${escapeHtml(observacoes)}</div>`
                          : ''
                      }
                    </footer>
                  `
                  : ''
              }
            </div>
          </article>
        </div>
      </body>
    </html>
  `;
};

const extrairCardComandaChecklist = (html = '') => {
  const match = String(html).match(/<article class="comanda-vazia[\s\S]*?<\/article>/i);
  return match?.[0] || '';
};

const substituirCardsHtml = (htmlBase = '', cardsHtml = '') =>
  String(htmlBase).replace(
    /<div class="print-area">[\s\S]*?<\/div>/i,
    `<div class="print-area">${cardsHtml}</div>`
  );

export const gerarHtmlComandasChecklist = (lista = []) => {
  const comandas = Array.isArray(lista) ? lista.filter(Boolean) : [];

  if (!comandas.length) {
    return gerarHtmlComandaChecklist();
  }

  const htmlBase = gerarHtmlComandaChecklist(comandas[0]);
  const cardsHtml = comandas
    .map((dadosComanda) => extrairCardComandaChecklist(gerarHtmlComandaChecklist(dadosComanda)))
    .join('');

  return substituirCardsHtml(htmlBase, cardsHtml);
};

export const abrirImpressaoComandaChecklist = (dados = {}) => {
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    throw new Error('Bloqueador de pop-up ativo');
  }

  printWindow.document.write(gerarHtmlComandaChecklist(dados));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

export const abrirImpressaoComandasChecklist = (lista = []) => {
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    throw new Error('Bloqueador de pop-up ativo');
  }

  printWindow.document.write(gerarHtmlComandasChecklist(lista));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};
