import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiLock, FiLogIn } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useAuth } from '../context/useAuth';
import '../styles/empresa.css';

export default function EmpresaLogin({ modo = 'empresa' }) {
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { login, usuario } = useAuth();
  const navigate = useNavigate();

  const isAdminLogin = modo === 'admin';
  const whatsappNumero = import.meta.env.VITE_WHATSAPP_NUMERO || '5585996586824';
  const whatsappLink = `https://wa.me/${whatsappNumero}`;

  useEffect(() => {
    if (!usuario) return;
    if (isAdminLogin && usuario.role === 'ADMIN') {
      navigate('/admin', { replace: true });
      return;
    }
    if (!isAdminLogin && usuario.role === 'EMPRESA_FUNC') {
      navigate('/empresa/pedidos', { replace: true });
    }
  }, [usuario, navigate, isAdminLogin]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const credenciais = isAdminLogin
        ? { email: identificador.trim().toLowerCase(), senha }
        : { sigla: identificador.trim().toUpperCase(), senha };

      const usuarioLogado = await login(credenciais);

      if (isAdminLogin && usuarioLogado.role !== 'ADMIN') {
        setErro('Este acesso e exclusivo para administrador.');
        setCarregando(false);
        return;
      }

      if (!isAdminLogin && usuarioLogado.role === 'ADMIN') {
        setErro('Use /admin/login para acessar o painel administrativo.');
        setCarregando(false);
        return;
      }

      if (usuarioLogado.role === 'ADMIN') navigate('/admin');
      if (usuarioLogado.role === 'EMPRESA_FUNC') navigate('/empresa/pedidos');
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao fazer login. Verifique suas credenciais.');
    }

    setCarregando(false);
  };

  return (
    <div className={`login-page ${isAdminLogin ? 'login-page-admin' : 'login-page-empresa'}`} id="pagina-login">
      <div className="login-card">
        <div className="logo-section">
          <h2>Restaurante Ribeiro</h2>
          <p>{isAdminLogin ? 'Acesso Administrativo' : 'Acesso da Empresa'}</p>
        </div>

        {erro && (
          <div style={{
            padding: '12px 16px',
            background: 'var(--vermelho-light)',
            color: 'var(--vermelho)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.9rem',
            marginBottom: '16px',
            fontWeight: '500'
          }}>
            {erro}
          </div>
        )}

        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label"><FiMail size={14} /> {isAdminLogin ? 'E-mail' : 'Sigla'}</label>
            <input
              className="form-input"
              type="text"
              placeholder={isAdminLogin ? 'admin@dominio.com' : 'SIGLA da empresa'}
              value={identificador}
              onChange={e => setIdentificador(e.target.value)}
              required
              id="input-email-login"
            />
          </div>

          <div className="form-group">
            <label className="form-label"><FiLock size={14} /> Senha</label>
            <input
              className="form-input"
              type="password"
              placeholder="Sua senha"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              id="input-senha-login"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={carregando}
            id="btn-login"
          >
            {carregando ? (
              <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span>
            ) : (
              <>
                <FiLogIn size={18} /> Entrar
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>{isAdminLogin ? 'Precisa de suporte?' : 'Duvidas? Entre em contato'}</p>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}
            id="link-whatsapp-login"
          >
            <FaWhatsapp color="#25D366" /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

