'use strict';

var SIG = (function () {

  var TOKEN_RE = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

  var KEYS = [
    'full_name', 'job_title', 'email', 'phone', 'mobile', 'department',
    'website', 'school_name', 'logo_url', 'default_address', 'default_website'
  ];

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

  function keyValue(key, data, state) {
    var d = data || {};
    switch (key) {
      case 'full_name':      return d.full_name || '';
      case 'job_title':      return d.job_title || '';
      case 'email':          return d.email || '';
      case 'phone':          return d.phone || '';
      case 'mobile':         return d.mobile || '';
      case 'department':     return d.department || '';
      case 'website':        return safeUrl(d.website || state.defaultWebsite);
      case 'school_name':    return d.school_name || state.schoolName;
      case 'logo_url':       return safeUrl(d.logo_url || state.logoUrl);
      case 'default_address':return d.default_address || state.defaultAddress;
      case 'default_website':return safeUrl(d.default_website || state.defaultWebsite);
      default:               return '';
    }
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
    // Structural lines (table/tr/td etc.) contain no placeholder and are always kept.
    if (!hasToken) return false;
    // Line has a placeholder with a value, so it stays.
    if (!allEmpty) return false;
    // Placeholder line rendered empty (e.g. <div>{{department}}</div> with no department).
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
      if (collapse !== false && isBlankAfterFill(lines[i], data, state)) continue;
      out.push(substitute(lines[i], data, state));
    }
    return out.join('\n');
  }

  function buildStarter(accent) {
    var co = /^#[0-9a-f]{6}$/i.test(accent || '') ? accent : '#1f4e79';
    return [
      '<table cellpadding="0" cellspacing="0" border="0" style="font-family:\'Segoe UI\',Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#333333;">',
      '  <tr>',
      '    <td valign="middle" style="padding-right:15px;">',
      '      <img src="{{logo_url}}" alt="" style="display:block;max-height:80px;width:auto;" />',
      '    </td>',
      '    <td valign="middle" style="border-left:3px solid ' + co + ';padding-left:15px;">',
      '      <div style="font-size:16px;font-weight:bold;color:' + co + ';">{{full_name}}</div>',
      '      <div style="color:#555555;">{{job_title}}</div>',
      '      <div style="color:#555555;">{{department}}</div>',
      '      <div style="height:8px;font-size:0;">&nbsp;</div>',
      '      <div><a href="mailto:{{email}}" style="color:' + co + ';text-decoration:none;">{{email}}</a></div>',
      '      <div>Phone: {{phone}}</div>',
      '      <div>Mobile: {{mobile}}</div>',
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
    renderSignature: renderSignature,
    buildStarter: buildStarter,
    wrapPreview: wrapPreview,
    htmlToText: htmlToText
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SIG;