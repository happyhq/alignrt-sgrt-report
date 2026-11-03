'use strict';
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const toast = $('#toast');
  let toastTimer;
  function announce(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2800);
  }

  const nav = $('#reading-nav');
  const menu = $('#menu-toggle');
  function closeMenu() {
    nav.classList.remove('is-open');
    menu.setAttribute('aria-expanded', 'false');
  }
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menu.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('click', event => { if (!nav.contains(event.target) && !menu.contains(event.target)) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', () => { if (innerWidth > 760) closeMenu(); });

  const chapters = $$('.chapter');
  const progress = $('.reading-progress');
  let scrollPending = false;
  function updateReading() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const percent = max > 0 ? Math.min(100, Math.max(0, Math.round(scrollY / max * 100))) : 100;
    progress.firstElementChild.style.width = `${percent}%`;
    progress.setAttribute('aria-valuenow', String(percent));
    $('#progress-number').textContent = `${percent}%`;
    let current = null;
    for (const chapter of chapters) {
      if (chapter.getBoundingClientRect().top <= innerHeight * 0.35) current = chapter.id;
    }
    $$('[data-nav]', nav).forEach(link => {
      const active = link.dataset.nav === current;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    scrollPending = false;
  }
  addEventListener('scroll', () => {
    if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateReading); }
  }, {passive: true});
  addEventListener('resize', updateReading);
  addEventListener('load', updateReading);
  updateReading();

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      try { await navigator.clipboard.writeText(text); return true; } catch (_) { /* file:// / denied: use local fallback */ }
    }
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;left:-10000px;top:0';
    document.body.append(field);
    const focus = document.activeElement;
    field.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } finally { field.remove(); focus?.focus({preventScroll:true}); }
    return copied;
  }
  $$('.copy-section').forEach(button => button.addEventListener('click', async () => {
    const section = document.getElementById(button.dataset.copy);
    const clone = section.cloneNode(true);
    $$('button,.zoom-label', clone).forEach(element => element.remove());
    // innerText requires layout; a hidden rendered clone preserves table/list line breaks.
    clone.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;pointer-events:none';
    clone.setAttribute('aria-hidden', 'true');
    document.body.append(clone);
    const text = clone.innerText;
    clone.remove();
    try { announce(await copyText(text) ? '本章正文已复制' : '复制未完成，请选择正文后手动复制'); }
    catch (_) { announce('复制未完成，请选择正文后手动复制'); }
  }));

  const dialog = $('#image-dialog');
  const dialogImage = $('#dialog-image');
  let zoom = 1;
  let baseWidth = 800;
  let zoomTrigger;
  function setZoom(value) {
    zoom = Math.min(3, Math.max(0.5, value));
    dialogImage.style.width = `${baseWidth * zoom}px`;
    dialogImage.classList.toggle('zoomed', zoom > 1);
    $('#zoom-level').value = `${Math.round(zoom * 100)}%`;
  }
  function fitImage() {
    baseWidth = Math.min($('.image-viewport').clientWidth - 28, 1000);
    setZoom(1);
    $('.image-viewport').scrollTo(0,0);
  }
  $$('.zoom-figure').forEach(button => button.addEventListener('click', () => {
    zoomTrigger = button;
    dialogImage.src = button.dataset.image;
    dialogImage.alt = button.dataset.caption;
    $('#dialog-caption').textContent = button.dataset.caption;
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
    fitImage();
    $('#close-dialog').focus();
  }));
  $('#close-dialog').addEventListener('click', () => dialog.close());
  $('#zoom-in').addEventListener('click', () => setZoom(zoom + 0.25));
  $('#zoom-out').addEventListener('click', () => setZoom(zoom - 0.25));
  $('#zoom-reset').addEventListener('click', fitImage);
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = '';
    zoomTrigger?.focus({preventScroll: true});
  });
  addEventListener('resize', () => { if (dialog.open) fitImage(); });

  const speed = $('#speed');
  const delay = $('#delay');
  function calculate() {
    const v = speed.valueAsNumber;
    const t = delay.valueAsNumber;
    const valid = speed.checkValidity() && delay.checkValidity() && Number.isFinite(v) && Number.isFinite(t);
    $('#distance').value = valid ? `${Number((v * t / 1000).toFixed(4))} mm` : '请输入有效值';
  }
  [speed,delay].forEach(input => input.addEventListener('input', calculate));
  calculate();

  const checks = $$('.understood');
  function score() {
    const n = checks.filter(box => box.checked).length;
    $('#quiz-score').textContent = `已掌握 ${n} / 5`;
  }
  checks.forEach(box => box.addEventListener('change', score));
  $('#reset-quiz').addEventListener('click', () => {
    checks.forEach(box => { box.checked = false; });
    $$('.quiz-item').forEach(item => { item.open = false; });
    score();
    announce('自测已重置');
  });

  const records = $$('.source-record');
  $('#expand-sources').addEventListener('click', event => {
    const expand = !records.every(item => item.open);
    records.forEach(item => { item.open = expand; });
    event.currentTarget.textContent = expand ? '收起全部原文' : '展开全部原文';
    updateReading();
  });
  function openSourceHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!/^source-\d{2}$/.test(id)) return;
    const record = document.getElementById(id);
    if (record) {
      record.open = true;
      requestAnimationFrame(() => record.scrollIntoView({block:'start'}));
    }
  }
  addEventListener('hashchange', openSourceHash);
  openSourceHash();
  records.forEach(item => item.addEventListener('toggle', updateReading));

  // Print expands all answers, then restores each user's reading state.
  let printState = null;
  addEventListener('beforeprint', () => {
    if (printState) return;
    printState = $$('.quiz-item').map(item => ({item,open:item.open}));
    printState.forEach(({item}) => { item.open = true; });
  });
  addEventListener('afterprint', () => {
    printState?.forEach(({item,open}) => { item.open = open; });
    printState = null;
  });
  $$('.print-button').forEach(button => button.addEventListener('click', () => window.print()));
})();
