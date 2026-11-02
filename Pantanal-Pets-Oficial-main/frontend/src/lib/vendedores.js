export const NOME_VENDEDOR = 'Atendimento Loja Pet';

export function mensagemDoPedido(carrinho, endereco, moeda) {
  const itens = carrinho.map(
    (item) => `• ${item.quantidade}x ${item.nome} — ${moeda(item.preco * item.quantidade)}`
  );
  let texto = `Olá! Quero fazer um pedido na Pantanal Pets:\n\n${itens.join('\n')}`;

  if (endereco) {
    const linha = [endereco.logradouro, endereco.bairro].filter(Boolean).join(', ');
    const cidade = [endereco.localidade, endereco.uf].filter(Boolean).join(' - ');
    texto += '\n\nEndereço para entrega:';
    if (linha) texto += `\n${linha}`;
    if (cidade) texto += `\n${cidade}`;
    if (endereco.cep) texto += `\nCEP: ${endereco.cep}`;
  }
  return texto;
}
