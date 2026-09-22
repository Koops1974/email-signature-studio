'use strict';

var SigCSV = (function () {

  // Maps normalised header names (lowercase, no spaces/punctuation) to fields.
  var HEADER_MAP = {
    name: 'full_name', fullname: 'full_name', full_name: 'full_name',
    jobtitle: 'job_title', title: 'job_title',
    role: 'job_title', position: 'job_title',
    email: 'email', emailaddress: 'email',
    phone: 'phone', telephone: 'phone', landline: 'phone', tel: 'phone',
    mobile: 'mobile', cell: 'mobile', cellphone: 'mobile',
    department: 'department', dept: 'department', team: 'department',
    website: 'website', web: 'website', site: 'website',
    school: 'school_name', schoolname: 'school_name', organisation: 'school_name', organisationname: 'school_name',
    address: 'default_address', address1: 'default_address'
  };

  function normaliseHeader(h) {
    return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Parser handles quoted fields, embedded commas, and escaped quotes.
  function parseCSV(text) {
    var str = String(text || '').replace(/^\uFEFF/, '');
    var rows = [];
    var row = [], field = '', inQ = false;

    function pushField() { row.push(field); field = ''; }
    function pushRow() { pushField(); rows.push(row); row = []; }

    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (inQ) {
        if (ch === '"') {
          if (str[i + 1] === '"') { field += '"'; i++; }
          else { inQ = false; }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQ = true;
      } else if (ch === ',') {
        pushField();
      } else if (ch === '\n') {
        pushRow();
      } else if (ch !== '\r') {
        field += ch;
      }
    }
    if (field !== '' || row.length) pushRow();
    // Drop a trailing empty row if one was left.
    if (rows.length) {
      var last = rows[rows.length - 1];
      if (last.length === 1 && last[0].trim() === '') rows.pop();
    }
    return rows;
  }

  // Parse CSV text into an array of objects keyed by internal field names.
  // The first row must contain headers. Rows are objects like
  // { full_name, job_title, email, ... } with only the fields it has values for.
  function toRecords(text) {
    var rows = parseCSV(text);
    if (rows.length === 0) return [];
    var headers = rows[0].map(normaliseHeader).map(function (h) { return HEADER_MAP[h] || null; });
    var records = [];
    for (var r = 1; r < rows.length; r++) {
      var rec = {};
      var line = rows[r];
      for (var c = 0; c < headers.length; c++) {
        var key = headers[c];
        if (!key) continue;
        var val = (line[c] || '').trim();
        if (val !== '') rec[key] = val;
      }
      records.push(rec);
    }
    return records;
  }

  var COLUMNS = ['name', 'job title', 'email', 'phone', 'mobile', 'department', 'website'];

  function templateCSV() {
    var example = ['Jane Smith', 'Year 5 Teacher', 'jane.smith@example.sch.uk', '01223 456 789', '07700 900 123', 'Learning & Teaching', 'www.example.sch.uk'];
    var esc = function (v) {
      v = String(v == null ? '' : v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    return COLUMNS.map(esc).join(',') + '\r\n' + example.map(esc).join(',') + '\r\n';
  }

  return {
    toRecords: toRecords,
    parseCSV: parseCSV,
    templateCSV: templateCSV,
    COLUMNS: COLUMNS
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SigCSV;