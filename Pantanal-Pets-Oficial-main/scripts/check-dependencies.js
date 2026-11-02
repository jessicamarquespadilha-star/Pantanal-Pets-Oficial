import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  ['sql.js JavaScript', 'node_modules/sql.js/dist/sql-wasm.js'],
  ['sql.js WebAssembly', 'node_modules/sql.js/dist/sql-wasm.wasm'],
  ['Vite', 'node_modules/vite/bin/vite.js'],
  ['React', 'node_modules/react/package.json'],
  ['Express', 'node_modules/express/package.json'],
  ['express-session', 'node_modules/express-session/package.json'],
];
const missing = required.filter(([, file]) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error('\nDependências ausentes ou instalação incompleta:');
  for (const [name, file] of missing) console.error(` - ${name}: ${file}`);
  console.error('\nNa pasta raiz do projeto, execute:');
  console.error('  npm ci --no-audit --no-fund');
  console.error('Depois, execute: npm run validate');
  console.error('Se aparecer EAI_AGAIN, verifique a conexão/DNS com registry.npmjs.org; isso é falha de rede, não erro do código.\n');
  process.exit(1);
}
console.log('Dependências essenciais encontradas.');
