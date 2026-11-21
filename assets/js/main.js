/* ==========================================================
   Лесная Тишина — интерактив
   ========================================================== */
(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Новогодняя тема ---------- */
  const themeToggle = $('#themeToggle');
  const savedTheme = localStorage.getItem('lesnaya-theme');
  if (savedTheme === 'ny') {
    document.body.classList.add('ny-theme');
    themeToggle.setAttribute('aria-pressed', 'true');
  }
  themeToggle.addEventListener('click', () => {
    const isNy = document.body.classList.toggle('ny-theme');
    themeToggle.setAttribute('aria-pressed', String(isNy));
    localStorage.setItem('lesnaya-theme', isNy ? 'ny' : 'default');
    snow.setDensity(isNy ? 170 : 55);
  });

  /* ---------- Падающий снег ---------- */
  const snow = (() => {
    const canvas = $('#snow');
    const ctx = canvas.getContext('2d');
    let flakes = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let density = document.body.classList.contains('ny-theme') ? 170 : 55;

    function makeFlake(randomY = true) {
      const depth = Math.random();
      return {
        x: Math.random() * width,
        y: randomY ? Math.random() * height : -12,
        r: 1 + depth * 2.6,
        vy: .35 + depth * 1.15,
        vx: (Math.random() - .5) * .35,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: .008 + Math.random() * .015,
        alpha: .3 + depth * .55
      };
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (flakes.length > density) flakes = flakes.slice(0, density);
      while (flakes.length < density) flakes.push(makeFlake());
    }

    function setDensity(next) {
      density = reduced ? 0 : next;
      if (flakes.length > density) flakes = flakes.slice(0, density);
      while (flakes.length < density) flakes.push(makeFlake());
    }

    function frame() {
      ctx.clearRect(0, 0, width, height);
      for (const f of flakes) {
        f.sway += f.swaySpeed;
        f.x += f.vx + Math.sin(f.sway) * .28;
        f.y += f.vy;
        if (f.y > height + 8) { f.y = -8; f.x = Math.random() * width; }
        if (f.x > width + 8) f.x = -8;
        if (f.x < -8) f.x = width + 8;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${f.alpha})`;
        ctx.fill();
      }
      requestAnimationFrame(frame);
    }

    resize();
    if (!reduced) requestAnimationFrame(frame);
    window.addEventListener('resize', resize);
    return { setDensity };
  })();

  /* ---------- Появление блоков ---------- */
  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => revealObserver.observe(el));

  /* ---------- Шапка ---------- */
  const header = $('#header');
  const onScrollHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
  onScrollHeader();

  /* ---------- Параллакс ---------- */
  const parallaxNodes = $$('[data-parallax]');
  let ticking = false;
  function updateParallax() {
    const y = window.scrollY;
    for (const node of parallaxNodes) {
      const factor = parseFloat(node.dataset.parallax) || 0;
      node.style.transform = `translate3d(0, ${y * factor}px, 0)`;
    }
    ticking = false;
  }
  function requestTick() {
    onScrollHeader();
    if (!ticking && !reduced) {
      ticking = true;
      requestAnimationFrame(updateParallax);
    }
  }
  window.addEventListener('scroll', requestTick, { passive: true });
  updateParallax();

  /* ---------- Мобильное меню ---------- */
  const burger = $('#burger');
  const navLinks = $('#navLinks');
  burger.addEventListener('click', () => {
    const open = burger.classList.toggle('is-open');
    navLinks.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  });
  $$('a', navLinks).forEach(link => link.addEventListener('click', () => {
    burger.classList.remove('is-open');
    navLinks.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }));

  /* ---------- Световая реакция карточек ---------- */
  $$('.card').forEach(card => {
    card.addEventListener('pointermove', e => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });
  });

  /* ---------- 3D-сцена: наклон, приближение, облачки ---------- */
  const scene = $('#chalet3d');
  const stage = $('.showroom-stage');
  const stageCaption = $('.stage-caption');
  const clouds = $$('.review-cloud');
  const tabs = $$('.scene-tab');
  const pin = $('#chaletPin');

  let userSelectedCloud = false;

  function showCloud(name, fromUser = false) {
    if (fromUser) userSelectedCloud = true;
    clouds.forEach(c => c.classList.toggle('is-visible', c.dataset.cloud === name));
    tabs.forEach(t => {
      const active = t.dataset.cloud === name;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
    });
  }

  tabs.forEach(tab => tab.addEventListener('click', () => showCloud(tab.dataset.cloud, true)));
  pin.addEventListener('click', () => {
    showCloud('anna', true);
    scene.classList.add('is-close');
    stageCaption.innerHTML = '<span class="stage-caption__dot"></span> Камера: шале №4 · тишина 55 дБ';
  });

  if (!reduced) {
    scene.addEventListener('pointermove', e => {
      const rect = scene.getBoundingClientRect();
      const dx = (e.clientX - rect.left) / rect.width - .5;
      const dy = (e.clientY - rect.top) / rect.height - .5;
      scene.style.setProperty('--ry', `${dx * 14}deg`);
      scene.style.setProperty('--rx', `${-dy * 10}deg`);
      scene.classList.add('is-close');
      stageCaption.innerHTML = '<span class="stage-caption__dot"></span> Камера: приближение · шале №4';
    });
    scene.addEventListener('pointerleave', () => {
      scene.style.setProperty('--ry', '0deg');
      scene.style.setProperty('--rx', '0deg');
      if (!pin.matches(':focus')) scene.classList.remove('is-close');
    });
  }

  // «Камера приближается» при скролле к сцене — появляется отзыв Анны о шале №4
  const stageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !scene.matches(':hover')) {
        scene.classList.add('is-close');
        if (!userSelectedCloud) {
          showCloud('anna');
          stageCaption.innerHTML = '<span class="stage-caption__dot"></span> Камера: приближение · шале №4';
        }
      } else if (!entry.isIntersecting) {
        scene.classList.remove('is-close');
      }
    });
  }, { threshold: .2 });
  if (stage) stageObserver.observe(stage);

  /* ---------- Обратный отсчёт до 25 ноября ---------- */
  const cd = { d: $('#cdDays'), h: $('#cdHours'), m: $('#cdMinutes'), s: $('#cdSeconds') };
  function countdownTarget() {
    const now = new Date();
    let year = now.getFullYear();
    let target = new Date(year, 10, 25, 23, 59, 59);
    if (now > target) target = new Date(year + 1, 10, 25, 23, 59, 59);
    return target;
  }
  let target = countdownTarget();
  function tickCountdown() {
    const diff = Math.max(0, target - new Date());
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000) % 24;
    const minutes = Math.floor(diff / 60000) % 60;
    const seconds = Math.floor(diff / 1000) % 60;
    cd.d.textContent = String(days).padStart(2, '0');
    cd.h.textContent = String(hours).padStart(2, '0');
    cd.m.textContent = String(minutes).padStart(2, '0');
    cd.s.textContent = String(seconds).padStart(2, '0');
    if (diff === 0) target = countdownTarget();
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  /* ---------- Модалка заявки (логика формы — в form.js) ---------- */
  const modal = $('#bookingModal');

  $$('[data-open-modal]').forEach(btn => btn.addEventListener('click', () => {
    modal.dispatchEvent(new CustomEvent('form:reset'));
    modal.showModal();
  }));
  $$('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => modal.close()));
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.close();
  });

  /* ---------- Галерея: лайтбокс ---------- */
  const lightbox = $('#lightbox');
  const lbImg = $('#lightboxImg');
  const lbWebp = $('#lightboxWebp');
  const lbCaption = $('#lightboxCaption');
  const lbCount = $('#lightboxCount');
  const galleryItems = $$('.gallery-item');
  let lbIndex = 0;

  function renderLightbox(index) {
    lbIndex = (index + galleryItems.length) % galleryItems.length;
    const item = galleryItems[lbIndex];
    lbWebp.setAttribute('srcset', item.dataset.webp);
    lbImg.src = item.dataset.full;
    lbImg.alt = item.querySelector('img')?.alt || '';
    lbCaption.textContent = item.dataset.caption;
    lbCount.textContent = `${lbIndex + 1} / ${galleryItems.length}`;
  }

  galleryItems.forEach((item, index) => item.addEventListener('click', () => {
    renderLightbox(index);
    lightbox.showModal();
  }));
  $('[data-lightbox-close]').addEventListener('click', () => lightbox.close());
  $('[data-lightbox-prev]').addEventListener('click', () => renderLightbox(lbIndex - 1));
  $('[data-lightbox-next]').addEventListener('click', () => renderLightbox(lbIndex + 1));
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) lightbox.close();
  });
  lightbox.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') renderLightbox(lbIndex - 1);
    if (e.key === 'ArrowRight') renderLightbox(lbIndex + 1);
  });
})();
