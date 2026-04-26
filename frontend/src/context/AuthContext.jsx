import { useEffect, useState, useContext } from 'react';
import { authAPI } from '../services/api';
import { AuthContext } from './auth-context';

export { AuthContext } from './auth-context';

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    const token = localStorage.getItem('token');
    const usuarioSalvo = localStorage.getItem('usuario');

    if (token && usuarioSalvo) {
      try {
        return JSON.parse(usuarioSalvo);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
      }
    }

    return null;
  });

  const [carregando, setCarregando] = useState(() => Boolean(localStorage.getItem('token')));

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setCarregando(false);
      return;
    }

    let ativo = true;

    authAPI.perfil()
      .then(({ data }) => {
        if (!ativo) return;
        localStorage.setItem('usuario', JSON.stringify(data));
        setUsuario(data);
      })
      .catch(() => {
        if (!ativo) return;
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        setUsuario(null);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const login = async (credenciais) => {
    const { data } = await authAPI.login(credenciais);
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    setCarregando(false);
    return data.usuario;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setUsuario(null);
  };

  const isAdmin = () => usuario?.role === 'ADMIN';
  const isEmpresa = () => usuario?.role === 'EMPRESA_FUNC';

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout, isAdmin, isEmpresa }}>
      {children}
    </AuthContext.Provider>
  );
}
