import { useState, useEffect, useRef, useCallback } from 'react';
import { FiUpload, FiTrash2, FiEdit2, FiX, FiSave } from 'react-icons/fi';
import { bannerAPI, marmitaAPI } from '../../services/api';

const TAMANHOS = ['GRANDE', 'PEQUENA'];

const PADRAO_MARMITAS = {
  GRANDE: { titulo: 'Marmita Grande', preco: '24.90', imagemUrl: '' },
  PEQUENA: { titulo: 'Marmita Pequena', preco: '19.90', imagemUrl: '' }
};

export default function GerenciarBanners() {
  const [banners, setBanners] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ titulo: '', texto: '', imagemUrl: '' });
  const [arquivo, setArquivo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [salvandoBanner, setSalvandoBanner] = useState(false);

  const [formMarmitas, setFormMarmitas] = useState(PADRAO_MARMITAS);
  const [arquivosMarmita, setArquivosMarmita] = useState({ GRANDE: null, PEQUENA: null });
  const [previewMarmita, setPreviewMarmita] = useState({ GRANDE: '', PEQUENA: '' });

  const fileRef = useRef(null);
  const fileMarmitaGrandeRef = useRef(null);
  const fileMarmitaPequenaRef = useRef(null);
  const salvandoBannerRef = useRef(false);

  const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

  const resolverPreview = useCallback((imagemUrl = '') => {
    if (!imagemUrl) return '';
    return imagemUrl.startsWith('http') ? imagemUrl : `${apiUrl}${imagemUrl}`;
  }, [apiUrl]);

  async function carregar() {
    try {
      const [bannersRes, marmitasRes] = await Promise.all([
        bannerAPI.listarTodos(),
        marmitaAPI.listarTodos()
      ]);

      setBanners(bannersRes.data || []);

      const listaMarmitas = marmitasRes.data || [];
      const grande = listaMarmitas.find(item => item.tamanho === 'GRANDE');
      const pequena = listaMarmitas.find(item => item.tamanho === 'PEQUENA');

      setFormMarmitas({
        GRANDE: {
          titulo: grande?.titulo || PADRAO_MARMITAS.GRANDE.titulo,
          preco: grande?.preco !== undefined ? String(grande.preco) : PADRAO_MARMITAS.GRANDE.preco,
          imagemUrl: grande?.imagemUrl || ''
        },
        PEQUENA: {
          titulo: pequena?.titulo || PADRAO_MARMITAS.PEQUENA.titulo,
          preco: pequena?.preco !== undefined ? String(pequena.preco) : PADRAO_MARMITAS.PEQUENA.preco,
          imagemUrl: pequena?.imagemUrl || ''
        }
      });

      setPreviewMarmita({
        GRANDE: resolverPreview(grande?.imagemUrl || ''),
        PEQUENA: resolverPreview(pequena?.imagemUrl || '')
      });

      setArquivosMarmita({ GRANDE: null, PEQUENA: null });
    } catch (err) {
      console.error('Erro:', err);
    }

    setCarregando(false);
  }

  useEffect(() => {
    let ativo = true;
    const resolverLocal = (imagemUrl = '') =>
      (!imagemUrl ? '' : (imagemUrl.startsWith('http') ? imagemUrl : `${apiUrl}${imagemUrl}`));

    Promise.all([
      bannerAPI.listarTodos(),
      marmitaAPI.listarTodos()
    ])
      .then(([bannersRes, marmitasRes]) => {
        if (!ativo) return;

        setBanners(bannersRes.data || []);

        const listaMarmitas = marmitasRes.data || [];
        const grande = listaMarmitas.find(item => item.tamanho === 'GRANDE');
        const pequena = listaMarmitas.find(item => item.tamanho === 'PEQUENA');

        setFormMarmitas({
          GRANDE: {
            titulo: grande?.titulo || PADRAO_MARMITAS.GRANDE.titulo,
            preco: grande?.preco !== undefined ? String(grande.preco) : PADRAO_MARMITAS.GRANDE.preco,
            imagemUrl: grande?.imagemUrl || ''
          },
          PEQUENA: {
            titulo: pequena?.titulo || PADRAO_MARMITAS.PEQUENA.titulo,
            preco: pequena?.preco !== undefined ? String(pequena.preco) : PADRAO_MARMITAS.PEQUENA.preco,
            imagemUrl: pequena?.imagemUrl || ''
          }
        });

        setPreviewMarmita({
          GRANDE: resolverLocal(grande?.imagemUrl || ''),
          PEQUENA: resolverLocal(pequena?.imagemUrl || '')
        });

        setArquivosMarmita({ GRANDE: null, PEQUENA: null });
      })
      .catch((err) => {
        console.error('Erro:', err);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [apiUrl]);

  const abrirModal = (banner = null) => {
    if (banner) {
      setEditando(banner);
      setForm({ titulo: banner.titulo || '', texto: banner.texto || '', imagemUrl: banner.imagemUrl || '' });
      setPreviewUrl(resolverPreview(banner.imagemUrl || ''));
    } else {
      setEditando(null);
      setForm({ titulo: '', texto: '', imagemUrl: '' });
      setPreviewUrl('');
    }
    setArquivo(null);
    setModalAberto(true);
  };

  const handleArquivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setArquivo(file);
    setPreviewUrl(URL.createObjectURL(file));
    setForm(prev => ({ ...prev, imagemUrl: '' }));
  };

  const salvar = async () => {
    if (salvandoBannerRef.current || (!previewUrl && !form.imagemUrl)) return;

    salvandoBannerRef.current = true;
    setSalvandoBanner(true);

    const formData = new FormData();
    formData.append('titulo', form.titulo);
    formData.append('texto', form.texto);

    if (arquivo) {
      formData.append('imagem', arquivo);
    } else if (form.imagemUrl) {
      formData.append('imagemUrl', form.imagemUrl);
    }

    try {
      if (editando) {
        await bannerAPI.atualizar(editando.id, formData);
      } else {
        await bannerAPI.criar(formData);
      }
      setModalAberto(false);
      await carregar();
    } catch (err) {
      console.error('Erro:', err);
      alert(err.response?.data?.erro || 'Erro ao salvar banner');
    } finally {
      salvandoBannerRef.current = false;
      setSalvandoBanner(false);
    }
  };

  const deletar = async (id) => {
    if (!confirm('Deseja remover este banner?')) return;
    try {
      await bannerAPI.deletar(id);
      carregar();
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  const handleArquivoMarmita = (tamanho, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setArquivosMarmita(prev => ({ ...prev, [tamanho]: file }));
    setPreviewMarmita(prev => ({ ...prev, [tamanho]: URL.createObjectURL(file) }));
    setFormMarmitas(prev => ({
      ...prev,
      [tamanho]: {
        ...prev[tamanho],
        imagemUrl: ''
      }
    }));
  };

  const atualizarCampoMarmita = (tamanho, campo, valor) => {
    setFormMarmitas(prev => ({
      ...prev,
      [tamanho]: {
        ...prev[tamanho],
        [campo]: valor
      }
    }));
  };

  const atualizarUrlMarmita = (tamanho, valor) => {
    setArquivosMarmita(prev => ({ ...prev, [tamanho]: null }));
    atualizarCampoMarmita(tamanho, 'imagemUrl', valor);
    setPreviewMarmita(prev => ({ ...prev, [tamanho]: resolverPreview(valor) }));
  };

  const limparImagemMarmita = (tamanho) => {
    setArquivosMarmita(prev => ({ ...prev, [tamanho]: null }));
    atualizarCampoMarmita(tamanho, 'imagemUrl', '');
    setPreviewMarmita(prev => ({ ...prev, [tamanho]: '' }));
  };

  const salvarMarmita = async (tamanho) => {
    const dados = formMarmitas[tamanho];

    if (!dados.titulo.trim()) {
      alert('Informe o titulo da marmita.');
      return;
    }

    const precoNormalizado = Number(String(dados.preco).replace(',', '.'));
    if (!Number.isFinite(precoNormalizado) || precoNormalizado < 0) {
      alert('Informe um valor valido para a marmita.');
      return;
    }

    const formData = new FormData();
    formData.append('titulo', dados.titulo.trim());
    formData.append('preco', String(precoNormalizado));

    if (arquivosMarmita[tamanho]) {
      formData.append('imagem', arquivosMarmita[tamanho]);
    } else if (dados.imagemUrl) {
      formData.append('imagemUrl', dados.imagemUrl);
    }

    try {
      await marmitaAPI.salvar(tamanho, formData);
      await carregar();
      alert(`Card da marmita ${tamanho.toLowerCase()} salvo com sucesso.`);
    } catch (err) {
      console.error('Erro ao salvar marmita:', err);
      alert(err.response?.data?.erro || 'Erro ao salvar card da marmita');
    }
  };

  const getFileRef = (tamanho) => (tamanho === 'GRANDE' ? fileMarmitaGrandeRef : fileMarmitaPequenaRef);

  if (carregando) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div id="gerenciar-banners">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <p style={{ color: 'var(--cinza-600)' }}>Gerencie os banners do carrossel e os cards de marmita exibidos na home.</p>
        <button className="btn btn-primary" onClick={() => abrirModal()} id="btn-novo-banner">
          <FiUpload size={18} /> Novo Banner
        </button>
      </div>

      <div className="admin-form-card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '14px' }}>Cards de Marmitas (Home)</h3>
        <p style={{ color: 'var(--cinza-600)', marginBottom: '18px' }}>Configure titulo, valor e imagem de cada card exibido na home.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {TAMANHOS.map((tamanho) => {
            const ref = getFileRef(tamanho);
            const dados = formMarmitas[tamanho];
            const preview = previewMarmita[tamanho];

            return (
              <div key={tamanho} className="card" style={{ border: '1px solid var(--cinza-200)' }}>
                <div className="card-body">
                  <h4 style={{ marginBottom: '12px', fontWeight: 700 }}>Marmita {tamanho === 'GRANDE' ? 'Grande' : 'Pequena'}</h4>

                  <div className="form-group">
                    <label className="form-label">Titulo</label>
                    <input
                      className="form-input"
                      value={dados.titulo}
                      onChange={(e) => atualizarCampoMarmita(tamanho, 'titulo', e.target.value)}
                      placeholder={`Titulo da marmita ${tamanho.toLowerCase()}`}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Valor (R$)</label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={dados.preco}
                      onChange={(e) => atualizarCampoMarmita(tamanho, 'preco', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Imagem</label>
                    <div className="upload-area" onClick={() => ref.current?.click()}>
                      <div className="upload-icon">IMG</div>
                      <p>Clique para upload</p>
                      <p className="upload-hint">JPG, PNG ou WebP</p>
                    </div>
                    <input
                      ref={ref}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleArquivoMarmita(tamanho, e)}
                      style={{ display: 'none' }}
                    />
                  </div>

                  {!arquivosMarmita[tamanho] && (
                    <div className="form-group" style={{ marginTop: '12px' }}>
                      <label className="form-label">Ou cole URL da imagem</label>
                      <input
                        className="form-input"
                        value={dados.imagemUrl}
                        onChange={(e) => atualizarUrlMarmita(tamanho, e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  )}

                  {preview && (
                    <div className="upload-preview" style={{ marginTop: '12px' }}>
                      <img src={preview} alt={`Preview marmita ${tamanho.toLowerCase()}`} />
                      <button className="remove-btn" onClick={() => limparImagemMarmita(tamanho)}>
                        <FiX size={14} />
                      </button>
                    </div>
                  )}

                  <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={() => salvarMarmita(tamanho)}>
                      <FiSave size={14} /> Salvar Marmita {tamanho === 'GRANDE' ? 'Grande' : 'Pequena'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalAberto && (
        <div className="modal-overlay" onClick={() => !salvandoBanner && setModalAberto(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3>{editando ? 'Editar Banner' : 'Novo Banner'}</h3>
              <button
                onClick={() => setModalAberto(false)}
                disabled={salvandoBanner}
                style={{ fontSize: '1.2rem', color: 'var(--cinza-500)' }}
              >
                x
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Imagem</label>
                <div className="upload-area" onClick={() => fileRef.current?.click()}>
                  <div className="upload-icon">IMG</div>
                  <p>Clique para fazer upload</p>
                  <p className="upload-hint">JPG, PNG ou WebP (max. 20MB)</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleArquivo}
                  style={{ display: 'none' }}
                />

                {!arquivo && (
                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label className="form-label">Ou cole a URL da imagem</label>
                    <input
                      className="form-input"
                      placeholder="https://..."
                      value={form.imagemUrl}
                      onChange={e => {
                        setForm({ ...form, imagemUrl: e.target.value });
                        setPreviewUrl(resolverPreview(e.target.value));
                      }}
                    />
                  </div>
                )}

                {previewUrl && (
                  <div className="upload-preview" style={{ marginTop: '12px' }}>
                    <img src={previewUrl} alt="Preview" />
                    <button className="remove-btn" onClick={() => { setPreviewUrl(''); setArquivo(null); setForm({ ...form, imagemUrl: '' }); }}>
                      <FiX size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Titulo (opcional)</label>
                <input
                  className="form-input"
                  placeholder="Titulo do banner"
                  value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Texto/Anuncio (opcional)</label>
                <input
                  className="form-input"
                  placeholder="Texto descritivo"
                  value={form.texto}
                  onChange={e => setForm({ ...form, texto: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalAberto(false)} disabled={salvandoBanner}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvandoBanner || (!previewUrl && !form.imagemUrl)}>
                {salvandoBanner ? 'Salvando...' : editando ? 'Salvar' : 'Criar Banner'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {banners.map(banner => (
          <div key={banner.id} className="card" id={`banner-${banner.id}`}>
            <div style={{ height: '180px', background: 'var(--cinza-200)', overflow: 'hidden' }}>
              <img
                src={resolverPreview(banner.imagemUrl || '')}
                alt={banner.titulo || 'Banner'}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h4 style={{ fontWeight: 600 }}>{banner.titulo || 'Sem titulo'}</h4>
                  {banner.texto && <p style={{ fontSize: '0.85rem', color: 'var(--cinza-500)', marginTop: '4px' }}>{banner.texto}</p>}
                </div>
                <span className={`badge ${banner.ativo ? 'badge-success' : 'badge-danger'}`}>
                  {banner.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button className="btn btn-sm btn-secondary" onClick={() => abrirModal(banner)}>
                  <FiEdit2 size={14} /> Editar
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => deletar(banner.id)}>
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {banners.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: 'var(--cinza-400)' }}>
            <FiUpload size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <p>Nenhum banner cadastrado</p>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Clique em "Novo Banner" para comecar</p>
          </div>
        )}
      </div>
    </div>
  );
}
