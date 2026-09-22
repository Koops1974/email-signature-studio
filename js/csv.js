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

  var CSV_COLUMNS = [
    { key: 'full_name', label: 'name' },
    { key: 'job_title', label: 'job title' },
    { key: 'email', label: 'email' },
    { key: 'phone', label: 'phone' },
    { key: 'mobile', label: 'mobile' },
    { key: 'department', label: 'department' },
    { key: 'website', label: 'website' }
  ];

  // Parse CSV text into an array of objects keyed by internal field names.
  // The first row must contain headers. Rows are objects like
  // { full_name, job_title, email, ... } with only the fields it has values for.
  // When enabledKeys (an array of internal keys) is supplied, any column whose
  // key is not in the list is ignored, so disabled Signature Fields are never
  // imported.
  function toRecords(text, enabledKeys) {
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
        if (enabledKeys && enabledKeys.indexOf(key) === -1) continue;
        var val = (line[c] || '').trim();
        if (val !== '') rec[key] = val;
      }
      records.push(rec);
    }
    return records;
  }

  var EXAMPLE = {
    full_name: 'Jane Smith',
    job_title: 'Year 5 Teacher',
    email: 'jane.smith@example.sch.uk',
    phone: '01223 456 789',
    mobile: '07700 900 123',
    department: 'Learning & Teaching',
    website: 'www.example.sch.uk'
  };

  // A CSV template that only contains the enabled staff fields.
  function templateCSV(enabledKeys) {
    var cols = CSV_COLUMNS.filter(function (c) {
      return !enabledKeys || enabledKeys.indexOf(c.key) !== -1;
    });
    if (cols.length === 0) cols = [CSV_COLUMNS[0]];
    var esc = function (v) {
      v = String(v == null ? '' : v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    return cols.map(function (c) { return esc(c.label); }).join(',') + '\r\n' +
      cols.map(function (c) { return esc(EXAMPLE[c.key]); }).join(',') + '\r\n';
  }

  return {
    toRecords: toRecords,
    parseCSV: parseCSV,
    templateCSV: templateCSV,
    COLUMNS: COLUMNS,
    CSV_COLUMNS: CSV_COLUMNS
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SigCSV;