const ENTREGADOR_AUTH_KEY = 'ribeiro.entregador.auth.v1';
const SENHA_PADRAO_ENTREGADOR = '213141';

export const obterSenhaEntregador = () =>
  String(import.meta.env.VITE_ENTREGADOR_SENHA || SENHA_PADRAO_ENTREGADOR);

export const isEntregadorAutenticado = () => {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(ENTREGADOR_AUTH_KEY) === 'ok';
};

export const autenticarEntregador = (senha = '') => {
  const senhaInformada = String(senha || '').trim();
  if (!senhaInformada) return false;
  const senhaValida = senhaInformada === obterSenhaEntregador();
  if (typeof window !== 'undefined') {
    if (senhaValida) {
      window.sessionStorage.setItem(ENTREGADOR_AUTH_KEY, 'ok');
    } else {
      window.sessionStorage.removeItem(ENTREGADOR_AUTH_KEY);
    }
  }
  return senhaValida;
};

export const sairAreaEntregador = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(ENTREGADOR_AUTH_KEY);
};
