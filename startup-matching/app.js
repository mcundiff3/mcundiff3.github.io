(function () {
  const Q = DATA.questions;
  const TOTAL = Q.length;
  const COLORS = ['var(--q0)', 'var(--q1)', 'var(--q2)', 'var(--q3)', 'var(--q4)', 'var(--q5)', 'var(--q6)', 'var(--q7)'];
  const TOPIC_NAMES = ['Your round', 'Product stage', 'Revenue', 'Sector', 'Location', 'Team size', 'Founding team', 'What you want from an investor'];
  const LETTERS = 'ABCDEFGHIJ';
  const NUM_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen'];
  const ROMAN = ['i.', 'ii.', 'iii.'];
  const SHORT_NAME = { round: 'Round', product: 'Product', revenue: 'Revenue', industry: 'Sector', location: 'Location', team: 'Team', profile: 'Founding team', priority: 'Priority' };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const pad = (n) => String(n).padStart(2, '0');
  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  function stepFromUrl() {
    const raw = new URLSearchParams(location.search).get('step');
    if (raw === null) return -1;
    const n = Number(raw);
    if (!Number.isFinite(n)) return -1;
    return Math.max(-1, Math.min(TOTAL, Math.trunc(n)));
  }

  const state = { step: stepFromUrl(), answers: {}, showAll: false };
  let autoAdvanceTimer = null;

  function syncUrl(replace) {
    const url = new URL(location.href);
    if (state.step <= -1) url.searchParams.delete('step');
    else url.searchParams.set('step', String(state.step));
    const fn = replace ? 'replaceState' : 'pushState';
    history[fn](null, '', url);
  }

  function go(step, opts) {
    clearTimeout(autoAdvanceTimer);
    state.step = Math.max(-1, Math.min(TOTAL, step));
    state.showAll = false;
    if (opts && opts.push === false) syncUrl(true);
    else syncUrl(false);
    render();
  }

  window.addEventListener('popstate', () => {
    clearTimeout(autoAdvanceTimer);
    state.step = stepFromUrl();
    state.showAll = false;
    render();
  });

  function labelOf(q, id) {
    const o = q.options.find((x) => x.id === id);
    return o ? o.label : id;
  }

  function domainOf(url) {
    return String(url || '')
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');
  }

  function iconArrowRight(color) {
    return `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8h10M9 4l4 4-4 4" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  function iconArrowLeft(color) {
    return `<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 8h-10M7 4 3 8l4 4" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function renderIntro() {
    const topics = TOPIC_NAMES.map((t, i) => `
      <div class="im-topic-row">
        <span class="im-topic-num">${pad(i + 1)}</span>
        <span class="im-topic-dot" style="background:${COLORS[i % COLORS.length]}"></span>
        <span class="im-topic-text">${esc(t)}</span>
      </div>`).join('');

    return `
      <div class="im-meta-row mono" style="color:rgba(17,17,17,0.6)">
        <span>Introduction</span>
        <span>00 / ${pad(TOTAL)}</span>
      </div>
      <div class="im-two-col im-intro-row">
        <section class="im-col-main" style="flex:999 1 520px">
          <div class="im-hi">Hi.</div>
          <h1 class="im-intro-headline">A few questions about your company, then a short list of investors who fit.</h1>
          <p class="im-intro-body">At the end you'll see what to look for in an investor at your stage, and the firms whose focus most closely matches yours, each with the reasons why.</p>
          <button type="button" class="btn im-primary-btn" data-action="start">Next ${iconArrowRight('#FFFFFF')}</button>
        </section>
        <aside class="im-col-side">
          <div class="im-side-head">What we'll ask</div>
          ${topics}
        </aside>
      </div>`;
  }

  function renderQuestion() {
    const step = state.step;
    const q = Q[step];
    const qColor = COLORS[step % COLORS.length];
    const isMulti = q.type === 'multi';
    const cur = Matching.rawVals(state.answers, q);

    const options = q.options.map((o, i) => {
      const selected = cur.includes(o.id);
      const key = isMulti && selected ? '✓' : LETTERS[i];
      return `
        <button type="button" class="opt im-option${selected ? ' selected' : ''}" data-action="pick" data-opt="${esc(o.id)}" aria-pressed="${selected}" style="${selected ? `--qcolor:${qColor}` : ''}">
          <span class="im-option-key">${key}</span>
          <span class="im-option-body">
            <span class="im-option-label">${esc(o.label)}</span>
            ${o.sub ? `<span class="im-option-sub">${esc(o.sub)}</span>` : ''}
          </span>
        </button>`;
    }).join('');

    const hasAny = Matching.vals(state.answers, q).length > 0;
    const multiControls = isMulti
      ? `<div class="im-multi-row">
          <button type="button" class="btn im-primary-btn" data-action="continue">${hasAny ? 'Continue' : 'Skip'} ${iconArrowRight('#FFFFFF')}</button>
          <span class="im-multi-hint">Select any that apply, or skip.</span>
        </div>`
      : '';

    const answered = [];
    Q.forEach((qq, i) => {
      const raw = Matching.rawVals(state.answers, qq);
      if (!raw.length) return;
      const value = raw[0] === 'none' ? 'None selected' : raw.map((id) => labelOf(qq, id)).join(', ');
      answered.push(`
        <div class="im-answered-row">
          <div style="min-width:0;display:flex;flex-direction:column;gap:2px">
            <span class="im-answered-label">${esc(SHORT_NAME[qq.id] || qq.id)}</span>
            <span class="im-answered-value">${esc(value)}</span>
          </div>
          <button type="button" class="im-edit-btn" data-action="edit" data-step="${i}" aria-label="Edit ${esc(SHORT_NAME[qq.id] || qq.id)}">Edit</button>
        </div>`);
    });

    return `
      <div class="im-meta-row">
        <button type="button" class="btn im-back-btn" data-action="back">${iconArrowLeft('#111111')}Back</button>
        <span class="mono" style="color:rgba(17,17,17,0.7)">${pad(step + 1)} / ${pad(TOTAL)}</span>
      </div>
      <div class="im-two-col im-quiz-row">
        <section class="im-col-main">
          <div class="im-q-label">Question ${pad(step + 1)}</div>
          <h2 class="im-q-title">${esc(q.title)}</h2>
          <p class="im-q-help">${esc(q.help)}</p>
          <div class="im-options">${options}</div>
          ${multiControls}
        </section>
        <aside class="im-col-side">
          <div class="im-side-head">Your answers</div>
          ${answered.length ? answered.join('') : '<div class="im-empty-note">Your answers will appear here as you go.</div>'}
        </aside>
      </div>`;
  }

  function renderResults() {
    const ranked = Matching.rank(state.answers, DATA);
    const fitting = ranked.filter((r) => r.s.fit >= Matching.FIT_THRESHOLD);
    const n = fitting.length;
    const shown = state.showAll ? fitting : fitting.slice(0, Matching.DEFAULT_VISIBLE);

    const fitDot = (v) => (v >= 85 ? 'var(--fit-strong)' : v >= 65 ? 'var(--fit-good)' : 'var(--fit-look)');

    const firmRows = shown.map((r, i) => {
      const f = r.firm;
      const meta = [f.hq, f.check, f.leads].filter(Boolean).join('  ·  ');
      const why = r.s.why.slice(0, 4).map((w) => `<span class="im-chip-why">${esc(w.text)}</span>`).join('');
      const stretch = r.s.stretch.slice(0, 2).map((s) => `<span class="im-chip-stretch">Stretch on ${esc(s)}</span>`).join('');
      return `
        <article class="im-firm">
          <div class="im-firm-rank">${pad(i + 1)}</div>
          <div class="im-firm-body">
            <div class="im-firm-head">
              <div style="min-width:0">
                <div class="im-firm-name">${esc(f.name)}</div>
                <div class="im-firm-meta">${esc(meta)}</div>
              </div>
              <div class="im-firm-fitcol">
                <div class="im-firm-fit">${r.s.fit}<span>%</span></div>
                <div class="im-firm-fitlabel"><span class="im-fit-dot" style="background:${fitDot(r.s.fit)}"></span>${esc(Matching.fitLabel(r.s.fit))}</div>
              </div>
            </div>
            <p class="im-firm-blurb">${esc(f.blurb)}</p>
            <div class="im-chips">${why}${stretch}</div>
            <a class="im-firm-link" href="${esc(f.url)}" target="_blank" rel="noopener">${esc(domainOf(f.url))} ↗</a>
          </div>
        </article>`;
    }).join('');

    const resultsTitle = n === 0
      ? 'No close matches yet.'
      : `${NUM_WORDS[n] || n}${n === 1 ? ' firm fits' : ' firms fit'} what you told us.`;

    const summary = [];
    Q.forEach((qq) => Matching.rawVals(state.answers, qq).forEach((v) => { if (v !== 'none') summary.push(labelOf(qq, v)); }));

    const tips = Matching.tips(state.answers, DATA).map((t, i) => `
      <div class="im-tip">
        <div class="im-tip-num">${ROMAN[i]}</div>
        <div class="im-tip-head">${esc(t.head)}</div>
        <div class="im-tip-body">${esc(t.tip)}</div>
      </div>`).join('');

    return `
      <div class="im-meta-row mono" style="color:rgba(17,17,17,0.6)">
        <span>Your shortlist</span>
        <div style="display:flex;gap:20px">
          <button type="button" class="btn im-text-btn" data-action="edit-all">Edit answers</button>
          <button type="button" class="btn im-text-btn" data-action="restart">Start over</button>
        </div>
      </div>
      <h2 class="im-results-headline">${esc(resultsTitle)}</h2>
      <p class="im-results-sub">Ranked by how closely each firm's stated focus matches your answers. The first three are a good place to start.</p>
      <div class="im-summary-line">${esc(summary.join('  ·  '))}</div>
      <div class="im-two-col im-results-row">
        <section class="im-col-main">
          <div class="im-side-head">Ranked by fit</div>
          ${n === 0 ? '<div class="im-no-matches">None of the firms we track line up closely with your answers yet. Try loosening your round or location.</div>' : ''}
          ${firmRows}
          ${n > Matching.DEFAULT_VISIBLE ? `<button type="button" class="btn im-outline-btn" data-action="toggle-all">${state.showAll ? 'Show top 5' : 'Show all ' + n}</button>` : ''}
        </section>
        <aside class="im-col-side">
          <div class="im-side-head">What to look for</div>
          ${tips}
        </aside>
      </div>`;
  }

  function render() {
    const root = document.getElementById('app');
    const step = state.step;
    const isWelcome = step < 0;
    const isQuiz = step >= 0 && step < TOTAL;
    const bg = isQuiz ? COLORS[step % COLORS.length] : 'var(--page)';
    const progress = isWelcome ? 0 : isQuiz ? Math.round((step / TOTAL) * 100) : 100;

    root.innerHTML = `
      <div class="im-root" style="--bg:${bg}">
        <div class="im-progress-track"><div class="im-progress-fill" style="width:${progress}%"></div></div>
        <main class="im-main">
          ${isWelcome ? renderIntro() : isQuiz ? renderQuestion() : renderResults()}
        </main>
        <footer class="im-footer"><div class="im-footer-inner">Matches are a starting point based on public information about each firm's stated focus. Not investment advice. Check a firm's current focus before you reach out.</div></footer>
      </div>`;

    bindEvents(root);
  }

  function pickOption(optId) {
    const step = state.step;
    const q = Q[step];
    if (q.type === 'multi') {
      let arr = Matching.rawVals(state.answers, q).slice();
      const selected = arr.includes(optId);
      if (optId === 'none') arr = selected ? [] : ['none'];
      else {
        arr = arr.filter((x) => x !== 'none');
        arr = selected ? arr.filter((x) => x !== optId) : arr.concat([optId]);
      }
      state.answers[q.id] = arr;
      render();
    } else {
      state.answers[q.id] = optId;
      render();
      clearTimeout(autoAdvanceTimer);
      const delay = reducedMotion ? 0 : 320;
      autoAdvanceTimer = setTimeout(() => go(step + 1), delay);
    }
  }

  function bindEvents(root) {
    root.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', (e) => {
        const action = el.getAttribute('data-action');
        if (action === 'start') go(0);
        else if (action === 'back') go(state.step - 1);
        else if (action === 'continue') go(state.step + 1);
        else if (action === 'pick') pickOption(el.getAttribute('data-opt'));
        else if (action === 'edit') go(Number(el.getAttribute('data-step')));
        else if (action === 'edit-all') go(0);
        else if (action === 'restart') { state.answers = {}; go(-1); }
        else if (action === 'toggle-all') { state.showAll = !state.showAll; render(); }
      });
    });

    if (state.step >= 0 && state.step < TOTAL) {
      root.querySelectorAll('.im-option').forEach((el, i) => {
        el.setAttribute('data-key-index', i);
      });
    }
  }

  document.addEventListener('keydown', (e) => {
    const step = state.step;
    if (step < 0 || step >= TOTAL) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const idx = LETTERS.indexOf(e.key.toUpperCase());
    if (idx >= 0 && idx < Q[step].options.length) {
      e.preventDefault();
      pickOption(Q[step].options[idx].id);
    }
  });

  syncUrl(true);
  render();
})();
