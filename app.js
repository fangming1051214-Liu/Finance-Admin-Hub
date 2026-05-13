// ── 全域錯誤捕捉 ──────────────────────────────────────────────────
window.onerror = function(msg, src, line) {
  document.body.insertAdjacentHTML('afterbegin',
    '<div style="position:fixed;top:0;left:0;right:0;background:#e74c3c;color:#fff;padding:10px;z-index:9999;font-size:13px;">⚠️ JS錯誤：'+msg+' (第'+line+'行)</div>');
  return false;
};

// ── 時鐘 ──────────────────────────────────────────────────────────
function updateClock() {
  var now = new Date();
  var wd = ['日','一','二','三','四','五','六'][now.getDay()];
  document.getElementById('headerDate').textContent =
    now.getFullYear()+'/'+(now.getMonth()+1+'').padStart(2,'0')+'/'+((now.getDate()+'').padStart(2,'0'))+' 週'+wd;
  document.getElementById('headerTime').textContent =
    (now.getHours()+'').padStart(2,'0')+':'+(now.getMinutes()+'').padStart(2,'0')+':'+(now.getSeconds()+'').padStart(2,'0');
  document.getElementById('homeSubtitle').textContent =
    now.getFullYear()+' 年 '+(now.getMonth()+1)+' 月 '+now.getDate()+' 日 財務行政作業總覽';
}
setInterval(updateClock, 1000);
updateClock();

// ── 頁面切換 ──────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
  var page = document.getElementById('page-'+id);
  if (page) page.classList.add('active');
  var nav = document.getElementById('nav-'+id);
  if (nav) nav.classList.add('active');
}
function handleHash() {
  var id = (window.location.hash || '#home').replace('#page-','').replace('#','') || 'home';
  showPage(id);
}
window.addEventListener('hashchange', handleHash);
handleHash();

// ── 拖曳上傳 ──────────────────────────────────────────────────────
var selectedFile = null;
var outputData = null;

window.addEventListener('DOMContentLoaded', function() {
  var dz = document.getElementById('dropZone');
  if (!dz) return;
  dz.addEventListener('dragover', function(e) { e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', function() { dz.classList.remove('drag-over'); });
  dz.addEventListener('drop', function(e) {
    e.preventDefault(); dz.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  });
  var fi = document.getElementById('fileInput');
  if (fi) fi.addEventListener('change', function(e) { if (e.target.files[0]) setFile(e.target.files[0]); });
});

function setFile(f) {
  selectedFile = f;
  document.getElementById('fileName').textContent = f.name;
  document.getElementById('fileTag').style.display = 'block';
  document.getElementById('runBtn').disabled = false;
  document.getElementById('resultBox').style.display = 'none';
  document.getElementById('dlBtn').style.display = 'none';
  outputData = null;
}

// ── 工具函式 ──────────────────────────────────────────────────────
function clean(s) { return s == null ? '' : String(s).replace(/[\s　]/g,''); }

function rocToWest(roc) {
  try {
    var s = String(Math.round(Number(roc)));
    if (s.length === 7) {
      return (parseInt(s.slice(0,3)) + 1911) + '/' + s.slice(3,5) + '/' + s.slice(5,7);
    }
  } catch(e) {}
  return null;
}

function westToRocYm(w) {
  try {
    var p = String(w).split('/');
    return (parseInt(p[0]) - 1911) + '/' + (parseInt(p[1])+'').padStart(2,'0');
  } catch(e) { return ''; }
}

function getSegs(name) {
  var n = clean(name);
  var paren = [];
  var pm = n.matchAll(/[（(]([^）)]+)[）)]?/g);
  for (var m of pm) paren.push(m[1].replace(/[?？]/g,''));
  var main = n.replace(/[（(].*/,'').replace(/[?？]/g,'');
  var segs = [];
  var parts = main.split(/[-—]/).concat(paren);
  for (var i = 0; i < parts.length; i++) {
    var t = parts[i].replace(/[?？]/g,'').trim();
    if (t.length >= 2) segs.push(t);
  }
  return segs;
}

function nameMatch(a, b) {
  a = clean(a); b = clean(b);
  if (!a || !b) return false;
  var aq = a.replace(/[?？]/g,'');
  if (b.includes(aq) || aq.includes(b)) return true;
  if (Math.min(aq.length, b.length) >= 4 && aq.slice(0,4) === b.slice(0,4)) return true;
  if (/[?？]/.test(a)) {
    var pts = a.split(/[?？]/);
    if (pts[0].length >= 3 && b.includes(pts[0])) return true;
    if (pts[pts.length-1].length >= 2 && b.includes(pts[pts.length-1])) return true;
  }
  var segsA = getSegs(a);
  for (var i = 0; i < segsA.length; i++) if (segsA[i].length >= 2 && b.includes(segsA[i])) return true;
  var segsB = getSegs(b);
  for (var i = 0; i < segsB.length; i++) if (segsB[i].length >= 2 && a.includes(segsB[i])) return true;
  return false;
}

function* comb(arr, k) {
  if (k === 1) { for (var x of arr) yield [x]; return; }
  for (var i = 0; i <= arr.length - k; i++)
    for (var r of comb(arr.slice(i+1), k-1)) yield [arr[i], ...r];
}

function tryMatch(rows, target) {
  if (!rows.length) return null;
  for (var fee of [0, 15]) {
    var t = rows.reduce(function(s,r){ return s + (isNaN(r.amt) ? 0 : Number(r.amt)); }, 0);
    if (Math.abs(t + fee - target) < 0.01) return [rows, fee];
  }
  if (rows.length <= 25) {
    for (var k = 1; k < rows.length; k++) {
      for (var c of comb(rows, k)) {
        var s = c.reduce(function(acc,r){ return acc + (isNaN(r.amt) ? 0 : Number(r.amt)); }, 0);
        for (var fee of [0, 15]) if (Math.abs(s + fee - target) < 0.01) return [c, fee];
      }
    }
  }
  return null;
}

function buildRes(rows, fee) {
  var inv = [], po = [], conds = new Set(), yms = [];
  for (var r of rows) {
    for (var n of String(r.inv||'').split(',')) {
      var t = n.trim(); if (t && t !== 'undefined' && !inv.includes(t)) inv.push(t);
    }
  }
  for (var r of rows) {
    for (var n of String(r.po||'').split(/[,，]/)) {
      var t = n.trim(); if (t && t !== 'undefined' && !po.includes(t)) po.push(t);
    }
  }
  for (var r of rows) if (r.cond && r.cond !== 'undefined') conds.add(clean(r.cond));
  for (var r of rows) {
    var ym = westToRocYm(r.opDate); if (ym && !yms.includes(ym)) yms.push(ym);
  }
  return {
    inv: inv.join('、'), po: po.join('、'), conds: [...conds].join('、'),
    ym: yms.join('、'), fee: fee > 0 ? fee : '',
    total: rows.reduce(function(s,r){ return s + (isNaN(r.amt) ? 0 : Number(r.amt)); }, 0)
  };
}

function addDays(w, d) {
  var parts = w.split('/').map(Number);
  var dt = new Date(parts[0], parts[1]-1, parts[2]+d);
  return dt.getFullYear() + '/' + (dt.getMonth()+1+'').padStart(2,'0') + '/' + (dt.getDate()+'').padStart(2,'0');
}

function dateToWest(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    var d = dateInput;
    if (isNaN(d.getTime())) return null;
    return d.getFullYear() + '/' + (d.getMonth()+1+'').padStart(2,'0') + '/' + (d.getDate()+'').padStart(2,'0');
  }
  return rocToWest(dateInput);
}

function findMatch(vendor, dateRoc, amount, grp) {
  if (!amount || !dateRoc) return null;
  var west = dateToWest(dateRoc);
  if (!west) return null;
  for (var entry of grp) {
    var hn = entry[0][0], hd = entry[0][1], rows = entry[1];
    if (hd === west && nameMatch(vendor, hn)) {
      var r = tryMatch(rows, amount); if (r) return buildRes(r[0], r[1]);
    }
  }
  for (var delta of [1, -1, 2, -2]) {
    var alt = addDays(west, delta);
    for (var entry of grp) {
      var hn = entry[0][0], hd = entry[0][1], rows = entry[1];
      if (hd === alt && nameMatch(vendor, hn)) {
        var r = tryMatch(rows, amount); if (r) return buildRes(r[0], r[1]);
      }
    }
  }
  var month = west.slice(0, 7), cands = [];
  for (var entry of grp) {
    var hn = entry[0][0], hd = entry[0][1], rows = entry[1];
    if (hd.startsWith(month) && nameMatch(vendor, hn)) cands.push(...rows);
  }
  if (cands.length) { var r = tryMatch(cands, amount); if (r) return buildRes(r[0], r[1]); }
  return null;
}

function setP(pct, lbl) {
  document.getElementById('progFill').style.width = pct + '%';
  document.getElementById('progLabel').textContent = lbl;
}

function sleep(ms) { return new Promise(function(r){ setTimeout(r, ms); }); }

// ── 主比對流程 ────────────────────────────────────────────────────
async function runReconcile() {
  document.getElementById('runBtn').disabled = true;
  document.getElementById('progWrap').style.display = 'block';
  document.getElementById('resultBox').style.display = 'none';
  outputData = null;
  try {
    setP(10, '讀取 Excel 檔案...'); await sleep(50);
    var ab = await selectedFile.arrayBuffer();
    var wb = XLSX.read(ab, {type:'array', cellDates:true});
    var sn = wb.SheetNames;
    var chbSN = sn.find(function(s){ return s.toUpperCase().includes('CHB'); }) || sn[0];
    var htSN  = sn.find(function(s){ return s.includes('後台'); }) || sn[1];
    setP(20, '解析工作表...'); await sleep(50);
    var chbData = XLSX.utils.sheet_to_json(wb.Sheets[chbSN], {header:1, defval:null});
    var htRaw   = XLSX.utils.sheet_to_json(wb.Sheets[htSN],  {header:1, defval:null});
    var htCols  = htRaw[0];
    var htRows  = htRaw.slice(1).map(function(row) {
      var o = {};
      htCols.forEach(function(c, i){ o[c] = row[i]; });
      for (var df of ['付款日期','開立日期']) {
        if (o[df] instanceof Date) {
          var d = o[df];
          o[df] = d.getFullYear() + '/' + (d.getMonth()+1+'').padStart(2,'0') + '/' + (d.getDate()+'').padStart(2,'0');
        }
      }
      return {
        inv: o['發票號碼'], po: o['採購單序號'], cond: o['付款條件'],
        opDate: String(o['開立日期']||'').trim(),
        amt: parseFloat(o['發票金額']) || 0,
        hc: clean(o['發票抬頭']),
        hd: String(o['付款日期']||'').trim().replace(/-/g,'/')
      };
    });
    var grpMap = new Map();
    for (var r of htRows) {
      var k = JSON.stringify([r.hc, r.hd]);
      if (!grpMap.has(k)) grpMap.set(k, []);
      grpMap.get(k).push(r);
    }
    var grp = [...grpMap.entries()].map(function(e){ return [JSON.parse(e[0]), e[1]]; });

    // ── 自動偵測 CHB 欄位 ──────────────────────────────────────────
    var headerRowIdx = 1, cAmt = 5, cDate = 1, cVendor = 2, cD = 3, cE = 4, cH = 7, cI = 8;
    for (var i = 0; i < Math.min(6, chbData.length); i++) {
      var row = chbData[i]; if (!row) continue;
      var joined = row.map(function(c){ return String(c||''); }).join('');
      if (joined.includes('支出') || joined.includes('借方') || (joined.includes('日期') && joined.includes('金額'))) {
        headerRowIdx = i;
        row.forEach(function(cell, idx) {
          var c = String(cell||'');
          if (c.includes('支出') || c.includes('借方')) cAmt = idx;
          if ((c.includes('日期') || c.includes('起息')) && idx > 0 && cDate === 1) cDate = idx;
          if (c.includes('廠商') || c.includes('說明') || c.includes('摘要') || c.includes('備註')) cVendor = idx;
          if (c.includes('採購單')) cD = idx;
          if (c.includes('憑證號碼') || c.includes('發票號')) cE = idx;
          if (c.includes('手續費') || c.includes('匯費')) cH = idx;
          if (c.includes('憑證日期')) cI = idx;
        });
        break;
      }
    }
    var dataStart = headerRowIdx + 1;

    // ── 用資料內容自動找日期欄（民國7位數字 或 Date物件）──
    var cDateFromData = -1;
    for (var i = 0; i < Math.min(30, chbData.length - dataStart); i++) {
      var row = chbData[dataStart + i]; if (!row) continue;
      for (var j = 0; j < row.length; j++) {
        var v = row[j];
        if (v != null && !(v instanceof Date)) {
          var s = String(v).trim().replace(/,/g,'');
          if (/^\d{7}$/.test(s)) { var n = parseInt(s); if (n >= 1000101 && n <= 1200101) { cDateFromData = j; break; } }
        }
        if (v instanceof Date && !isNaN(v.getTime()) && v.getFullYear() >= 2000 && v.getFullYear() <= 2100) {
          cDateFromData = j; break;
        }
      }
      if (cDateFromData !== -1) break;
    }
    if (cDateFromData !== -1) cDate = cDateFromData;

    // ── 用資料內容自動找廠商欄 ──
    var cVendorFromData = -1;
    for (var i = 0; i < Math.min(30, chbData.length - dataStart); i++) {
      var row = chbData[dataStart + i]; if (!row) continue;
      var rawAmt2 = row[cAmt];
      var amt2 = parseFloat(String(rawAmt2||'').replace(/,/g,''));
      if (isNaN(amt2) || amt2 <= 0) continue;
      for (var j = 0; j < row.length; j++) {
        var v = String(row[j]||'').trim();
        if (v.length >= 2 && /[一-鿿]/.test(v) && !/^\d+$/.test(v) && j !== cDate) { cVendorFromData = j; break; }
      }
      if (cVendorFromData !== -1) break;
    }
    if (cVendorFromData !== -1) cVendor = cVendorFromData;

    setP(50, '比對中...'); await sleep(50);
    var chbRows = chbData.slice(dataStart);
    var results = [], matched = 0, expense = 0;
    for (var i = 0; i < chbRows.length; i++) {
      var row = chbRows[i]; if (!row) { results.push(null); continue; }
      var rawAmt = row[cAmt];
      var amount = parseFloat(String(rawAmt||'').replace(/,/g,'').replace(/－/g,'-'));
      var absAmt = Math.abs(amount);
      if (!isNaN(amount) && absAmt > 0) {
        expense++;
        var res = findMatch(row[cVendor], row[cDate], absAmt, grp);
        results.push(res);
        if (res) matched++;
      } else {
        results.push(null);
      }
      if (i % 20 === 0) { setP(50 + Math.round(40 * i / chbRows.length), '比對中... ' + (i+1) + '/' + chbRows.length); await sleep(0); }
    }

    setP(92, '寫入結果...'); await sleep(50);
    var outData = chbData.map(function(r){ return [...(r||[])]; });
    var maxCol = Math.max(cD, cE, cH, cI, 9) + 2;
    while ((outData[headerRowIdx]||[]).length < maxCol) (outData[headerRowIdx] = outData[headerRowIdx] || []).push(null);
    var cCond = Math.max(cI, 9) + 1, cTotal = Math.max(cI, 9) + 2;
    outData[headerRowIdx][cCond] = '付款條件';
    outData[headerRowIdx][cTotal] = '發票加總金額';
    for (var i = 0; i < chbRows.length; i++) {
      var res = results[i], ri = i + dataStart;
      if (!outData[ri]) outData[ri] = [];
      while (outData[ri].length <= cTotal) outData[ri].push(null);
      if (res) {
        if (res.po)    outData[ri][cD] = res.po;
        if (res.inv)   outData[ri][cE] = res.inv;
        if (res.fee)   outData[ri][cH] = -Math.abs(res.fee);
        if (res.ym)    outData[ri][cI] = res.ym;
        if (res.conds) outData[ri][cCond] = res.conds;
        outData[ri][cTotal] = res.total;
      }
    }
    var newWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWb, XLSX.utils.aoa_to_sheet(outData), chbSN);
    XLSX.utils.book_append_sheet(newWb, wb.Sheets[htSN], htSN);
    outputData = XLSX.write(newWb, {bookType:'xlsx', type:'array'});
    setP(100, '完成！'); await sleep(200);

    document.getElementById('progWrap').style.display = 'none';
    var rb = document.getElementById('resultBox'); rb.className = 'result-box ok'; rb.style.display = 'block';
    document.getElementById('resultTitle').textContent = '✅ 比對完成！';
    var diagSamples = chbRows.slice(0, 5).map(function(r, i){
      return r ? '第'+(i+1)+'筆:「'+String(r[cAmt]||'空')+'」' : '';
    }).filter(Boolean).join('　');
    var matchedRows = chbRows.slice(0, 5).filter(function(r){ return r && r[cAmt] && parseFloat(String(r[cAmt]).replace(/,/g,'')) > 0; }).slice(0, 3);
    document.getElementById('resultStats').innerHTML =
      '<div class="rs"><div class="rs-num" style="color:var(--accent)">'+expense+'</div><div class="rs-lbl">總支出</div></div>' +
      '<div class="rs"><div class="rs-num" style="color:var(--accent2)">'+matched+'</div><div class="rs-lbl">成功比對</div></div>' +
      '<div class="rs"><div class="rs-num" style="color:var(--accent3)">'+(expense-matched)+'</div><div class="rs-lbl">留空</div></div>' +
      '<div style="width:100%;margin-top:10px;padding:8px 10px;background:var(--panel2);border-radius:8px;font-size:11px;color:var(--muted);">' +
        '📋 偵測：標題第'+(headerRowIdx+1)+'列 ｜ 支出第'+(cAmt+1)+'欄 ｜ 日期第'+(cDate+1)+'欄 ｜ 廠商第'+(cVendor+1)+'欄<br>' +
        '🔍 支出欄前5筆：'+diagSamples+'<br>' +
        '📅 日期欄前3筆：'+matchedRows.map(function(r){ return '「'+String(r[cDate]||'空')+'」'; }).join(' ')+'<br>' +
        '🏪 廠商欄前3筆：'+matchedRows.map(function(r){ return '「'+String(r[cVendor]||'空')+'」'; }).join(' ') +
      '</div>';
    document.getElementById('dlBtn').style.display = 'block';

    var now = new Date();
    document.getElementById('lastRun').textContent = (now.getMonth()+1) + '/' + now.getDate();
    document.getElementById('lastRunDetail').textContent = (now.getHours()+'').padStart(2,'0') + ':' + (now.getMinutes()+'').padStart(2,'0') + ' 對帳完成';
    document.getElementById('lastMatched').textContent = matched;
    document.getElementById('lastUnmatched').textContent = expense - matched;
    addActivity('blue', 'CHB 對帳完成：' + matched + '/' + expense + ' 筆');

  } catch(err) {
    document.getElementById('progWrap').style.display = 'none';
    var rb = document.getElementById('resultBox'); rb.className = 'result-box err'; rb.style.display = 'block';
    document.getElementById('resultTitle').textContent = '❌ 錯誤：' + err.message;
    document.getElementById('resultStats').innerHTML = '';
    console.error(err);
  }
  document.getElementById('runBtn').disabled = false;
}

function downloadResult() {
  if (!outputData) return;
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([outputData], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.download = 'CHB_比對完成.xlsx';
  a.click();
}

function addActivity(color, text) {
  var list = document.getElementById('activityList');
  var now = new Date();
  var time = (now.getHours()+'').padStart(2,'0') + ':' + (now.getMinutes()+'').padStart(2,'0');
  var item = document.createElement('div'); item.className = 'activity-item';
  item.innerHTML = '<span class="activity-dot '+color+'"></span><span>'+text+'</span><span class="activity-time">'+time+'</span>';
  if (list.children[0] && list.children[0].style.justifyContent === 'center') list.innerHTML = '';
  list.insertBefore(item, list.firstChild);
}
