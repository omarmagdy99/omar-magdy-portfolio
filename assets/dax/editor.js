// A small DAX editor: syntax colours, IntelliSense-style suggestions, signature help and live diagnostics.
// A transparent <textarea> sits on top of a highlighted <pre>, so selection, IME, undo and mobile keyboards stay native.
import { complete, signatureHelp, highlight, diagnose, lineCol } from './intellisense.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const esc = s => s.replace(/[&<>]/g, c => ESC[c]);
const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
const KIND_LABEL = { function: 'fx', table: 'T', column: 'C', measure: 'M', variable: 'V', keyword: 'K' };

const DEFAULT_STRINGS = {
  title: 'Measure',
  hintHtml: '<kbd>Ctrl</kbd>+<kbd>Space</kbd> suggestions · <kbd>Ctrl</kbd>+<kbd>Enter</kbd> run',
  label: 'DAX measure editor',
  empty: 'Write a measure, for example: Total Sales = SUM ( Sales[Amount] )',
  ok: '✓ No problems found',
  problem: (message, line, col) => `⚠ ${message} (line ${line}, column ${col})`,
  suggestions: 'Suggestions',
};

export function createEditor(root, model, { value = '', onChange = () => {}, onRun = () => {}, strings = {} } = {}) {
  const S = { ...DEFAULT_STRINGS, ...strings };
  const label = S.label;
  root.classList.add('dax-editor');
  root.setAttribute('dir', 'ltr'); // code is always left-to-right, even on Arabic pages
  root.innerHTML = `
    <div class="dax-editor__bar"><span class="dax-editor__title">${S.title}</span><span class="dax-editor__hint">${S.hintHtml}</span></div>
    <div class="dax-editor__body">
      <div class="dax-editor__gutter" aria-hidden="true"></div>
      <div class="dax-editor__code">
        <pre class="dax-editor__hl" aria-hidden="true"><code></code></pre>
        <textarea class="dax-editor__input" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off" wrap="off" rows="10"
          role="combobox" aria-autocomplete="list" aria-expanded="false" aria-haspopup="listbox"></textarea>
        <div class="dax-sig" hidden role="status"></div>
        <div class="dax-suggest" hidden>
          <ul role="listbox" aria-label="${S.suggestions}"></ul>
          <div class="dax-suggest__doc"></div>
        </div>
      </div>
    </div>
    <div class="dax-editor__status" role="status" aria-live="polite"></div>`;
  const $ = s => root.querySelector(s);
  const input = $('.dax-editor__input'), hl = $('.dax-editor__hl code'), pre = $('.dax-editor__hl'), gutter = $('.dax-editor__gutter');
  const sigEl = $('.dax-sig'), box = $('.dax-suggest'), list = box.querySelector('ul'), docEl = $('.dax-suggest__doc'), statusEl = $('.dax-editor__status');
  const codeEl = $('.dax-editor__code');
  input.setAttribute('aria-label', label);
  const listId = `dax-list-${Math.random().toString(36).slice(2, 8)}`;
  list.id = listId; input.setAttribute('aria-controls', listId);

  let sugg = null, active = 0, diagTimer = 0, errRanges = [], metrics = null;

  function measure() {
    const probe = document.createElement('span');
    probe.className = 'dax-editor__probe'; probe.textContent = 'M'.repeat(40);
    codeEl.appendChild(probe);
    const cw = probe.getBoundingClientRect().width / 40;
    probe.remove();
    const cs = getComputedStyle(input);
    metrics = { cw: cw || 8, lh: parseFloat(cs.lineHeight) || 22, pt: parseFloat(cs.paddingTop) || 0, pl: parseFloat(cs.paddingLeft) || 0 };
  }

  function render() {
    const text = input.value;
    const toks = highlight(text, model);
    let html = '', pos = 0;
    for (const t of toks) {
      if (t.start > pos) html += esc(text.slice(pos, t.start));
      const bad = t.cls !== 'err' && errRanges.some(r => t.start < r.end && t.end > r.start);
      html += `<span class="t-${bad ? 'err' : t.cls}">${esc(text.slice(t.start, t.end))}</span>`;
      pos = t.end;
    }
    html += esc(text.slice(pos)) + '\n';
    hl.innerHTML = html;
    const lines = text.split('\n').length;
    gutter.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
    syncScroll();
  }
  function syncScroll() { pre.scrollTop = input.scrollTop; pre.scrollLeft = input.scrollLeft; gutter.scrollTop = input.scrollTop; }

  function scheduleDiagnostics() {
    clearTimeout(diagTimer);
    diagTimer = setTimeout(runDiagnostics, 250);
  }
  function runDiagnostics() {
    const text = input.value;
    const d = diagnose(text, model);
    errRanges = d.issues.map(i => ({ start: i.start, end: i.end }));
    if (d.empty) statusEl.textContent = S.empty;
    else if (d.ok) statusEl.textContent = S.ok;
    else {
      const i = d.issues[0]; const { line, col } = lineCol(text, i.start);
      statusEl.textContent = S.problem(i.message, line, col);
    }
    statusEl.classList.toggle('is-error', !d.ok && !d.empty);
    render();
    onChange(text, d);
  }

  /* ── editing helpers ── */
  function replace(start, end, text, caret = start + text.length) {
    input.focus();
    input.setSelectionRange(start, end);
    let done = false;
    try { done = document.execCommand('insertText', false, text); } catch { done = false; }
    if (!done) { input.setRangeText(text, start, end, 'end'); input.dispatchEvent(new Event('input', { bubbles: true })); }
    input.setSelectionRange(caret, caret);
  }

  /* ── suggestions ── */
  function closeSuggest() {
    sugg = null; box.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
  }
  function caretXY() {
    const { line, col } = lineCol(input.value, input.selectionStart);
    return { x: metrics.pl + (col - 1) * metrics.cw - input.scrollLeft, y: metrics.pt + line * metrics.lh - input.scrollTop };
  }
  function place(el, extraTop = 0) {
    const { x, y } = caretXY();
    const maxLeft = Math.max(0, codeEl.clientWidth - el.offsetWidth - 8);
    el.style.left = `${Math.max(4, Math.min(x, maxLeft))}px`;
    el.style.top = `${y + 4 + extraTop}px`;
  }
  function openSuggest(force = false) {
    if (input.selectionStart !== input.selectionEnd) return closeSuggest();
    const r = complete(input.value, input.selectionStart, model, { force });
    if (!r) return closeSuggest();
    sugg = r; active = 0;
    list.innerHTML = r.items.map((it, i) => `<li role="option" id="${listId}-${i}" data-i="${i}" class="${i === 0 ? 'is-active' : ''}" aria-selected="${i === 0}"><span class="dax-k dax-k--${it.kind}">${KIND_LABEL[it.kind]}</span><span class="dax-suggest__label">${esc(it.label)}</span><span class="dax-suggest__detail">${esc(it.detail ?? '')}</span></li>`).join('');
    box.hidden = false; sigEl.hidden = true;
    input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-activedescendant', `${listId}-0`);
    showDoc(); place(box);
    flipIfClipped();
  }
  function flipIfClipped() {
    const rect = box.getBoundingClientRect(), parent = codeEl.getBoundingClientRect();
    if (rect.bottom > Math.min(window.innerHeight - 8, parent.bottom + 220)) {
      const { y } = caretXY();
      box.style.top = `${Math.max(0, y - box.offsetHeight - metrics.lh - 4)}px`;
    }
  }
  function showDoc() {
    const it = sugg?.items[active];
    if (!it) return;
    docEl.innerHTML = it.signature ? `<code>${esc(it.signature)}</code><p>${esc(it.doc ?? '')}</p>` : (it.doc ? `<p>${esc(it.doc)}</p>` : '');
    docEl.hidden = !docEl.innerHTML;
  }
  function setActive(i) {
    active = (i + sugg.items.length) % sugg.items.length;
    [...list.children].forEach((li, k) => { li.classList.toggle('is-active', k === active); li.setAttribute('aria-selected', String(k === active)); });
    input.setAttribute('aria-activedescendant', `${listId}-${active}`);
    list.children[active].scrollIntoView({ block: 'nearest' });
    showDoc();
  }
  function accept(i = active) {
    const it = sugg.items[i]; const text = input.value;
    let { from, to } = sugg;
    let insert = it.insert, caret;
    if (it.replaceBracket) from -= 1;
    if (it.closeBracket) {
      if (text[to] === ']') to += 1;
      insert += ']';
    } else if (it.kind === 'table' && text[from - 1] === "'" && text[to] === "'") to += 1;
    if (it.caretInside) {
      const hasClose = text[to] === ')';
      if (text[to] === '(') { insert = it.label; }
      else if (!hasClose) { insert = `${it.label}()`; caret = from + it.label.length + 1; }
      else caret = from + insert.length;
    }
    closeSuggest();
    replace(from, to, insert, caret ?? from + insert.length);
    openAfterAccept(it);
  }
  function openAfterAccept(it) {
    if (it.kind === 'table' && !it.closeBracket) { /* user types [ next */ }
    updateSig();
  }

  /* ── signature help ── */
  function updateSig() {
    if (sugg) return;
    const s = signatureHelp(input.value, input.selectionStart);
    if (!s) { sigEl.hidden = true; return; }
    const parts = s.fn.params.map((p, i) => {
      const txt = (p.optional ? `[${p.label}]` : p.label) + (p.repeat ? ', …' : '');
      return i === s.active ? `<b>${esc(txt)}</b>` : esc(txt);
    });
    sigEl.innerHTML = `<code>${s.fn.name}(${parts.join(', ')})</code><span>${esc(s.fn.doc)}</span>`;
    sigEl.hidden = false;
    const { x, y } = caretXY();
    sigEl.style.left = `${Math.max(4, Math.min(x, codeEl.clientWidth - sigEl.offsetWidth - 8))}px`;
    sigEl.style.top = `${Math.max(2, y - metrics.lh - sigEl.offsetHeight - 6)}px`;
  }

  /* ── events ── */
  input.addEventListener('input', e => {
    render(); scheduleDiagnostics();
    const t = e.inputType ?? '';
    if (t.startsWith('insert') && t !== 'insertLineBreak') openSuggest(); else if (t.startsWith('delete') && sugg) openSuggest(); else closeSuggest();
    updateSig();
  });
  input.addEventListener('scroll', () => { syncScroll(); if (sugg) place(box); });
  input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== input) { closeSuggest(); sigEl.hidden = true; } }, 120));
  input.addEventListener('click', () => { closeSuggest(); updateSig(); });
  input.addEventListener('keyup', e => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) { closeSuggest(); updateSig(); } });
  list.addEventListener('mousedown', e => { e.preventDefault(); const li = e.target.closest('li'); if (li) accept(+li.dataset.i); });

  input.addEventListener('keydown', e => {
    if (e.isComposing) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun(); return; }
    if ((e.ctrlKey || e.metaKey) && e.code === 'Space') { e.preventDefault(); openSuggest(true); return; }
    if (sugg) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); accept(); return; }
      if (e.key === 'Escape') { e.preventDefault(); closeSuggest(); return; }
    }
    const { selectionStart: s, selectionEnd: en, value: v } = input;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // typing a closing character over an auto-inserted one
    const isQuote = e.key === '"' || e.key === "'";
    if (s === en && v[s] === e.key && [')', ']', '}', '"', "'"].includes(e.key)) {
      e.preventDefault(); input.setSelectionRange(s + 1, s + 1); return;
    }
    if (PAIRS[e.key] && (!isQuote || !/[A-Za-z0-9_]/.test(v[s - 1] ?? ''))) {
      e.preventDefault();
      const close = PAIRS[e.key];
      if (s !== en) replace(s, en, e.key + v.slice(s, en) + close, en + 2);
      else replace(s, s, e.key + close, s + 1);
      return;
    }
    if (e.key === 'Backspace' && s === en && PAIRS[v[s - 1]] === v[s]) { e.preventDefault(); replace(s - 1, s + 1, '', s - 1); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const indent = /^[ \t]*/.exec(v.slice(lineStart, s))[0];
      const extra = /[(\[{]$/.test(v.slice(0, s).trimEnd()) ? '    ' : '';
      if (extra && /^[)\]}]/.test(v.slice(en))) replace(s, en, `\n${indent}${extra}\n${indent}`, s + 1 + indent.length + extra.length);
      else replace(s, en, `\n${indent}${extra}`);
    }
  });

  new ResizeObserver(() => { measure(); }).observe(root);
  measure();
  input.value = value;
  render(); runDiagnostics();

  return {
    get value() { return input.value; },
    set value(v) { input.value = v; render(); runDiagnostics(); },
    focus: () => input.focus(),
    insert(text) { const s = input.selectionStart; replace(s, input.selectionEnd, text); input.focus(); },
    setMessage(msg) { statusEl.textContent = msg; },
  };
}
