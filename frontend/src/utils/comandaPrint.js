export const TELEFONE_RESTAURANTE = '85996586824';

export const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const COMANDA_PRINT_CSS = `
  :root {
    --preto-termico: #000000;
    --branco: #FFFFFF;
  }

  /* Papel real da Elgin L42PRO: etiqueta horizontal 105mm x 70mm. */
  @page {
    size: 105mm 70mm;
    margin: 0;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    width: 105mm;
    height: 70mm;
    margin: 0;
    padding: 0;
    overflow: visible;
    background: var(--branco);
    color: var(--preto-termico);
    font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    display: block;
  }

  .print-area {
    width: 105mm;
    height: auto;
    margin: 0;
    padding: 0;
    overflow: visible;
    background: var(--branco);
  }

  /* Etiqueta inteira. Sem rotacao, sem escala e sem margem externa. */
  .comanda {
    width: 105mm;
    height: 70mm;
    margin: 0;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: var(--branco);
    color: var(--preto-termico);
    page-break-inside: avoid;
    break-inside: avoid;
    box-shadow: none;
    text-shadow: none;
  }

  /* Conteudo centralizado e com borda forte para leitura em impressora termica. */
  .comanda-conteudo {
    width: 101mm;
    height: 66mm;
    margin: 0 auto;
    padding: 1mm 1.25mm;
    display: flex;
    flex-direction: column;
    gap: 0.8mm;
    overflow: hidden;
    background: var(--branco);
    border: 0.45mm solid var(--preto-termico);
    border-radius: 1.3mm;
    page-break-inside: avoid;
    break-inside: avoid;
    box-shadow: none;
  }

  .comanda-topo {
    flex: 0 0 auto;
    text-align: center;
  }

  .fone-destaque {
    color: var(--preto-termico);
    font-size: 3.9mm;
    font-weight: 900;
    letter-spacing: 0.65mm;
    line-height: 1;
    text-align: center;
  }

  .linha-divisoria {
    width: 100%;
    margin: 0.55mm 0;
    border: 0;
    border-top: 0.35mm solid var(--preto-termico);
  }

  .pedido-faixa {
    flex: 0 0 auto;
    min-height: 6mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2mm;
    padding: 0.65mm 1.25mm;
    border: 0.45mm solid var(--preto-termico);
    border-radius: 1mm;
    background: var(--branco);
    color: var(--preto-termico);
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .pedido-titulo {
    color: var(--preto-termico);
    font-size: 3.3mm;
    font-weight: 900;
    line-height: 1;
    letter-spacing: 0.35mm;
    text-transform: uppercase;
  }

  .pedido-numero {
    color: var(--preto-termico);
    font-size: 5.7mm;
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
  }

  .identificacao-card {
    flex: 0 0 auto;
    display: grid;
    gap: 0.45mm;
    margin: 0;
    padding: 0.85mm 1mm;
    border: 0.42mm solid var(--preto-termico);
    border-radius: 1.1mm;
    background: var(--branco);
    color: var(--preto-termico);
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .ident-linha {
    display: grid;
    grid-template-columns: 19mm minmax(0, 1fr);
    align-items: start;
    gap: 1mm;
    min-width: 0;
  }

  .ident-label {
    display: block;
    color: var(--preto-termico);
    font-size: 2.35mm;
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: 0.35mm;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .ident-valor {
    min-width: 0;
    color: var(--preto-termico);
    font-weight: 900;
    line-height: 1.05;
    word-break: break-word;
  }

  .ident-empresa {
    font-size: 3.55mm;
    text-transform: uppercase;
    letter-spacing: 0.25mm;
  }

  .ident-nome {
    font-size: 3.6mm;
    text-transform: uppercase;
    letter-spacing: 0.25mm;
  }

  .ident-endereco {
    font-size: 3.65mm;
    letter-spacing: 0.18mm;
  }

  .itens-bloco {
    flex: 1 1 auto;
    min-height: 0;
    margin: 0;
    border: 0.42mm solid var(--preto-termico);
    border-radius: 1mm;
    overflow: hidden;
    color: var(--preto-termico);
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .itens-faixa {
    padding: 0.55mm 1mm;
    background: var(--preto-termico);
    color: var(--branco);
    font-size: 3mm;
    font-weight: 900;
    line-height: 1;
    letter-spacing: 0.4mm;
    text-transform: uppercase;
  }

  .itens-lista {
    margin: 0;
    padding: 0.85mm 1.1mm 0.8mm 4.4mm;
    column-count: 2;
    column-gap: 5mm;
    color: var(--preto-termico);
    font-size: 2.9mm;
    font-weight: 900;
    line-height: 1.16;
    overflow: hidden;
  }

  .itens-lista li {
    margin: 0 0 0.55mm;
    padding-left: 0.2mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .itens-lista li::marker {
    color: var(--preto-termico);
    font-size: 2.8mm;
  }

  .info-extra {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: 1fr 0.65fr 1fr;
    gap: 0.45mm 1.2mm;
    padding: 0.7mm 0.9mm;
    border-top: 0.35mm dotted var(--preto-termico);
    border-bottom: 0.35mm solid var(--preto-termico);
    color: var(--preto-termico);
    font-size: 2.25mm;
    font-weight: 900;
    line-height: 1.12;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .info-extra p {
    margin: 0;
  }

  .info-extra strong {
    font-weight: 900;
  }

  .info-extra .info-obs {
    grid-column: 1 / -1;
  }

  .comanda-rodape {
    flex: 0 0 auto;
    margin-top: auto;
    text-align: center;
    color: var(--preto-termico);
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .data-hora {
    color: var(--preto-termico);
    font-size: 2.45mm;
    font-weight: 900;
    line-height: 1;
  }

  @media print {
    @page {
      size: 105mm 70mm;
      margin: 0;
    }

    html,
    body {
      width: 105mm;
      height: 70mm;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: var(--branco) !important;
      color: var(--preto-termico) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body > :not(.print-area) {
      display: none !important;
    }

    .print-area {
      width: 105mm !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: var(--branco) !important;
    }

    .comanda {
      width: 105mm !important;
      height: 70mm !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      background: var(--branco) !important;
      color: var(--preto-termico) !important;
      box-shadow: none !important;
      text-shadow: none !important;
      page-break-after: auto !important;
      break-after: auto !important;
    }

    .comanda-conteudo {
      width: 101mm !important;
      height: 66mm !important;
      margin: 0 auto !important;
      overflow: hidden !important;
      border-color: var(--preto-termico) !important;
      background: var(--branco) !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
  }
`;
