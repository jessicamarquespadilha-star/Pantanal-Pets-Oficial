import { useEffect, useRef, useState } from 'react';

export default function IconeTransparente({
  src,
  alt = '',
  className = '',
  style,
  threshold = 245,
}) {
  return (
    <IconeTransparenteInterno
      key={src || 'sem-src'}
      src={src}
      alt={alt}
      className={className}
      style={style}
      threshold={threshold}
    />
  );
}

function IconeTransparenteInterno({ src, alt, className, style, threshold }) {
  const ehGif = /\.gif(?:\?|$)/i.test(src || '');

  const canvasRef = useRef(null);
  const [semSuporte, setSemSuporte] = useState(false);

  useEffect(() => {
    if (!src || ehGif) return;
    let cancelado = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.src = src;

    function ehFundoClaro(i, dados) {
      return (
        dados[i + 3] > 0 &&
        dados[i] >= threshold &&
        dados[i + 1] >= threshold &&
        dados[i + 2] >= threshold
      );
    }

    function removerFundoConectado(dados, largura, altura) {
      const total = largura * altura;
      const fila = new Uint32Array(total);
      let inicio = 0;
      let fim = 0;

      const adicionarSeFundo = (x, y) => {
        if (x < 0 || y < 0 || x >= largura || y >= altura) return;
        const indice = y * largura + x;
        const offset = indice * 4;
        if (!ehFundoClaro(offset, dados)) return;

        dados[offset + 3] = 0;
        fila[fim++] = indice;
      };

      for (let x = 0; x < largura; x += 1) {
        adicionarSeFundo(x, 0);
        if (altura > 1) adicionarSeFundo(x, altura - 1);
      }
      for (let y = 1; y < altura - 1; y += 1) {
        adicionarSeFundo(0, y);
        if (largura > 1) adicionarSeFundo(largura - 1, y);
      }

      while (inicio < fim) {
        const indice = fila[inicio++];
        const x = indice % largura;
        const y = Math.floor(indice / largura);

        adicionarSeFundo(x - 1, y);
        adicionarSeFundo(x + 1, y);
        adicionarSeFundo(x, y - 1);
        adicionarSeFundo(x, y + 1);
      }
    }

    function desenharQuadro() {
      const canvas = canvasRef.current;
      if (!canvas || cancelado || !img.naturalWidth) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      try {
        const quadro = ctx.getImageData(0, 0, canvas.width, canvas.height);
        removerFundoConectado(quadro.data, quadro.width, quadro.height);
        ctx.putImageData(quadro, 0, 0);
      } catch {
        if (!cancelado) setSemSuporte(true);
      }
    }

    img.onload = desenharQuadro;
    img.onerror = () => !cancelado && setSemSuporte(true);

    return () => {
      cancelado = true;
    };
  }, [src, ehGif, threshold]);

  if (ehGif || semSuporte) {
    return (
      <img
        src={src}
        alt={alt}
        className={`gif-transparente ${className}`.trim()}
        style={style}
        aria-hidden={alt ? undefined : 'true'}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={style}
      role="img"
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : 'true'}
    />
  );
}
