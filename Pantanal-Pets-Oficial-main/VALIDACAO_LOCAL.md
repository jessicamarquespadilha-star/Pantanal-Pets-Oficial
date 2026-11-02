# Validação local do Pantanal Pets

A validação automatizada utiliza o Node Test Runner e o build Vite, como parte da verificação técnica do projeto.

Na raiz do projeto:

```bash
node --version
npm --version
npm ci --no-audit --no-fund
npm run validate
```

O `package.json` requer Node.js 22.12 ou superior. `npm run validate` executa `npm test` e `npm run build`.

## O que os testes cobrem

Os arquivos em `tests/` incluem verificações de arquitetura, persistência remota, compatibilidade de banco legado, regras de agendamento, gestão de banho e tosa, CEP, segurança de senhas, utilitários e vendedores.

O sucesso dos testes automatizados não substitui a conferência visual e funcional da aplicação no StackBlitz e no Render.

## Problemas de instalação

Falhas `EAI_AGAIN` ou `ENOTFOUND` normalmente indicam problema de DNS/rede ao acessar o registro npm. Erros de módulo ausente (`sql.js`, Vite etc.) exigem verificar se `npm ci` foi concluído na raiz correta.
