// Port of reference/matching.js from the handoff. Keep behavior identical —
// see investor-matcher-handoff/reference/matching.test.js for the golden cases
// this must reproduce against data.js.
const Matching = (() => {
  const IGNORED_ANSWERS = ['unsure', 'none'];
  const FIT_THRESHOLD = 50;
  const DEFAULT_VISIBLE = 5;

  function rawVals(answers, q) {
    const v = answers[q.id];
    return Array.isArray(v) ? v : v ? [v] : [];
  }

  function vals(answers, q) {
    return rawVals(answers, q).filter((x) => !IGNORED_ANSWERS.includes(x));
  }

  function tagList(firm, qid) {
    return String((firm.tags && firm.tags[qid]) || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  const REASON_MAPS = {
    round: { preseed: 'Pre-seed investor', seed: 'Seed investor', seriesa: 'Series A investor' },
    industry: { ai_apps: 'Invests in AI & software', devtools: 'Invests in dev tools & infra', fintech: 'Invests in fintech', consumer: 'Invests in consumer', health: 'Invests in health & bio', climate: 'Climate specialist', frontier: 'Invests in hard tech', other: 'Generalist' },
    location: { pnw: 'Invests in the Pacific NW', bay: 'Invests in the Bay Area', nyc: 'Invests in New York', us_other: 'Invests across the US', intl: 'Invests outside the US' },
    profile: { technical: 'Backs technical founders', woman: 'Backs women founders', black_latino: 'Backs Black & Latino founders', immigrant: 'Backs immigrant founders', first_time: 'Backs first-time founders' },
    priority: { hands_on: 'Hands-on support', sector: 'Deep sector expertise', lead: 'Leads rounds', speed: 'Fast decisions', community: 'Strong founder community' },
  };

  function reason(q, hit, any) {
    const id = hit[0];
    if (q.id === 'round') return any ? 'Invests at any stage' : REASON_MAPS.round[id];
    if (q.id === 'product') return 'Backs your product stage';
    if (q.id === 'revenue') return 'Fits your revenue stage';
    if (q.id === 'industry') return any ? 'Sector-agnostic' : REASON_MAPS.industry[id];
    if (q.id === 'location') return any ? 'Invests globally' : REASON_MAPS.location[id];
    if (q.id === 'team') return 'Fits your team size';
    if (q.id === 'profile') return REASON_MAPS.profile[id] || 'Founder focus';
    if (q.id === 'priority') return REASON_MAPS.priority[id] || 'Matches what you want';
    return id;
  }

  const STRETCH_NAME = { round: 'round', product: 'product stage', revenue: 'revenue stage', industry: 'sector', location: 'location', team: 'team size' };

  function scoreFirm(firm, answers, questions) {
    const must = String(firm.must || '').split(',').map((t) => t.trim()).filter(Boolean);
    let score = 0;
    let max = 0;
    const why = [];
    const stretch = [];
    for (const q of questions) {
      const v = vals(answers, q);
      if (!v.length) continue;
      const tags = tagList(firm, q.id);
      const any = tags.includes('*');
      const hit = v.filter((x) => any || tags.includes(x));
      if (must.includes(q.id) && !hit.length) return null;
      if (!tags.length) continue;
      if (q.scoring === 'bonus' && any) continue;
      max += q.weight;
      if (hit.length) {
        score += q.weight;
        why.push({ w: q.weight, text: reason(q, hit, any) });
      } else if (q.scoring === 'core') {
        stretch.push(STRETCH_NAME[q.id] || q.id);
      }
    }
    why.sort((a, b) => b.w - a.w);
    return { fit: max ? Math.round((score / max) * 100) : 100, score, why, stretch };
  }

  function rank(answers, data) {
    return data.firms
      .map((firm) => ({ firm, s: scoreFirm(firm, answers, data.questions) }))
      .filter((r) => r.s)
      .sort(
        (x, y) =>
          y.s.fit - x.s.fit ||
          y.s.score - x.s.score ||
          (y.firm.featured ? 1 : 0) - (x.firm.featured ? 1 : 0)
      );
  }

  function matches(answers, data) {
    return rank(answers, data).filter((r) => r.s.fit >= FIT_THRESHOLD);
  }

  function fitLabel(n) {
    return n >= 85 ? 'Strong fit' : n >= 65 ? 'Good fit' : 'Worth a look';
  }

  function tips(answers, data) {
    const chosen = new Set();
    for (const q of data.questions) for (const v of rawVals(answers, q)) chosen.add(`${q.id}:${v}`);
    const seen = new Set();
    return data.guidance
      .filter((g) => g.q === '*' || chosen.has(`${g.q}:${g.a}`))
      .sort((a, b) => a.rank - b.rank)
      .filter((g) => (seen.has(g.head) ? false : (seen.add(g.head), true)))
      .slice(0, 3);
  }

  return { FIT_THRESHOLD, DEFAULT_VISIBLE, rawVals, vals, tagList, reason, scoreFirm, rank, matches, fitLabel, tips };
})();
