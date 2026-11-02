import { useEffect, useRef, useState } from 'react';

export function useContagem(valorFinal, duracaoMs = 700) {
  const [valor, setValor] = useState(0);
  const inicioRef = useRef(null);
  const origemRef = useRef(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const destino = Number(valorFinal) || 0;
    origemRef.current = valor;
    inicioRef.current = null;
    cancelAnimationFrame(frameRef.current);

    function passo(timestamp) {
      if (inicioRef.current === null) inicioRef.current = timestamp;
      const progresso = Math.min(
        1,
        (timestamp - inicioRef.current) / duracaoMs
      );
      const suavizado = 1 - Math.pow(1 - progresso, 3);
      setValor(origemRef.current + (destino - origemRef.current) * suavizado);
      if (progresso < 1) frameRef.current = requestAnimationFrame(passo);
    }

    frameRef.current = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(frameRef.current);
  }, [valorFinal, duracaoMs]);

  return valor;
}
