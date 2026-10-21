# Persistência do Pantanal Pets

O projeto utiliza **SQLite**, com acesso organizado na camada DAO (`server/dao/sqliteDAO.js`). O esquema e a inicialização do banco ficam em `server/database.js`.

## Dados armazenados

Clientes e hashes de senha; solicitações de recuperação de senha; categorias; produtos; histórico; cupons; agendamentos de banho e tosa; serviços; veículos e taxas.

## Modos implementados

O arquivo `server/storage.js` determina o modo de armazenamento:

- **`supabase-storage`**: quando `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` estão configuradas, o servidor lê e salva o arquivo SQLite em um bucket privado do Supabase Storage.
- **`arquivo-local`**: na ausência dessas variáveis, o banco é mantido como arquivo SQLite local.

Variáveis opcionais para nome do bucket e objeto: `SUPABASE_BUCKET` e `SUPABASE_OBJECT` (padrões definidos em `server/storage.js`).

O Supabase Storage **não substitui o SQLite por tabelas PostgreSQL**: ele guarda o arquivo do banco. No StackBlitz, o armazenamento remoto é importante porque arquivos gravados durante a execução podem não persistir entre reinicializações. No Render, a persistência depende do modo efetivamente configurado no serviço.

A rota `GET /api/health` permite verificar o modo indicado pelo servidor. O modo de armazenamento pode ser consultado por essa rota.

**Segurança:** nunca inclua a chave `SUPABASE_SERVICE_KEY` em código do front-end, documentação pública ou repositório.
