import { iconeDe } from '../lib/categorias.js';

export default function IconeCategoria({ categoria, className = '' }) {
  const src = iconeDe(categoria);

  if (!src) return null;

  return (
    <img
      className={`icone-categoria-imagem ${className}`.trim()}
      src={src}
      alt={`Categoria ${categoria || ''}`.trim()}
      loading="lazy"
      decoding="async"
    />
  );
}
