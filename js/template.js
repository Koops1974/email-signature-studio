'use strict';

var SIG = (function () {

  var TOKEN_RE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

  var KEYS = [
    'full_name', 'job_title', 'email', 'phone', 'mobile', 'department',
    'website', 'school_name', 'logo_url', 'default_address', 'default_website'
  ];

  // Placeholder key -> Signature Fields control id.
  var FIELD_BY_KEY = {
    full_name: 'name',
    job_title: 'job_title',
    email: 'email',
    phone: 'phone',
    mobile: 'mobile',
    department: 'department',
    website: 'website',
    school_name: 'school_name',
    logo_url: 'logo',
    default_address: 'address',
    default_website: 'website'
  };

  // A key is "off" when its field toggle is explicitly false in state.fields.
  function fieldOff(key, state) {
    var id = FIELD_BY_KEY[key];
    if (!id || !state || !state.fields) return false;
    return state.fields[id] === false;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/[\r\n]+/g, ' ')
      .trim();
  }

  function safeUrl(value) {
    var v = String(value == null ? '' : value).trim();
    if (!v) return '';
    if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
    if (/^www\./i.test(v)) return v;
    return '';
  }

  function gate(key, val, state) {
    return fieldOff(key, state) ? '' : val;
  }

  function keyValue(key, data, state) {
    var d = data || {};
    switch (key) {
      case 'full_name':       return gate(key, d.full_name || '', state);
      case 'job_title':       return gate(key, d.job_title || '', state);
      case 'email':           return gate(key, d.email || '', state);
      case 'phone':           return gate(key, d.phone || '', state);
      case 'mobile':          return gate(key, d.mobile || '', state);
      case 'department':      return gate(key, d.department || '', state);
      case 'website':         return gate(key, safeUrl(d.website || state.defaultWebsite), state);
      case 'school_name':     return gate(key, d.school_name || state.schoolName, state);
      case 'logo_url':        return gate(key, safeUrl(d.logo_url || state.logoUrl), state);
      case 'default_address': return gate(key, d.default_address || state.defaultAddress, state);
      case 'default_website': return gate(key, safeUrl(d.default_website || state.defaultWebsite), state);
      default:                return '';
    }
  }

  function tokensIn(line) {
    var t = [];
    String(line || '').replace(TOKEN_RE, function (m, key) { t.push(key); return m; });
    return t;
  }

  function substitute(line, data, state) {
    return line.replace(TOKEN_RE, function (m, key) {
      var v = keyValue(key, data, state);
      return v === '' ? '' : escapeHtml(v);
    });
  }

  function isBlankAfterFill(line, data, state) {
    var re = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
    var hasToken = false, allEmpty = true;
    line.replace(re, function (m, key) {
      hasToken = true;
      if (keyValue(key, data, state) !== '') allEmpty = false;
      return m;
    });
    if (!hasToken) return false;
    if (!allEmpty) return false;
    var text = line
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, '')
      .replace(/&#160;/gi, '')
      .trim();
    return text === '';
  }

  function renderSignature(html, data, state, collapse) {
    var lines = String(html || '').split(/\r?\n/);
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var toks = tokensIn(lines[i]);
      // A line built around a single placeholder belongs to that field:
      // when the field is switched off the whole line is dropped, even if it
      // carries static text such as a "Tel:" label.
      if (toks.length === 1 && fieldOff(toks[0], state)) continue;
      if (collapse !== false && isBlankAfterFill(lines[i], data, state)) continue;
      out.push(substitute(lines[i], data, state));
    }
    return out.join('\n');
  }

  function buildStarter(accent) {
    var co = /^#[0-9a-f]{6}$/i.test(accent || '') ? accent : '#1f4e79';
    // Every supported field line is present; Signature Fields toggles decide
    // which ones survive into a generated signature (fields switched off are
    // dropped at render time, so they never appear in output).
    return [
      '<table cellpadding="0" cellspacing="0" border="0" style="font-family:\'Segoe UI\',Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#333333;">',
      '  <tr>',
      '    <td valign="middle">',
      '      <img src="{{logo_url}}" alt="" style="display:block;max-height:80px;width:auto;margin-right:15px;" />',
      '    </td>',
      '    <td valign="middle" style="border-left:3px solid ' + co + ';padding-left:15px;">',
      '      <div style="font-size:16px;font-weight:bold;color:' + co + ';">{{full_name}}</div>',
      '      <div style="color:#555555;">{{job_title}}</div>',
      '      <div style="color:#555555;">{{department}}</div>',
      '      <div style="height:8px;font-size:0;">&nbsp;</div>',
      '      <div><a href="mailto:{{email}}" style="color:' + co + ';text-decoration:none;">{{email}}</a></div>',
      '      <div><a href="tel:{{phone}}" style="color:' + co + ';text-decoration:none;">{{phone}}</a></div>',
      '      <div><a href="tel:{{mobile}}" style="color:' + co + ';text-decoration:none;">{{mobile}}</a></div>',
      '      <div style="height:8px;font-size:0;">&nbsp;</div>',
      '      <div style="font-size:14px;font-weight:bold;color:' + co + ';">{{school_name}}</div>',
      '      <div style="color:#888888;font-size:12px;">{{default_address}}</div>',
      '      <div style="color:#888888;font-size:12px;"><a href="{{website}}" style="color:' + co + ';">{{website}}</a></div>',
      '    </td>',
      '  </tr>',
      '</table>'
    ].join('\n');
  }

  function wrapPreview(html) {
    return '<!doctype html><html><head><meta charset="utf-8">' +
      '<style>body{margin:0;padding:14px;background:#ffffff;font-family:"Segoe UI",Arial,Helvetica,sans-serif;color:#333;}</style>' +
      '</head><body>' + html + '</body></html>';
  }

  function htmlToText(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = String(html || '')
      .replace(/<\/(?:div|tr|p|li|h1|h2|h3|h4|table|tbody)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n');
    var txt = tmp.textContent || tmp.innerText || '';
    return txt
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return {
    KEYS: KEYS,
    TOKEN_RE: TOKEN_RE,
    FIELD_BY_KEY: FIELD_BY_KEY,
    fieldOff: fieldOff,
    renderSignature: renderSignature,
    buildStarter: buildStarter,
    wrapPreview: wrapPreview,
    htmlToText: htmlToText
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SIG;