/**
 * Catálogo dos micro-sistemas do São João Digital e quais deles atendem cada uma das 12 categorias.
 * Usado pelas páginas de categoria, pelo hub /servicos/ e pelo mapa do site.
 */
'use strict';

const SISTEMAS = {
  cardapios: { nome: 'Cardápio digital', icone: '🍽️', url: '/cardapios/', desc: 'Veja o menu com preços e monte o pedido para enviar pelo WhatsApp.', tecnologia: 'estático + PHP/MySQL' },
  agendar: { nome: 'Agendamento online', icone: '📅', url: '/agendar/', desc: 'Escolha serviço, dia e horário livre; horário ocupado é bloqueado.', tecnologia: 'PHP + MySQL' },
  comparador: { nome: 'Comparador de preços', icone: '⚖️', url: '/comparador/', desc: 'Compare o preço do mesmo produto ou serviço entre empresas.', tecnologia: 'estático' },
  cupons: { nome: 'Cupons', icone: '🏷️', url: '/cupons/', desc: 'Cupons de desconto com código e validade.', tecnologia: 'estático' },
  'ofertas-semana': { nome: 'Ofertas da semana', icone: '🔥', url: '/ofertas-semana/', desc: 'Promoções vigentes das empresas da cidade.', tecnologia: 'estático' },
  encartes: { nome: 'Encartes digitais', icone: '📰', url: '/encartes/', desc: 'Encartes de ofertas das lojas, com validade.', tecnologia: 'estático' },
  vitrine: { nome: 'Vitrine virtual', icone: '🛍️', url: '/vitrine/', desc: 'Produtos de lojas locais com contato direto no WhatsApp.', tecnologia: 'estático' },
  'shopping-digital': { nome: 'Shopping digital', icone: '🏬', url: '/shopping-digital/', desc: 'Todas as empresas por categoria, com mapa e WhatsApp.', tecnologia: 'estático' },
  imoveis: { nome: 'Imóveis', icone: '🏠', url: '/imoveis/', desc: 'Comprar, alugar ou vender: escolha a imobiliária, informe seu perfil e fale no WhatsApp.', tecnologia: 'PHP + MySQL' },
  veiculos: { nome: 'Carros e motos', icone: '🚗', url: '/veiculos/', desc: 'Consulte a tabela FIPE e fale com a garagem para comprar, vender ou trocar.', tecnologia: 'PHP + MySQL + API FIPE' },
  saude: { nome: 'Saúde e bem-estar', icone: '❤️', url: '/saude/', desc: 'Calculadoras de IMC, água, estresse e frequência cardíaca.', tecnologia: 'PHP' },
  'profissionais-saude': { nome: 'Profissionais de saúde', icone: '🩺', url: '/profissionais-saude/', desc: 'Nutricionistas, personal trainers, academias, psicólogos e psiquiatras.', tecnologia: 'PHP + MySQL' },
  'guia-medico': { nome: 'Guia médico', icone: '🏥', url: '/guia-medico/', desc: 'Clínicas e profissionais de saúde por especialidade.', tecnologia: 'estático' },
  'minisite-modelo': { nome: 'Minisite modelo', icone: '🧩', url: '/minisite-modelo/', desc: 'Veja o modelo de página gratuita para cada categoria.', tecnologia: 'estático' },
  busca: { nome: 'Busca', icone: '🔎', url: '/busca/', desc: 'Procure empresas, produtos, ofertas, cupons, eventos e notícias.', tecnologia: 'PHP' }
};

const CATEGORIAS = {
  'onde-comer': ['cardapios', 'cupons', 'comparador', 'encartes'],
  'onde-comprar': ['vitrine', 'encartes', 'comparador', 'ofertas-semana'],
  'casamentos-festas': ['cupons', 'shopping-digital', 'minisite-modelo'],
  'saude-beleza': ['agendar', 'guia-medico', 'saude', 'profissionais-saude'],
  'casa-construcao': ['imoveis', 'encartes', 'comparador', 'cupons'],
  'carro-moto': ['veiculos', 'agendar', 'comparador', 'cupons'],
  'assistencia-tecnica': ['comparador', 'agendar', 'cupons', 'minisite-modelo'],
  'onde-ficar': ['shopping-digital', 'cupons', 'minisite-modelo'],
  'caes-gatos': ['agendar', 'vitrine', 'comparador', 'cupons'],
  'escolas-cursos': ['agendar', 'cupons', 'minisite-modelo'],
  'transportes-locacao': ['comparador', 'cupons', 'shopping-digital'],
  'escritorios': ['agendar', 'minisite-modelo', 'shopping-digital']
};

module.exports = { SISTEMAS, CATEGORIAS };
