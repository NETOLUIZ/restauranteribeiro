export const TELEFONE_RESTAURANTE = '85996267480';

export const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const COMANDA_PRINT_CSS = `
  :root {
    --verde-principal: #1FA463;
    --verde-escuro: #158A52;
    --verde-claro: #7ED957;
    --branco: #FFFFFF;
    --preto: #1A1A1A;
    --cinza-borda: #D7EEDF;
  }

  /* Papel real da Elgin L42PRO: 105mm x 70mm em horizontal. */
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
    color: var(--preto);
    font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    display: block;
  }

  /* Raiz do documento de impressao. Nao recebe margem para evitar folha extra. */
  .print-area {
    width: 105mm;
    margin: 0;
    padding: 0;
    overflow: visible;
    background: var(--branco);
  }

  /*
    A classe .comanda e a etiqueta inteira.
    Nao existe rotate, scale, margem externa nem page-break manual.
  */
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
    color: var(--preto);
    page-break-inside: avoid;
    break-inside: avoid;
    box-shadow: none;
    text-shadow: none;
  }

  /* Conteudo visual centralizado dentro da etiqueta horizontal. */
  .comanda-conteudo {
    width: 101mm;
    height: 66mm;
    margin: 0 auto;
    padding: 1.1mm 1.4mm;
    display: flex;
    flex-direction: column;
    gap: 0.75mm;
    overflow: hidden;
    background: var(--branco);
    border: 0.35mm solid var(--verde-principal);
    border-radius: 1.5mm;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .comanda-topo {
    flex: 0 0 auto;
    text-align: center;
  }

  .logo-img {
    width: 48mm;
    height: 8mm;
    display: block;
    object-fit: contain;
    margin: 0 auto 0.4mm;
  }

  .fone-destaque {
    color: var(--verde-principal);
    font-size: 3.15mm;
    font-weight: 900;
    letter-spacing: 0.2mm;
    line-height: 1;
    text-align: center;
  }

  .linha-divisoria {
    width: 100%;
    margin: 0.55mm 0;
    border: 0;
    border-top: 0.25mm solid var(--verde-escuro);
  }

  .pedido-faixa {
    flex: 0 0 auto;
    min-height: 5.4mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2mm;
    padding: 0.6mm 1.2mm;
    border: 0.28mm solid var(--verde-escuro);
    border-radius: 1.2mm;
    background: #EEF9F3;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .pedido-titulo {
    color: var(--verde-escuro);
    font-size: 2.75mm;
    font-weight: 900;
    line-height: 1;
    letter-spacing: 0.16mm;
  }

  .pedido-numero {
    color: var(--preto);
    font-size: 4.9mm;
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
  }

  .identificacao-card {
    flex: 0 0 auto;
    display: grid;
    gap: 0.55mm;
    margin: 0;
    padding: 0.75mm 1mm;
    border: 0.35mm solid var(--verde-principal);
    border-radius: 1.3mm;
    background: var(--branco);
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .ident-linha {
    display: grid;
    grid-template-columns: 17mm minmax(0, 1fr);
    align-items: start;
    gap: 1mm;
    min-width: 0;
  }

  .ident-label {
    display: block;
    color: var(--verde-escuro);
    font-size: 2.1mm;
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: 0.08mm;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .ident-valor {
    min-width: 0;
    color: var(--preto);
    font-weight: 900;
    line-height: 1.04;
    word-break: break-word;
  }

  .ident-empresa {
    font-size: 3mm;
    text-transform: uppercase;
  }

  .ident-nome {
    font-size: 3.25mm;
    text-transform: uppercase;
  }

  .ident-endereco {
    font-size: 3.35mm;
  }

  .itens-bloco {
    flex: 1 1 auto;
    min-height: 0;
    margin: 0;
    border: 0.25mm solid var(--cinza-borda);
    border-radius: 1.3mm;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .itens-faixa {
    padding: 0.6mm 1mm;
    border-radius: 1mm 1mm 0 0;
    background: var(--verde-principal);
    color: var(--branco);
    font-size: 2.55mm;
    font-weight: 900;
    line-height: 1;
    letter-spacing: 0.14mm;
  }

  .itens-lista {
    margin: 0;
    padding: 0.8mm 1mm 0.8mm 3.8mm;
    column-count: 2;
    column-gap: 4mm;
    color: var(--preto);
    font-size: 2.55mm;
    font-weight: 700;
    line-height: 1.08;
    overflow: hidden;
  }

  .itens-lista li {
    margin: 0 0 0.45mm;
    padding-left: 0.15mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .itens-lista li::marker {
    color: var(--verde-principal);
    font-size: 2.45mm;
  }

  .info-extra {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.45mm 1mm;
    padding: 0.65mm 0.9mm;
    border: 0.25mm dashed #9CD9B9;
    border-radius: 1.2mm;
    color: var(--preto);
    font-size: 2.15mm;
    font-weight: 700;
    line-height: 1.05;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .info-extra p {
    margin: 0;
  }

  .info-extra .info-obs {
    grid-column: 1 / -1;
  }

  .comanda-rodape {
    flex: 0 0 auto;
    margin-top: auto;
    text-align: center;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .data-hora {
    color: #2E2E2E;
    font-size: 2.2mm;
    font-weight: 800;
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
    }

    body > :not(.print-area) {
      display: none !important;
    }

    .print-area {
      width: 105mm !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }

    .comanda {
      width: 105mm !important;
      height: 70mm !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      box-shadow: none !important;
      text-shadow: none !important;
      page-break-after: auto !important;
      break-after: auto !important;
    }

    .comanda-conteudo {
      width: 101mm !important;
      height: 66mm !important;
      margin: 0 auto !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
  }
`;
