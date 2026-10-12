import { validarProduto, capitalizar, paginaValida, porPaginaValido, validarCupom } from '../util.js';
import { criarDAO, modoArmazenamento, registrarCliente, autenticarCliente } from '../database.js';
import { SELECT_PRODUTO, produtoDaLinha } from '../models/produtoModel.js';
import { cupomDaLinha as normalizarCupom } from '../models/cupomModel.js';
import { motivoIndisponivel } from '../agendamentoRegras.js';

export function registrarControladores(app, deps) {
  const { ok, falha, exigeLogin, exigeAdmin, ACCESS_TOKEN, WHATSAPP_NUMERO, CIDADES_ATENDIDAS, LIMITE_IMAGEM_MB } = deps;
  const dao = criarDAO();
  const emitirAtualizacao = typeof deps.emitirAtualizacao === 'function' ? deps.emitirAtualizacao : () => {};

// ---------- Rotas ----------

app.get('/api/health', (req, res) => {
  ok(
    res,
    { banco: 'SQLite', armazenamento: modoArmazenamento() },
    'API funcionando.'
  );
});

app.get('/api/config', (req, res) => {
  ok(
    res,
    {
      whatsapp: WHATSAPP_NUMERO,
      cidadesAtendidas: CIDADES_ATENDIDAS,
    },
    'Configuração carregada.'
  );
});


app.post('/api/login', (req, res) => {
  const { access_token: token } = req.body || {};

  // O login administrativo sempre exige o token; campo ausente também é inválido.
  if (typeof token !== 'string' || !token.trim() || !ACCESS_TOKEN || token !== ACCESS_TOKEN) {
    return falha(res, 401, 'TOKEN_INVALIDO', 'Informe um token administrativo válido.');
  }

  req.session.regenerate((error) => {
    if (error) return falha(res, 500, 'ERRO_SESSAO', 'Não foi possível iniciar a sessão.');
    req.session.autenticado = true;
    req.session.tipo = 'administrador';
    req.session.contaAcessos = 0;
    return ok(res, { tipo: 'administrador' }, 'Login realizado com sucesso.');
  });
});

app.post('/api/cadastro-cliente', async (req, res, next) => {
  try {
    const cliente = await registrarCliente(req.body || {});
    req.session.regenerate((error) => {
      if (error) return falha(res, 500, 'ERRO_SESSAO', 'Não foi possível iniciar a sessão.');
      req.session.autenticado = true;
      req.session.tipo = 'cliente';
      req.session.clienteId = cliente.id;
      req.session.clienteNome = cliente.nome;
      req.session.contaAcessos = 0;
      return ok(res, { tipo: 'cliente', cliente }, 'Conta criada com sucesso.', 201);
    });
  } catch (error) {
    if (error.codigo === 'DADOS_INVALIDOS') return falha(res, 400, error.codigo, error.message);
    if (error.codigo === 'EMAIL_EM_USO') return falha(res, 409, error.codigo, error.message);
    return next(error);
  }
});

app.post('/api/login-cliente', async (req, res, next) => {
  try {
    const cliente = await autenticarCliente(req.body || {});
    if (!cliente) return falha(res, 401, 'CREDENCIAIS_INVALIDAS', 'E-mail ou senha inválidos.');
    req.session.regenerate((error) => {
      if (error) return falha(res, 500, 'ERRO_SESSAO', 'Não foi possível iniciar a sessão.');
      req.session.autenticado = true;
      req.session.tipo = 'cliente';
      req.session.clienteId = cliente.id;
      req.session.clienteNome = cliente.nome;
      req.session.contaAcessos = 0;
      return ok(res, { tipo: 'cliente', cliente }, 'Login de cliente realizado com sucesso.');
    });
  } catch (error) { return next(error); }
});

app.get('/api/perfil', exigeLogin, (req, res) => {
  ok(
    res,
    {
      autenticado: true,
      tipo: req.session.tipo || 'cliente',
      cliente: req.session.tipo === 'cliente' ? { id: req.session.clienteId, nome: req.session.clienteNome } : null,
      acessos: req.session.contaAcessos || 0,
    },
    'Perfil carregado.'
  );
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((error) => {
    if (error)
      return falha(
        res,
        500,
        'ERRO_INTERNO',
        'Não foi possível encerrar a sessão.'
      );
    res.clearCookie('connect.sid');
    return res.status(204).end();
  });
});

app.get('/api/produtos', exigeLogin, (req, res, next) => {
  try {
    req.session.contaAcessos = (req.session.contaAcessos || 0) + 1;

    const numeroOpcional = (valor) =>
      valor === undefined || String(valor).trim() === '' ? null : Number(valor);

    const resultado = dao.listarProdutos({
      nome: String(req.query.nome || '').trim().toLowerCase(),
      categoria: String(req.query.categoria || '').trim().toLowerCase(),
      ordem: String(req.query.ordem || 'nome'),
      precoMin: numeroOpcional(req.query.precoMin),
      precoMax: numeroOpcional(req.query.precoMax),
      pagina: paginaValida(req.query.pagina),
      porPagina: porPaginaValido(req.query.porPagina),
    });

    return ok(res, resultado, 'Produtos encontrados.');
  } catch (error) {
    console.error('GET /api/produtos:', error);
    return falha(
      res,
      500,
      'ERRO_LISTAGEM_PRODUTOS',
      process.env.NODE_ENV === 'production'
        ? 'Não foi possível carregar os produtos. Verifique a inicialização do banco de dados.'
        : `Não foi possível carregar os produtos: ${error?.message || 'erro desconhecido'}`
    );
  }
});

app.get('/api/produtos/:id', exigeLogin, (req, res) => {
  if (!Number.isInteger(Number(req.params.id)))
    return falha(res, 400, 'ID_INVALIDO', 'Identificador do produto inválido.');
  const produto = dao.buscarProdutoPorId(Number(req.params.id));
  if (!produto)
    return falha(res, 404, 'PRODUTO_NAO_ENCONTRADO', 'Produto não encontrado.');
  ok(res, produto, 'Produto encontrado.');
});

function imagemValida(valor) {
  if (valor === undefined || valor === null || valor === '')
    return { ok: true, imagem: null };
  if (typeof valor !== 'string' || !valor.startsWith('data:image/')) {
    return { ok: false, erro: 'A imagem enviada é inválida.' };
  }
  const tamanhoMb = (valor.length * 3) / 4 / (1024 * 1024);
  if (tamanhoMb > LIMITE_IMAGEM_MB) {
    return {
      ok: false,
      erro: `A imagem deve ter no máximo ${LIMITE_IMAGEM_MB}MB.`,
    };
  }
  return { ok: true, imagem: valor };
}

app.post('/api/produtos', exigeAdmin, async (req, res, next) => {
  try {
    const erro = validarProduto(req.body);
    if (erro) return falha(res, 400, 'DADOS_INVALIDOS', erro);
    const imagem = imagemValida(req.body.imagem);
    if (!imagem.ok) return falha(res, 400, 'DADOS_INVALIDOS', imagem.erro);

    const nome = req.body.nome.trim();
    const categoriaId = dao.obterOuCriarCategoriaId(req.body.categoria);
    const agora = new Date().toISOString();

    const statement = dao.prepare(`
      INSERT INTO produtos (nome, categoria_id, preco, descricao, validade, unidade_venda, imagem, criado_em, atualizado_em)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    statement.run([
      nome,
      categoriaId,
      Number(req.body.preco),
      typeof req.body.descricao === 'string' ? req.body.descricao.trim().slice(0, 500) : '',
      req.body.validade || null,
      req.body.unidadeVenda === 'kg' || req.body.unidadeVenda === 'kit' ? req.body.unidadeVenda : null,
      imagem.imagem,
      agora,
      agora,
    ]);
    statement.free();

    const id = Number(
      dao.exec('SELECT last_insert_rowid() AS id')[0].values[0][0]
    );
    dao.registrarHistorico(
      'criado',
      id,
      nome,
      `Categoria: ${capitalizar(req.body.categoria)}`
    );
    await dao.salvarBanco();
    emitirAtualizacao({ tipo: 'produto', acao: 'criado', id });

    ok(res, dao.buscarProdutoPorId(id), 'Produto cadastrado com sucesso.', 201);
  } catch (error) {
    next(error);
  }
});

app.put('/api/produtos/:id', exigeAdmin, async (req, res, next) => {
  try {
    const erro = validarProduto(req.body);
    if (erro) return falha(res, 400, 'DADOS_INVALIDOS', erro);

    const id = Number(req.params.id);
    const existente = dao.buscarProdutoPorId(id);
    if (!existente)
      return falha(
        res,
        404,
        'PRODUTO_NAO_ENCONTRADO',
        'Produto não encontrado.'
      );

    const imagem = imagemValida(
      req.body.imagem !== undefined ? req.body.imagem : existente.imagem
    );
    if (!imagem.ok) return falha(res, 400, 'DADOS_INVALIDOS', imagem.erro);

    const nome = req.body.nome.trim();
    const categoriaId = dao.obterOuCriarCategoriaId(req.body.categoria);
    const agora = new Date().toISOString();

    const statement = dao.prepare(`
      UPDATE produtos
      SET nome = ?, categoria_id = ?, preco = ?, descricao = ?, validade = ?, unidade_venda = ?, imagem = ?, atualizado_em = ?
      WHERE id = ?
    `);
    statement.run([
      nome,
      categoriaId,
      Number(req.body.preco),
      typeof req.body.descricao === 'string' ? req.body.descricao.trim().slice(0, 500) : '',
      req.body.validade || null,
      req.body.unidadeVenda === 'kg' || req.body.unidadeVenda === 'kit' ? req.body.unidadeVenda : null,
      imagem.imagem,
      agora,
      id,
    ]);
    statement.free();

    dao.registrarHistorico(
      'atualizado',
      id,
      nome,
      `Categoria: ${capitalizar(req.body.categoria)} • Preço: R$ ${Number(
        req.body.preco
      ).toFixed(2)}`
    );
    await dao.salvarBanco();
    emitirAtualizacao({ tipo: 'produto', acao: 'atualizado', id });

    ok(res, dao.buscarProdutoPorId(id), 'Produto atualizado com sucesso.');
  } catch (error) {
    next(error);
  }
});

app.delete('/api/produtos/:id', exigeAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existente = dao.buscarProdutoPorId(id);
    if (!existente)
      return falha(
        res,
        404,
        'PRODUTO_NAO_ENCONTRADO',
        'Produto não encontrado.'
      );

    const statement = dao.prepare('DELETE FROM produtos WHERE id = ?');
    statement.run([id]);
    statement.free();

    dao.registrarHistorico(
      'excluido',
      id,
      existente.nome,
      `Categoria: ${existente.categoria}`
    );
    await dao.salvarBanco();
    emitirAtualizacao({ tipo: 'produto', acao: 'excluido', id });

    ok(res, null, 'Produto excluído com sucesso.');
  } catch (error) {
    next(error);
  }
});


const STATUS_AGENDAMENTO = new Set(['pendente', 'confirmado', 'concluido', 'cancelado']);

app.get('/api/banho-tosa/opcoes', exigeLogin, (req, res, next) => {
  try {
    const servicos = dao.all('SELECT id, nome, descricao, valor FROM banho_servicos WHERE ativo = 1 ORDER BY id ASC');
    const veiculos = dao.all("SELECT id, nome, descricao, taxa, icone FROM banho_veiculos WHERE ativo = 1 ORDER BY id ASC");
    return ok(res, { servicos, veiculos }, 'Opções de Banho e Tosa carregadas.');
  } catch (e) { return next(e); }
});

app.get('/api/banho-tosa/gestao', exigeAdmin, (req, res, next) => {
  try {
    const servicos = dao.all('SELECT id, nome, descricao, valor, ativo FROM banho_servicos ORDER BY id ASC');
    const veiculos = dao.all("SELECT id, nome, descricao, taxa, icone, ativo FROM banho_veiculos ORDER BY id ASC");
    return ok(res, { servicos, veiculos }, 'Configuração de Banho e Tosa carregada.');
  } catch (e) { return next(e); }
});

app.post('/api/banho-tosa/servicos', exigeAdmin, async (req, res, next) => {
  try {
    const { nome, descricao = '', valor } = req.body || {};
    const preco = Number(valor);
    if (!String(nome || '').trim() || !Number.isFinite(preco) || preco < 0) return falha(res, 400, 'SERVICO_INVALIDO', 'Informe nome e valor válidos.');
    const agora = new Date().toISOString();
    const stmt = dao.prepare('INSERT INTO banho_servicos (nome, descricao, valor, ativo, criado_em, atualizado_em) VALUES (?, ?, ?, 1, ?, ?)');
    stmt.run([String(nome).trim(), String(descricao).trim(), preco, agora, agora]); stmt.free();
    await dao.salvarBanco(); emitirAtualizacao({ tipo: 'banho-opcoes', acao: 'alterado' });
    return ok(res, null, 'Serviço adicionado com sucesso.');
  } catch (e) { if (/UNIQUE/i.test(e.message)) return falha(res, 409, 'SERVICO_DUPLICADO', 'Já existe um serviço com esse nome.'); return next(e); }
});

app.put('/api/banho-tosa/servicos/:id', exigeAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id); const { nome, descricao = '', valor, ativo = 1 } = req.body || {}; const preco = Number(valor);
    if (!Number.isInteger(id) || !String(nome || '').trim() || !Number.isFinite(preco) || preco < 0) return falha(res, 400, 'SERVICO_INVALIDO', 'Dados do serviço inválidos.');
    const stmt = dao.prepare('UPDATE banho_servicos SET nome=?, descricao=?, valor=?, ativo=?, atualizado_em=? WHERE id=?');
    stmt.run([String(nome).trim(), String(descricao).trim(), preco, ativo ? 1 : 0, new Date().toISOString(), id]); stmt.free();
    if (!dao.linhasAfetadas()) return falha(res, 404, 'SERVICO_NAO_ENCONTRADO', 'Serviço não encontrado.');
    await dao.salvarBanco(); emitirAtualizacao({ tipo: 'banho-opcoes', acao: 'alterado' }); return ok(res, null, 'Serviço atualizado com sucesso.');
  } catch (e) { if (/UNIQUE/i.test(e.message)) return falha(res, 409, 'SERVICO_DUPLICADO', 'Já existe um serviço com esse nome.'); return next(e); }
});

app.delete('/api/banho-tosa/servicos/:id', exigeAdmin, async (req, res, next) => {
  try { const id=Number(req.params.id); if(!Number.isInteger(id)) return falha(res,400,'ID_INVALIDO','Serviço inválido.'); const stmt=dao.prepare('DELETE FROM banho_servicos WHERE id=?'); stmt.run([id]); stmt.free(); if(!dao.linhasAfetadas()) return falha(res,404,'SERVICO_NAO_ENCONTRADO','Serviço não encontrado.'); await dao.salvarBanco(); emitirAtualizacao({tipo:'banho-opcoes',acao:'alterado'}); return ok(res,null,'Serviço excluído com sucesso.'); } catch(e){ return next(e); }
});

app.post('/api/banho-tosa/veiculos', exigeAdmin, async (req, res, next) => {
  try {
    const { nome, descricao = '', taxa, icone = 'fa-car' } = req.body || {}; const valor=Number(taxa);
    if(!String(nome||'').trim() || !Number.isFinite(valor) || valor<0) return falha(res,400,'VEICULO_INVALIDO','Informe nome e taxa válidos.');
    const agora=new Date().toISOString(); const stmt=dao.prepare('INSERT INTO banho_veiculos (nome, descricao, taxa, icone, ativo, criado_em, atualizado_em) VALUES (?,?,?,?,1,?,?)'); stmt.run([String(nome).trim(),String(descricao).trim(),valor,String(icone||'fa-car'),agora,agora]); stmt.free(); await dao.salvarBanco(); emitirAtualizacao({tipo:'banho-opcoes',acao:'alterado'}); return ok(res,null,'Veículo adicionado com sucesso.');
  } catch(e){ if(/UNIQUE/i.test(e.message)) return falha(res,409,'VEICULO_DUPLICADO','Já existe um veículo com esse nome.'); return next(e); }
});

app.put('/api/banho-tosa/veiculos/:id', exigeAdmin, async (req, res, next) => {
  try { const id=Number(req.params.id); const {nome,descricao='',taxa,icone='fa-car',ativo=1}=req.body||{}; const valor=Number(taxa); if(!Number.isInteger(id)||!String(nome||'').trim()||!Number.isFinite(valor)||valor<0)return falha(res,400,'VEICULO_INVALIDO','Dados do veículo inválidos.'); const stmt=dao.prepare('UPDATE banho_veiculos SET nome=?,descricao=?,taxa=?,icone=?,ativo=?,atualizado_em=? WHERE id=?'); stmt.run([String(nome).trim(),String(descricao).trim(),valor,String(icone||'fa-car'),ativo?1:0,new Date().toISOString(),id]); stmt.free(); if(!dao.linhasAfetadas()) return falha(res,404,'VEICULO_NAO_ENCONTRADO','Veículo não encontrado.'); await dao.salvarBanco(); emitirAtualizacao({tipo:'banho-opcoes',acao:'alterado'}); return ok(res,null,'Veículo atualizado com sucesso.'); } catch(e){ if(/UNIQUE/i.test(e.message)) return falha(res,409,'VEICULO_DUPLICADO','Já existe um veículo com esse nome.'); return next(e); }
});

app.delete('/api/banho-tosa/veiculos/:id', exigeAdmin, async (req, res, next) => {
  try { const id=Number(req.params.id); if(!Number.isInteger(id))return falha(res,400,'ID_INVALIDO','Veículo inválido.'); const stmt=dao.prepare('DELETE FROM banho_veiculos WHERE id=?'); stmt.run([id]); stmt.free(); if(!dao.linhasAfetadas()) return falha(res,404,'VEICULO_NAO_ENCONTRADO','Veículo não encontrado.'); await dao.salvarBanco(); emitirAtualizacao({tipo:'banho-opcoes',acao:'alterado'}); return ok(res,null,'Veículo excluído com sucesso.'); } catch(e){ return next(e); }
});

// Horários já reservados em uma data (qualquer usuário logado pode consultar; não expõe dados pessoais).
function horariosOcupados(data, ignorarId = null) {
  return dao
    .all("SELECT horario FROM agendamentos_banho_tosa WHERE data = ? AND status <> 'cancelado' AND id <> ?", [data, ignorarId ?? -1])
    .map((l) => l.horario);
}

app.get('/api/agendamentos-banho-tosa/ocupados', exigeLogin, (req, res, next) => {
  try {
    const data = String(req.query.data || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return falha(res, 400, 'DATA_INVALIDA', 'Informe uma data válida.');
    return ok(res, horariosOcupados(data), 'Horários ocupados carregados.');
  } catch (error) { next(error); }
});

app.post('/api/agendamentos-banho-tosa', exigeLogin, async (req, res, next) => {
  try {
    if (req.session.tipo !== 'cliente') return falha(res, 403, 'ACESSO_NEGADO', 'Agendamentos de clientes devem ser realizados na área do cliente.');
    const { nomeCliente, nomePet, porte = '', servico, data, horario, transporte = null, observacoes = '' } = req.body || {};
    if (!String(nomeCliente || '').trim() || !String(nomePet || '').trim() || !String(servico || '').trim() || !String(data || '').trim() || !String(horario || '').trim()) {
      return falha(res, 400, 'DADOS_INVALIDOS', 'Informe cliente, pet, serviço, data e horário.');
    }
    const dataTexto = String(data).trim();
    const horarioTexto = String(horario).trim();
    const motivo = motivoIndisponivel(dataTexto, horarioTexto);
    if (motivo) return falha(res, 400, 'DATA_INDISPONIVEL', motivo);

    // Valores sempre vêm do cadastro do administrador, nunca do navegador.
    const servicoDb = dao.all('SELECT nome, valor FROM banho_servicos WHERE ativo = 1 AND nome = ?', [String(servico).trim()])[0];
    if (!servicoDb) return falha(res, 400, 'SERVICO_INVALIDO', 'Esse serviço não está mais disponível. Atualize a página e escolha novamente.');
    let veiculoDb = null;
    if (transporte) {
      veiculoDb = dao.all('SELECT nome, taxa FROM banho_veiculos WHERE ativo = 1 AND nome = ?', [String(transporte).trim()])[0];
      if (!veiculoDb) return falha(res, 400, 'VEICULO_INVALIDO', 'Esse veículo não está mais disponível. Atualize a página e escolha novamente.');
    }
    if (horariosOcupados(dataTexto).includes(horarioTexto)) {
      return falha(res, 409, 'HORARIO_OCUPADO', 'Esse horário acabou de ser reservado. Escolha outro horário.');
    }

    const agora = new Date().toISOString();
    const stmt = dao.prepare(`INSERT INTO agendamentos_banho_tosa (nome_cliente, nome_pet, porte, servico, valor_servico, data, horario, transporte, taxa_transporte, observacoes, status, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente', ?, ?)`);
    stmt.run([String(nomeCliente).trim().slice(0, 120), String(nomePet).trim().slice(0, 80), String(porte).trim().slice(0, 30), servicoDb.nome, Number(servicoDb.valor), dataTexto, horarioTexto, veiculoDb ? veiculoDb.nome : null, veiculoDb ? Number(veiculoDb.taxa) : 0, String(observacoes).trim().slice(0, 500), agora, agora]);
    stmt.free();
    const id = Number(dao.exec('SELECT last_insert_rowid() AS id')[0].values[0][0]);
    await dao.salvarBanco();
    emitirAtualizacao({ tipo: 'agendamento', acao: 'criado', id });
    return ok(res, { id, valorServico: Number(servicoDb.valor), taxaTransporte: veiculoDb ? Number(veiculoDb.taxa) : 0 }, 'Agendamento enviado! Nossa equipe recebeu a solicitação e fará a confirmação.');
  } catch (error) { next(error); }
});

app.get('/api/agendamentos-banho-tosa', exigeAdmin, (req, res, next) => {
  try {
    const result = dao.exec(`SELECT id, nome_cliente AS nomeCliente, nome_pet AS nomePet, porte, servico, valor_servico AS valorServico, data, horario, transporte, taxa_transporte AS taxaTransporte, observacoes, status, criado_em AS criadoEm, atualizado_em AS atualizadoEm FROM agendamentos_banho_tosa ORDER BY CASE status WHEN 'pendente' THEN 0 WHEN 'confirmado' THEN 1 WHEN 'concluido' THEN 2 ELSE 3 END, data ASC, horario ASC, id DESC`);
    const dados = result.length ? result[0].values.map(row => Object.fromEntries(['id','nomeCliente','nomePet','porte','servico','valorServico','data','horario','transporte','taxaTransporte','observacoes','status','criadoEm','atualizadoEm'].map((k,i)=>[k,row[i]]))) : [];
    return ok(res, dados, 'Agendamentos encontrados.');
  } catch (error) { next(error); }
});

app.put('/api/agendamentos-banho-tosa/:id', exigeAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return falha(res, 400, 'ID_INVALIDO', 'Agendamento inválido.');
    const consulta = dao.prepare(`SELECT id, nome_cliente AS nomeCliente, nome_pet AS nomePet, porte, servico, valor_servico AS valorServico, data, horario, transporte, taxa_transporte AS taxaTransporte, observacoes, status FROM agendamentos_banho_tosa WHERE id = ?`);
    consulta.bind([id]);
    const atual = consulta.step() ? consulta.getAsObject() : null;
    consulta.free();
    if (!atual) return falha(res, 404, 'AGENDAMENTO_NAO_ENCONTRADO', 'Agendamento não encontrado.');
    const status = String(req.body?.status || atual.status);
    if (!STATUS_AGENDAMENTO.has(status)) return falha(res, 400, 'STATUS_INVALIDO', 'Status de agendamento inválido.');
    const data = String(req.body?.data || atual.data).trim().slice(0,10);
    const horario = String(req.body?.horario || atual.horario).trim().slice(0,5);
    const dataReal = /^\d{4}-\d{2}-\d{2}$/.test(data) && new Date(`${data}T12:00:00Z`).toISOString().slice(0,10) === data;
    if (!dataReal) return falha(res, 400, 'DATA_INVALIDA', 'Informe uma data válida.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) return falha(res, 400, 'HORARIO_INVALIDO', 'Informe um horário válido (HH:MM).');
    if (status !== 'cancelado' && horariosOcupados(data, id).includes(horario)) return falha(res, 409, 'HORARIO_OCUPADO', 'Já existe outro agendamento ativo nesse dia e horário.');
    const agora = new Date().toISOString();
    const stmt = dao.prepare('UPDATE agendamentos_banho_tosa SET data = ?, horario = ?, status = ?, atualizado_em = ? WHERE id = ?');
    stmt.run([data, horario, status, agora, id]); stmt.free();
    await dao.salvarBanco();
    emitirAtualizacao({ tipo: 'agendamento', acao: 'atualizado', id });
    return ok(res, { id, data, horario, status }, 'Agendamento atualizado com sucesso.');
  } catch (error) { next(error); }
});

app.get('/api/categorias', exigeLogin, (req, res) => {
  const result = dao.exec(
    'SELECT nome FROM categorias ORDER BY nome COLLATE NOCASE ASC'
  );
  const dados = result.length ? result[0].values.map((row) => row[0]) : [];
  ok(res, dados, 'Categorias encontradas.');
});

app.get('/api/estatisticas', exigeAdmin, (req, res) => {
  const geral = dao.exec(`
    SELECT COUNT(*) AS total, COALESCE(SUM(preco), 0) AS valor_total, COALESCE(AVG(preco), 0) AS preco_medio
    FROM produtos
  `);
  const [total, valorTotal, precoMedio] = geral[0]?.values[0] || [0, 0, 0];

  const porCategoriaResult = dao.exec(`
    SELECT c.nome, COUNT(p.id) AS quantidade
    FROM categorias c
    JOIN produtos p ON p.categoria_id = c.id
    GROUP BY c.id
    ORDER BY quantidade DESC, c.nome COLLATE NOCASE ASC
  `);

  const porCategoria = {};
  let categoriaTop = null;
  if (porCategoriaResult.length) {
    for (const [nome, quantidade] of porCategoriaResult[0].values) {
      porCategoria[nome] = Number(quantidade);
    }
    categoriaTop = porCategoriaResult[0].values[0][0];
  }

  const linhaParaProduto = (result) => {
    if (!result.length) return null;
    const [id, nome, categoria, preco, criadoEm, atualizadoEm] =
      result[0].values[0];
    return produtoDaLinha({
      id,
      nome,
      categoria,
      preco,
      criado_em: criadoEm,
      atualizado_em: atualizadoEm,
    });
  };

  const maisCaro = linhaParaProduto(
    dao.exec(`${SELECT_PRODUTO} ORDER BY p.preco DESC LIMIT 1`)
  );
  const maisBarato = linhaParaProduto(
    dao.exec(`${SELECT_PRODUTO} ORDER BY p.preco ASC LIMIT 1`)
  );
  const recentesResult = dao.exec(
    `${SELECT_PRODUTO} ORDER BY p.id DESC LIMIT 5`
  );
  const recentes = recentesResult.length
    ? recentesResult[0].values.map(
        ([id, nome, categoria, preco, criadoEm, atualizadoEm]) =>
          produtoDaLinha({
            id,
            nome,
            categoria,
            preco,
            criado_em: criadoEm,
            atualizado_em: atualizadoEm,
          })
      )
    : [];

  ok(
    res,
    {
      total: Number(total),
      valorTotal: Number(valorTotal),
      precoMedio: Number(precoMedio),
      totalCategorias: Object.keys(porCategoria).length,
      porCategoria,
      categoriaTop,
      maisCaro,
      maisBarato,
      recentes,
    },
    'Estatísticas calculadas.'
  );
});

app.get('/api/historico', exigeAdmin, (req, res) => {
  const limite = porPaginaValido(req.query.limite, 50, 20);
  const result = dao.exec(`
    SELECT id, tipo, produto_id, produto_nome, detalhes, criado_em
    FROM historico
    ORDER BY id DESC
    LIMIT ${limite}
  `);
  const dados = result.length
    ? result[0].values.map(
        ([id, tipo, produtoId, produtoNome, detalhes, criadoEm]) => ({
          id: Number(id),
          tipo,
          produtoId: produtoId === null ? null : Number(produtoId),
          produtoNome,
          detalhes,
          criadoEm,
        })
      )
    : [];
  ok(res, dados, 'Histórico encontrado.');
});

app.delete('/api/historico', exigeAdmin, async (req, res, next) => {
  try {
    dao.run('DELETE FROM historico');
    await dao.salvarBanco();
    emitirAtualizacao({ tipo: 'historico', acao: 'limpo' });
    ok(res, null, 'Histórico limpo com sucesso.');
  } catch (error) {
    next(error);
  }
});

// ---------- Cupons ----------

app.get('/api/cupons', exigeLogin, (req, res) => {
  const somenteAtivos = req.session.tipo !== 'administrador';
  const agora = new Date().toISOString();
  const linhas = dao.all(`
    SELECT cu.id, cu.codigo, cu.descricao, cu.tipo, cu.valor, cu.ativo, cu.criado_em,
           c.nome AS categoria, cu.validade_inicio, cu.validade_fim
    FROM cupons cu
    LEFT JOIN categorias c ON c.id = cu.categoria_id
    ${somenteAtivos ? 'WHERE cu.ativo = 1 AND (cu.validade_fim IS NULL OR cu.validade_fim > ?)' : ''}
    ORDER BY cu.criado_em DESC
  `, somenteAtivos ? [agora] : []);
  const dados = linhas.map(normalizarCupom);
  ok(res, dados, 'Cupons encontrados.');
});

app.post('/api/cupons', exigeAdmin, async (req, res, next) => {
  try {
    const erro = validarCupom(req.body);
    if (erro) return falha(res, 400, 'DADOS_INVALIDOS', erro);

    const codigo = req.body.codigo.trim().toUpperCase();
    const descricao = typeof req.body.descricao === 'string'
      ? req.body.descricao.trim().slice(0, 200) : '';
    const tipo = req.body.tipo === 'fixo' ? 'fixo' : 'percentual';
    const agora = new Date().toISOString();
    const validadeFim = req.body.validadeTipo === '24h'
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : new Date(req.body.validadeFim).toISOString();

    let categoriaId = null;
    if (req.body.categoria) {
      categoriaId = dao.obterOuCriarCategoriaId(req.body.categoria);
      if (!categoriaId) return falha(res, 400, 'DADOS_INVALIDOS', 'Categoria inválida.');
    }

    const existe = dao.prepare('SELECT id FROM cupons WHERE UPPER(codigo) = ?');
    existe.bind([codigo]);
    const jaExiste = existe.step();
    existe.free();
    if (jaExiste) return falha(res, 400, 'DADOS_INVALIDOS', 'Já existe um cupom com esse código.');

    const statement = dao.prepare(`
      INSERT INTO cupons
        (codigo, descricao, tipo, valor, ativo, criado_em, categoria_id, validade_inicio, validade_fim)
      VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
    `);
    statement.run([codigo, descricao, tipo, Number(req.body.valor), agora, categoriaId, agora, validadeFim]);
    statement.free();
    await dao.salvarBanco();
    emitirAtualizacao({ tipo: 'cupom', acao: 'criado' });

    ok(res, null, 'Cupom criado com sucesso.', 201);
  } catch (error) {
    next(error);
  }
});

app.put('/api/cupons/:id', exigeAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return falha(res, 400, 'ID_INVALIDO', 'Identificador do cupom inválido.');
    }

    const existenteStmt = dao.prepare(`
      SELECT cu.id, cu.codigo, cu.descricao, cu.tipo, cu.valor, cu.ativo,
             c.nome AS categoria, cu.validade_inicio, cu.validade_fim
      FROM cupons cu
      LEFT JOIN categorias c ON c.id = cu.categoria_id
      WHERE cu.id = ?
    `);
    existenteStmt.bind([id]);
    const existe = existenteStmt.step();
    const existente = existe ? existenteStmt.getAsObject() : null;
    existenteStmt.free();

    if (!existente) {
      return falha(res, 404, 'CUPOM_NAO_ENCONTRADO', 'Cupom não encontrado.');
    }

    // Mantém compatibilidade com o botão de ativar/desativar antigo.
    if (Object.keys(req.body || {}).length === 1 && typeof req.body.ativo !== 'undefined') {
      const stmt = dao.prepare('UPDATE cupons SET ativo = ? WHERE id = ?');
      stmt.run([req.body.ativo ? 1 : 0, id]);
      stmt.free();
      await dao.salvarBanco();
      emitirAtualizacao({ tipo: 'cupom', acao: 'atualizado', id });
      return ok(res, null, 'Cupom atualizado com sucesso.');
    }

    const dados = {
      codigo: req.body?.codigo ?? existente.codigo,
      descricao: req.body?.descricao ?? existente.descricao ?? '',
      tipo: req.body?.tipo ?? existente.tipo,
      valor: req.body?.valor ?? existente.valor,
      categoria: req.body?.categoria ?? existente.categoria ?? '',
      validadeTipo: req.body?.validadeTipo || 'personalizada',
      validadeFim: req.body?.validadeFim ?? existente.validade_fim,
    };
    const erro = validarCupom(dados);
    if (erro) return falha(res, 400, 'DADOS_INVALIDOS', erro);

    const codigo = String(dados.codigo).trim().toUpperCase();
    const duplicado = dao.prepare('SELECT id FROM cupons WHERE UPPER(codigo) = ? AND id <> ?');
    duplicado.bind([codigo, id]);
    const temDuplicado = duplicado.step();
    duplicado.free();
    if (temDuplicado) {
      return falha(res, 400, 'DADOS_INVALIDOS', 'Já existe outro cupom com esse código.');
    }

    const descricao = typeof dados.descricao === 'string' ? dados.descricao.trim().slice(0, 200) : '';
    const tipo = dados.tipo === 'fixo' ? 'fixo' : 'percentual';
    const categoriaId = dados.categoria ? dao.obterOuCriarCategoriaId(dados.categoria) : null;
    const validadeFim = dados.validadeTipo === '24h'
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : new Date(dados.validadeFim).toISOString();
    const validadeInicio = existente.validade_inicio || new Date().toISOString();
    const ativo = typeof req.body?.ativo === 'undefined' ? Number(existente.ativo) : (req.body.ativo ? 1 : 0);

    const statement = dao.prepare(`
      UPDATE cupons
      SET codigo = ?, descricao = ?, tipo = ?, valor = ?, ativo = ?, categoria_id = ?, validade_inicio = ?, validade_fim = ?
      WHERE id = ?
    `);
    statement.run([codigo, descricao, tipo, Number(dados.valor), ativo, categoriaId, validadeInicio, validadeFim, id]);
    statement.free();
    await dao.salvarBanco();
    emitirAtualizacao({ tipo: 'cupom', acao: 'atualizado', id });

    ok(res, null, 'Cupom editado com sucesso.');
  } catch (error) {
    next(error);
  }
});

app.delete('/api/cupons/:id', exigeAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return falha(res, 400, 'ID_INVALIDO', 'Identificador do cupom inválido.');
    }
    if (!dao.one('SELECT id FROM cupons WHERE id = ?', [id])) {
      return falha(res, 404, 'CUPOM_NAO_ENCONTRADO', 'Cupom não encontrado.');
    }
    const statement = dao.prepare('DELETE FROM cupons WHERE id = ?');
    statement.run([id]);
    statement.free();
    await dao.salvarBanco();
    emitirAtualizacao({ tipo: 'cupom', acao: 'excluido', id });
    ok(res, null, 'Cupom excluído com sucesso.');
  } catch (error) {
    next(error);
  }
});

app.post('/api/cupons/validar', exigeLogin, (req, res) => {
  const codigo = String(req.body?.codigo || '').trim().toUpperCase();
  if (!codigo) return falha(res, 400, 'DADOS_INVALIDOS', 'Informe o código do cupom.');

  const produtoIds = Array.isArray(req.body?.produtoIds)
    ? [...new Set(req.body.produtoIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
    : [];

  const statement = dao.prepare(`
    SELECT cu.id, cu.codigo, cu.descricao, cu.tipo, cu.valor, cu.ativo, cu.criado_em,
           c.nome AS categoria, cu.validade_inicio, cu.validade_fim
    FROM cupons cu
    LEFT JOIN categorias c ON c.id = cu.categoria_id
    WHERE UPPER(cu.codigo) = ?
  `);
  statement.bind([codigo]);
  const encontrou = statement.step();
  const linha = encontrou ? statement.getAsObject() : null;
  statement.free();

  if (!linha || Number(linha.ativo) !== 1)
    return falha(res, 404, 'CUPOM_NAO_ENCONTRADO', 'Cupom inválido ou inativo.');

  const agora = Date.now();
  if (linha.validade_inicio && new Date(linha.validade_inicio).getTime() > agora)
    return falha(res, 400, 'CUPOM_AINDA_NAO_VALIDO', 'Este cupom ainda não está disponível.');
  if (linha.validade_fim && new Date(linha.validade_fim).getTime() <= agora)
    return falha(res, 404, 'CUPOM_EXPIRADO', 'Este cupom já expirou.');

  if (linha.categoria) {
    if (produtoIds.length === 0) {
      return falha(
        res,
        400,
        'CUPOM_CATEGORIA_INCOMPATIVEL',
        `Este cupom é válido apenas para a categoria ${linha.categoria}. Adicione um produto dessa categoria ao carrinho.`
      );
    }

    const placeholders = produtoIds.map(() => '?').join(',');
    const categoriaStmt = dao.prepare(`
      SELECT DISTINCT c.nome AS categoria
      FROM produtos p
      JOIN categorias c ON c.id = p.categoria_id
      WHERE p.id IN (${placeholders})
    `);
    categoriaStmt.bind(produtoIds);
    const categoriasDosProdutos = [];
    while (categoriaStmt.step()) {
      categoriasDosProdutos.push(String(categoriaStmt.getAsObject().categoria || ''));
    }
    categoriaStmt.free();

    const categoriaElegivel = categoriasDosProdutos.some(
      (categoria) => categoria.toLocaleLowerCase() === String(linha.categoria).toLocaleLowerCase()
    );
    if (!categoriaElegivel) {
      return falha(
        res,
        400,
        'CUPOM_CATEGORIA_INCOMPATIVEL',
        `Este cupom é válido apenas para a categoria ${linha.categoria}.`
      );
    }
  }

  ok(res, normalizarCupom(linha), 'Cupom aplicado com sucesso.');
});

app.get('/api/exportar', exigeAdmin, (req, res) => {
  const produtos = dao.todosProdutos();

  const escapeCsv = (valor) => `"${String(valor ?? '').replaceAll('"', '""')}"`;

  const csv = [
    'id,nome,categoria,preco,descricao,validade,unidade_venda,criado_em,atualizado_em',
    ...produtos.map((p) =>
      [
        p.id,
        escapeCsv(p.nome),
        escapeCsv(p.categoria),
        p.preco,
        escapeCsv(p.descricao),
        escapeCsv(p.validade),
        escapeCsv(p.unidadeVenda),
        escapeCsv(p.criadoEm),
        escapeCsv(p.atualizadoEm),
      ].join(',')
    ),
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="produtos.csv"');
  res.send(`\ufeff${csv}`);
});

}
