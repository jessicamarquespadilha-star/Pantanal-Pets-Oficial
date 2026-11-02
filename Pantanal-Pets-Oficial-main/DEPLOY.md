# Implantação do Pantanal Pets

O Pantanal Pets é executado no Render e no StackBlitz. A configuração de produção reúne o servidor Node.js, a interface React e as integrações de armazenamento e e-mail.

**Aplicação:** https://pantanal-pets.onrender.com

## Como o código executa

O `npm start` inicia `server/index.js`. O Express fornece a API e, em produção, serve o build do front-end React. O `npm run build` usa o Vite. O endpoint `GET /api/health` informa o estado do serviço e o modo de armazenamento.

O repositório inclui um `render.yaml` com comandos, variáveis e disco configurados. O arquivo `render.yaml` descreve a configuração de infraestrutura versionada no repositório.

## StackBlitz e Render

O front-end usa `frontend/src/services/api.js` para acessar a API. O servidor possui regras CORS para os previews do StackBlitz e sessões para os acessos. A compatibilidade com cookies depende também das políticas do navegador.

## Persistência

O código usa SQLite e, quando configuradas as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`, utiliza o Supabase Storage para armazenar o arquivo do banco. Sem essas variáveis, usa o arquivo local. Veja `PERSISTENCIA.md`.

## Variáveis de ambiente do Render

O ambiente de produção informado utiliza as seguintes variáveis (nomes apenas, sem expor credenciais):

| Variável | Finalidade |
|---|---|
| `ACCESS_TOKEN` | Token de acesso do administrador. |
| `APP_URL` | Endereço público da aplicação, usado também nos links de recuperação de senha. |
| `EMAIL_FROM` | Remetente dos e-mails enviados pelo Resend. |
| `FRONTEND_URL` | Origem do frontend StackBlitz autorizada pela configuração. |
| `NODE_ENV` | Modo de execução (`production` no Render). |
| `RESEND_API_KEY` | Credencial privada de envio de e-mails pelo Resend. |
| `SESSION_SECRET` | Segredo de assinatura da sessão. |
| `SUPABASE_BUCKET` | Bucket do Supabase Storage que contém o banco. |
| `SUPABASE_OBJECT` | Nome do objeto SQLite armazenado no bucket. |
| `SUPABASE_SERVICE_KEY` | Credencial privada de acesso ao Supabase Storage. |
| `SUPABASE_URL` | URL do projeto Supabase. |

Essas variáveis compõem a configuração do ambiente de produção. Os valores de `ACCESS_TOKEN`, `RESEND_API_KEY`, `SESSION_SECRET` e `SUPABASE_SERVICE_KEY` não devem ser publicados.

O número do WhatsApp está definido como constante `WHATSAPP_NUMERO` em `server/index.js`; nesta versão, não é lido de uma variável de ambiente.

## Recuperação de senha por e-mail

O controlador utiliza `RESEND_API_KEY`, `EMAIL_FROM` e `APP_URL` para enviar pelo Resend o link de redefinição de senha do cliente. A mensagem contém um token válido por 30 minutos e de uso único. O envio é acionado pela solicitação de recuperação de senha da aplicação.

## WebSocket

O servidor disponibiliza comunicação por WebSocket para eventos de atualização. O funcionamento principal também é disponibilizado por rotas HTTP/JSON.
