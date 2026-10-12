import { useCallback, useRef, useState } from 'react'

let proximoId = 1

export function useToasts() {
  const [itens, setItens] = useState([])
  const timers = useRef({})

  const remover = useCallback((id) => {
    setItens((atual) => atual.filter((t) => t.id !== id))
    clearTimeout(timers.current[id])
    delete timers.current[id]
  }, [])

  const notificar = useCallback(
    (texto, tipo = 'sucesso', duracaoMs = 3200) => {
      if (!texto) return
      const id = proximoId++
      setItens((atual) => [...atual, { id, texto, tipo }])
      timers.current[id] = setTimeout(() => remover(id), duracaoMs)
    },
    [remover]
  )

  return { itens, notificar, remover }
}
