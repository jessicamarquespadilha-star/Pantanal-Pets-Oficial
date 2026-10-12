# Loja Pet — Trabalho Semestral de Programação para Web Avançada

Aplicação web full-stack para gerenciamento de produtos e uma loja pet, desenvolvida para atender aos requisitos técnicos do **Trabalho Semestral de Programação para Web Avançada**.

## 1. Requisitos da atividade atendidos

| Requisito do PDF   | Implementação                                                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HTTP               | API usa GET, POST, PUT e DELETE, com códigos de sucesso e erro adequados.                                                                                                                  |
| Estado             | Login e controle de acesso usam `express-session` e cookie HTTP-only.                                                                                                                      |
| MVC                | `routes` faz o mapeamento HTTP, `controllers` concentra os handlers, `models` representa o domínio/esquema e `dao` encapsula a persistência; respostas JSON formam a camada View/Response. |
| Persistência       | SQLite real em `data/produtos.sqlite`, acessado pela camada DAO.                                                                                                                           |
| API REST           | Express, JSON, recursos de produtos/categorias/cupons/histórico e documentação neste README.                                                                                               |
| CORS               | Middleware explícito com origem configurável por `FRONTEND_URL`, credenciais e métodos/cabeçalhos permitidos.                                                                              |
| Front-end          | React + Vite consumindo a API por `frontend/src/services/api.js`.                                                                                                                          |
| Autenticação       | Dois níveis: cliente e administrador.                                                                                                                                                      |
| Controle de acesso | Validação feita no back-end com `exigeLogin` e `exigeAdmin`.                                                                                                                               |
| Deploy             | Configuração de produção e `render.yaml` preparados; falta somente realizar a publicação e registrar a URL final.                                                                          |
| Versionamento      | Repositório GitHub do projeto: `https://github.com/jessicamarquespadilha-star/Pantanal-Pets`.                                                                                              |

### Configuração do WebSocket separado

Se o React for hospedado em outro domínio, defina `VITE_WS_URL` apontando para a origem WebSocket pública (por exemplo, `wss://api.exemplo.com`). Em deploy fullstack no mesmo domínio, deixe vazia.

### Configuração do front-end separado

Se o React for hospedado em outro domínio, defina `VITE_API_URL` antes do build, apontando para a URL pública da API. Em deploy fullstack no mesmo domínio, deixe essa variável vazia.

### URLs de entrega

- **Aplicação publicada:** `PREENCHER_APOS_DEPLOY` *(preencher após o deploy)*
- **API publicada:** `PREENCHER_APOS_DEPLOY` *(no deploy fullstack, use a mesma URL)*
- **Repositório GitHub/GitLab:** `https://github.com/jessicamarquespadilha-star/Pantanal-Pets`

> O ZIP não consegue provar o deploy remoto nem a autoria dos commits. O repositório GitHub já está definido acima; após o deploy, basta registrar a URL pública da aplicação.

## 2. Arquitetura MVC + DAO

```text
┌───────────────────────────────┐
│ Front-end React + Vite        │
│ componentes + services/api.js │
└───────────────┬───────────────┘
                │ HTTP/JSON
                ▼
┌───────────────────────────────┐
│ Express / Routes              │
│ server/routes                 │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│ Controllers                   │
│ server/controllers            │
│ validação + regras + resposta │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│ DAO                           │
│ server/dao/sqliteDAO.js       │
│ acesso encapsulado ao SQLite  │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│ Model / persistência          │
│ categorias, produtos,         │
│ cupons e historico            │
│ data/produtos.sqlite          │
└───────────────────────────────┘
```

No back-end, **View/Response** corresponde às respostas JSON padronizadas da API:

```json
{
  "sucesso": true,
  "dados": {},
  "mensagem": "Operação realizada com sucesso."
}
```

Erros seguem o mesmo padrão:

```json
{
  "sucesso": false,
  "erro": {
    "codigo": "DADOS_INVALIDOS",
    "mensagem": "Descrição do problema."
  }
}
```

## 3. Tecnologias

- Node.js
- Express 5
- Express Session
- SQLite via SQL.js
- React 19
- Vite
- JavaScript ES Modules
- API pública ViaCEP
- Node Test Runner

## 4. Estrutura de pastas

```text
.
├── server/
│   ├── index.js
│   ├── database.js
│   ├── util.js
│   ├── controllers/
│   │   ├── apiController.js
│   │   └── README.md
│   ├── dao/
│   │   └── sqliteDAO.js
│   ├── models/
│   │   └── README.md
│   ├── routes/
│   │   ├── apiRoutes.js
│   │   └── cepRoutes.js
│   └── services/
│       └── cepService.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   └── package.json
├── data/
│   └── produtos.sqlite
├── tests/
├── api.js
├── env.example
├── package.json
└── README.md
```

## 5. HTTP e API REST

### Saúde e configuração

| Método | Rota          | Acesso  | Descrição                                   |
| ------ | ------------- | ------- | ------------------------------------------- |
| GET    | `/api/health` | público | Verifica a API e o banco                    |
| GET    | `/api/config` | público | Retorna configuração pública do atendimento |

### Autenticação e estado

| Método | Rota                 | Acesso      | Descrição                                  |
| ------ | -------------------- | ----------- | ------------------------------------------ |
| POST   | `/api/login`         | público     | Login administrativo por token             |
| POST   | `/api/cadastro-cliente` | público     | Cria conta de cliente com nome, e-mail e senha |
| POST   | `/api/login-cliente` | público     | Autentica cliente por e-mail e senha e inicia sessão |
| GET    | `/api/perfil`        | autenticado | Consulta o usuário da sessão               |
| POST   | `/api/logout`        | público     | Encerra a sessão                           |

Exemplo de cadastro de cliente:

```http
POST /api/cadastro-cliente
Content-Type: application/json

{
  "nome": "Cliente de Teste",
  "email": "cliente@example.com",
  "senha": "senha-forte-123"
}
```

Exemplo de login de cliente:

```http
POST /api/login-cliente
Content-Type: application/json

{
  "email": "cliente@example.com",
  "senha": "senha-forte-123"
}
```

O cadastro cria a conta e inicia a sessão. E-mails duplicados são rejeitados; as senhas nunca são armazenadas em texto puro.

### Produtos

| Método | Rota                | Acesso        | Descrição                                |
| ------ | ------------------- | ------------- | ---------------------------------------- |
| GET    | `/api/produtos`     | autenticado   | Lista com filtros, ordenação e paginação |
| GET    | `/api/produtos/:id` | autenticado   | Busca produto por ID                     |
| POST   | `/api/produtos`     | administrador | Cadastra produto                         |
| PUT    | `/api/produtos/:id` | administrador | Edita produto                            |
| DELETE | `/api/produtos/:id` | administrador | Exclui produto                           |

Exemplo de criação:

```http
POST /api/produtos
Content-Type: application/json
Cookie: connect.sid=...
```

```json
{
  "nome": "Ração Premium",
  "categoria": "Alimentação",
  "preco": 89.90
}
```

Resposta de sucesso: HTTP `201` com JSON padronizado.

### Categorias, dashboard e histórico

| Método | Rota                | Acesso        | Descrição                |
| ------ | ------------------- | ------------- | ------------------------ |
| GET    | `/api/categorias`   | autenticado   | Lista categorias         |
| GET    | `/api/estatisticas` | administrador | Indicadores do dashboard |
| GET    | `/api/historico`    | administrador | Lista histórico          |
| DELETE | `/api/historico`    | administrador | Limpa histórico          |
| GET    | `/api/exportar`     | administrador | Exporta produtos em CSV  |

### Cupons

| Método | Rota                  | Acesso        | Descrição                         |
| ------ | --------------------- | ------------- | --------------------------------- |
| GET    | `/api/cupons`         | autenticado   | Lista cupons disponíveis          |
| POST   | `/api/cupons`         | administrador | Cria cupom                        |
| PUT    | `/api/cupons/:id`     | administrador | **Edita** cupom ou ativa/desativa |
| DELETE | `/api/cupons/:id`     | administrador | Exclui cupom                      |
| POST   | `/api/cupons/validar` | autenticado   | Valida cupom no servidor          |

A edição permite alterar código, descrição, tipo, valor, categoria, validade e status.

### ViaCEP

| Método | Rota            | Acesso  | Descrição                   |
| ------ | --------------- | ------- | --------------------------- |
| GET    | `/api/cep/:cep` | público | Consulta endereço na ViaCEP |

Fluxo:

```text
React → Express → Route → Controller → Service → ViaCEP
                                      ↓
                                endereço tratado
```

O backend verifica a cidade contra `CIDADES_ATENDIDAS`. Por padrão, a transportadora atende **Corumbá e Ladário**. Para outras cidades, como Campo Grande ou São Paulo, a aplicação informa **"Sem transportadora disponível para este endereço."**. Países diferentes do Brasil são tratados como **"Endereço não suportado."** na interface.

## 6. Autenticação e autorização

Existem dois níveis:

### Cliente

Pode:

- consultar produtos;
- filtrar e pesquisar;
- adicionar ao carrinho;
- consultar/aplicar cupons;
- consultar endereço;
- montar pedido;
- falar com o atendimento pelo WhatsApp.

### Administrador

Pode, além das funções administrativas:

- cadastrar produto;
- editar produto;
- excluir produto;
- administrar categorias;
- criar cupom;
- **editar cupom**;
- ativar/desativar cupom;
- excluir cupom;
- visualizar dashboard;
- visualizar/limpar histórico;
- exportar CSV.

A autorização é verificada no servidor. Um cliente não consegue obter acesso administrativo apenas manipulando a interface.

### Credenciais de teste

- **Administrador:** exige o token definido em `ACCESS_TOKEN`; não existe token administrativo padrão em produção.
- **Cliente:** cria conta com nome, e-mail e senha ou entra com e-mail e senha; não precisa do token administrativo. As senhas são armazenadas com hash derivado por PBKDF2-SHA-256 com salt individual; a sessão é regenerada após autenticação.

**Segurança:** não armazene credenciais Supabase, tokens reais ou segredos em arquivos versionados. Configure-os como variáveis privadas no ambiente de execução. Se uma chave já foi publicada, revogue-a e gere outra.

## 7. Estado com sessão/cookie

O login cria uma sessão no Express:

```text
POST /api/login, /api/login-cliente ou /api/cadastro-cliente
        ↓
req.session.autenticado = true
req.session.tipo = "administrador" ou "cliente"
        ↓
cookie HTTP-only connect.sid
```

O front-end utiliza `credentials: 'include'` para enviar o cookie nas requisições.

## 8. CORS

O servidor possui middleware explícito de CORS em `server/index.js`.

A variável `FRONTEND_URL` define as origens autorizadas quando front-end e back-end estiverem em domínios/portas diferentes. É possível informar mais de uma origem separando-as por vírgula. O servidor não reflete origens arbitrárias; a própria origem do serviço é aceita para o modo full-stack. O middleware também habilita:

- credenciais;
- `Content-Type` e `Authorization`;
- `GET, POST, PUT, PATCH, DELETE, OPTIONS`;
- resposta de preflight `OPTIONS`.

Em um deploy full-stack no mesmo domínio, `FRONTEND_URL` pode permanecer vazio.

## 9. Persistência e DAO

O banco é SQLite persistente em `data/produtos.sqlite`; no Render, esse caminho deve estar dentro do disco persistente definido em `render.yaml`. Se as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` estiverem configuradas, o snapshot é armazenado no Supabase Storage. As credenciais são lidas exclusivamente do ambiente.

A classe `SQLiteDAO`, em `server/dao/sqliteDAO.js`, encapsula operações de acesso ao banco (`exec`, `prepare`, `run`, `one` e `all`). Os handlers da API utilizam essa camada em vez de acessar diretamente a conexão SQLite.

Tabelas principais:

- `clientes` (contas e hashes de senha)
- `categorias`
- `produtos`
- `historico`
- `cupons`

## 10. WhatsApp

A Loja Pet utiliza **somente um WhatsApp de atendimento**, independentemente da categoria do produto.

O número é configurado em `WHATSAPP_NUMERO` e o carrinho monta uma única mensagem com todos os itens e, quando informado, o endereço consultado.

## 11. Funcionalidades adicionais já implementadas

- dashboard com estatísticas;
- histórico de ações;
- filtros por nome, categoria e faixa de preço;
- ordenação;
- paginação;
- imagens de produtos;
- máscara e controles de preço;
- carrinho;
- cupons com validade e categoria;
- **edição de cupons**;
- exportação CSV;
- ViaCEP;
- mensagens de erro padronizadas;
- tratamento de sessão expirada;
- modo de cliente e administrador;
- interface responsiva;
- um único atendimento de WhatsApp.

## 12. Instalação e execução local

Requisitos:

- Node.js 20+ recomendado;
- npm.

Instalação limpa e reproduzível (execute na pasta raiz, onde fica o `package.json` principal):

```bash
npm ci --no-audit --no-fund
```

O repositório inclui `package-lock.json`; prefira `npm ci` para instalar exatamente as versões registradas. Não apague o arquivo de lock.

Antes dos testes e do build, o projeto verifica se os arquivos essenciais de `sql.js`, Vite, React e Express estão presentes. Se a instalação for interrompida, o diagnóstico informa quais arquivos faltam.

Copie as configurações:

```bash
cp env.example .env
```

No Windows PowerShell, pode-se copiar manualmente `env.example` para `.env`.

Execução:

```bash
npm run dev
```

Aplicação local:

```text
http://localhost:3000
```

Validar dependências, executar todos os testes e compilar o front-end:

```bash
npm run validate
```

O comando acima só termina com sucesso se os testes e o build terminarem sem erro. Para iniciar o servidor depois da validação:

```bash
npm start
```

## 13. Deploy

O servidor serve o build do React quando `NODE_ENV=production`.

Exemplo de configuração em uma plataforma como Render/Railway/Fly.io/VPS:

```text
Build command: npm ci && npm run build
Start command: npm start
NODE_ENV=production
PORT=<porta fornecida pela plataforma>
ACCESS_TOKEN=<token administrativo seguro>
SESSION_SECRET=<segredo seguro>
FRONTEND_URL=<origem pública do frontend, se separada>
WHATSAPP_NUMERO=<número internacional>
CIDADES_ATENDIDAS=Corumbá,Ladário
```

Depois do deploy, atualizar as URLs no início deste README.

## 14. Testes

Executar todos os testes:

```bash
npm test
```

Executar a validação completa (testes + build de produção):

```bash
npm run validate
```

### Se `sql.js` ou Vite aparecerem como ausentes

1. Confirme que o terminal está na pasta raiz do projeto, junto do `package.json` principal e do `package-lock.json`.
2. Feche outros processos de instalação e execute `npm ci --no-audit --no-fund` novamente.
3. Se estiver no Windows PowerShell e a pasta `node_modules` ficou incompleta, execute:

   ```powershell
   Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
   npm cache verify
   npm ci --no-audit --no-fund
   npm run validate
   ```
4. Se o erro for `EAI_AGAIN` ou `ENOTFOUND`, o npm não está conseguindo resolver o endereço do registro. Verifique a conexão, VPN/proxy e DNS e teste `npm ping`. Opcionalmente, confirme o registro com `npm config get registry`; o padrão público é `https://registry.npmjs.org/`. Repita `npm ci` quando o registro estiver acessível.
5. Não copie `node_modules` de outro sistema operacional e não remova `package-lock.json` para tentar contornar o erro.


Os testes cobrem principalmente:

- validação de produtos;
- categorias;
- paginação;
- validação de cupons;
- integração/serviço ViaCEP;
- tratamento de CEP inválido/inexistente;
- cidade atendida/não atendida;
- regra de **um único WhatsApp**.

## 15. Pontos extras da atividade

O PDF prevê quatro possibilidades de bônus:

1. **Portfólio pessoal:** cada integrante deve publicar o projeto em seu próprio portfólio.
2. **Repositório público e colaborativo:** o GitHub/GitLab deve ser público e conter commits reais de todos os integrantes.
3. **WebSocket:** pode ser acrescentado para dados em tempo real.
4. **LinkedIn:** uma única postagem do grupo explicando projeto, tecnologias e aprendizados e marcando os demais integrantes.

Esses itens externos ao código não podem ser comprovados pelo ZIP. O código está preparado para versionamento e deploy, mas a equipe deve realizar e registrar essas ações para receber os respectivos bônus.
## 12. Deploy e atualização em tempo real

O projeto está preparado para deploy fullstack com `npm run build` + `npm start`. O arquivo `render.yaml` automatiza a configuração de um serviço Node/Express no Render e inclui armazenamento persistente para o SQLite. O passo externo que ainda depende da equipe é publicar o repositório e executar o deploy, pois o ZIP não possui acesso à conta de hospedagem.

O back-end também expõe um canal WebSocket em `/ws`. Após o login, o front-end conecta automaticamente ao canal e atualiza a listagem/painel quando ocorre criação, edição ou exclusão de produtos, alterações de cupons ou limpeza do histórico. Se o WebSocket estiver indisponível, a aplicação continua funcionando pela API REST.

## 13. Checklist técnico

Consulte `ENTREGA_CHECKLIST.md` para a conferência dos requisitos obrigatórios e bônus.
