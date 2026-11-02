# Controllers

`apiController.js` registra os handlers da API: recebe requisições, verifica autenticação/autorização, valida dados, usa a camada DAO e devolve respostas JSON.

## Funcionalidades do controlador principal

- Autenticação administrativa e de clientes; cadastro, perfil e logout.
- Recuperação e redefinição de senha de cliente: geração e validação de token, envio de e-mail pelo Resend e criação de link com `APP_URL`.
- Consulta, criação, edição e exclusão de produtos.
- Consulta de categorias, estatísticas e histórico; limpeza do histórico e exportação CSV.
- Consulta, criação, edição, exclusão e validação de cupons.
- Consulta de opções de banho e tosa, incluindo serviços e veículos.
- Gestão administrativa dos serviços e veículos de banho e tosa.
- Consulta de horários ocupados, criação, listagem administrativa, edição e exclusão de agendamentos. A operação de exclusão é registrada em `server/index.js`.
- Endpoints de configuração e saúde do serviço.

`cepController.js` trata a requisição de CEP e utiliza `server/services/cepService.js`.

As regras específicas de disponibilidade são complementadas por `server/agendamentoRegras.js`. A comunicação WebSocket é implementada em `server/index.js`, e não neste controller.

As rotas administrativas usam controle de acesso no servidor. As respostas JSON padronizadas representam a camada de resposta da API.

**Observação:** a edição administrativa usa `PUT /api/agendamentos-banho-tosa/:id`, enquanto a exclusão usa `DELETE /api/agendamentos-banho-tosa/:id`, registrada em `server/index.js` com exigência de administrador, remoção no SQLite, salvamento do banco e emissão de evento de atualização. A consulta de CEP usa `GET /api/cep/:cep`, montada em `server/index.js`.

O envio de e-mail é realizado no handler `POST /api/recuperar-senha`, que utiliza `RESEND_API_KEY` e `EMAIL_FROM` sem expor essas credenciais ao frontend.
