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

  /*
    Papel fisico da Elgin L42 configurado no navegador:
    largura total 105mm, altura total 70mm, sem margem automatica.
  */
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
    min-height: 70mm;
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

  /* Area raiz: no print window ela e o unico conteudo visivel. */
  .print-area {
    width: 105mm;
    margin: 0;
    padding: 0;
    overflow: visible;
    background: var(--branco);
  }

  /*
    Pagina real: ocupa o papel inteiro 105mm x 70mm.
    O flex centraliza horizontalmente a comanda util de 80mm.
  */
  .pagina-impressao {
    width: 105mm;
    height: 70mm;
    margin: 0;
    padding: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow: visible;
    background: var(--branco);
    page-break-inside: avoid;
    break-inside: avoid;
    page-break-after: always;
    break-after: page;
  }

  .pagina-impressao:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  /*
    Conteudo util da comanda: 80mm x 70mm.
    Nao usamos transform/scale; tudo e medido em mm para impressao real.
  */
  .comanda-impressao {
    width: 80mm;
    height: 70mm;
    margin: 0 auto;
    padding: 1.6mm 2mm 1.3mm;
    overflow: visible;
    display: flex;
    flex-direction: column;
    gap: 1mm;
    background: var(--branco);
    border: 0.45mm solid var(--verde-principal);
    border-radius: 1.8mm;
    color: var(--preto);
    page-break-inside: avoid;
    break-inside: avoid;
    box-shadow: none;
  }

  .comanda-topo {
    flex: 0 0 auto;
    text-align: center;
  }

  .logo-img {
    width: 48mm;
    height: 10mm;
    display: block;
    object-fit: contain;
    margin: 0 auto 0.6mm;
  }

  .fone-destaque {
    color: var(--verde-principal);
    font-size: 3.8mm;
    font-weight: 900;
    letter-spacing: 0.25mm;
    line-height: 1;
    text-align: center;
  }

  .linha-divisoria {
    width: 100%;
    margin: 0.8mm 0;
    border: 0;
    border-top: 0.28mm solid var(--verde-escuro);
  }

  .pedido-faixa {
    flex: 0 0 auto;
    min-height: 6.5mm;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2mm;
    padding: 0.8mm 1.5mm;
    border: 0.3mm solid var(--verde-escuro);
    border-radius: 1.4mm;
    background: #EEF9F3;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .pedido-titulo {
    color: var(--verde-escuro);
    font-size: 3mm;
    font-weight: 900;
    line-height: 1;
    letter-spacing: 0.2mm;
  }

  .pedido-numero {
    color: var(--preto);
    font-size: 5.7mm;
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
  }

  .identificacao-card {
    flex: 0 0 auto;
    display: grid;
    gap: 0.8mm;
    margin: 0;
    padding: 1mm 1.2mm;
    border: 0.42mm solid var(--verde-principal);
    border-radius: 1.6mm;
    background: var(--branco);
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .ident-linha {
    display: grid;
    grid-template-columns: 18mm minmax(0, 1fr);
    align-items: start;
    gap: 1mm;
    min-width: 0;
  }

  .ident-label {
    display: block;
    color: var(--verde-escuro);
    font-size: 2.4mm;
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: 0.1mm;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .ident-valor {
    min-width: 0;
    color: var(--preto);
    font-weight: 900;
    line-height: 1.08;
    word-break: break-word;
  }

  .ident-empresa {
    font-size: 3.35mm;
    text-transform: uppercase;
  }

  .ident-nome {
    font-size: 3.55mm;
    text-transform: uppercase;
  }

  .ident-endereco {
    font-size: 3.75mm;
  }

  .itens-bloco {
    flex: 1 1 auto;
    min-height: 0;
    margin: 0;
    border: 0.28mm solid var(--cinza-borda);
    border-radius: 1.6mm;
    overflow: visible;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .itens-faixa {
    padding: 0.75mm 1.2mm;
    border-radius: 1.2mm 1.2mm 0 0;
    background: var(--verde-principal);
    color: var(--branco);
    font-size: 2.9mm;
    font-weight: 900;
    line-height: 1;
    letter-spacing: 0.18mm;
  }

  .itens-lista {
    margin: 0;
    padding: 1mm 1mm 1mm 4mm;
    column-count: 2;
    column-gap: 3mm;
    color: var(--preto);
    font-size: 2.95mm;
    font-weight: 700;
    line-height: 1.12;
    overflow: visible;
  }

  .itens-lista li {
    margin: 0 0 0.7mm;
    padding-left: 0.2mm;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .itens-lista li::marker {
    color: var(--verde-principal);
    font-size: 2.8mm;
  }

  .info-extra {
    flex: 0 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.65mm 1.4mm;
    padding: 0.9mm 1.1mm;
    border: 0.25mm dashed #9CD9B9;
    border-radius: 1.4mm;
    color: var(--preto);
    font-size: 2.45mm;
    font-weight: 700;
    line-height: 1.1;
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
    font-size: 2.45mm;
    font-weight: 800;
    line-height: 1;
  }

  @media print {
    @page {
      size: 105mm 70mm; /* horizontal */
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

    .print-area,
    .pagina-impressao,
    .comanda-impressao {
      overflow: visible !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }

    .pagina-impressao {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }

    /*
      Mantem compatibilidade com qualquer template antigo que ainda use .comanda.
      No template atual, .pagina-impressao e a folha inteira; .comanda-impressao e a area util.
    */
    .comanda {
      width: 100%;
      height: 100%;
    }

    .comanda-impressao {
      width: 80mm;
      height: 70mm;
      margin: 0 auto;
    }
  }
`;
