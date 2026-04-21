export default function Footer() {
  return (
    <footer className="footer" id="footer-principal">
      <div className="container">
        <div className="footer-content">
          <div className="footer-logo">
            <span>Restaurante Ribeiro</span>
          </div>
          <div>
            <p style={{ fontSize: '0.9rem' }}>Qualidade e sabor em cada refeição</p>
          </div>
        </div>
        <p className="footer-copy">
          &copy; 2020 Restaurante Ribeiro. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
