/* Compact discovery themes. Catalogue data and filter state remain owned by the app. */
(function (global) {
  'use strict';
  const FEATURED = ['Dyr', 'Magi', 'Køretøjer', 'Billogoer', 'Pokémon', 'Minecraft', 'Skibe', 'Blomster', 'Eksotiske dyr', 'Klublogoer', 'Messi og CR7', '3D-figurer'];
  const SPECIAL = new Set(['Alle', '50 nye', 'Likede', 'Egne']);
  const countLabel = n => n + (n === 1 ? ' motiv' : ' motiver');
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function create(options) {
    const doc = options.document || global.document;
    const container = options.container || doc.getElementById('themeTiles');
    const getBuilds = options.getBuilds;
    const getCategories = options.getCategories;
    const select = options.onSelect;
    const draw = options.draw;
    const extras = options.extraCategories || [];
    if (!container || !getBuilds || !getCategories || !select) throw new Error('Theme explorer needs a container and catalogue callbacks');
    container.classList.add('category-explorer');
    container.setAttribute('aria-label', 'Udforsk temaer');
    container.innerHTML = '<div class="category-explorer-heading"><h2>Udforsk temaer</h2><button type="button" class="all-themes-button" aria-haspopup="dialog" aria-controls="allThemesDialog">Alle temaer <i class="ic arrow-right" aria-hidden="true"></i></button></div><div class="featured-categories"></div>';
    const cards = container.querySelector('.featured-categories');
    const opener = container.querySelector('.all-themes-button');
    const dialog = doc.createElement('dialog');
    dialog.id = 'allThemesDialog';
    dialog.className = 'all-themes-dialog';
    dialog.setAttribute('aria-labelledby', 'allThemesTitle');
    dialog.innerHTML = '<div class="dialog-heading"><h2 id="allThemesTitle">Alle temaer</h2><button type="button" class="icon-button" aria-label="Luk temaer" autofocus><i class="ic close-icon" aria-hidden="true"></i></button></div><p class="meta">Vælg et tema. Sværhedsgrad og antal brikker kan du vælge under Filtre.</p><div class="all-themes-list"></div>';
    doc.body.append(dialog);
    const closeButton = dialog.querySelector('.icon-button');
    const list = dialog.querySelector('.all-themes-list');
    let selectedOnClose = false;
    let activeCategory = 'Alle';

    function catalogue() {
      const builds = getBuilds();
      const counts = new Map();
      for (const build of builds) counts.set(build.cat, (counts.get(build.cat) || 0) + 1);
      const categories = Array.from(new Set(getCategories())).filter(c => !SPECIAL.has(c) && counts.has(c));
      return { builds, counts, categories };
    }
    function choose(category) {
      selectedOnClose = true;
      if (dialog.open) dialog.close();
      select(category);
      // The chosen theme can hide the discovery cards, so focus a visible result heading.
      const heading = doc.getElementById('collectionTitle');
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus(); }
    }
    function renderDialog() {
      const { counts, categories } = catalogue();
      list.innerHTML = categories.map(c => '<button type="button" data-theme-category="' + escape(c) + '" aria-pressed="' + (c === activeCategory) + '"><span>' + escape(c) + '</span><span class="theme-count">' + countLabel(counts.get(c)) + '</span></button>').join('');
      list.innerHTML += extras.map(e=>'<button type="button" data-theme-category="'+escape(e.name)+'"><span>'+escape(e.name)+'</span><span class="theme-count">'+e.count+' billedprototyper</span></button>').join('');
      for (const button of list.querySelectorAll('button')) button.onclick = () => choose(button.dataset.themeCategory);
    }
    opener.onclick = () => { selectedOnClose = false; renderDialog(); dialog.showModal(); closeButton.focus(); };
    closeButton.onclick = () => dialog.close();
    dialog.addEventListener('cancel', event => { event.preventDefault(); dialog.close(); });
    dialog.addEventListener('close', () => { if (!selectedOnClose && !container.classList.contains('hide')) opener.focus(); });

    function refresh(state = {}) {
      if ('activeCategory' in state) activeCategory = state.activeCategory;
      if ('visible' in state) container.classList.toggle('hide', !state.visible);
      const { builds, counts } = catalogue();
      cards.innerHTML = FEATURED.filter(c => counts.has(c)).map((c, i) => '<button type="button" class="theme-tile compact-theme theme-' + i + '" data-theme-category="' + escape(c) + '" aria-pressed="' + (c === activeCategory) + '"><canvas width="112" height="112" aria-hidden="true"></canvas><span class="theme-copy"><span class="theme-name">' + escape(c) + '</span><span class="theme-count">' + countLabel(counts.get(c)) + '</span></span><i class="ic arrow-right" aria-hidden="true"></i></button>').join('');
      cards.innerHTML += extras.map(e=>'<button type="button" class="theme-tile compact-theme theme-4" data-theme-category="'+escape(e.name)+'"><span class="prototype-tile-icon" aria-hidden="true">3D</span><span class="theme-copy"><span class="theme-name">'+escape(e.name)+'</span><span class="theme-count">'+e.count+' billedprototyper</span></span><i class="ic arrow-right" aria-hidden="true"></i></button>').join('');
      for (const button of cards.querySelectorAll('button')) {
        const category = button.dataset.themeCategory;
        const model = builds.find(b => b.cat === category && (category !== 'Magi' || b.id === 'motiver50-01')) || builds.find(b => b.cat === category);
        if(model?.kind==='spatial'){const image=doc.createElement('img');image.src=model.preview;image.alt='';image.className='spatial-theme-preview';button.querySelector('canvas').replaceWith(image)}
        else if (model && draw) draw(button.querySelector('canvas'), model.p);
        button.onclick = () => choose(category);
      }
      if (dialog.open) renderDialog();
    }
    refresh();
    return { refresh, dialog, destroy() { dialog.remove(); container.innerHTML = ''; } };
  }
  global.CategoriesExplorer = { create, featured: FEATURED.slice() };
})(typeof window === 'undefined' ? globalThis : window);
