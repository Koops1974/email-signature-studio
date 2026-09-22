'use strict';

(function () {

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  var STORAGE_KEY = 'emailish.template.v1';

  var SAMPLE = {
    full_name: 'Jane Smith',
    job_title: 'Year 5 Teacher',
    email: 'jane.smith@example.sch.uk',
    phone: '01223 456 789',
    mobile: '07700 900 123',
    department: 'Learning & Teaching',
    website: 'www.example.sch.uk'
  };

  var SAMPLE_CSV =
    'name,job title,email,phone,mobile,department,website\r\n' +
    'Ayesha Khan,Headteacher,a.khan@example.sch.uk,"0114 296 1234",07700 900101,Leadership Team,www.example.sch.uk\r\n' +
    'James O\'Neill,Deputy Headteacher,j.oneill@example.sch.uk,0114 296 1235,07700 900102,Leadership Team,\r\n' +
    'Jane Smith,Year 5 Teacher,jane.smith@example.sch.uk,0114 296 1236,07700 900103,Learning & Teaching,\r\n' +
    'Marcus Reid,ICT Technician,m.reid@example.sch.uk,,"07700 900104",,\r\n' +
    'Priya Patel,SENCO,p.patel@example.sch.uk,0114 296 1238,07700 900105,Inclusion,\r\n' +
    'David Brown,Office Manager,d.brown@example.sch.uk,"0114 296 1239, extension 3",07700 900106,Business & Admin,';

  var signatures = [];

  function defaults() {
    return {
      schoolName: 'Example Primary School',
      logoUrl: '',
      defaultAddress: 'Main Road, Cambridge CB1 2AB',
      defaultWebsite: 'www.example.sch.uk',
      accentColor: '#1f4e79',
      html: SIG.buildStarter('#1f4e79')
    };
  }

  var state = defaults();

  /* ---------------- persistence ---------------- */

  function saveToStorage() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage full / blocked */ }
  }

  function loadFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var obj = JSON.parse(raw);
      if (!obj || typeof obj.html !== 'string') return false;
      state = mergeState(obj);
      return true;
    } catch (e) { return false; }
  }

  function mergeState(obj) {
    var d = defaults();
    return {
      schoolName: obj.schoolName != null ? String(obj.schoolName) : d.schoolName,
      logoUrl: obj.logoUrl != null ? String(obj.logoUrl) : d.logoUrl,
      defaultAddress: obj.defaultAddress != null ? String(obj.defaultAddress) : d.defaultAddress,
      defaultWebsite: obj.defaultWebsite != null ? String(obj.defaultWebsite) : d.defaultWebsite,
      accentColor: /^#[0-9a-f]{6}$/i.test(obj.accentColor) ? obj.accentColor : d.accentColor,
      html: typeof obj.html === 'string' ? obj.html : d.html
    };
  }

  function encodeShare(str) {
    return btoa(encodeURIComponent(str)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeShare(str) {
    var b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return decodeURIComponent(atob(b64));
  }

  function shareLink() {
    var base = location.origin + location.pathname;
    return base + '#' + encodeShare(JSON.stringify(state));
  }

  function tryLoadFromHash() {
    var h = location.hash;
    if (!h || h === '#' || h.length < 8) return false;
    try {
      var obj = JSON.parse(decodeShare(h.slice(1)));
      if (!obj || typeof obj.html !== 'string') return false;
      state = mergeState(obj);
      return true;
    } catch (e) { return false; }
  }

  /* ---------------- UI helpers ---------------- */

  var toastTimer = null;
  function toast(id, msg, ok) {
    var el = $(id);
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok === false ? '#b3261e' : '#2f7d32';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.textContent = ''; }, 6000);
  }

  function populateEditor() {
    $('#in-school-name').value = state.schoolName;
    $('#in-logo-url').value = state.logoUrl;
    $('#in-address').value = state.defaultAddress;
    $('#in-website').value = state.defaultWebsite;
    $('#in-accent').value = state.accentColor;
    $('#in-html').value = state.html;
  }

  function refreshPreview() {
    var frame = $('#preview-frame');
    var data = {};
    for (var k in SAMPLE) data[k] = SAMPLE[k];
    data.school_name = state.schoolName;
    data.default_address = state.defaultAddress;
    data.default_website = state.defaultWebsite;
    var out = SIG.renderSignature(state.html, data, state, true);
    frame.srcdoc = SIG.wrapPreview(out);
  }

  function syncStateFromEditor() {
    state.schoolName = $('#in-school-name').value;
    state.logoUrl = $('#in-logo-url').value;
    state.defaultAddress = $('#in-address').value;
    state.defaultWebsite = $('#in-website').value;
    state.accentColor = $('#in-accent').value;
    state.html = $('#in-html').value;
  }

  /* ---------------- tabs ---------------- */

  function activateTab(name) {
    $$('.tab-btn').forEach(function (b) {
      var on = b.getAttribute('data-tab') === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $$('.tab-panel').forEach(function (p) {
      p.classList.toggle('active', p.id === 'tab-' + name);
    });
  }

  /* ---------------- copy helpers ---------------- */

  function legacyCopy(html) {
    var host = document.createElement('div');
    host.contentEditable = 'true';
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:fixed;left:-9999px;top:0;width:4px;height:4px;overflow:hidden;opacity:0;';
    host.innerHTML = html;
    document.body.appendChild(host);
    var ok = false;
    var range = document.createRange();
    range.selectNodeContents(host);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    sel.removeAllRanges();
    document.body.removeChild(host);
    return ok;
  }

  function copyHtml(html) {
    return new Promise(function (resolve) {
      if (navigator.clipboard && window.ClipboardItem) {
        var cItem = new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([SIG.htmlToText(html) || ' '], { type: 'text/plain' })
        });
        navigator.clipboard.write([cItem]).then(function () { resolve('clipboard'); })
          .catch(function () { resolve(legacyCopy(html) ? 'legacy' : 'failed'); });
      } else {
        resolve(legacyCopy(html) ? 'legacy' : 'failed');
      }
    });
  }

  function downloadFile(name, content, mime) {
    var blob = (content instanceof Blob)
      ? content
      : new Blob([content], { type: mime || 'text/html' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      document.body.removeChild(a);
    }, 400);
  }

  function safeFileName(name) {
    var n = String(name || 'signature').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
    return n || 'signature';
  }

  /* ---------------- staff cards ---------------- */

  function removeEmptyHint() {
    var hint = $('#staff-results .empty-hint');
    if (hint) hint.remove();
  }

  function updateResultsBar() {
    var bar = $('#results-bar');
    var hint = $('#zip-hint');
    var count = signatures.length;
    bar.hidden = count === 0;
    hint.hidden = count === 0;
    $('#results-count').textContent = count + ' signature' + (count === 1 ? '' : 's');
  }

  function clearResults() {
    var box = $('#staff-results');
    box.innerHTML = '<p class="hint empty-hint">Upload a CSV or enter a name to see signatures here.</p>';
    signatures = [];
    updateResultsBar();
  }

  function showPreviews() {
    return $('#toggle-previews').checked;
  }

  function addCard(record) {
    if (!record.full_name && !record.email) return false;
    var html = SIG.renderSignature(state.html, record, state, true);
    var name = record.full_name || record.email;
    signatures.push({ name: name, html: html });

    var card = document.createElement('div');
    card.className = 'card';

    var head = document.createElement('div');
    head.className = 'card-head';
    var h = document.createElement('h4');
    h.textContent = name;
    var who = document.createElement('span');
    who.className = 'who';
    who.textContent = (record.job_title || '') + (record.email ? ' — ' + record.email : '');
    head.appendChild(h);
    head.appendChild(who);

    var frame = null;
    if (showPreviews()) {
      frame = document.createElement('iframe');
      frame.className = 'preview-frame';
      frame.title = 'Signature preview for ' + name;
      frame.setAttribute('sandbox', 'allow-same-origin');
      frame.srcdoc = SIG.wrapPreview(html);
    }

    var actions = document.createElement('div');
    actions.className = 'card-actions';

    var btnCopy = document.createElement('button');
    btnCopy.type = 'button';
    btnCopy.className = 'btn';
    btnCopy.textContent = 'Copy signature';
    var btnDl = document.createElement('button');
    btnDl.type = 'button';
    btnDl.className = 'btn ghost';
    btnDl.textContent = 'Download .html';

    btnCopy.addEventListener('click', function () {
      btnCopy.disabled = true;
      copyHtml(html).then(function (status) {
        btnCopy.disabled = false;
        btnCopy.textContent = status === 'failed' ? 'Copy blocked — use Download' : 'Copied!';
        setTimeout(function () { btnCopy.textContent = 'Copy signature'; }, 3000);
        if (status === 'failed') {
          toast('#staff-toast', 'Clipboard was blocked by the browser — click Download .html below and copy from the file.', false);
        } else {
          toast('#staff-toast', 'Copied. Paste it into Outlook web or Gmail settings (see the staff guide).');
        }
      });
    });

    btnDl.addEventListener('click', function () {
      downloadFile('signature-' + safeFileName(name) + '.html', SIG.wrapPreview(html), 'text/html');
    });

    actions.appendChild(btnCopy);
    actions.appendChild(btnDl);
    card.appendChild(head);
    if (frame) card.appendChild(frame);
    card.appendChild(actions);

    $('#staff-results').appendChild(card);
    updateResultsBar();
    return true;
  }

  function generateCards(records, opts) {
    if (!state.html.trim()) {
      toast('#staff-toast', 'Design a template first — go to the "Design template" tab.', false);
      activateTab('design');
      return;
    }
    if (opts && opts.replace) clearResults();
    removeEmptyHint();
    var done = 0, skipped = 0;
    for (var i = 0; i < records.length; i++) {
      if (addCard(records[i])) done++; else skipped++;
    }
    var msg = 'Generated ' + done + ' signature' + (done === 1 ? '' : 's') + '.';
    if (skipped) msg += ' ' + skipped + ' row' + (skipped === 1 ? ' was' : 's were') + ' skipped (no name or email).';
    toast('#staff-toast', msg);
  }

  /* ---------------- wire-up ---------------- */

  function bindEvents() {
    $$('.tab-btn').forEach(function (b) {
      b.addEventListener('click', function () { if (b.getAttribute('data-tab')) activateTab(b.getAttribute('data-tab')); });
    });

    var debounceTimer = null;
    function schedule() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        syncStateFromEditor();
        refreshPreview();
        saveToStorage();
      }, 250);
    }

    ['in-school-name', 'in-logo-url', 'in-address', 'in-website', 'in-accent'].forEach(function (id) {
      $('#' + id).addEventListener('input', schedule);
    });
    $('#in-html').addEventListener('input', schedule);

    $('#btn-build').addEventListener('click', function () {
      $('#in-html').value = SIG.buildStarter(state.accentColor);
      syncStateFromEditor();
      refreshPreview();
      saveToStorage();
      toast('#toast', 'Starter template built with your details and chosen colour.');
    });

    $('#btn-accent').addEventListener('click', function () {
      syncStateFromEditor();
      var co = state.accentColor;
      $('#in-html').value = state.html.replace(/#1f4e79/gi, co);
      syncStateFromEditor();
      refreshPreview();
      saveToStorage();
      toast('#toast', 'Colour applied to the current template.');
    });

    $$('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var ta = $('#in-html');
        var tok = chip.getAttribute('data-insert');
        var start = ta.selectionStart != null ? ta.selectionStart : ta.value.length;
        var end = ta.selectionEnd != null ? ta.selectionEnd : start;
        ta.value = ta.value.slice(0, start) + tok + ta.value.slice(end);
        ta.focus();
        var pos = start + tok.length;
        ta.setSelectionRange(pos, pos);
        syncStateFromEditor();
        refreshPreview();
        saveToStorage();
      });
    });

    $('#btn-save').addEventListener('click', function () {
      syncStateFromEditor();
      saveToStorage();
      toast('#toast', 'Template saved in this browser.');
    });

    $('#btn-sharelink').addEventListener('click', function () {
      syncStateFromEditor();
      var link = shareLink();
      copyHtml('<a href="' + link + '">' + link + '</a>').then(function (status) {
        if (status === 'failed') {
          toast('#toast', 'Copy blocked — here is the link (already loaded from it):', false);
          prompt('Copy this share link:', link);
        } else {
          toast('#toast', 'Share link copied. Anyone who opens it starts from your template.');
          history.replaceState(null, '', '#' + link.split('#')[1]);
        }
      });
    });

    $('#btn-export').addEventListener('click', function () {
      syncStateFromEditor();
      downloadFile('email-signature-template.json', JSON.stringify(state, null, 2), 'application/json');
      toast('#toast', 'Template exported as .json — keep it as a backup.');
    });

    $('#in-import').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var obj = JSON.parse(reader.result);
          if (!obj || typeof obj.html !== 'string') throw new Error('bad');
          state = mergeState(obj);
          populateEditor();
          refreshPreview();
          saveToStorage();
          toast('#toast', 'Template imported.');
        } catch (e) {
          toast('#toast', 'That file does not look like a valid template export.', false);
        }
      };
      reader.readAsText(file);
      this.value = '';
    });

    $('#btn-reset').addEventListener('click', function () {
      if (!window.confirm('Reset the editor and remove the saved template from this browser?')) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      history.replaceState(null, '', location.pathname);
      state = defaults();
      populateEditor();
      refreshPreview();
      toast('#toast', 'Reset. Nothing was stored anywhere.');
    });

    $('#btn-csv-template').addEventListener('click', function () {
      downloadFile('email-signatures-template.csv', SigCSV.templateCSV(), 'text/csv');
      toast('#toast', 'CSV template downloaded — fill it in and upload it on this tab.');
    });

    $('#btn-sample').addEventListener('click', function () {
      generateCards(SigCSV.toRecords(SAMPLE_CSV), { replace: true });
    });

    $('#in-csv').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var records = SigCSV.toRecords(reader.result);
        if (records.length === 0) {
          toast('#staff-toast', 'No staff rows found — check the CSV has a header row with a "name" column.', false);
        } else {
          generateCards(records, { replace: true });
        }
      };
      reader.readAsText(file);
      this.value = '';
    });

    $('#btn-add-person').addEventListener('click', function () {
      var rec = {
        full_name: $('#p-name').value.trim(),
        job_title: $('#p-title').value.trim(),
        email: $('#p-email').value.trim(),
        phone: $('#p-phone').value.trim(),
        mobile: $('#p-mobile').value.trim(),
        department: $('#p-dept').value.trim(),
        website: $('#p-website').value.trim()
      };
      generateCards([rec]);
    });

    $('#toggle-previews').addEventListener('change', function () {
      var show = this.checked;
      $$('#staff-results .preview-frame').forEach(function (f) {
        f.style.display = show ? '' : 'none';
      });
    });

    $('#btn-zip').addEventListener('click', function () {
      if (signatures.length === 0) {
        toast('#staff-toast', 'No signatures yet — upload a CSV or load the example data first.', false);
        return;
      }
      var used = {};
      var files = signatures.map(function (s) {
        var base = safeFileName(s.name);
        var fn = base + '.html', i = 1;
        while (used[fn]) { fn = base + '-' + (++i) + '.html'; }
        used[fn] = true;
        return { name: fn, content: SIG.wrapPreview(s.html) };
      });
      downloadFile('email-signatures.zip', SigZip.makeZipBlob(files), 'application/zip');
      toast('#staff-toast', files.length + ' file' + (files.length === 1 ? '' : 's') + ' bundled into email-signatures.zip.');
    });
  }

  /* ---------------- init ---------------- */

  function init() {
    if (tryLoadFromHash()) {
      // load from hash first (a shared link beats any local copy), then persist locally
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
      saveToStorage();
    } else {
      loadFromStorage();
    }
    populateEditor();
    refreshPreview();
    bindEvents();
  }

  init();
})();