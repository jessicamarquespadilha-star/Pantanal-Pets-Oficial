# Models

Os Models normalizam e representam os dados de domínio:

- `produtoModel.js` — modelo e consulta base de produtos;
- `cupomModel.js` — modelo de cupons;
- o banco SQLite mantém as entidades `categorias`, `produtos`, `historico` e `cupons`.

O acesso físico ao banco é responsabilidade exclusiva da camada DAO.
