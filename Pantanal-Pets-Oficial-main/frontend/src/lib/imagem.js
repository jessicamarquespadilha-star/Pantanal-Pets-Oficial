const LADO_MAXIMO = 1000;
const QUALIDADE_JPEG = 0.86;

function carregarImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    img.src = URL.createObjectURL(arquivo);
  });
}

export async function processarImagem(
  arquivo,
  { ladoMaximo = LADO_MAXIMO } = {}
) {
  const img = await carregarImagem(arquivo);
  const escala = Math.min(1, ladoMaximo / Math.max(img.width, img.height));
  const largura = Math.round(img.width * escala);
  const altura = Math.round(img.height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, largura, altura);
  URL.revokeObjectURL(img.src);

  const manterPng = arquivo.type === 'image/png';
  const mime = manterPng ? 'image/png' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(
    mime,
    manterPng ? undefined : QUALIDADE_JPEG
  );
  return dataUrl;
}
