# Persistência dos dados

O projeto suporta duas estratégias, escolhidas pelas variáveis de ambiente.

## Render ou servidor com disco persistente

Por padrão, o SQLite é gravado em `data/produtos.sqlite`. No Render, o `render.yaml` monta um disco persistente nesse diretório. Não apague nem substitua o arquivo de banco durante o deploy.

## Supabase Storage (opcional)

No StackBlitz ou em um ambiente sem disco persistente, configure as seguintes variáveis privadas no painel do ambiente de execução:

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_KEY=SUA_CHAVE_PRIVADA_ATUAL
SUPABASE_BUCKET=loja-pet
SUPABASE_OBJECT=produtos.sqlite
```

O servidor lê segredos apenas de variáveis de ambiente ou de arquivos locais `.env`/`configuracao.env`, ignorados pelo Git. **Não coloque chaves privadas em arquivos `.js`, README, ZIP compartilhado ou repositório.** A chave Supabase incluída em uma versão anterior do projeto deve ser revogada no painel do Supabase antes de qualquer publicação.

Se o Supabase estiver configurado e indisponível na inicialização, o servidor falha de forma explícita para evitar sobrescrever os dados remotos com um banco vazio. Sem as variáveis `SUPABASE_*`, o armazenamento local é utilizado.

Confira `GET /api/health`: o campo `armazenamento` informa `supabase-storage` ou `arquivo-local`.


## StackBlitz usando os dados oficiais do Render

Quando a interface estiver aberta em um endereço `*.webcontainer.io`, ela usa automaticamente `https://pantanal-pets.onrender.com` como API. Assim, produtos, cupons, clientes e agendamentos são consultados no backend oficial, sem gravar alterações em uma segunda cópia local do SQLite. O endereço pode ser substituído pela variável pública `VITE_API_URL`; para o WebSocket, use `VITE_WS_URL`.

O Render precisa permitir a origem exata do preview StackBlitz em `FRONTEND_URL`. O `render.yaml` inclui o endereço de preview informado para esta correção. Se o StackBlitz gerar outro endereço, atualize `FRONTEND_URL` nas variáveis de ambiente do Render para o novo endereço e faça um redeploy. Não configure o StackBlitz para gravar no mesmo arquivo SQLite remoto como se fosse um banco compartilhado.

**Importante:** os logins serão validados pelo Render. Se o navegador bloquear cookies de terceiros para a sessão entre os dois domínios, use a aplicação diretamente pelo endereço do Render; para acesso confiável a partir de um domínio separado, a solução definitiva é hospedar a interface no mesmo domínio da API ou implementar autenticação por token adequada para esse cenário.

## Recuperação de senha do cliente

A tela de login oferece **Esqueci minha senha**. Para enviar links reais, configure no Render:
- `RESEND_API_KEY`: chave da API do Resend;
- `EMAIL_FROM`: remetente verificado no Resend;
- `FRONTEND_URL`: URL pública da aplicação que abre a tela de login.

O link expira em 30 minutos e só pode ser usado uma vez. O banco guarda somente o hash do token. Sem essas variáveis, a API informa que o envio de e-mail não está configurado; ela não expõe tokens na resposta.
