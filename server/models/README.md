# Models e entidades

Os arquivos `produtoModel.js` e `cupomModel.js` representam e normalizam dados do domínio de produtos e cupons. Não existe um arquivo Model separado para cada tabela.

O esquema em `server/database.js` também define:

- `clientes`: contas de clientes e hash da senha;
- `recuperacao_senha`: tokens de recuperação com validade e registro de uso;
- `categorias`: classificação dos produtos;
- `produtos`: cadastro, descrição, preço, unidade, validade e imagem;
- `historico`: registro de operações;
- `cupons`: regras e período de validade dos descontos;
- `agendamentos_banho_tosa`: solicitações, horários, valores e status;
- `banho_servicos`: catálogo e preços dos serviços;
- `banho_veiculos`: opções de transporte e taxas.

A camada DAO (`server/dao/sqliteDAO.js`) encapsula o acesso ao banco SQLite. O arquivo do banco pode ser persistido remotamente por `server/storage.js`.
