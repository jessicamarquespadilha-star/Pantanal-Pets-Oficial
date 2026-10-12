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
