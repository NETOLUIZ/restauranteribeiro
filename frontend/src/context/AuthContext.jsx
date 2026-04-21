import { useState } from 'react';
import { authAPI } from '../services/api';
import { AuthContext } from './auth-context';

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

  const [carregando] = useState(false);

  const login = async (credenciais) => {
    const { data } = await authAPI.login(credenciais);
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
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
