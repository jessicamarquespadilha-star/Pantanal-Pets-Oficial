# Controllers

`apiController.js` é a camada Controller: recebe `req`/`res`, valida entradas,
verifica autenticação/autorização, chama a camada DAO e devolve a resposta.

As respostas JSON padronizadas (`ok` e `falha`) representam a camada
View/Response da API, conforme a definição do trabalho.
