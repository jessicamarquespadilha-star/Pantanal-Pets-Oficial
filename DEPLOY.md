# Deploy da Loja Pet

O projeto foi preparado para deploy como aplicação fullstack em um único serviço Node/Express. O Express serve a API e, em produção, também entrega o build do React.

## Render

Existe um `render.yaml` na raiz do projeto. Ao importar o repositório no Render, o Blueprint configura:

- `npm ci && npm run build` como build;
- `npm start` como comando de inicialização;
- `/api/health` como health check;
- variáveis de ambiente obrigatórias;
- disco persistente para `data/produtos.sqlite`.

### Passos

1. Publique o projeto em um repositório GitHub público ou privado.
2. No Render, crie um novo Blueprint e selecione o repositório.
3. Confirme o serviço definido em `render.yaml`.
4. Aguarde o build e a publicação.
5. Teste `https://SEU-DOMINIO.onrender.com/api/health`.
6. Teste a aplicação pela URL principal.
7. Copie as URLs finais para a seção **URLs de entrega** do README.

### Importante sobre SQLite

O projeto usa SQLite. O `render.yaml` inclui um disco persistente montado em `/opt/render/project/src/data` para evitar que `data/produtos.sqlite` seja perdido em reinicializações do serviço. Nunca inclua arquivos `.env` ou chaves privadas no repositório. Como uma chave Supabase já foi exposta na versão recebida, revogue-a e gere outra antes de configurar o ambiente. Para plataformas sem armazenamento persistente, o banco precisa ser migrado para um banco gerenciado.

## Variáveis de produção

- `NODE_ENV=production`
- `ACCESS_TOKEN`
- `SESSION_SECRET`
- `WHATSAPP_NUMERO`
- `CIDADES_ATENDIDAS`
- `FRONTEND_URL` — opcional; se front-end e API estiverem em domínios diferentes, informe a origem completa (ou origens separadas por vírgula).

## WebSocket

O canal de tempo real fica em:

`wss://SEU-DOMINIO.onrender.com/ws`

A interface tenta conectar automaticamente quando o usuário está autenticado. Caso o WebSocket não esteja disponível, a aplicação continua funcionando normalmente pela API REST.

## GitHub/GitLab

O repositório remoto não pode ser criado automaticamente a partir deste ZIP sem acesso à conta da equipe. Depois de criar o repositório, execute:

```bash
git init
git add .
git commit -m "Entrega final do projeto web avançado"
git branch -M main
git remote add origin URL_DO_REPOSITORIO
git push -u origin main
```

Para o bônus de repositório público e colaborativo, cada integrante deve realizar commits reais identificáveis no histórico.
