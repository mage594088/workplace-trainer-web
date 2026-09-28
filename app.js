// 職場小白訓練（靜態版）。題目、答案、解說都在 data.js，由
// workplace-trainer 的 tools/build_static.py 產生；這裡只負責抽題、
// 打亂選項、比對答案，進度存在這台裝置的瀏覽器（localStorage）。
(function () {
  "use strict";

  var D = window.WRK;
  var STORE = "wrk-web-v1";
  var SESSION = 20;        // 單元練習一次幾題
  var EXAM = 40;           // 關卡測驗一次幾題
  var FINAL_EXAM = 100;    // 最終測驗
  var PASS = 0.9;          // 關卡測驗過關線
  var app = document.getElementById("app");

  // --- 進度 ---------------------------------------------------------------

  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* 私密模式或被封鎖：這次不存 */ }
    return { items: {}, exams: {} };
  }
  var state = load();
  state.items = state.items || {};
  state.exams = state.exams || {};

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {}
  }

  function record(item, ok) {
    var s = state.items[item] || { n: 0, ok: 0 };
    s.n += 1;
    if (ok) s.ok += 1;
    s.last = ok;
    s.t = Date.now();
    state.items[item] = s;
    save();
  }

  // --- 題庫 ---------------------------------------------------------------

  var unitTitle = {};
  var levelOf = {};
  D.levels.forEach(function (lvl) {
    lvl.units.forEach(function (u) {
      unitTitle[u.id] = u.title;
      levelOf[u.id] = lvl.id;
    });
  });

  // 一個 item（一題、一個用語、一種計算）可能有好幾個版本。
  function itemsOf(units) {
    var map = {};
    units.forEach(function (u) {
      (D.questions[u] || []).forEach(function (q) {
        (map[q.item] = map[q.item] || []).push(q);
      });
    });
    return map;
  }

  function known(item) {
    var s = state.items[item];
    return !!(s && s.last);
  }

  function unitProgress(unit) {
    var items = Object.keys(itemsOf([unit]));
    var done = items.filter(known).length;
    return { done: done, total: items.length };
  }

  function shuffle(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function sample(list, n) { return shuffle(list).slice(0, n); }

  // 練習：沒做過的、上次答錯的先出，其餘挑最久沒碰的；同分隨機。
  function practicePick(map, n) {
    var scored = Object.keys(map).map(function (item) {
      var s = state.items[item];
      var rank;
      if (!s) rank = 0;
      else if (!s.last) rank = 1;
      else rank = 2 + Math.min(s.ok, 5) / 10 + (s.t || 0) / 1e14;
      return { item: item, rank: rank + Math.random() * 0.05 };
    });
    scored.sort(function (a, b) { return a.rank - b.rank; });
    return shuffle(scored.slice(0, n).map(function (x) { return x.item; }));
  }

  // 把一題變成這次要顯示的樣子：挑版本、挑三個錯的選項、打亂順序。
  function build(map, item) {
    var q = map[item][Math.floor(Math.random() * map[item].length)];
    var out = { item: item, q: q };
    if (q.a !== undefined) {
      out.choices = shuffle([q.a].concat(sample(q.x, 3)));
    }
    return out;
  }

  // --- 畫面 ---------------------------------------------------------------

  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
               "'": "&#39;" }[c];
    });
  }

  function linkify(text) {
    return esc(text).replace(/https:\/\/[^\s<]+/g, function (url) {
      return '<a href="' + url + '" target="_blank" rel="noopener">' +
        url + "</a>";
    });
  }

  function rankName() {
    var name = "職場小白";
    D.levels.forEach(function (lvl) {
      if ((state.exams[lvl.id] || 0) >= PASS) name = lvl.rank;
    });
    return name;
  }

  // 淺色／深色：沒選過就跟系統，按一下換成另一種並記住。
  var themeBtn = document.getElementById("theme");
  function currentTheme() {
    var set = document.documentElement.dataset.theme;
    if (set) return set;
    return matchMedia("(prefers-color-scheme: dark)").matches ?
      "dark" : "light";
  }
  function showTheme() {
    themeBtn.textContent = currentTheme() === "dark" ?
      "☀️ 淺色" : "🌙 深色";
  }
  themeBtn.onclick = function () {
    var next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("wrk-theme", next); } catch (e) {}
    showTheme();
  };
  matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", showTheme);
  showTheme();

  function header() {
    document.getElementById("rank").textContent = "目前：" + rankName();
  }

  function missedItems() {
    var all = {};
    Object.keys(D.questions).forEach(function (u) {
      D.questions[u].forEach(function (q) {
        var s = state.items[q.item];
        if (s && s.last === false) (all[q.item] = all[q.item] || []).push(q);
      });
    });
    return all;
  }

  function home() {
    header();
    var missed = Object.keys(missedItems()).length;
    var html = "<h1>職場小白訓練</h1>" +
      '<div class="card"><p>給剛進台灣科技業的新人（各種職位）：email、' +
      "會議、向上管理、跨部門、勞動法規與現實裡的潛規則、畫大餅與 PUA " +
      "怎麼辨識與自保，還有真實的職場鬼故事。先讀教材再練習；每次從題庫" +
      "隨機抽題，沒做過和答錯的會優先出。</p>" +
      '<p class="muted">共同基礎（第 0～12 關）之後分台廠線與外商線，' +
      "兩線互不影響，最後的總測驗兩線都會考。</p>" +
      '<div class="row">' +
      (missed ? '<a class="btn primary" href="#/review">錯題複習（' +
        missed + " 題）</a>" : "") +
      '<button class="btn small" id="reset">清除進度</button></div></div>';
    var track = "";
    D.levels.forEach(function (lvl) {
      if (lvl.track !== track) {
        track = lvl.track;
        html += "<h2>" + esc(track) + "</h2>";
      }
      html += levelCard(lvl);
    });
    app.innerHTML = html;
    document.getElementById("reset").onclick = function () {
      if (confirm("確定要清除這台裝置上的全部練習紀錄？")) {
        state = { items: {}, exams: {} };
        save();
        home();
      }
    };
  }

  function levelCard(lvl) {
    var done = 0, total = 0, units = "";
    lvl.units.forEach(function (u) {
      var p = unitProgress(u.id);
      done += p.done; total += p.total;
      var pct = p.total ? Math.round(100 * p.done / p.total) : 0;
      units += '<div class="unit"><div class="unit-name">' +
        '<a href="#/unit/' + u.id + '">' + esc(u.id + " " + u.title) +
        "</a>" + '<div class="bar"><span style="width:' + pct +
        '%"></span></div></div>' +
        '<span class="muted" style="font-size:13px">' + p.done + "/" +
        p.total + "</span>" +
        '<a class="btn small" href="#/practice/' + u.id + '">練習</a></div>';
    });
    var best = state.exams[lvl.id];
    var tag = best === undefined ? "" :
      '<span class="tag' + (best >= PASS ? " done" : "") + '">測驗 ' +
      Math.round(best * 100) + "%</span>";
    return '<details class="card level"><summary><span>' +
      '<span class="level-title">第 ' + lvl.id + " 關　" + esc(lvl.title) +
      '</span><br><span class="muted" style="font-size:13px">熟練 ' +
      done + "/" + total + " ・過關稱號：" + esc(lvl.rank) + "</span></span>" +
      tag + "</summary>" + units +
      '<div class="row" style="margin-top:10px">' +
      '<a class="btn" href="#/exam/' + lvl.id + '">' +
      (lvl.id === D.final ? "最終測驗" : "關卡測驗") + "</a></div></details>";
  }

  function unitPage(unit) {
    header();
    var cards = (D.unit_cards[unit] || []).map(function (i) {
      return D.cards[i];
    });
    var stories = cards.map(function (c) {
      return '<div class="story">' + linkify(c.text) +
        (c.source ? '<br><span class="muted">出處：' + linkify(c.source) +
          "</span>" : "") + "</div>";
    }).join("");
    app.innerHTML = '<p><a href="#/">← 回關卡列表</a></p>' +
      "<h1>" + esc(unit + " " + unitTitle[unit]) + "</h1>" +
      '<div class="card lesson">' + D.lessons[unit] + "</div>" +
      (cards.length ? '<details class="card"><summary>本單元的職場故事（' +
        cards.length + " 則）</summary>" + stories + "</details>" : "") +
      '<div class="row"><a class="btn primary" href="#/practice/' + unit +
      '">開始練習</a></div>';
    window.scrollTo(0, 0);
  }

  // --- 作答 ---------------------------------------------------------------

  var run = null;

  function start(kind, title, map, items, back, extra) {
    run = { kind: kind, title: title, map: map, back: back, extra: extra,
            list: items.map(function (i) { return build(map, i); }),
            at: 0, right: 0, missed: [], answered: false };
    show();
  }

  function show() {
    header();
    var cur = run.list[run.at];
    var q = cur.q;
    var body = '<div class="qhead"><span>' + esc(run.title) + "</span><span>" +
      (run.at + 1) + " / " + run.list.length + "</span></div>" +
      '<div class="progress"><span style="width:' +
      Math.round(100 * run.at / run.list.length) + '%"></span></div>' +
      '<div class="card"><div class="question">' + esc(q.text) + "</div>" +
      (q.code ? '<pre class="code">' + esc(q.code) + "</pre>" : "") +
      (q.given ? '<ul class="given">' + q.given.map(function (g) {
        return "<li>" + esc(g) + "</li>"; }).join("") + "</ul>" : "");
    if (cur.choices) {
      body += '<div class="choices">' + cur.choices.map(function (c, i) {
        return '<button class="btn choice" data-i="' + i + '">' +
          '<span class="key">' + (i + 1) + "</span><span>" + esc(c) +
          "</span></button>";
      }).join("") + "</div>";
    } else {
      body += '<form id="numf" class="row"><input class="num" id="num" ' +
        'inputmode="decimal" autocomplete="off" placeholder="輸入數字">' +
        (q.unit ? "<span>" + esc(q.unit) + "</span>" : "") +
        '<button class="btn primary">送出</button></form>';
    }
    body += '<div id="fb"></div></div>' +
      '<div class="row spread"><a href="#/" id="quit">結束練習</a>' +
      '<button class="btn primary" id="next" hidden>下一題（Enter）</button>' +
      "</div>";
    app.innerHTML = body;
    run.answered = false;
    if (cur.choices) {
      app.querySelectorAll(".choice").forEach(function (b) {
        b.onclick = function () { answerChoice(+b.dataset.i); };
      });
    } else {
      var input = document.getElementById("num");
      input.focus();
      document.getElementById("numf").onsubmit = function (e) {
        e.preventDefault();
        answerNumber(input.value);
      };
    }
    document.getElementById("next").onclick = next;
    window.scrollTo(0, 0);
  }

  function answerChoice(i) {
    if (run.answered) return;
    var cur = run.list[run.at];
    var ok = cur.choices[i] === cur.q.a;
    app.querySelectorAll(".choice").forEach(function (b, j) {
      b.disabled = true;
      if (cur.choices[j] === cur.q.a) b.classList.add("right");
      else if (j === i) b.classList.add("wrong");
    });
    finish(ok, cur.q.a);
  }

  function answerNumber(text) {
    if (run.answered) return;
    var cur = run.list[run.at];
    var v = parseFloat(String(text).replace(/[,，%\s]/g, ""));
    if (isNaN(v)) return;
    var ok = Math.abs(v - cur.q.num) < Math.pow(10, -cur.q.dec) + 1e-9;
    document.getElementById("num").disabled = true;
    finish(ok, cur.q.shown);
  }

  function finish(ok, answer) {
    var cur = run.list[run.at];
    run.answered = true;
    if (ok) run.right += 1; else run.missed.push(cur);
    record(cur.item, ok);
    var fb = document.getElementById("fb");
    fb.className = "feedback " + (ok ? "good" : "bad");
    fb.innerHTML = "<strong>" + (ok ? "答對了" : "答錯了，正確答案：" +
      esc(answer)) + "</strong>" + linkify(cur.q.why);
    var btn = document.getElementById("next");
    btn.hidden = false;
    btn.focus();
  }

  function next() {
    run.at += 1;
    if (run.at < run.list.length) show(); else summary();
  }

  function summary() {
    header();
    var total = run.list.length;
    var share = total ? run.right / total : 0;
    var note = "";
    if (run.kind === "exam") {
      var before = state.exams[run.extra] || 0;
      if (share > before) { state.exams[run.extra] = share; save(); }
      note = share >= PASS ? "<p>過關！稱號：" +
        esc(D.levels[run.extra].rank) + "</p>" :
        '<p class="muted">要答對 ' + Math.round(PASS * 100) +
        "% 才算過關，先複習錯的再來。</p>";
    }
    var story = "";
    if (run.kind === "practice") {
      var ids = D.unit_cards[run.extra] || [];
      if (ids.length) {
        var c = D.cards[ids[Math.floor(Math.random() * ids.length)]];
        story = '<div class="story">' + linkify(c.text) +
          (c.source ? '<br><span class="muted">出處：' +
            linkify(c.source) + "</span>" : "") + "</div>";
      }
    }
    var missed = run.missed.map(function (m) {
      var ans = m.q.a !== undefined ? m.q.a : m.q.shown;
      return "<li>" + esc(m.q.text.slice(0, 80)) +
        (m.q.text.length > 80 ? "…" : "") + '<br><span class="muted">' +
        "答案：" + esc(ans) + "</span></li>";
    }).join("");
    app.innerHTML = '<div class="card"><div class="muted">' +
      esc(run.title) + '</div><div class="score">' + run.right + " / " +
      total + "</div>" + note +
      (missed ? "<h3>答錯的題目</h3><ul class=\"missed\">" + missed +
        "</ul>" : "<p>全部答對。</p>") + "</div>" + story +
      '<div class="row"><button class="btn primary" id="again">再練一次' +
      '</button><a class="btn" href="' + run.back + '">回上一頁</a>' +
      '<a class="btn" href="#/">回關卡列表</a></div>';
    document.getElementById("again").onclick = function () { route(true); };
    window.scrollTo(0, 0);
  }

  function practice(unit) {
    var map = itemsOf([unit]);
    start("practice", unit + " " + unitTitle[unit], map,
          practicePick(map, SESSION), "#/unit/" + unit, unit);
  }

  function exam(id) {
    var lvl = D.levels[id];
    var map = itemsOf(lvl.exam);
    var n = id === D.final ? FINAL_EXAM : EXAM;
    start("exam", "第 " + id + " 關測驗：" + lvl.title, map,
          sample(Object.keys(map), n), "#/", id);
  }

  function review() {
    var map = missedItems();
    var items = Object.keys(map);
    if (!items.length) { location.hash = "#/"; return; }
    start("review", "錯題複習", map, sample(items, SESSION), "#/", null);
  }

  // --- 路由 ---------------------------------------------------------------

  function route(force) {
    var parts = (location.hash || "#/").slice(2).split("/");
    var page = parts[0], arg = parts[1];
    if (page === "unit" && D.lessons[arg]) unitPage(arg);
    else if (page === "practice" && D.lessons[arg]) practice(arg);
    else if (page === "exam" && D.levels[+arg]) exam(+arg);
    else if (page === "review") review();
    else home();
  }

  document.addEventListener("keydown", function (e) {
    if (!run || !document.querySelector(".qhead")) return;
    if (e.target.tagName === "INPUT" && !run.answered) return;
    if (!run.answered && /^[1-4]$/.test(e.key)) {
      var b = app.querySelector('.choice[data-i="' + (+e.key - 1) + '"]');
      if (b) b.click();
    } else if (run.answered && e.key === "Enter") {
      e.preventDefault();
      next();
    }
  });

  window.addEventListener("hashchange", function () { run = null; route(); });
  route();
})();
