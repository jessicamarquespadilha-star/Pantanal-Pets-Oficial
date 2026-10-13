# CORS flexível para previews do StackBlitz

O `server/index.js` permite previews HTTPS hospedados em subdomínios dos domínios oficiais `webcontainer.io` e `stackblitz.io`. Assim, o identificador do ambiente e o nome do projeto podem mudar sem precisar atualizar `FRONTEND_URL` a cada vez.

A regra não libera origens HTTP nem domínios externos arbitrários. Para publicar um frontend em outro domínio (por exemplo, um domínio próprio), inclua a origem exata em `FRONTEND_URL` no Render, separando múltiplas origens por vírgula.

## Aplicar no Render

1. Atualize `server/index.js` no repositório conectado ao serviço Render.
2. Faça commit/push ou publique a alteração pelo fluxo usado no projeto.
3. Aguarde o deploy terminar.
4. Teste carregamento, login, sessões e operações administrativas.

## Limitação importante: cookies entre sites

CORS permite que o navegador leia as respostas, mas não garante que cookies de sessão de terceiros sejam aceitos. Alguns navegadores/configurações bloqueiam esses cookies. Se a loja carregar mas a sessão não persistir, será necessário usar um proxy same-origin ou hospedar frontend e API sob o mesmo domínio. Não é possível garantir compatibilidade com qualquer política de cookies apenas com CORS.

A regra CORS não altera o token administrativo, o banco de dados, `ACCESS_TOKEN` ou `SESSION_SECRET`.
