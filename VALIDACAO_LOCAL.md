# Validação local da Loja Pet

Execute os comandos na pasta raiz do projeto (a pasta que contém o `package.json` principal):

```bash
node --version
npm --version
npm ci --no-audit --no-fund
npm run validate
```

O Node deve ser 22.12 ou superior. A versão 22.16.0 está indicada em `.node-version`.

`npm run validate` executa a suíte de testes e o build de produção. Não considere a validação concluída se qualquer comando retornar código diferente de zero.

## Erro `EAI_AGAIN` / `ENOTFOUND`

Esse erro indica que o computador não conseguiu resolver o host do registro npm. Não é uma falha de teste do aplicativo. Verifique internet, VPN/proxy e DNS, rode `npm ping` e tente novamente quando `https://registry.npmjs.org/` estiver acessível.

## `sql.js` ou Vite ausente

Isso geralmente indica que `npm ci` foi interrompido ou executado na pasta errada. No Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm cache verify
npm ci --no-audit --no-fund
npm run validate
```
