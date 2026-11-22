# São João Digital

Base de conhecimento local de **São João da Boa Vista (SP)** para pessoas e sistemas de IA. Não é só um diretório de empresas: é uma infraestrutura de dados estruturados (JSON + HTML + Schema.org) com assistentes que respondem **somente** com o que está cadastrado.

**Stack:** HTML5, CSS3, JavaScript puro, JSON e Bootstrap 5.3.3 (CSS, JS e fontes hospedados em `assets/`, sem CDN, compatível com a CSP). Páginas públicas estáticas; PHP 8 + MySQL (phpMyAdmin) opcionais para agendamento, pedidos, cadastro e painel. Sem Python, sem TypeScript. Funciona em hospedagem compartilhada (`public_html`).

## Estrutura

```
index.html                 Home
empresas/<slug>/           Uma página completa por empresa (Schema.org + FAQ + assistente IA)
categorias/<slug>/         12 categorias oficiais (Onde Comer, Onde Comprar, Casamentos e Festas, Saúde e Beleza, Casa e Construção, Carro e Moto, Assistência Técnica, Onde Ficar, Cães e Gatos, Escolas e Cursos, Transportes e Locação, Escritórios), com subcategorias
eventos/<slug>/            Agenda (schema Event)
noticias/<slug>/           Notícias, guias, novidades e conteúdo patrocinado identificado
assistente/                "Assistente Inteligente São João Digital"
comparador/<produto>/      Comparador de preços (menor preço primeiro, schema AggregateOffer)
cardapios/<empresa>/       Cardápio digital + pedido pelo WhatsApp
agendar/<empresa>/         Solicitação de agendamento pelo WhatsApp
cupons/  encartes/  vitrine/   Cupons e ofertas da semana, encartes digitais e vitrine virtual
guia-medico/               Profissionais de saúde por especialidade
solucoes-digitais/  anuncie/  planos/  sobre/   Oferta para empresas (planos Gratuito, Básico, Pro, Premium) e como interpretar os dados
dados/                     empresas, categorias (12 + subcategorias), eventos, noticias, ofertas, cupons, encartes, vitrine, cardapios (.json)
assets/                    vendor (Bootstrap), css, js (core, ai-engine, site) e imagens SVG
tools/build.js             Gerador das páginas a partir dos JSON (Node, só para desenvolvimento)
robots.txt  sitemap.xml  llms.txt  llms-full.txt  .htaccess  404.html
```

## Como atualizar o conteúdo

1. Edite os arquivos em `dados/`.
2. Rode `node tools/build.js` (ou `SITE_URL=https://seudominio.com.br node tools/build.js`).
3. Envie a pasta para `public_html` (o Node **não** é necessário no servidor; o resultado é HTML estático).

Antes de publicar: ajuste o domínio em `robots.txt` (linha `Sitemap:`), troque `SITE_URL`, remova os registros `"demo": true`, substitua as imagens SVG ilustrativas por fotos reais e (se quiser) converta `og-default.svg` para PNG 1200×630, pois algumas redes sociais não leem SVG.

> Os dados atuais são **fictícios (demonstração)**. Use `NOINDEX=1 node tools/build.js` para impedir indexação enquanto só houver dados de teste.

## Recursos portados do projeto antigo (sem banco)

- **Comparador:** `dados/ofertas.json` (`empresa`, `produto`, `preco`, `preco_promocional`, `data_inicio`, `data_fim`). Produtos com o mesmo nome são agrupados; ofertas fora da vigência somem (no build e no navegador).
- **Cardápio digital:** `dados/cardapios.json` (itens por categoria, cardápio do dia). O carrinho monta a mensagem e abre o WhatsApp da empresa; nada é armazenado.
- **Agendamento:** campo `agendamento` da empresa (serviços, duração, passo, antecedência). Os horários livres saem do horário de funcionamento; a solicitação vai por WhatsApp e só vale após a confirmação da empresa.
- **Categorias:** páginas com empresas, preços, cardápios/agendamento, eventos, notícias e FAQ; subcategorias com empresas ganham página própria.

- **Cupons, encartes, vitrine:** `dados/cupons.json` (código, tipo, validade, `semana: true` destaca na home; vencidos somem), `dados/encartes.json` (seções com itens e preço "de/por"), `dados/vitrine.json` (produtos com botão "tenho interesse" no WhatsApp).
- **Guia médico:** gerado das empresas de Saúde e Beleza nas especialidades de saúde (campo `subcategoria_slug`).

## Design

Identidade premium: marinho `#123456`, laranja e branco (placa de indicação, laranja só como acento e ação). Fontes Bricolage Grotesque e Instrument Sans em `assets/fonts/` (licença OFL). Não há `style=""` inline (a CSP bloqueia); cores por categoria são classes `.c-<slug>` no CSS.

## Back-end PHP + MySQL (opcional, camada dinâmica)

As páginas públicas continuam **estáticas** (velocidade e SEO). O PHP acrescenta o que precisa gravar dados:

| Recurso | Arquivo | O que faz |
|---|---|---|
| Agendamento real | `api/agendamento.php`, `api/horarios.php` | Grava a solicitação, **bloqueia horário já ocupado** (inclusive sobreposição pela duração do serviço) e devolve o link do WhatsApp |
| Pedidos do cardápio | `api/pedido.php` | Grava o pedido; o **preço é recalculado no servidor** a partir do cardápio |
| Cadastro de empresas | `api/cadastro.php` + `/cadastrar/` | Entra como pendente até um admin aprovar |
| Painel | `/admin/` | Login, agendamentos, pedidos, cadastros (aprovar/rejeitar), empresas, ofertas do comparador, cupons, importar/exportar JSON |

Sem o back-end (hospedagem só estática) o site continua funcionando: agendamento e pedido caem para "só WhatsApp".

### Instalação (phpMyAdmin / hospedagem compartilhada)

1. No phpMyAdmin crie o banco (`utf8mb4_unicode_ci`) e **importe `database/schema.sql`**.
2. Copie `config/config.example.php` para `config/config.php` e preencha banco, `segredo` (texto longo aleatório) e `install_key`. Esse arquivo não vai para o Git.
3. Envie tudo para `public_html` (PHP 8.1+). As pastas `src/`, `config/` e `database/` são bloqueadas pelo `.htaccess`.
4. Abra `/admin/instalar.php`, informe a `install_key` e crie o administrador (senha com 10+ caracteres, letras e números). **Apague `admin/instalar.php` depois.**
5. Em `/admin/dados.php` clique em **Importar** para carregar empresas e ofertas dos JSON para o banco.
6. Dê permissão de escrita à pasta `dados/` se quiser usar **Exportar** (banco → JSON); depois rode `node tools/build.js` e envie as páginas novas.

Teste local rápido (XAMPP): `php -S localhost:8098 -t .` na raiz do projeto, com o MySQL do XAMPP ligado.

### Segurança aplicada

PDO com *prepared statements*; senhas com `password_hash`; sessão `HttpOnly` + `SameSite=Strict`; token CSRF em todo POST do painel; checagem de `Origin` e `Content-Type` nas APIs; limite de requisições por IP (IP guardado só como HMAC); campo isca anti-robô; consentimento (LGPD) obrigatório nos formulários; saída sempre escapada; sem JS/CSS inline (CSP restritiva); `/admin/` e `/api/` fora do `robots.txt` e do sitemap.

## Planos (preparado no código)

- `plano: "gratuito"`: cadastro básico, páginas renderizam só os campos preenchidos.
- `plano: "premium"` + `ia: true`: página completa, destaque na home e assistente IA próprio.
- Conteúdo patrocinado: `tipo: "patrocinado"` + `patrocinador` em `noticias.json`. A página mostra o aviso, usa `rel="sponsored"` e o schema `sponsor`.

## Assistentes de IA

`assets/js/ai-engine.js` roda no navegador: busca nos JSON (normaliza acentos, sinônimos, pontuação por campo) e responde só com dados cadastrados; sem dado, diz que não sabe.

Para conectar uma IA generativa depois, defina antes do script:

```html
<script>window.SJD_AI = { provider: 'http', endpoint: 'https://seu-proxy/ia' };</script>
```

O endpoint recebe `{escopo, pergunta, contexto}` (apenas dados da empresa/cidade) e devolve `{resposta}`. **Nunca ponha chave de API no front-end**: use um proxy próprio. Libere o domínio em `connect-src` no `.htaccess` (a CSP bloqueia scripts inline, então esse trecho deve ir em um arquivo `.js` próprio).

## SEO / GEO / segurança

Title, description, canonical, Open Graph, JSON-LD (Organization, LocalBusiness, Product, FAQPage, Event, Article, BreadcrumbList, WebSite), sitemap, `llms.txt`/`llms-full.txt`, rastreadores de IA liberados no `robots.txt`. Nota agregada de avaliações só entra no schema se `avaliacoes_verificadas: true`. CSP restritiva, sem JS/CSS inline, saída dinâmica escapada, cabeçalhos de segurança, cache e gzip no `.htaccess`.
