/* =========================================================
   Aurio Burger — interações
   - Mensagens de WhatsApp pré-preenchidas (produto, quantidade, preço)
   - Carrinho com quantidades, subtotais e total (sem taxa de entrega)
   - Navegação móvel, header compacto, separadores, revelação ao scroll
   ========================================================= */
(function () {
  'use strict';

  var WA_NUMBER = '244937722482';
  var CART_KEY = 'aurio-cart-v1';
  var MAX_QTY = 20;

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- Utilitários ---------- */
  function formatKz(value, plain) {
    // 1000 -> "1.000 Kz" (separador de milhares com ponto, como no menu).
    // Na interface usa espaço não separável; nas mensagens, espaço normal.
    return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (plain ? ' ' : '\u00a0') + 'Kz';
  }
  function kz(value) { return formatKz(value, true); }
  function waLink(text) {
    return 'https://wa.me/' + WA_NUMBER + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  /* ---------- Catálogo (lido do HTML: fonte única dos preços) ---------- */
  var PRODUCTS = {};
  $$('[data-product]').forEach(function (card) {
    var img = $('.product-media img', card);
    PRODUCTS[card.dataset.id] = {
      id: card.dataset.id,
      name: card.dataset.name,
      price: Number(card.dataset.price),
      thumb: img ? img.getAttribute('srcset').split(' ')[0] : null
    };
  });

  /* ---------- Mensagens ---------- */
  var MESSAGES = {
    geral: 'Olá, Aurio Burger! Gostaria de fazer uma encomenda.',
    zona: 'Olá, Aurio Burger! Gostaria de confirmar se fazem entregas na minha zona.'
  };

  function singleMessage(product, qty) {
    var total = product.price * qty;
    var line = qty === 1
      ? '1 ' + product.name + ', por ' + kz(product.price)
      : qty + ' × ' + product.name + ' (' + kz(product.price) + ' cada), num total de ' + kz(total);
    return 'Olá, Aurio Burger! Gostaria de encomendar ' + line +
      '. Podem confirmar a disponibilidade e as condições de entrega?';
  }

  function cartMessage(items, name, zone) {
    var lines = items.map(function (it) {
      return '- ' + it.qty + 'x ' + it.product.name + ' — ' + kz(it.product.price * it.qty);
    });
    return [
      'Olá, Aurio Burger!',
      '',
      'Gostaria de fazer a seguinte encomenda:',
      '',
      lines.join('\n'),
      '',
      'Subtotal dos artigos: ' + kz(cartTotal(items)),
      '',
      'Nome: ' + (name || ''),
      'Zona de entrega: ' + (zone || ''),
      '',
      'Podem confirmar a disponibilidade, a taxa de entrega e as condições de pagamento?',
      '',
      'Obrigado.'
    ].join('\n');
  }

  // Links gerais e por produto (secção "camada a camada")
  $$('[data-wa]').forEach(function (a) {
    var msg = MESSAGES[a.dataset.wa];
    if (msg) a.href = waLink(msg);
  });
  $$('[data-wa-product]').forEach(function (a) {
    var p = PRODUCTS[a.dataset.waProduct];
    if (p) a.href = waLink(singleMessage(p, 1));
  });

  /* ---------- Armazenamento do carrinho (apenas neste navegador) ---------- */
  function loadCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
      var clean = {};
      Object.keys(raw).forEach(function (id) {
        var q = parseInt(raw[id], 10);
        if (PRODUCTS[id] && q > 0) clean[id] = Math.min(q, MAX_QTY);
      });
      return clean;
    } catch (e) { return {}; }
  }
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* modo privado: ignora */ }
  }

  var cart = loadCart();

  function cartItems() {
    // Mantém a ordem do menu
    return Object.keys(PRODUCTS)
      .filter(function (id) { return cart[id] > 0; })
      .map(function (id) { return { product: PRODUCTS[id], qty: cart[id] }; });
  }
  function cartCount(items) { return items.reduce(function (n, it) { return n + it.qty; }, 0); }
  function cartTotal(items) { return items.reduce(function (s, it) { return s + it.qty * it.product.price; }, 0); }

  /* ---------- Cartões de produto ---------- */
  $$('[data-product]').forEach(function (card) {
    var product = PRODUCTS[card.dataset.id];
    var out = $('[data-qty]', card);
    var dec = $('[data-qty-dec]', card);
    var inc = $('[data-qty-inc]', card);
    var order = $('[data-order]', card);
    var add = $('[data-add]', card);
    var qty = 1;

    dec.setAttribute('aria-label', 'Diminuir quantidade de ' + product.name);
    inc.setAttribute('aria-label', 'Aumentar quantidade de ' + product.name);

    function render() {
      out.textContent = qty;
      dec.disabled = qty <= 1;
      inc.disabled = qty >= MAX_QTY;
      order.href = waLink(singleMessage(product, qty));
      order.setAttribute('aria-label', 'Encomendar ' + qty + ' ' + product.name + ' pelo WhatsApp');
    }
    dec.addEventListener('click', function () { if (qty > 1) { qty--; render(); } });
    inc.addEventListener('click', function () { if (qty < MAX_QTY) { qty++; render(); } });

    add.addEventListener('click', function () {
      cart[product.id] = Math.min((cart[product.id] || 0) + qty, MAX_QTY);
      saveCart();
      renderCart();
      bumpCount();
      add.classList.add('is-added');
      setTimeout(function () { add.classList.remove('is-added'); }, 1200);
      showToast(qty + ' × ' + product.name + ' adicionado');
      qty = 1; render();
    });

    render();
  });

  /* ---------- Carrinho (dialog) ---------- */
  var dialog = $('[data-cart]');
  var listEl = $('[data-cart-items]');
  var emptyEl = $('[data-cart-empty]');
  var bodyEl = $('[data-cart-body]');
  var footEl = $('[data-cart-foot]');
  var totalEl = $('[data-cart-total]');
  var sendEl = $('[data-cart-send]');
  var sendLabel = $('[data-send-label]');
  var statusEl = $('[data-cart-status]');
  var nameEl = $('[data-cart-name]');
  var zoneEl = $('[data-cart-zone]');
  var dockCart = $('.dock-cart');
  var dockLabel = $('[data-dock-label]');
  var dockTotal = $('[data-dock-total]');
  var countEls = $$('[data-cart-count]');
  var cartBtn = $('.cart-btn');

  function updateSendLink() {
    var items = cartItems();
    sendEl.href = items.length
      ? waLink(cartMessage(items, nameEl.value.trim(), zoneEl.value.trim()))
      : waLink(MESSAGES.geral);
  }

  function renderCart() {
    var items = cartItems();
    var count = cartCount(items);
    var total = cartTotal(items);

    // Contadores
    countEls.forEach(function (el) { el.textContent = count; el.hidden = count === 0; });
    cartBtn.setAttribute('aria-label', 'Abrir a tua encomenda (' + count + (count === 1 ? ' artigo)' : ' artigos)'));
    dockCart.hidden = count === 0;
    dockLabel.textContent = count === 1 ? 'Ver encomenda · 1 artigo' : 'Ver encomenda · ' + count + ' artigos';
    dockTotal.textContent = formatKz(total);
    document.body.classList.toggle('has-cart', count > 0);

    // Lista
    emptyEl.hidden = count > 0;
    bodyEl.hidden = footEl.hidden = count === 0;
    listEl.innerHTML = '';
    items.forEach(function (it) {
      var p = it.product;
      var li = document.createElement('li');
      var thumb = p.thumb
        ? '<img class="cart-thumb" src="' + p.thumb + '" alt="" width="56" height="56">'
        : '<span class="cart-thumb ph" aria-hidden="true">' + p.name.replace('Hambúrguer ', '').charAt(0) + '</span>';
      li.innerHTML =
        thumb +
        '<div><p class="cart-name"></p><p class="cart-unit">' + formatKz(p.price) + ' / unidade</p></div>' +
        '<p class="cart-line-total"><span class="sr-only">Subtotal: </span>' + formatKz(p.price * it.qty) + '</p>' +
        '<div class="cart-row-actions">' +
          '<div class="stepper" role="group">' +
            '<button type="button" data-act="dec"><svg class="icon" aria-hidden="true"><use href="#i-minus"/></svg></button>' +
            '<output aria-live="polite">' + it.qty + '</output>' +
            '<button type="button" data-act="inc"><svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg></button>' +
          '</div>' +
          '<button type="button" class="cart-remove" data-act="remove"><svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg> Retirar</button>' +
        '</div>';
      $('.cart-name', li).textContent = p.name;
      $('.stepper', li).setAttribute('aria-label', 'Quantidade de ' + p.name);
      var bDec = $('[data-act="dec"]', li), bInc = $('[data-act="inc"]', li);
      bDec.setAttribute('aria-label', 'Diminuir quantidade de ' + p.name);
      bInc.setAttribute('aria-label', 'Aumentar quantidade de ' + p.name);
      $('[data-act="remove"]', li).setAttribute('aria-label', 'Retirar ' + p.name + ' da encomenda');
      bDec.disabled = it.qty <= 1;
      bInc.disabled = it.qty >= MAX_QTY;
      li.dataset.id = p.id;
      listEl.appendChild(li);
    });

    totalEl.textContent = formatKz(total);
    updateSendLink();
  }

  listEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    var id = btn.closest('li').dataset.id;
    var act = btn.dataset.act;
    if (act === 'inc') cart[id] = Math.min(cart[id] + 1, MAX_QTY);
    if (act === 'dec') cart[id] = Math.max(cart[id] - 1, 1);
    if (act === 'remove') delete cart[id];
    saveCart();
    renderCart();
    // Mantém o foco num sítio útil depois de re-renderizar
    var row = listEl.querySelector('li[data-id="' + id + '"]');
    var target = row ? row.querySelector('[data-act="' + act + '"]') : null;
    if (target && !target.disabled) target.focus();
    else if (row) row.querySelector('[data-act="remove"]').focus();
    else if (Object.keys(cart).length === 0) $('[data-cart-close]', dialog).focus();
    else listEl.querySelector('[data-act="remove"]').focus();
  });

  nameEl.addEventListener('input', updateSendLink);
  zoneEl.addEventListener('input', updateSendLink);

  sendEl.addEventListener('click', function () {
    updateSendLink();
    sendEl.setAttribute('aria-busy', 'true');
    sendLabel.textContent = 'A abrir o WhatsApp…';
    setTimeout(function () {
      sendEl.removeAttribute('aria-busy');
      sendLabel.textContent = 'Continuar no WhatsApp';
      statusEl.textContent = 'Abrimos o WhatsApp com o resumo. A encomenda só fica feita depois de enviares a mensagem e a equipa a confirmar.';
    }, 1400);
  });

  $('[data-cart-clear]').addEventListener('click', function () {
    cart = {};
    saveCart();
    statusEl.textContent = '';
    renderCart();
    $('[data-cart-close]', dialog).focus();
  });

  function openCart() {
    statusEl.textContent = '';
    closeNav();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }
  function closeCart() {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }
  $$('[data-cart-open]').forEach(function (b) { b.addEventListener('click', openCart); });
  $$('[data-cart-close]', dialog).forEach(function (b) { b.addEventListener('click', closeCart); });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) closeCart(); }); // clique no fundo

  function bumpCount() {
    countEls.forEach(function (el) {
      el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    });
  }

  /* ---------- Toast ---------- */
  var toast = $('[data-toast]');
  var toastTimer;
  function showToast(text) {
    toast.innerHTML = '';
    var span = document.createElement('span');
    span.textContent = text;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Ver encomenda';
    btn.addEventListener('click', function () { hideToast(); openCart(); });
    toast.append(span, btn);
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 3800);
  }
  function hideToast() { toast.classList.remove('is-visible'); }

  /* ---------- Navegação ---------- */
  var header = $('[data-header]');
  var nav = $('[data-nav]');
  var toggle = $('[data-nav-toggle]');

  function closeNav() {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  toggle.addEventListener('click', function () {
    var open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) $('a', nav).focus();
  });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', closeNav); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { closeNav(); toggle.focus(); }
  });

  // Header compacto ao fazer scroll
  var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 24); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Ligação ativa na navegação
  if ('IntersectionObserver' in window) {
    var links = {};
    $$('.main-nav a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        // Secções fora da navegação (ex.: zona, FAQ) limpam o estado ativo
        Object.keys(links).forEach(function (k) {
          links[k].classList.toggle('is-active', k === en.target.id);
          if (k === en.target.id) links[k].setAttribute('aria-current', 'location');
          else links[k].removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section[id]').forEach(function (s) { spy.observe(s); });

    // Telemóvel: o botão flutuante do WhatsApp só aparece depois dos botões do hero
    var heroCtas = $('.hero-copy .btn-row');
    var dockWa = $('.dock-wa');
    if (heroCtas && dockWa) {
      new IntersectionObserver(function (entries) {
        dockWa.classList.toggle('is-hidden', entries[0].isIntersecting);
      }).observe(heroCtas);
    }
  }

  /* ---------- Separadores "camada a camada" ---------- */
  var tabs = $$('.exp-tabs [role="tab"]');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });
  });

  /* ---------- Revelação ao scroll ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 70 + 'ms';
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Ano automático ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  renderCart();

  // Exposto apenas para testes automáticos
  window.__aurio = { formatKz: formatKz, singleMessage: singleMessage, cartMessage: cartMessage, products: PRODUCTS };
})();
