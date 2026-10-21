# Comunicação entre StackBlitz e Render

O Pantanal Pets utiliza o StackBlitz para execução e desenvolvimento e o Render para hospedagem da aplicação. A comunicação entre origens é controlada pelo servidor.

O servidor em `server/index.js` implementa CORS para permitir previews HTTPS dos domínios oficiais do StackBlitz/WebContainer. A variável `FRONTEND_URL` permite indicar origens adicionais explicitamente autorizadas.

O front-end centraliza as chamadas HTTP em `frontend/src/services/api.js` e pode usar a API pública publicada no Render quando executado em preview. As rotas de login usam sessão, por isso requisições entre origens também dependem do envio e da aceitação de cookies pelo navegador.

O canal WebSocket é complementar e não substitui a API REST.

## Diagnóstico de comunicação

Verifique a URL da API, a origem autorizada, as credenciais de sessão e a resposta de `GET /api/health`. Não troque `ACCESS_TOKEN`, `SESSION_SECRET` nem as configurações de armazenamento para resolver um problema exclusivamente de CORS.
