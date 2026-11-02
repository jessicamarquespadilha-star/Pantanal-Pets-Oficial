# Pantanal Pets — Loja Pet

O Pantanal Pets é uma aplicação web full-stack para gerenciamento de uma loja de produtos e serviços para animais de estimação. Reúne loja de produtos pet, acesso de clientes e administradores, cupons e agendamento de banho e tosa.

**Aplicação publicada:** https://pantanal-pets.onrender.com

## Tecnologias e arquitetura

- Front-end: React 19, Vite, JavaScript, HTML e CSS.
- Back-end: Node.js 22, Express 5 e API HTTP/JSON.
- Autenticação e sessão: `express-session`, cookies de sessão, controle de acesso para cliente e administrador; senhas de clientes armazenadas como hash.
- Persistência: SQLite com `sql.js`, camada DAO e suporte a cópia do arquivo do banco no Supabase Storage.
- Integrações: ViaCEP, WhatsApp, Resend para e-mails de recuperação de senha e WebSocket para eventos de atualização.
- Testes: Node Test Runner; build com Vite.

A estrutura separa rotas (`server/routes`), controladores (`server/controllers`), modelos (`server/models`), acesso a dados (`server/dao`) e interface (`frontend/src`). As respostas JSON da API representam a camada de resposta da aplicação.

## Verificação, Validação e Testes de Software (VV&TS)

O projeto conta com uma suíte de testes unitários automatizados e integração contínua (CI) para garantir a qualidade do software.

### Validação de CEP para Mato Grosso do Sul (MS)
A lógica centralizada no módulo `server/services/cepService.js` implementa regras de negócio específicas para o atendimento em MS:
* **Normalização e formato:** Tratamento e validação estrita de CEPs de 8 dígitos.
* **Integração externa:** Consulta à API ViaCEP com tratamento de falhas HTTP e CEPs inexistentes.
* **Regra de abrangência regional:** Verificação e validação de cidades atendidas no Estado de Mato Grosso do Sul, ignorando caracteres especiais e acentuação.

### Testes Unitários Automáticos
Os testes são executados com o **Node Test Runner** nativo (`node --test tests/cepService.test.js`) cobrindo 7 cenários essenciais:
1. Normalização de máscaras e remoção de caracteres não numéricos.
2. Aceitação estrita de 8 dígitos.
3. Consulta e tratamento de dados com mock de API externa.
4. Rejeição imediata de CEPs inválidos antes de requisitar a API.
5. Tratamento para CEPs inexistentes na base de dados.
6. Tratamento de falhas HTTP/erros de rede na consulta externa.
7. Validação de cidades atendidas no estado de MS ignorando acentuação.

### Integração Contínua (CI/CD)
O projeto utiliza **GitHub Actions** (`.github/workflows/test.yml`) para garantia contínua de qualidade. A esteira automatizada executa em ambiente virtual Linux a cada `push` ou `pull_request` direcionado à branch `main`:
1. *Checkout* automático do repositório.
2. Configuração do ambiente Node.js.
3. Instalação das dependências (`npm install`).
4. Execução automatizada da suíte de testes (`npm test`).

## Funcionalidades

### Acesso e contas
- Tela de acesso de cliente e de administrador, com permissões distintas.
- Cadastro e login de clientes, consulta de perfil e encerramento de sessão.
- Solicitação de recuperação e redefinição de senha de cliente, com envio de link por e-mail pelo Resend, validade de 30 minutos e uso único do token de recuperação.
- Proteção de operações administrativas no servidor.

### Loja de produtos
- Visualização e pesquisa de produtos por nome e categoria, com imagem, descrição, preço, unidade de venda e validade quando cadastrados.
- Cadastro, edição e exclusão de produtos pelo administrador.
- Categorias de produtos e ícones associados à interface.
- Carrinho de compras, uso de cupons e encaminhamento do pedido pelo WhatsApp; não há integração de pagamento bancário.
- Consulta de CEP e verificação das regras de atendimento e transporte.

### Cupons e gestão
- Listagem, cadastro, edição, exclusão e validação de cupons.
- Campos de cupom como código, descrição, tipo, valor, situação, categoria e período de validade.
- Painel administrativo com estatísticas, histórico de operações de produtos e exportação de dados em CSV.

### Banho e tosa
- Consulta de serviços, preços, veículos e taxas de transporte cadastrados.
- Agendamento com dados do cliente e do animal, serviço, data, horário, transporte e observações.
- Consulta de horários ocupados e regras de disponibilidade, incluindo bloqueios e feriados tratados pela interface.
- Área administrativa para consultar, editar e excluir agendamentos, além de cadastrar, editar e excluir serviços e veículos. O administrador também pode remover agendamentos pelo painel, por meio da API.
- Confirmação de agendamento sem processamento de pagamento.

### Interface e comunicação
- Navegação entre áreas de cliente e administrador, interface responsiva e recursos visuais do projeto.
- Atualizações por WebSocket quando disponíveis, com operações principais realizadas por API REST.
- Tratamento de erros e mensagens de retorno ao usuário.

## Banco de dados

O esquema de `server/database.js` inclui as tabelas `clientes`, `recuperacao_senha`, `categorias`, `produtos`, `historico`, `cupons`, `agendamentos_banho_tosa`, `banho_servicos` e `banho_veiculos`. O SQLite é acessado pela camada DAO; o módulo `server/storage.js` oferece persistência remota do arquivo no Supabase Storage quando configurado.

## API — rotas registradas no controlador

As rotas HTTP da aplicação são definidas em `server/controllers/apiController.js`. A exclusão de agendamentos é registrada em `server/index.js`. Algumas operações exigem autenticação de cliente ou administrador.

| Método | Endpoint |
|---|---|
| `GET` | `/api/health` |
| `GET` | `/api/config` |
| `POST` | `/api/login` |
| `POST` | `/api/cadastro-cliente` |
| `POST` | `/api/recuperar-senha` |
| `POST` | `/api/redefinir-senha` |
| `POST` | `/api/login-cliente` |
| `GET` | `/api/perfil` |
| `POST` | `/api/logout` |
| `GET` | `/api/produtos` |
| `GET` | `/api/produtos/:id` |
| `POST` | `/api/produtos` |
| `PUT` | `/api/produtos/:id` |
| `DELETE` | `/api/produtos/:id` |
| `GET` | `/api/banho-tosa/opcoes` |
| `GET` | `/api/banho-tosa/gestao` |
| `POST` | `/api/banho-tosa/servicos` |
| `PUT` | `/api/banho-tosa/servicos/:id` |
| `DELETE` | `/api/banho-tosa/servicos/:id` |
| `POST` | `/api/banho-tosa/veiculos` |
| `PUT` | `/api/banho-tosa/veiculos/:id` |
| `DELETE` | `/api/banho-tosa/veiculos/:id` |
| `GET` | `/api/agendamentos-banho-tosa/ocupados` |
| `DELETE` | `/api/agendamentos-banho-tosa/:id` |
| `POST` | `/api/agendamentos-banho-tosa` |
| `GET` | `/api/agendamentos-banho-tosa` |
| `PUT` | `/api/agendamentos-banho-tosa/:id` |
| `GET` | `/api/categorias` |
| `GET` | `/api/estatisticas` |
| `GET` | `/api/historico` |
| `DELETE` | `/api/historico` |
| `GET` | `/api/cupons` |
| `POST` | `/api/cupons` |
| `PUT` | `/api/cupons/:id` |
| `DELETE` | `/api/cupons/:id` |
| `POST` | `/api/cupons/validar` |
| `GET` | `/api/exportar` |

A consulta de CEP é registrada separadamente por `server/routes/cepRoutes.js`, montado em `server/index.js`: **`GET /api/cep/:cep`**.

A API disponibiliza a edição e a exclusão administrativa de agendamentos. A rota `PUT /api/agendamentos-banho-tosa/:id` atualiza o registro; a rota `DELETE /api/agendamentos-banho-tosa/:id`, registrada em `server/index.js`, realiza a exclusão com autorização administrativa.

## Execução e verificação

Na raiz do projeto:

```bash
npm ci
npm start
```

Para executar testes e gerar o build:

```bash
npm test
npm run build
```

Para ambos em sequência: `npm run validate`.

O projeto contém `.node-version`, `render.yaml` e arquivos de configuração utilizados no ambiente publicado. A aplicação está disponível no Render e pode ser executada no StackBlitz, com as funcionalidades de loja e administração operacionais.

## Ambientes

O código contém suporte à execução no StackBlitz e à publicação no Render. As variáveis de ambiente e os segredos devem permanecer fora do repositório. Consulte `DEPLOY.md`, `PERSISTENCIA.md`, `CONFIGURACAO-CORS-STACKBLITZ.md` e `VALIDACAO_LOCAL.md`.

## Escopo da aplicação

O fechamento das compras é encaminhado pelo WhatsApp. O sistema não realiza processamento bancário de pagamentos.

## E-mail de recuperação de senha (Resend)

A API implementa `POST /api/recuperar-senha` e usa o serviço Resend para enviar ao e-mail cadastrado um link para redefinir a senha. O link é gerado a partir de `APP_URL` e contém um token de uso único, válido por 30 minutos. O servidor responde de forma genérica à solicitação para não informar se um endereço está cadastrado. A redefinição é concluída pela rota implementada no controlador e pela interface de login.

As variáveis `RESEND_API_KEY`, `EMAIL_FROM` e `APP_URL` estão configuradas no ambiente de produção informado. Seus valores privados não devem ser incluídos no repositório.
