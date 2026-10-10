# Aurio Burger — Landing page

Landing page da **Aurio Burger**, hamburgueria de operação digital na zona do Xyami Shopping, Nova Vida, Luanda.
O site apresenta o menu e encaminha todas as encomendas para o WhatsApp oficial. Não há pagamentos online nem contas de cliente.

- **WhatsApp:** 937 722 482 → `https://wa.me/244937722482`
- **Email:** aurioburgueroficial@gmail.com (manter esta grafia exata)

## Tecnologia

HTML, CSS e JavaScript puros, sem framework, sem build e sem dependências.
Só as fontes vêm de fora (Google Fonts: Sora e Manrope).

## Estrutura

```
.
├── site/                      ← tudo o que é publicado
│   ├── index.html             página completa (conteúdo, SEO, dados estruturados)
│   ├── assets/css/styles.css  estilos (tokens de cor no topo, mobile-first)
│   ├── assets/js/main.js      encomenda/carrinho, mensagens WhatsApp, navegação
│   ├── assets/img/            imagens otimizadas (WebP) + imagem de partilha
│   ├── favicon-*.png, apple-touch-icon.png, site.webmanifest, robots.txt
├── *.png                      originais em alta resolução (não publicados)
└── .claude/ , .agents/        skills usadas no desenvolvimento
```

## Ver localmente

```bash
cd site
python3 -m http.server 8000
# abrir http://localhost:8000
```

Também funciona ao abrir `site/index.html` diretamente no navegador.

## Publicar

Publicar **apenas o conteúdo da pasta `site/`**.

- **Netlify / Vercel / Cloudflare Pages:** ligar o repositório e indicar `site` como diretório de publicação (sem comando de build).
- **GitHub Pages:** o Pages só serve a raiz ou `/docs`. Usar um workflow do GitHub Actions que publique `site/`, ou mover o conteúdo para `docs/`.

Depois de confirmado o domínio definitivo, fazer o seguinte:

1. Em `index.html`, descomentar e preencher `<link rel="canonical">` e `og:url`.
2. Trocar os caminhos de `og:image` e `twitter:image` por URLs absolutas (`https://dominio/assets/img/og-image.jpg`). Algumas redes só mostram a imagem de partilha com URL absoluta.
3. Criar `sitemap.xml` e descomentar a linha `Sitemap:` em `robots.txt`.

## Como funciona a encomenda

- **Por produto:** cada cartão tem um seletor de quantidade. "Encomendar este hambúrguer" abre o WhatsApp com a mensagem já escrita (produto, quantidade, preço e total).
- **Vários produtos:** "Adicionar" junta o produto a **"A tua encomenda"**. Aí o cliente pode alterar quantidades, retirar produtos e indicar nome e zona (opcionais). Depois carrega em "Continuar no WhatsApp".
- **Total:** o total mostrado é o **subtotal dos artigos**. A taxa de entrega nunca entra no cálculo, porque é confirmada pelo atendimento.
- **Dados do cliente:** a seleção fica guardada só no navegador do cliente (`localStorage`). Nada é enviado para um servidor.

## Tarefas comuns

### Alterar um preço ou nome

O JavaScript lê os produtos dos atributos `data-*` de cada cartão (`data-name`, `data-price`), por isso as mensagens e o carrinho atualizam-se sozinhos. Ao mudar um preço, atualizar em `index.html`:

1. `data-price` do cartão (`<article data-product data-id="...">`)
2. O preço visível no cartão (`<p class="price">`)
3. O `exp-kicker` do separador correspondente em "Camada a camada"
4. O `"price"` do produto no bloco JSON-LD (`<head>`)
5. Se o preço mínimo mudar: o selo do topo, a FAQ ("começam nos 1.000 Kz"), o `priceRange` no JSON-LD e a descrição de partilha.

### Substituir as ilustrações pelas fotografias reais

O **Hambúrguer Especial** e o **Combo Duplo** ainda não têm fotografia. Por agora mostram uma ilustração das camadas marcada "Ilustração · fotografia em breve".

1. Converter a foto (exemplo para o Especial):
   ```bash
   cwebp -q 80 -resize 480 0 especial.png -o site/assets/img/especial-480.webp
   cwebp -q 80 -resize 800 0 especial.png -o site/assets/img/especial-800.webp
   ```
2. No cartão do menu, substituir o bloco `<div class="product-media is-placeholder">…</div>` pelo mesmo formato dos cartões Baixinho/Normal:
   - `<div class="product-media">` com o `<img>` (incluir `srcset`, `width`/`height` reais e `alt` descritivo)
   - manter o `<span class="product-index">`
3. Fazer o mesmo no painel do separador (`#panel-especial` / `#panel-combo`) se houver imagem dos ingredientes separados. Usar proporção 2:3, como as existentes.
4. A miniatura do carrinho passa a usar a foto automaticamente.

### Adicionar redes sociais

Só depois de os endereços estarem confirmados. Adicionar os links no rodapé (`<footer class="site-footer">`).

## Regras de conteúdo

O briefing do proprietário proíbe inventar dados comerciais. Manter estas regras em qualquer alteração:

- **Localização:** o Xyami Shopping é **apenas referência da zona**. Não publicar morada, pin no mapa ou coordenadas. A Aurio Burger não tem espaço de atendimento ao público.
- **Dados operacionais:** não publicar horários, taxa ou tempo de entrega, métodos de pagamento, nem ponto de levantamento sem confirmação.
- **Credibilidade:** não usar avaliações, testemunhos, contadores ou selos fictícios. Não usar alegações como "o melhor de Luanda".
- **Fotografias:** não usar a fotografia de um hambúrguer para representar outro. No Normal, o chourição é uma **fatia fina de enchido curado**.

## Pendente (depende do proprietário)

- [ ] Fotografias do Hambúrguer Especial e do Combo Duplo (e das respetivas camadas)
- [ ] Domínio definitivo (canonical, `og:url`, sitemap)
- [ ] Confirmação da ordem das camadas do Especial e do Combo
- [ ] Política de privacidade completa, se vier a ser necessária
- [ ] Redes sociais oficiais
