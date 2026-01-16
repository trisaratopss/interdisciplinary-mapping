// Client UI wiring for the vis-network graph.
// Responsibilities:
//  - attach event handlers to DOM controls injected by the server
//  - implement click/hover highlight behavior and info panel updates
//  - provide deterministic relayout functions used by filters
// The file keeps defensive checks (missing elements / network objects) so
// it is safe to run even if some parts of the page are absent.
//
// Entry: call window.IM_initUI() after the graph is drawn. It expects
// global `network`, `nodes`, `edges`, and `window.AP_PEOPLE` to exist.
window.IM_initUI = function() {
  try {
      // --- spacing helpers (moved here so they are available globally in this file) ---
    function clamp(v, a, b){ return Math.min(b, Math.max(a, v)); }
    // radius so that adjacent points on an n-gon are at least `chordPx` apart
    function radiusForChord(n, chordPx){
      if (n <= 1) return 0;
      var s = Math.sin(Math.PI / n);
      return s === 0 ? 0 : (chordPx / (2 * s));
    }
    // -------- Click handling (highlight + info panel) --------
    // Cache original node colors so we can restore them on subsequent clicks
    var __originalColors = {};
    nodes.get().forEach(function(n) { __originalColors[n.id] = (n.origColor !== undefined) ? n.origColor : n.color; });
    // Cache original edge color/width so we can restore after highlighting
    var __originalEdgeStyles = {};
    try {
      edges.get().forEach(function(e){ __originalEdgeStyles[e.id] = { color: e.color, width: e.width }; });
    } catch (e) { /* edges may not be ready yet in some contexts */ }
    function __resetEdgeStyles(){
      try {
        var allE = edges.get();
        var ups = allE.map(function(e){
          var orig = __originalEdgeStyles[e.id] || {};
          var obj = { id: e.id };
          if (orig.color !== undefined) obj.color = orig.color; else obj.color = '#666666';
          if (orig.width !== undefined) obj.width = orig.width; else obj.width = 1;
          if (e.hidden) obj.hidden = true;
          return obj;
        });
        if (ups.length) edges.update(ups);
      } catch (err) { console && console.warn && console.warn('resetEdgeStyles failed', err); }
    }
    function __highlightEdgesForNode(nodeId){
      try {
        __resetEdgeStyles();
        if (!nodeId) return;
        var conn = (network.getConnectedEdges && network.getConnectedEdges(nodeId)) || [];
        console && console.debug && console.debug('highlightEdgesForNode:', nodeId, 'connectedEdges:', conn);
        var upd = conn.map(function(eid){ return { id: eid, color: '#ff3333', width: 3 }; });
        if (upd.length) {
          console && console.debug && console.debug('updating edges:', upd);
          edges.update(upd);
        }
      } catch (err) { console && console.warn && console.warn('highlightEdges failed', err); }
    }
    function __resetColors() {
      var ids = nodes.getIds();
      var updates = ids.map(function(id) { return { id: id, color: __originalColors[id] }; });
      try { nodes.update(updates); } catch (e) {}
    }

    /**
     * Single click handler that performs two duties:
     *  - highlights the clicked node and its neighbors
     *  - updates the info panel with details for the clicked node
     */
    function __handleClick(params) {
      __resetColors();
      var infoEl = document.getElementById('infoBox');
      if (!params || !params.nodes || params.nodes.length === 0) {
        // click on background: clear info text
        if (infoEl) infoEl.innerHTML = '<div class="info-title">Click a node to see details here</div>';
        // reset any edge highlighting when clicking empty space
        try { __resetEdgeStyles(); } catch(e){}
        return;
      }
      var selectedId = params.nodes[0];
      // highlight edges connected to the selected node
      try { __highlightEdgesForNode(selectedId); } catch(e){}
      var neighborIds = (network.getConnectedNodes && network.getConnectedNodes(selectedId)) || [];
      var toHighlight = [selectedId].concat(neighborIds);
      var updates = toHighlight.map(function(id) { return { id: id, color: { background: '#ff4d4f', border: '#a8071a' } }; });
      try { nodes.update(updates); } catch (e) {}

      if (!infoEl) return;
      var n = nodes.get(selectedId);
      if (!n) { infoEl.innerHTML = ''; return; }
      if (n.kind === 'person') {
        var html = '<div class="info-title">' + (n.full_name || n.label) + '</div>' +
                   '<div class="info-line"><b>Subteam:</b> ' + (n.subteam || '—') + '</div>' +
                   (n.value ? '<div class="info-line"><b>Publications:</b> ' + n.value + '</div>' : '');
        infoEl.innerHTML = html;
      } else if (n.kind === 'pub') {
        var authors = (n.authors && n.authors.length) ? n.authors.join(', ') : '—';
        var doiLine = (n.doi && n.doi.trim().length) ? ('<div class="info-line"><b>DOI:</b> <a href="' + n.doi + '" target="_blank">' + n.doi + '</a></div>') : '';
        var html2 = '<div class="info-title">' + (n.full_title || n.label) + '</div>' +
                    '<div class="info-line"><b>Team:</b> ' + (n.team || '—') + '</div>' +
                    '<div class="info-line"><b>Type:</b> ' + (n.ptype || '—') + '</div>' +
                    '<div class="info-line"><b>Project Year:</b> ' + (n.year || '—') + '</div>' +
                    '<div class="info-line"><b>Authors:</b> ' + authors + '</div>' +
                    doiLine;
        infoEl.innerHTML = html2;
      }
    }
    network.on('click', __handleClick);

  // Ensure per-edge color is respected (don't inherit node color for edges)
  try { network.setOptions({ edges: { color: { inherit: false } } }); } catch(e) { console && console.warn && console.warn('setOptions(inherit:false) failed', e); }

    // 2) Physics tuning, smoothing, and node scaling
    network.setOptions({
      edges: { smooth: { enabled: true, type: 'continuous', roundness: 0.25 }, color: { inherit: false } },
      nodes: { scaling: { min: 12, max: 40, label: { enabled: true, min: 12, max: 22 } } },
      physics: {
        enabled: false,
        solver: 'repulsion',
        maxVelocity: 12,
        minVelocity: 0.75,
        stabilization: { iterations: 200 },
        repulsion: { nodeDistance: 220, springLength: 200, springConstant: 0.02, damping: 0.09 }
      }
    });
    // Physics starts disabled to honor provided layout positions

    // 3) Header, info panel already present. Add info fill on click
    network.on('click', function(params) {
      var info = document.getElementById('infoBox');
      if (!info) return;
      if (params.nodes && params.nodes.length > 0) {
        var n = nodes.get(params.nodes[0]);
        if (n && n.kind === 'person') {
          var html = '<div class="info-title">' + (n.full_name || n.label) + '</div>' +
                     '<div class="info-line"><b>Subteam:</b> ' + (n.subteam || '—') + '</div>' +
                     (n.value ? '<div class="info-line"><b>Publications:</b> ' + n.value + '</div>' : '');
          info.innerHTML = html;
        } else if (n && n.kind === 'pub') {
          var authors = (n.authors && n.authors.length) ? n.authors.join(', ') : '—';
          var doiLine = (n.doi && n.doi.trim().length) ? ('<div class="info-line"><b>DOI:</b> <a href="' + n.doi + '" target="_blank">' + n.doi + '</a></div>') : '';
          var html = '<div class="info-title">' + (n.full_title || n.label) + '</div>' +
                     '<div class="info-line"><b>Team:</b> ' + (n.team || '—') + '</div>' +
                     '<div class="info-line"><b>Type:</b> ' + (n.ptype || '—') + '</div>' +
                     '<div class="info-line"><b>Project Year:</b> ' + (n.year || '—') + '</div>' +
                     '<div class="info-line"><b>Authors:</b> ' + authors + '</div>' +
                     doiLine;
          info.innerHTML = html;
        }
      }
    });

    // 4) Controls: center (fit) and labels toggle
    var centerBtn = document.getElementById('centerGraph');
    if (centerBtn) centerBtn.onclick = function(){ try { network.fit({ animation: { duration: 500, easing: 'easeInOutQuad' } }); } catch(e){} };

    // 4b) Labels: All vs Hover-only to reduce overlap
    var labelMode = 'all';
    var toggleLabels = document.getElementById('toggleLabels');
    function __labels_apply(){
      try {
        if (labelMode === 'all') {
          // restore labels from origLabel and set people labels a bit smaller so
          // they fit better; publications keep a larger label.
          var ups = nodes.get().map(function(n){
            var fsize = (n.kind === 'person') ? 11 : 14;
            return { id: n.id, label: (n.origLabel || n.label || ''), font: { size: fsize } };
          });
          nodes.update(ups);
          network.off('hoverNode', __onHoverNode);
          network.off('blurNode', __onBlurNode);
        } else {
          // hover-only: clear labels initially
          var ups2 = nodes.get().map(function(n){ return { id: n.id, label: '', font: { size: 12 } }; });
          nodes.update(ups2);
          network.off('hoverNode', __onHoverNode);
          network.off('blurNode', __onBlurNode);
          network.on('hoverNode', __onHoverNode);
          network.on('blurNode', __onBlurNode);
        }
      } catch(e){}
    }
    function __onHoverNode(params){ try { var n = nodes.get(params.node); if (!n) return; nodes.update({ id: n.id, label: (n.origLabel || n.label || '') }); } catch(e){} }
    function __onBlurNode(params){ try { var n = nodes.get(params.node); if (!n) return; if (labelMode==='hover') nodes.update({ id: n.id, label: '' }); } catch(e){} }
    if (toggleLabels) {
      toggleLabels.onclick = function(){
        labelMode = (labelMode === 'all') ? 'hover' : 'all';
        try { toggleLabels.textContent = (labelMode === 'all') ? 'Labels: All' : 'Labels: Hover-only'; } catch(e){}
        __labels_apply();
      };
    }

    // 5) Floating controls collapse/expand
    var fcToggle = document.getElementById('fc_toggle');
    if (fcToggle) fcToggle.onclick = function(){
      var box = document.getElementById('floating_controls'); if (!box) return;
      var collapsed = box.classList.contains('collapsed');
      if (collapsed){ box.classList.remove('collapsed'); fcToggle.textContent = '▼'; fcToggle.title = 'Collapse'; }
      else { box.classList.add('collapsed'); fcToggle.textContent = '▲'; fcToggle.title = 'Expand'; }
    };

    // 6) Subteam filtering
    function __recomputeSizesFromVisible(){
      try {
        var counts = {};
        var eArr = edges.get();
        eArr.forEach(function(e){
          var na = nodes.get(e.from); var nb = nodes.get(e.to);
          if (!na || !nb) return; if (na.hidden || nb.hidden) return;
          var isPersonA = (na.kind==='person'); var isPubB = ((nb.id+'').indexOf('pub:')===0);
          var isPersonB = (nb.kind==='person'); var isPubA = ((na.id+'').indexOf('pub:')===0);
          if (isPersonA && isPubB) { counts[na.id] = (counts[na.id]||0) + 1; }
          else if (isPersonB && isPubA) { counts[nb.id] = (counts[nb.id]||0) + 1; }
        });
        var people = nodes.get({filter: function(n){ return n.kind==='person'; }});
        var ups = people.map(function(p){ return { id: p.id, value: Math.max(counts[p.id]||0, 1) }; });
        nodes.update(ups);
      } catch(e){}
    }
    function __flt_selectedSubteams(){
      var out = [];
      try {
        if ((document.getElementById('flt_discover')||{}).checked) out.push('discover');
        if ((document.getElementById('flt_direct')||{}).checked) out.push('direct');
        if ((document.getElementById('flt_develop')||{}).checked) out.push('develop');
      } catch(e){}
      return out;
    }
    // --- People selector helpers (searchable via Tom Select) ---
    function people_populate(){
      try {
        var sel = document.getElementById('people_select'); if(!sel) return;
        sel.innerHTML = '';
        var arr = (window.AP_PEOPLE || []).slice().sort(function(a,b){ var an=(a.name||'').toLowerCase(); var bn=(b.name||'').toLowerCase(); return an<bn?-1:an>bn?1:0; });
        arr.forEach(function(p){ var opt=document.createElement('option'); opt.value = p.id; opt.textContent = p.name || ("person:"+p.id); sel.appendChild(opt); });
      } catch(e) { console && console.warn && console.warn('people_populate failed', e); }
    }
    function people_upgradeTomSelect(){ try{ var el=document.getElementById('people_select'); if(!el) return; if(window.__people_ts__){ try{ window.__people_ts__.destroy(); }catch(e){} window.__people_ts__=null; } if(typeof TomSelect !== 'undefined'){ window.__people_ts__ = new TomSelect(el, { maxItems: null, plugins: ['remove_button'], create: false, persist: false, sortField: { field: 'text', direction: 'asc' } }); } }catch(e){}
    }
    function people_getSelected(){ try{ var sel=document.getElementById('people_select'); if(!sel) return []; var out=[]; for(var i=0;i<sel.options.length;i++){ var o=sel.options[i]; if(o.selected) out.push(o.value); } return out; } catch(e){ return []; } }
    // Relayout visible nodes in a compact circle: publications on outer ring,
    // people on a fixed inner ring. Uses deterministic placement (physics off)
    // and the radius formula: r = clamp(minR, 0.7 * 12 * sqrt(n), maxR).
    function relayoutCircle(opts){
      try {
        var visiblePeople = nodes.get({filter:function(n){ return n.kind==='person' && !n.hidden; }}).slice();
        var visiblePubs = nodes.get({filter:function(n){ return n.kind==='pub' && !n.hidden; }}).slice();
        var n = visiblePubs.length;
        // radius clamp bounds (tunable)
  // Increase minimum and maximum radii to avoid very squished layouts when
  // only a few publications are visible. These defaults can be overridden
  // via opts if needed. Raised more aggressively because previous values
  // still produced overlap.
        // Spread filtered items out more aggressively to avoid squishing. Raised
        // defaults so filtered subsets are visibly more spread out.
        var minR = (opts && opts.minR) ? opts.minR : 420;
        var maxR = (opts && opts.maxR) ? opts.maxR : 2000;
    // spacingFactor controls how aggressively nodes spread when filtered.
    var spacingFactor = (opts && typeof opts.spacingFactor === 'number') ? opts.spacingFactor : 4.5;
    var computed = spacingFactor * 12 * Math.sqrt(n || 0);
    var r = Math.max(minR, Math.min(computed, maxR));
        var centerX = 0, centerY = 0;
        var updates = [];
        // --- PEOPLE RING (adaptive + optional dual rings) ---
        var peopleN  = visiblePeople.length;
        if (peopleN > 0) {
          // approx node diameter (px) for person nodes at your current scaling
          var personDiameter = 24;     // tweak if needed
          var padPx          = 10;     // extra pixels between nodes
          var desiredChord   = personDiameter + padPx;

          // hard cap so inner ring stays inside the publications ring
          var innerMax = r * 0.58;     // <= 0.6 keeps a nice gap to pubs
          var innerMin = 80;           // don’t get too tiny

          // radius needed so neighbors are at least desiredChord apart
          var rNeeded  = radiusForChord(peopleN, desiredChord);
          // allow caller to scale the inner people ring slightly larger for readability
          var peopleRingScale = (opts && typeof opts.peopleRingScale === 'number') ? opts.peopleRingScale : 1.4;
          var rInner   = clamp(Math.round(rNeeded * peopleRingScale), innerMin, innerMax);

          // If we still can't get enough spacing (i.e., rInner hit the cap)
          // and there are many people, split into two rings.
          if (peopleN >= 28 && rInner === innerMax) {
            var ring1Count = Math.ceil(peopleN / 2);
            var ring2Count = peopleN - ring1Count;

            var peopleRingScale2 = (opts && typeof opts.peopleRingScale === 'number') ? opts.peopleRingScale : 1.4;
            var rInner1 = Math.min(innerMax, Math.round(innerMax * peopleRingScale2));         // outer people ring
            var rInner2 = Math.max(innerMin, Math.round(innerMax * 0.75 * peopleRingScale2)); // inner people ring

            // place first half on rInner1
            for (var i1 = 0; i1 < ring1Count; i1++) {
              var a1 = (2 * Math.PI * i1) / ring1Count;
              updates.push({
                id: visiblePeople[i1].id,
                x: Math.round(centerX + rInner1 * Math.cos(a1)),
                y: Math.round(centerY + rInner1 * Math.sin(a1)),
                fixed: { x: true, y: true }
              });
            }
            // place second half on rInner2 (staggered by half-step for readability)
            for (var j1 = 0; j1 < ring2Count; j1++) {
              var a2 = (2 * Math.PI * (j1 + 0.5)) / ring2Count; // 0.5 offsets ring
              var node = visiblePeople[ring1Count + j1];
              updates.push({
                id: node.id,
                x: Math.round(centerX + rInner2 * Math.cos(a2)),
                y: Math.round(centerY + rInner2 * Math.sin(a2)),
                fixed: { x: true, y: true }
              });
            }
          } else {
            // one ring is enough
            for (var k = 0; k < peopleN; k++) {
              var a = (2 * Math.PI * k) / peopleN;
              updates.push({
                id: visiblePeople[k].id,
                x: Math.round(centerX + rInner * Math.cos(a)),
                y: Math.round(centerY + rInner * Math.sin(a)),
                fixed: { x: true, y: true }
              });
            }
          }
        }
        if (visiblePubs.length > 0) {
          for (var j=0;j<visiblePubs.length;j++){
            var ang2 = (Math.PI*2*j)/visiblePubs.length;
            var x2 = Math.round(centerX + r * Math.cos(ang2));
            var y2 = Math.round(centerY + r * Math.sin(ang2));
            updates.push({ id: visiblePubs[j].id, x: x2, y: y2, fixed: { x: true, y: true } });
          }
        }
        var prevPhysics = (network && network.physics && network.physics.options) ? !!network.physics.options.enabled : false;
        // turn physics off for deterministic placement
        try { network.setOptions({ physics: false }); } catch(e){}
        if (updates.length) nodes.update(updates);
        try { network.fit({ padding: 16 }); } catch(e){ try{ network.fit(); }catch(e){} }
        try { network.setOptions({ physics: prevPhysics }); } catch(e){}
      } catch(e) { console && console.warn && console.warn('relayoutCircle error', e); }
    }

    // Spread personnel nodes more widely in the main (unfiltered) view.
    // This only repositions person nodes; publication nodes keep their positions.
    function relayoutPeopleSpread(opts){
      try {
        var people = nodes.get({ filter: function(n){ return n.kind==='person' && !n.hidden; } }).slice();
        var n = people.length;
        if (n === 0) return;
  // spacing-driven placement so people have a minimum chord spacing
  var personDiameter = 24, padPx = 10;
  var desiredChord   = personDiameter + padPx;

  // Compute a reference publication ring radius using the same scale
  // logic as relayoutCircle so the people ring can be capped relative
  // to the publication ring (keeps scales consistent across views).
  var pubCount = nodes.get({ filter: function(n){ return n.kind==='pub' && !n.hidden; } }).length;
  var pubMinR = (opts && opts.pubMinR) ? opts.pubMinR : 420;
  var pubMaxR = (opts && opts.pubMaxR) ? opts.pubMaxR : 2000;
  var pubSpacingFactor = (opts && typeof opts.pubSpacingFactor === 'number') ? opts.pubSpacingFactor : 4.5;
  var computedPub = pubSpacingFactor * 12 * Math.sqrt(pubCount || 0);
  var refR = Math.max(pubMinR, Math.min(computedPub, pubMaxR));

  // hard cap so people ring stays inside the publications ring
  var innerMaxRef = Math.max(120, Math.round(refR * 0.5));

  // Allow the people ring to shrink for small groups so nodes aren't widely spaced.
  // Choose a small minimum radius (so small teams sit close together) and cap
  // the radius by innerMaxRef which depends on publication density.
  var minR = (opts && opts.minR) ? opts.minR : 60;    // smaller minimum avoids huge gaps
  // spacing-driven radius (preferred) but bounded between minR and innerMaxRef
  var rNeeded = radiusForChord(n, desiredChord);
  // scale the people ring outward so the inner ring appears larger
  var peopleRingScale = (opts && typeof opts.peopleRingScale === 'number') ? opts.peopleRingScale : 1.4;
  var r = clamp(Math.round(rNeeded * peopleRingScale), minR, innerMaxRef);
        var centerX = 0, centerY = 0;
        var updates = [];
        for (var i=0;i<n;i++){
          var ang = (Math.PI*2*i)/n;
          var x = Math.round(centerX + r * Math.cos(ang));
          var y = Math.round(centerY + r * Math.sin(ang));
          updates.push({ id: people[i].id, x: x, y: y, fixed: { x: true, y: true } });
        }
        var prevPhysics = (network && network.physics && network.physics.options) ? !!network.physics.options.enabled : false;
        try { network.setOptions({ physics: false }); } catch(e){}
        if (updates.length) nodes.update(updates);
        try { network.fit({ padding: 16 }); } catch(e){ try{ network.fit(); }catch(e){} }
        try { network.setOptions({ physics: prevPhysics }); } catch(e){}
      } catch(e) { console && console.warn && console.warn('relayoutPeopleSpread error', e); }
    }
    function __flt_apply(){
      try {
        var sels = __flt_selectedSubteams(); var selSet = {}; sels.forEach(function(s){ selSet[s] = true; });
        var piOnly = (document.getElementById('flt_pis')||{}).checked;
        var selectedPeople = people_getSelected(); // array of pid strings
        var selectedSet = {}; selectedPeople.forEach(function(id){ selectedSet['person:'+id] = true; });
        var visiblePersons = {}; var updates = []; var allNodes = nodes.get();
        allNodes.forEach(function(n){
          if (n.kind==='person'){
            var st = ((n.subteam||'')+'').toLowerCase();
            var show;
            if (selectedPeople && selectedPeople.length > 0) {
              // if specific people selected, show only them
              show = !!selectedSet[n.id];
            } else if (piOnly) {
              // show only people flagged as PI on the node
              show = !!n.PI;
            } else {
              show = (sels.length===0) ? true : !!selSet[st];
            }
            if (show) visiblePersons[n.id] = true;
            updates.push({ id: n.id, hidden: !show });
          }
        });
        var edgesArr = edges.get(); var showPubs = {};
        edgesArr.forEach(function(e){ var a=e.from,b=e.to; if (visiblePersons[a] || visiblePersons[b]){ var other = visiblePersons[a]? b : a; if ((other+'').indexOf('pub:')===0) showPubs[other]=true; } });
        allNodes.forEach(function(n){ if (n.kind==='pub'){ var team=((n.team||'')+'').toLowerCase(); var show = !!showPubs[n.id] || ((sels.length>0)? !!selSet[team] : true); updates.push({ id:n.id, hidden:!show }); } });
        nodes.update(updates);
        var eUpdates = []; edgesArr.forEach(function(e){ var na=nodes.get(e.from), nb=nodes.get(e.to); var hide=(na&&na.hidden)||(nb&&nb.hidden); eUpdates.push({ id:e.id, hidden: hide }); });
        edges.update(eUpdates);
        __recomputeSizesFromVisible();
        // Hide people who have no visible publications (after applying filters).
        try {
          var counts = {};
          edgesArr.forEach(function(e){
            var na = nodes.get(e.from); var nb = nodes.get(e.to);
            if (!na || !nb) return; if (na.hidden || nb.hidden) return;
            if (na.kind==='person' && ((''+nb.id).indexOf('pub:')===0)) { counts[na.id] = (counts[na.id]||0) + 1; }
            else if (nb.kind==='person' && ((''+na.id).indexOf('pub:')===0)) { counts[nb.id] = (counts[nb.id]||0) + 1; }
          });
          var personUpdates = [];
          var peopleNodes = nodes.get({filter:function(n){ return n.kind==='person'; }});
          peopleNodes.forEach(function(p){ if (!p.hidden){ if (!(counts[p.id] && counts[p.id] > 0)) { personUpdates.push({ id: p.id, hidden: true }); } } });
          if (personUpdates.length) nodes.update(personUpdates);
          // Recompute edge visibility after hiding persons
          var eUpdates2 = [];
          edgesArr.forEach(function(e){ var na2 = nodes.get(e.from), nb2 = nodes.get(e.to); var hide2 = (na2 && na2.hidden) || (nb2 && nb2.hidden); eUpdates2.push({ id: e.id, hidden: hide2 }); });
          if (eUpdates2.length) edges.update(eUpdates2);
        } catch(e){}
        // After filtering, if subteam filters are active run a compact circular relayout
        // (publications on outer ring, people on inner ring). Otherwise just fit.
        var selsActive = (sels.length>0);
        try {
          if (selsActive) {
            // If filtering includes 'discover', use a larger spacing so nodes spread out more
            try {
              var useDiscoverSpacing = (sels.indexOf('discover') !== -1);
              if (useDiscoverSpacing) {
                relayoutCircle({ spacingFactor: 6.0, minR: 600, maxR: 2200 });
              } else {
                relayoutCircle();
              }
            } catch(e){ relayoutCircle(); }
          } else {
            // Main unfiltered view: spread personnel nodes more but keep publications where they are
            try { relayoutPeopleSpread(); } catch(e){ try { network.fit({ animation: { duration: 400, easing: 'easeInOutQuad' } }); } catch(e){ try{ network.fit(); }catch(e){} } }
          }
        } catch(e){ try{ network.fit({ animation: { duration: 400, easing: 'easeInOutQuad' } }); }catch(e){} }
      } catch(e){}
    }
    var fltApply = document.getElementById('flt_apply'); if (fltApply) fltApply.onclick = __flt_apply;
  var fltClear = document.getElementById('flt_clear'); if (fltClear) fltClear.onclick = function(){ try { var d=document.getElementById('flt_discover'); if(d)d.checked=true; var r=document.getElementById('flt_direct'); if(r)r.checked=true; var v=document.getElementById('flt_develop'); if(v)v.checked=true; var p=document.getElementById('flt_pis'); if(p)p.checked=false; try{ var sel=document.getElementById('people_select'); if(sel){ for(var i=0;i<sel.options.length;i++){ sel.options[i].selected=false; } if(window.__people_ts__ && window.__people_ts__.clear) try{ window.__people_ts__.clear(); }catch(e){} } }catch(e){} } catch(e){} __flt_apply(); };

      // Ensure edges are styled visibly (some pyvis/vis versions may not serialize
      // color/width attributes on edges reliably). Force a neutral dark grey and a
      // slightly larger width so person<->publication links are obvious.
      function __ensureEdgeStyling(){
        try {
          var allE = edges.get();
          var upd = [];
          allE.forEach(function(e){
            // keep existing hidden state if present
            var hid = !!e.hidden;
            // if the edge already has a color/width, leave it; otherwise set defaults
            var needsColor = !(e.color || (e.color && e.color.color));
            var needsWidth = (typeof e.width === 'undefined');
            var obj = { id: e.id };
            if (needsColor) obj.color = { color: '#666666' };
            if (needsWidth) obj.width = 1;
            // preserve hidden flag if it exists
            if (hid) obj.hidden = true;
            // only push updates if we will change something
            if (needsColor || needsWidth || hid) upd.push(obj);
          });
          if (upd.length) edges.update(upd);
        } catch(e) { console && console.warn && console.warn('ensureEdgeStyling failed', e); }
      }

      // Run once at init and again after filters to keep edge styling consistent
      try { __ensureEdgeStyling(); } catch(e){}
      // also wrap __flt_apply to re-run styling after filters
      var __orig_flt_apply = __flt_apply;
      __flt_apply = function(){ try { __orig_flt_apply(); } catch(e){} try { __ensureEdgeStyling(); } catch(e){} };
  // Re-bind Apply button to the wrapped function and auto-apply filters on initial load
  try { var fltApplyBtn = document.getElementById('flt_apply'); if (fltApplyBtn) fltApplyBtn.onclick = __flt_apply; } catch(e){}
  try { __flt_apply(); } catch(e){}

    // 7) Add Publication helpers (Tom Select, preview, generate)
    function ap_populateAuthors() {
      var sel = document.getElementById('ap_authors_sel'); if (!sel) return; sel.innerHTML='';
      var arr = (window.AP_PEOPLE || []).slice().sort(function(a,b){ var an=(a.name||'').toLowerCase(); var bn=(b.name||'').toLowerCase(); return an<bn?-1:an>bn?1:0; });
      arr.forEach(function(p){ var opt=document.createElement('option'); opt.value=p.id; opt.textContent = p.name && p.name.trim().length ? p.name : ('person:'+p.id); sel.appendChild(opt); });
    }
    function ap_nextPubId(){ try { var ids = nodes.get().filter(function(n){return n.kind==='pub';}).map(function(n){ var s=(n.id+''); var parts=s.split(':'); return parseInt(parts.length>1?parts[1]:s); }).filter(function(v){return Number.isFinite(v)}); var max = ids.length? Math.max.apply(null, ids): 0; return max + 1; } catch(e){ return 1; } }
    function ap_parseAuthors(){ var sel=document.getElementById('ap_authors_sel'); if(!sel) return []; var out=[]; for(var i=0;i<sel.options.length;i++){ var o=sel.options[i]; if(o.selected) out.push(o.value);} return out; }
    function ap_buildRecord(id){ return { id:id, team:(document.getElementById('ap_team')||{}).value||'', authors: ap_parseAuthors().map(function(a){ var n=parseInt(a); return Number.isFinite(n)? n : a; }), title:(document.getElementById('ap_title')||{}).value||'', type:(document.getElementById('ap_type')||{}).value||'', date:(document.getElementById('ap_date')||{}).value||'', project_year:(document.getElementById('ap_project_year')||{}).value||'', doi:((document.getElementById('ap_doi')||{}).value||null), venue:(document.getElementById('ap_venue')||{}).value||'', short_title:(document.getElementById('ap_short')||{}).value||'' }; }
    function ap_showMsg(msg,color){ var el=document.getElementById('ap_msg'); if(el){ el.textContent=msg; el.style.color=color||'#666'; } }
    function ap_toNDJSON(rec){ return JSON.stringify(rec); }
    function ap_upgradeTomSelect(){ try{ var el=document.getElementById('ap_authors_sel'); if(!el) return; if(window.__ap_ts__){ try{ window.__ap_ts__.destroy(); }catch(e){} window.__ap_ts__=null; } if(typeof TomSelect !== 'undefined'){ window.__ap_ts__=new TomSelect(el,{ maxItems:null, plugins:['remove_button'], create:false, persist:false, sortField:{field:'text',direction:'asc'} }); } }catch(e){} }
    var apPrev=document.getElementById('ap_preview'); if(apPrev) apPrev.onclick=function(){ var id=ap_nextPubId(); var rec=ap_buildRecord(id); if(!rec.title){ ap_showMsg('Enter a title to preview','#a8071a'); return; } var nodeId='pub:'+rec.id; if(!nodes.get(nodeId)){ nodes.add({ id:nodeId, label:(rec.short_title||rec.title||('pub '+rec.id)), color:'#90EE90', kind:'pub', title:rec.title, origColor:'#90EE90', full_title:rec.title, team:rec.team, ptype:rec.type, year:(rec.project_year || (rec.date||'').slice(0,4)), doi:(rec.doi||''), authors:[], x:0, y:-260 }); } var anames=[]; ap_parseAuthors().forEach(function(a){ var pid='person:'+a; var p=nodes.get(pid); if(!p){ var name=((window.AP_PEOPLE||[]).find(function(pp){return (pp.id+'')===(a+'');})||{}).name || a; nodes.add({ id: pid, label:name, color:'#87CEEB', kind:'person', full_name:name, subteam:'', value:1, x:0, y:260}); } edges.add({ from: pid, to: nodeId }); var pn=nodes.get(pid); anames.push(pn && pn.label? pn.label: a); }); var n=nodes.get(nodeId); if(n){ n.authors=anames; nodes.update(n); } try{ __recomputeSizesFromVisible(); }catch(e){} ap_showMsg('Preview added. Remember to Generate NDJSON and append it to data/publications.ndjson, then re-export.', '#2b7a0b'); };
    var apGen=document.getElementById('ap_generate'); if(apGen) apGen.onclick=function(){ var id=ap_nextPubId(); var rec=ap_buildRecord(id); var box=document.getElementById('ap_ndjson'); if(box){ box.style.display='block'; box.value=ap_toNDJSON(rec); box.focus(); box.select && box.select(); } ap_showMsg('NDJSON generated. Copy this line into data/publications.ndjson (new line), then run export + visualize again.', '#1f4d8b'); };

    var apTgl=document.getElementById('ap_toggle');
    if(apTgl) apTgl.onclick=function(){
      var panel=document.getElementById('addPubPanel'); if(!panel) return; var shown=panel.style.display!=='none';
      if(shown){ panel.style.display='none'; apTgl.textContent='Add Publication'; ap_showMsg('', '#666'); }
      else { panel.style.display='block'; try { ap_populateAuthors(); ap_upgradeTomSelect(); } catch(e){} apTgl.textContent='Hide Add Publication'; }
    };

    // Initialize people selector (populate + Tom Select) so typing filters names
    try { people_populate(); people_upgradeTomSelect(); } catch(e) {}
  } catch (e) {
    console && console.warn && console.warn('IM_initUI error', e);
  }
};
