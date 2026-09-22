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

  // Signature Fields registry. `on` is the default state for new users.
  var FIELDS = [
    { id: 'name',        label: 'Name',          group: 'staff',  ph: 'full_name',       on: true  },
    { id: 'job_title',   label: 'Job title',     group: 'staff',  ph: 'job_title',       on: true  },
    { id: 'school_name', label: 'School name',   group: 'school', ph: 'school_name',     on: true  },
    { id: 'email',       label: 'Email address', group: 'staff',  ph: 'email',           on: true  },
    { id: 'phone',       label: 'Telephone',     group: 'staff',  ph: 'phone',           on: false },
    { id: 'mobile',      label: 'Mobile',        group: 'staff',  ph: 'mobile',          on: false },
    { id: 'website',     label: 'Website',       group: 'staff',  ph: 'website',         on: true  },
    { id: 'address',     label: 'Address',       group: 'school', ph: 'default_address', on: true  },
    { id: 'department',  label: 'Department',    group: 'staff',  ph: 'department',      on: false },
    { id: 'logo',        label: 'School logo',   group: 'school', ph: 'logo_url',        on: true  }
  ];

  var STAFF_KEYS = ['full_name', 'job_title', 'email', 'phone', 'mobile', 'department', 'website'];

  var STAFF_FORM = [
    { ph: 'full_name', id: 'p-name', label: 'Full name', pholder: 'Sarah Jones' },
    { ph: 'job_title', id: 'p-title', label: 'Job title', pholder: 'Headteacher' },
    { ph: 'email', id: 'p-email', label: 'Email address', pholder: 'sarah@example.sch.uk' },
    { ph: 'phone', id: 'p-phone', label: 'Telephone', pholder: '01223 456 789' },
    { ph: 'mobile', id: 'p-mobile', label: 'Mobile', pholder: '07700 900 123' },
    { ph: 'department', id: 'p-dept', label: 'Department', pholder: 'Leadership Team' },
    { ph: 'website', id: 'p-website', label: 'Website', pholder: 'www.example.sch.uk' }
  ];

  function defaults() {
    var fields = {};
    FIELDS.forEach(function (f) { fields[f.id] = f.on; });
    return {
      schoolName: 'Example Primary School',
      logoUrl: '',
      defaultAddress: 'Main Road, Cambridge CB1 2AB',
      defaultWebsite: 'www.example.sch.uk',
      accentColor: '#1f4e79',
      html: SIG.buildStarter('#1f4e79'),
      fields: fields,
      people: []
    };
  }

  var state = defaults();
  var editingIndex = -1;

  /* ---------------- persistence ---------------- */

  function saveToStorage() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
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

  function sanitisePerson(p) {
    var out = {};
    STAFF_KEYS.forEach(function (k) {
      if (p && typeof p[k] === 'string' && p[k].trim() !== '') out[k] = p[k].trim();
    });
    return out;
  }

  function sanitisePeople(list) {
    if (!Array.isArray(list)) return [];
    return list.map(sanitisePerson);
  }

  function mergeState(obj) {
    var d = defaults();
    var fields = {};
    FIELDS.forEach(function (f) {
      fields[f.id] = (obj.fields && typeof obj.fields[f.id] === 'boolean') ? obj.fields[f.id] : f.on;
    });
    return {
      schoolName: obj.schoolName != null ? String(obj.schoolName) : d.schoolName,
      logoUrl: obj.logoUrl != null ? String(obj.logoUrl) : d.logoUrl,
      defaultAddress: obj.defaultAddress != null ? String(obj.defaultAddress) : d.defaultAddress,
      defaultWebsite: obj.defaultWebsite != null ? String(obj.defaultWebsite) : d.defaultWebsite,
      accentColor: /^#[0-9a-f]{6}$/i.test(obj.accentColor) ? obj.accentColor : d.accentColor,
      html: typeof obj.html === 'string' ? obj.html : d.html,
      fields: fields,
      people: sanitisePeople(obj.people)
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

  /* ---------------- field helpers ---------------- */

  function isOn(id) { return state.fields[id] !== false; }

  function enabledPhs() {
    var a = [];
    FIELDS.forEach(function (f) { if (isOn(f.id)) a.push(f.ph); });
    return a.length ? a : null;
  }

  function enabledStaffPhs() {
    var a = [];
    FIELDS.forEach(function (f) { if (f.group === 'staff' && isOn(f.id)) a.push(f.ph); });
    return a;
  }

  function phToFieldId(ph) {
    for (var i = 0; i < FIELDS.length; i++) if (FIELDS[i].ph === ph) return FIELDS[i].id;
    return null;
  }

  /* ---------------- UI helpers ---------------- */

  var toastTimer = null;
  function toast(msg, ok) {
    var el = $('#staff-toast');
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

  function syncStateFromEditor() {
    state.schoolName = $('#in-school-name').value;
    state.logoUrl = $('#in-logo-url').value;
    state.defaultAddress = $('#in-address').value;
    state.defaultWebsite = $('#in-website').value;
    state.accentColor = $('#in-accent').value;
    state.html = $('#in-html').value;
  }

  function refreshPreview() {
    var frame = $('#preview-frame');
    if (!frame) return;
    var data = {};
    for (var k in SAMPLE) data[k] = SAMPLE[k];
    data.school_name = state.schoolName;
    data.default_address = state.defaultAddress;
    data.default_website = state.defaultWebsite;
    var out = SIG.renderSignature(state.html, data, state, true);
    frame.srcdoc = SIG.wrapPreview(out);
  }

  /* ---------------- tabs + stepper ---------------- */

  function activateTab(name) {
    $$('.tab-btn').forEach(function (b) {
      var on = b.getAttribute('data-tab') === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $$('.tab-panel').forEach(function (p) {
      p.classList.toggle('active', p.id === 'tab-' + name);
    });
    updateStepper(name);
  }

  function updateStepper(active) {
    $$('.stepper li').forEach(function (li) {
      var step = li.getAttribute('data-step');
      var done = false;
      var order = ['design', 'staff', 'signatures'];
      if (active) {
        done = order.indexOf(step) < order.indexOf(active);
      }
      li.classList.toggle('active', step === active);
      li.classList.toggle('done', done);
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

  /* ---------------- staff form ---------------- */

  function renderSingleForm() {
    var grid = $('#single-form-grid');
    if (!grid) return;
    grid.textContent = '';
    STAFF_FORM.forEach(function (f) {
      if (!isOn(phToFieldId(f.ph))) return;
      var div = document.createElement('div');
      div.className = 'field';
      var lab = document.createElement('label');
      lab.htmlFor = f.id;
      lab.textContent = f.label;
      var inp = document.createElement('input');
      inp.id = f.id;
      inp.type = 'text';
      inp.placeholder = f.pholder;
      div.appendChild(lab);
      div.appendChild(inp);
      grid.appendChild(div);
    });
  }

  function readPerson() {
    var rec = {};
    STAFF_FORM.forEach(function (f) {
      if (!isOn(phToFieldId(f.ph))) return;
      var el = $('#' + f.id);
      var val = el ? el.value.trim() : '';
      if (val !== '') rec[f.ph] = val;
    });
    return rec;
  }

  function writePerson(rec) {
    STAFF_FORM.forEach(function (f) {
      var el = $('#' + f.id);
      if (el) el.value = (rec && rec[f.ph]) || '';
    });
  }

  function clearForm() {
    STAFF_FORM.forEach(function (f) {
      var el = $('#' + f.id);
      if (el) el.value = '';
    });
  }

  function setEditing(i) {
    editingIndex = i;
    $('#btn-add-person').textContent = i < 0 ? 'Add this person' : 'Update this person';
    $('#btn-cancel-edit').hidden = i < 0;
  }

  /* ---------------- staff table ---------------- */

  function staffLabel(ph) {
    for (var i = 0; i < STAFF_FORM.length; i++) if (STAFF_FORM[i].ph === ph) return STAFF_FORM[i].label;
    return ph;
  }

  function renderStaffList() {
    var box = $('#staff-list');
    if (!box) return;
    box.textContent = '';
    $('#staff-count').textContent = state.people.length;

    if (state.people.length === 0) {
      var hint = document.createElement('p');
      hint.className = 'hint empty-hint';
      hint.innerHTML = 'No staff yet. Enter a person below or <strong>upload a CSV</strong> — everyone you add will appear here, then you can generate signatures in step 3.';
      box.appendChild(hint);
      return;
    }

    var wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    var table = document.createElement('table');
    table.className = 'staff-table';
    var thead = document.createElement('thead');
    var thr = document.createElement('tr');
    var shownKeys = [];
    FIELDS.forEach(function (f) {
      if (f.group === 'staff' && isOn(f.id)) {
        var th = document.createElement('th');
        th.textContent = f.label;
        thr.appendChild(th);
        shownKeys.push(f.ph);
      }
    });
    var thStatus = document.createElement('th');
    thStatus.textContent = 'Status';
    thr.appendChild(thStatus);
    var thAct = document.createElement('th');
    thAct.textContent = '';
    thr.appendChild(thAct);
    thead.appendChild(thr);

    var tbody = document.createElement('tbody');
    state.people.forEach(function (p, i) {
      var tr = document.createElement('tr');
      tr.setAttribute('data-i', i);
      shownKeys.forEach(function (k) {
        var td = document.createElement('td');
        if (k === 'email' && p.email) {
          var a = document.createElement('a');
          a.href = 'mailto:' + p.email;
          a.textContent = p.email;
          td.appendChild(a);
        } else {
          td.textContent = p[k] || '';
        }
        tr.appendChild(td);
      });
      var tdS = document.createElement('td');
      var chip = document.createElement('span');
      chip.className = 'status-chip';
      chip.textContent = 'Ready';
      tdS.appendChild(chip);
      tr.appendChild(tdS);

      var tdA = document.createElement('td');
      tdA.className = 'row-actions';
      [['preview', 'Preview'], ['edit', 'Edit'], ['delete', 'Delete']].forEach(function (pair) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'link-btn action-' + pair[0];
        b.textContent = pair[1];
        tdA.appendChild(b);
      });
      tr.appendChild(tdA);
      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    wrap.appendChild(table);
    box.appendChild(wrap);
  }

  function previewPerson(i) {
    if (!state.people[i]) return;
    activateTab('signatures');
    var el = document.getElementById('sigp-' + i);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  function editPerson(i) {
    if (!state.people[i]) return;
    writePerson(state.people[i]);
    setEditing(i);
    $('#single-form-grid').scrollIntoView({ block: 'center', behavior: 'smooth' });
    toast('Editing ' + (state.people[i].full_name || 'this person') + ' — make changes and click "Update this person".');
  }

  function deletePerson(i) {
    var p = state.people[i];
    if (!p) return;
    if (!window.confirm('Remove ' + (p.full_name || 'this person') + ' from the list?')) return;
    state.people.splice(i, 1);
    if (editingIndex === i) setEditing(-1);
    renderStaffList();
    renderSignatures();
    saveToStorage();
    toast('Person removed.');
  }

  /* ---------------- signatures ---------------- */

  function showPreviews() {
    var t = $('#toggle-previews');
    return !t || t.checked;
  }

  function renderSignatures() {
    var box = $('#staff-results');
    if (!box) return;
    var bar = $('#results-bar');
    var zh = $('#zip-hint');
    var count = state.people.length;
    box.textContent = '';
    if (bar) bar.hidden = count === 0;
    if (zh) zh.hidden = count === 0;
    $('#results-count').textContent = count + ' signature' + (count === 1 ? '' : 's');

    if (count === 0) {
      var hint = document.createElement('p');
      hint.className = 'hint empty-hint';
      hint.innerHTML = 'Nothing to generate yet. Go to <strong>Step 2 — Add your staff</strong>, enter a person or upload a CSV, then come back here.';
      box.appendChild(hint);
      return;
    }

    var show = showPreviews();
    state.people.forEach(function (p, i) {
      var html = SIG.renderSignature(state.html, p, state, true);
      var name = p.full_name || p.email || p.job_title || ('Staff member ' + (i + 1));

      var card = document.createElement('div');
      card.className = 'card sig-card';
      card.id = 'sigp-' + i;

      var head = document.createElement('div');
      head.className = 'sig-head';
      var h = document.createElement('h4');
      h.textContent = name;
      var who = document.createElement('span');
      who.className = 'who';
      who.textContent = p.job_title || '';
      head.appendChild(h);
      head.appendChild(who);
      card.appendChild(head);

      if (show) {
        var frame = document.createElement('iframe');
        frame.className = 'preview-frame sig-frame';
        frame.title = 'Signature preview for ' + name;
        frame.setAttribute('sandbox', 'allow-same-origin');
        frame.srcdoc = SIG.wrapPreview(html);
        card.appendChild(frame);
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
            toast('Clipboard was blocked by the browser — click Download .html and copy from the file.', false);
          } else {
            toast('Copied. Paste it into Outlook web or Gmail settings (see the staff guide).');
          }
        });
      });

      btnDl.addEventListener('click', function () {
        downloadFile('signature-' + safeFileName(name) + '.html', SIG.wrapPreview(html), 'text/html');
      });

      actions.appendChild(btnCopy);
      actions.appendChild(btnDl);
      card.appendChild(actions);
      box.appendChild(card);
    });
  }

  function replacePeople(records) {
    state.people = sanitisePeople(records);
    setEditing(-1);
    renderStaffList();
    renderSignatures();
    saveToStorage();
  }

  function joinedSignatures() {
    return state.people.map(function (p) {
      return SIG.renderSignature(state.html, p, state, true);
    }).join('<div style="height:18px;"></div>');
  }

  /* ---------------- field toggles ---------------- */

  function renderToggles() {
    var box = $('#field-toggles');
    if (!box) return;
    box.textContent = '';
    FIELDS.forEach(function (f) {
      var lab = document.createElement('label');
      lab.className = 'field-toggle';

      var inp = document.createElement('input');
      inp.type = 'checkbox';
      inp.id = 'field-on-' + f.id;
      inp.setAttribute('data-field', f.id);
      inp.checked = isOn(f.id);

      var track = document.createElement('span');
      track.className = 'toggle-track';
      track.setAttribute('aria-hidden', 'true');

      var txt = document.createElement('span');
      txt.className = 'toggle-text';
      var title = document.createElement('span');
      title.className = 'toggle-title';
      title.textContent = f.label;
      var grp = document.createElement('span');
      grp.className = 'toggle-group';
      grp.textContent = f.group === 'school' ? 'School-wide' : 'Per person';
      txt.appendChild(title);
      txt.appendChild(grp);

      lab.appendChild(inp);
      lab.appendChild(track);
      lab.appendChild(txt);
      box.appendChild(lab);
    });
  }

  function onFieldToggle(id, on) {
    state.fields[id] = !!on;
    renderSingleForm();
    renderStaffList();
    renderSignatures();
    refreshPreview();
    saveToStorage();
    var nm = '';
    FIELDS.forEach(function (f) { if (f.id === id) nm = f.label; });
    toast(on ? nm + ' is now shown in signatures.' : nm + ' is now hidden from signatures.');
  }

  /* ---------------- wire-up ---------------- */

  function bindEvents() {
    $$('.tab-btn').forEach(function (b) {
      b.addEventListener('click', function () { if (b.getAttribute('data-tab')) activateTab(b.getAttribute('data-tab')); });
    });

    $$('.stepper button').forEach(function (b) {
      b.addEventListener('click', function () {
        var li = b.parentNode;
        if (li && li.getAttribute('data-step')) activateTab(li.getAttribute('data-step'));
      });
    });

    var debounceTimer = null;
    function schedule() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        syncStateFromEditor();
        refreshPreview();
        renderSignatures();
        saveToStorage();
      }, 250);
    }

    ['in-school-name', 'in-logo-url', 'in-address', 'in-website', 'in-accent'].forEach(function (id) {
      $('#' + id).addEventListener('input', schedule);
    });
    $('#in-html').addEventListener('input', schedule);

    $('#btn-build').addEventListener('click', function () {
      syncStateFromEditor();
      $('#in-html').value = SIG.buildStarter(state.accentColor);
      syncStateFromEditor();
      refreshPreview();
      renderSignatures();
      saveToStorage();
      toast('Starter template built with your details and chosen colour.');
    });

    $('#btn-accent').addEventListener('click', function () {
      syncStateFromEditor();
      var co = state.accentColor;
      $('#in-html').value = state.html.replace(/#1f4e79/gi, co);
      syncStateFromEditor();
      refreshPreview();
      renderSignatures();
      saveToStorage();
      toast('Colour applied to the current template.');
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
        renderSignatures();
        saveToStorage();
      });
    });

    $('#field-toggles').addEventListener('change', function (e) {
      var inp = e.target;
      if (inp && inp.type === 'checkbox' && inp.getAttribute('data-field')) {
        onFieldToggle(inp.getAttribute('data-field'), inp.checked);
      }
    });

    $('#btn-save').addEventListener('click', function () {
      syncStateFromEditor();
      saveToStorage();
      toast('Template saved in this browser.');
    });

    $('#btn-sharelink').addEventListener('click', function () {
      syncStateFromEditor();
      var link = shareLink();
      copyHtml('<a href="' + link + '">' + link + '</a>').then(function (status) {
        if (status === 'failed') {
          toast('Copy blocked — here is the link:', false);
          prompt('Copy this share link:', link);
        } else {
          toast('Share link copied. Anyone who opens it starts from your template.');
          history.replaceState(null, '', '#' + link.split('#')[1]);
        }
      });
    });

    $('#btn-export').addEventListener('click', function () {
      syncStateFromEditor();
      downloadFile('email-signature-template.json', JSON.stringify(state, null, 2), 'application/json');
      toast('Template exported as .json — keep it as a backup.');
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
          renderToggles();
          renderSingleForm();
          refreshPreview();
          renderStaffList();
          renderSignatures();
          saveToStorage();
          toast('Template imported.');
        } catch (e) {
          toast('That file does not look like a valid template export.', false);
        }
      };
      reader.readAsText(file);
      this.value = '';
    });

    $('#btn-reset').addEventListener('click', function () {
      if (!window.confirm('Reset everything: the design, the field settings and the staff list. Remove the saved copy from this browser?')) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      history.replaceState(null, '', location.pathname);
      state = defaults();
      editingIndex = -1;
      populateEditor();
      renderToggles();
      renderSingleForm();
      clearForm();
      refreshPreview();
      renderStaffList();
      renderSignatures();
      toast('Reset. Nothing was stored anywhere.');
    });

    $('#btn-csv-template').addEventListener('click', function () {
      syncStateFromEditor();
      var csv = SigCSV.templateCSV(enabledStaffPhs());
      downloadFile('email-signatures-template.csv', csv, 'text/csv');
      toast('CSV template downloaded — fill it in and upload it on Step 2.');
    });

    $('#btn-sample').addEventListener('click', function () {
      var records = SigCSV.toRecords(SAMPLE_CSV, enabledPhs());
      replacePeople(records);
      toast(records.length + ' example staff loaded — check them in the list, then continue to step 3.');
    });

    $('#in-csv').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var records = SigCSV.toRecords(reader.result, enabledPhs());
        if (records.length === 0) {
          toast('No staff rows found — check the CSV has a header row with a "name" column.', false);
        } else {
          replacePeople(records);
          toast(records.length + ' staff imported.');
        }
      };
      reader.readAsText(file);
      this.value = '';
    });

    $('#btn-add-person').addEventListener('click', function () {
      syncStateFromEditor();
      var rec = readPerson();
      if (!rec.full_name && !rec.email) {
        toast('Enter at least a name or an email for this person.', false);
        return;
      }
      if (editingIndex >= 0 && state.people[editingIndex]) {
        state.people[editingIndex] = sanitisePerson(rec);
        setEditing(-1);
        toast('Person updated.');
      } else {
        state.people.push(sanitisePerson(rec));
        toast('Person added — you can now generate signatures.');
      }
      renderStaffList();
      renderSignatures();
      saveToStorage();
    });

    $('#btn-cancel-edit').addEventListener('click', function () {
      setEditing(-1);
      clearForm();
    });

    $('#toggle-previews').addEventListener('change', function () {
      renderSignatures();
    });

    $('#btn-zip').addEventListener('click', function () {
      if (state.people.length === 0) {
        toast('No signatures yet — add staff on Step 2 first.', false);
        return;
      }
      var used = {};
      var files = state.people.map(function (p) {
        var name = p.full_name || p.email || p.job_title || 'signature';
        var html = SIG.renderSignature(state.html, p, state, true);
        var base = safeFileName(name);
        var fn = base + '.html', i = 1;
        while (used[fn]) { fn = base + '-' + (++i) + '.html'; }
        used[fn] = true;
        return { name: fn, content: SIG.wrapPreview(html) };
      });
      downloadFile('email-signatures.zip', SigZip.makeZipBlob(files), 'application/zip');
      toast(files.length + ' file' + (files.length === 1 ? '' : 's') + ' bundled into email-signatures.zip.');
    });

    $('#btn-copy-all').addEventListener('click', function () {
      if (state.people.length === 0) {
        toast('No signatures yet — add staff on Step 2 first.', false);
        return;
      }
      copyHtml(joinedSignatures()).then(function (status) {
        if (status === 'failed') {
          toast('Clipboard blocked — use "Download all HTML" instead.', false);
        } else {
          toast('All signatures copied — paste them wherever you need them.');
        }
      });
    });

    $('#btn-dl-all').addEventListener('click', function () {
      if (state.people.length === 0) {
        toast('No signatures yet — add staff on Step 2 first.', false);
        return;
      }
      var fn = safeFileName(state.schoolName || 'school') + '-signatures.html';
      downloadFile(fn, SIG.wrapPreview(joinedSignatures()), 'text/html');
      toast('Downloaded one .html file containing every signature.');
    });

    $('#staff-list').addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.link-btn') : null;
      if (!btn) {
        var el = e.target;
        while (el && el !== this && !(/link-btn/.test(el.className || ''))) el = el.parentNode;
        btn = el && /link-btn/.test(el.className || '') ? el : null;
      }
      if (!btn) return;
      var tr = btn.closest ? btn.closest('tr[data-i]') : null;
      if (!tr) {
        var t = btn.parentNode;
        while (t && !t.getAttribute) t = t.parentNode;
        while (t && !(t.getAttribute && t.getAttribute('data-i'))) t = t.parentNode;
        tr = t;
      }
      var i = parseInt(tr.getAttribute('data-i'), 10);
      if (btn.className.indexOf('action-preview') !== -1) previewPerson(i);
      if (btn.className.indexOf('action-edit') !== -1) editPerson(i);
      if (btn.className.indexOf('action-delete') !== -1) deletePerson(i);
    });

    $('#btn-next-staff').addEventListener('click', function () { activateTab('staff'); });
    $('#btn-next-sigs').addEventListener('click', function () { activateTab('signatures'); });
  }

  /* ---------------- init ---------------- */

  function init() {
    if (tryLoadFromHash()) {
      try { history.replaceState(null, '', location.pathname); } catch (e) {}
      saveToStorage();
    } else {
      loadFromStorage();
    }
    populateEditor();
    renderToggles();
    renderSingleForm();
    refreshPreview();
    renderStaffList();
    renderSignatures();
    bindEvents();
    updateStepper('design');
  }

  init();
})();