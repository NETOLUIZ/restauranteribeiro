import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiKey, FiLogIn } from 'react-icons/fi';
import Navbar from '../../components/Navbar';
import { autenticarEntregador } from '../../components/controle/entregadorAccess';
import '../../styles/controleDiario.css';

export default function EntregadorLoginPage() {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const entrar = (event) => {
    event.preventDefault();
    const ok = autenticarEntregador(senha);
    if (!ok) {
      setErro('Senha invalida. Verifique e tente novamente.');
      return;
    }
    setErro('');
    navigate('/entregador/controle-diario', { replace: true });
  };

  return (
    <>
      <Navbar />
      <div className="entregador-login-page">
        <div className="container">
          <div className="entregador-login-card">
            <h2>Area do Entregador</h2>
            <p>Acesso restrito por senha</p>

            {erro && <div className="entregador-login-erro">{erro}</div>}

            <form onSubmit={entrar} className="entregador-login-form">
              <label htmlFor="entregador-senha">
                <FiKey size={14} /> Senha
              </label>
              <input
                id="entregador-senha"
                type="password"
                placeholder="Digite a senha"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button type="submit" className="btn btn-primary">
                <FiLogIn size={16} /> Entrar
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
