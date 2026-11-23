/* Search the links already in the built results index. Each destination is a static page and anchor. */
(function () {
  const panel = document.querySelector('.result-search');
  if (!panel) return;

  const form = panel.querySelector('form');
  const query = form.elements.q;
  const source = form.elements.source;
  const status = panel.querySelector('.result-search-status');
  const list = panel.querySelector('.result-matches');
  const more = panel.querySelector('.result-more');
  const batchSize = 24;

  function normalize(value) {
    return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[()\u2010-\u2015-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const entries = Array.from(document.getElementById('result-index').content.querySelectorAll('li'), node => {
    const title = normalize(node.querySelector('a').textContent);
    const reference = normalize(node.querySelector('span').textContent);
    const numbers = reference.match(/\b\d+(?:\.\d+)+[a-z]?\b/g) || [];
    return { node, title, reference, numbers, text: normalize(node.dataset.search) };
  });
  let matches = [];
  let shown = 0;
  panel.hidden = false;

  function showNext() {
    const next = matches.slice(shown, shown + batchSize);
    next.forEach(entry => list.appendChild(entry.node.cloneNode(true)));
    shown += next.length;
    more.hidden = shown >= matches.length;
    status.textContent = matches.length === 0 ? 'No results found.' :
      shown < matches.length ? `Showing ${shown} of ${matches.length} results` :
      `${matches.length} ${matches.length === 1 ? 'result' : 'results'}`;
  }

  function search(save) {
    const term = normalize(query.value);
    const words = term ? term.split(' ') : [];
    const numbers = term.match(/\b\d+(?:\.\d+)+[a-z]?\b/g) || [];
    const want = source.value;
    if (save) {
      const url = new URL(window.location.href);
      if (term) url.searchParams.set('q', query.value.trim());
      else url.searchParams.delete('q');
      if (want) url.searchParams.set('source', want);
      else url.searchParams.delete('source');
      window.history.replaceState(null, '', url);
    }
    list.replaceChildren();
    shown = 0;
    if (!term && !want) {
      status.textContent = '';
      more.hidden = true;
      return;
    }
    matches = entries.filter(entry => (!want || entry.node.dataset.source === want) &&
      words.every(word => entry.text.includes(word)));
    if (term) {
      const score = entry => {
        let rank = numbers.some(number => entry.numbers.includes(number)) ? 10 : 0;
        if (entry.title.includes(term)) rank += 5;
        if (entry.reference.includes(term)) rank += 3;
        if (words.every(word => entry.title.includes(word))) rank += 2;
        return rank;
      };
      matches.sort((a, b) => score(b) - score(a));
    }
    showNext();
  }

  const saved = new URLSearchParams(window.location.search);
  query.value = saved.get('q') || '';
  if (saved.has('source')) source.value = saved.get('source');
  form.addEventListener('submit', event => {
    event.preventDefault();
    search(true);
  });
  query.addEventListener('input', () => search(true));
  source.addEventListener('change', () => search(true));
  more.addEventListener('click', showNext);
  search(false);
})();
