'use strict';

var SigZip = (function () {

  // Builds a ZIP archive (STORE method, uncompressed) purely in the browser.
  // files: [{ name: "jane.html", content: "<html>..." }, ...]

  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c >>> 0;
    }
    return t;
  })();

  function crc32(data) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function w16(arr, p, v) { arr[p++] = v & 0xff; arr[p++] = (v >>> 8) & 0xff; return p; }
  function w32(arr, p, v) {
    v = v >>> 0;
    arr[p++] = v & 0xff; arr[p++] = (v >>> 8) & 0xff;
    arr[p++] = (v >>> 16) & 0xff; arr[p++] = (v >>> 24) & 0xff;
    return p;
  }

  function makeZip(files) {
    var enc = new TextEncoder();
    var names = [], datas = [], crcs = [], sizes = [], offs = [];
    var i;

    for (i = 0; i < files.length; i++) {
      var nb = enc.encode(files[i].name);
      var db = enc.encode(files[i].content);
      names.push(nb); datas.push(db);
      crcs.push(crc32(db)); sizes.push(db.length);
    }

    var localBytes = 0, centralBytes = 0;
    for (i = 0; i < files.length; i++) {
      localBytes += 30 + names[i].length + sizes[i];
      centralBytes += 46 + names[i].length;
    }
    var buf = new Uint8Array(localBytes + centralBytes + 22);
    var p = 0;

    for (i = 0; i < files.length; i++) {
      offs.push(p);
      buf[p++] = 0x50; buf[p++] = 0x4b; buf[p++] = 0x03; buf[p++] = 0x04;
      p = w16(buf, p, 20);      // version needed
      p = w16(buf, p, 0);       // flags
      p = w16(buf, p, 0);       // method: stored
      p = w16(buf, p, 0);       // mod time
      p = w16(buf, p, 0x21);    // mod date (1980-01-01)
      p = w32(buf, p, crcs[i]);
      p = w32(buf, p, sizes[i]);
      p = w32(buf, p, sizes[i]);
      p = w16(buf, p, names[i].length);
      p = w16(buf, p, 0);       // extra length
      buf.set(names[i], p); p += names[i].length;
      buf.set(datas[i], p); p += sizes[i];
    }

    var centralStart = p;
    for (i = 0; i < files.length; i++) {
      buf[p++] = 0x50; buf[p++] = 0x4b; buf[p++] = 0x01; buf[p++] = 0x02;
      p = w16(buf, p, 20);      // version made by
      p = w16(buf, p, 20);      // version needed
      p = w16(buf, p, 0);       // flags
      p = w16(buf, p, 0);       // method
      p = w16(buf, p, 0);       // mod time
      p = w16(buf, p, 0x21);    // mod date
      p = w32(buf, p, crcs[i]);
      p = w32(buf, p, sizes[i]);
      p = w32(buf, p, sizes[i]);
      p = w16(buf, p, names[i].length);
      p = w16(buf, p, 0);       // extra length
      p = w16(buf, p, 0);       // comment length
      p = w16(buf, p, 0);       // disk number
      p = w16(buf, p, 0);       // internal attrs
      p = w32(buf, p, 0);       // external attrs
      p = w32(buf, p, offs[i]); // local header offset
      buf.set(names[i], p); p += names[i].length;
    }

    var centralEnd = p;
    buf[p++] = 0x50; buf[p++] = 0x4b; buf[p++] = 0x05; buf[p++] = 0x06;
    p = w16(buf, p, 0);       // disk
    p = w16(buf, p, 0);       // central dir disk
    p = w16(buf, p, files.length);
    p = w16(buf, p, files.length);
    p = w32(buf, p, centralEnd - centralStart);
    p = w32(buf, p, centralStart);
    p = w16(buf, p, 0);       // comment length

    return buf;
  }

  function makeZipBlob(files) {
    return new Blob([makeZip(files)], { type: 'application/zip' });
  }

  return { makeZipBlob: makeZipBlob };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SigZip;