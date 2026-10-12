export const ICONE_CATEGORIA = {
  Alimentação: 'https://raw.githubusercontent.com/jessicamarquespadilha-star/Pantanal-Pets/refs/heads/main/alimenta%C3%A7%C3%A3o.png',
  Higiene: 'https://raw.githubusercontent.com/jessicamarquespadilha-star/Pantanal-Pets/refs/heads/main/higi%C3%AAne.png',
  Acessório: 'https://raw.githubusercontent.com/jessicamarquespadilha-star/Pantanal-Pets/refs/heads/main/acess%C3%B3rios.png',
  'Saúde e Farmácia': 'https://raw.githubusercontent.com/jessicamarquespadilha-star/Pantanal-Pets/refs/heads/main/sa%C3%BAde%20e%20farm%C3%A1cia.png',
  Brinquedos: 'https://raw.githubusercontent.com/jessicamarquespadilha-star/Pantanal-Pets/refs/heads/main/brinquedos.png',
};

export const COR_CATEGORIA = {
  Alimentação: '#B98A4E',
  Acessório: '#4F7A68',
  Higiene: '#6B8CA3',
  'Saúde e Farmácia': '#B06B54',
  Brinquedos: '#8874A0',
};

export function iconeDe(categoria) {
  return ICONE_CATEGORIA[categoria] || null;
}

export function corDe(categoria) {
  return COR_CATEGORIA[categoria] || '#8A9A8F';
}
