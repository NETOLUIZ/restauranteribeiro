import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      const path = window.location.pathname || '/';
      if (!path.includes('login')) {
        if (path.startsWith('/admin')) {
          window.location.href = '/admin/login';
        } else {
          window.location.href = '/empresa/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authAPI = {
  login: (dados) => api.post('/auth/login', dados),
  perfil: () => api.get('/auth/perfil')
};

// Cardápio
export const cardapioAPI = {
  listarAtivos: () => api.get('/cardapio'),
  listarTodos: () => api.get('/cardapio/todos'),
  criar: (dados) => api.post('/cardapio', dados),
  atualizar: (id, dados) => api.put(`/cardapio/${id}`, dados),
  deletar: (id) => api.delete(`/cardapio/${id}`)
};

// Pedidos Avulsos
export const pedidoAvulsoAPI = {
  criar: (dados) => api.post('/pedidos-avulsos', dados),
  statusPagamento: (id) => api.get(`/pedidos-avulsos/${id}/status-pagamento`),
  listar: (params) => api.get('/pedidos-avulsos', { params }),
  atualizarStatus: (id, dados) => api.put(`/pedidos-avulsos/${id}/status`, dados),
  imprimir: (id) => api.put(`/pedidos-avulsos/${id}/imprimir`)
};

// Pedidos Empresa
export const pedidoEmpresaAPI = {
  criar: (dados) => api.post('/pedidos-empresa', dados),
  listarPorEmpresa: (empresaId, params) => api.get(`/pedidos-empresa/empresa/${empresaId}`, { params }),
  listarTodos: (params) => api.get('/pedidos-empresa', { params }),
  autorizar: (id) => api.put(`/pedidos-empresa/${id}/autorizar`),
  imprimir: (id) => api.put(`/pedidos-empresa/${id}/imprimir`),
  historico: (params) => api.get('/pedidos-empresa/historico', { params })
};

// Empresas
export const empresaAPI = {
  listar: () => api.get('/empresas'),
  criar: (dados) => api.post('/empresas', dados),
  atualizar: (id, dados) => api.put(`/empresas/${id}`, dados),
  deletar: (id) => api.delete(`/empresas/${id}`),
  listarFuncionariosMinhaEmpresa: () => api.get('/empresas/minha/funcionarios'),
  salvarFuncionarioMinhaEmpresa: (dados) => api.post('/empresas/minha/funcionarios', dados),
  adicionarFuncionario: (id, dados) => api.post(`/empresas/${id}/funcionarios`, dados),
  removerFuncionario: (empresaId, funcId) => api.delete(`/empresas/${empresaId}/funcionarios/${funcId}`)
};

// Banners
export const bannerAPI = {
  listarAtivos: () => api.get('/banners'),
  listarTodos: () => api.get('/banners/todos'),
  criar: (formData) => api.post('/banners', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  atualizar: (id, formData) => api.put(`/banners/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deletar: (id) => api.delete(`/banners/${id}`)
};

// Cards de Marmita (Home)
export const marmitaAPI = {
  listarAtivos: () => api.get('/marmitas'),
  listarTodos: () => api.get('/marmitas/todos'),
  salvar: (tamanho, formData) => api.put(`/marmitas/${tamanho}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

// Dashboard
export const dashboardAPI = {
  resumo: () => api.get('/dashboard')
};

// Pedido por IA
export const aiOrderAPI = {
  organizarTexto: (dados) => api.post('/ai-order/text', dados),
  organizarAudio: (formData) => api.post('/ai-order/audio', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};
