/* GCEP 行事曆 Phase 1 Demo — 主程式
 *
 * 三種視圖都用 FullCalendar（前端專案同一套），設定集中在 fcOptions()。
 * 規則來源：Figma Phase 1 頁 #A／#B01 的稿旁筆記、SRS 1.4／1.5／3.11／7.4。
 */
(function () {
  const $ = id => document.getElementById(id);
  const pad = n => String(n).padStart(2, '0');
  const { EVENTS, TODAY, ME, nextSun } = window.DEMO_DATA;
  const { SCREENS, PARTS, FC_PARTS, link } = window.SPEC;

  const FC_VIEW = { month: 'dayGridMonth', week: 'timeGridWeek', day: 'timeGridDay' };
  const VIEW_LABEL = { month: '月', week: '週', day: '天' };
  const WD = ['日', '一', '二', '三', '四', '五', '六'];

  const sod = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const today = () => sod(new Date());
  const hm = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
  const ymd = d => d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate());
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const ym = d => d.getFullYear() + '/' + pad(d.getMonth() + 1);

  /* ════════════ 記憶（SRS 1.5） ════════════
   * 檢視模式 → 同一次登入期間（前端 store，登出清掉）       Demo 用 sessionStorage 模擬
   * 篩選勾選 → 永久、跨登入、跨裝置（後端使用者設定）         Demo 用 localStorage 模擬「後端」
   * 目前日期 → 不記憶，每次進入回到今天
   */
  const store = {
    getView() { try { return sessionStorage.getItem('gcep-p1-view') || 'month'; } catch (e) { return 'month'; } },
    setView(v) { try { sessionStorage.setItem('gcep-p1-view', v); } catch (e) {} },
    clearSession() { try { sessionStorage.removeItem('gcep-p1-view'); } catch (e) {} },
    getFilter() { try { return localStorage.getItem('gcep-p1-filter') !== '0'; } catch (e) { return true; } },
    setFilter(on) { try { localStorage.setItem('gcep-p1-filter', on ? '1' : '0'); } catch (e) {} },
  };

  const state = {
    view: store.getView(),
    base: today(),          // 基準日
    filterOn: store.getFilter(),
    dpMonth: null,          // Date Picker 正在看的月份（只影響 Date Picker）
    left: false,            // Demo：是否已切到其他模組
    pin: null,              // Demo：?s= 指定的稿號
    formCode: null,         // #C 的視窗開著時，稿號由 forms.js 指定
    spec: false,            // Demo：規格模式
  };
  let cal = null;
  const logs = [];

  /* ════════════ 左側導覽列 ════════════ */
  function renderNav() {
    const I = window.ICONS;
    const top = [
      ['wall', I.navWall, '動態牆'], ['ann', I.navAnn, '公告'], ['superhub', I.navSuperhub, '直播'],
      ['safesay', I.navSafeSay, 'SafeSay'], ['app', I.navAppCenter, '應用中心'],
      ['calendar', state.left ? I.navCalendar : I.navCalendarActive, '行事曆'],
      ['ext', I.navExtension, '擴充'],
    ];
    const bottom = [['notify', I.navNotify, '通知'], ['settings', I.navSettings, '設定']];
    const ic = ([k, svg, name]) => `<div class="nav-ic ${k}" data-mod="${k}" title="${name}">${svg}</div>`;
    $('nav').innerHTML =
      '<div class="user-area"></div>' +
      `<div class="avatar">${I.avatar}</div><div class="online"></div>` +
      `<div class="qr">${I.qr}</div>` +
      `<div class="nav-list">${top.map(ic).join('')}</div>` +
      `<div class="nav-list bottom">${bottom.map(ic).join('')}</div>`;
  }
  $('nav').addEventListener('click', e => {
    const el = e.target.closest('.nav-ic');
    if (!el) return;
    unpin();
    if (el.dataset.mod === 'calendar') { if (state.left) returnToCalendar('從其他模組回到行事曆'); }
    else if (!state.left) leaveCalendar(el.title);
  });

  /* ════════════ 工具列 ════════════ */
  function renderStaticIcons() {
    const I = window.ICONS;
    $('btnPrev').innerHTML = I.angleL;
    $('btnNext').innerHTML = I.angleR;
    $('btnFilter').innerHTML = I.sliders;
    $('viewCaret').innerHTML = I.caret;
    $('popClose').innerHTML = I.cross;
    $('dpPrev').innerHTML = I.dpAngle;
    $('dpNext').innerHTML = I.dpAngle;
    $('wcMin').innerHTML = I.wcMin;
    $('wcMax').innerHTML = I.wcMax;
    $('wcClose').innerHTML = I.wcClose;
    $('fmName').textContent = ME;
  }

  /* 日期顯示規則（#A02 筆記） */
  function titleText() {
    if (!cal) return '';
    const v = cal.view;
    if (state.view === 'week') {
      const s = v.currentStart, e = addDays(v.currentEnd, -1);
      return s.getMonth() === e.getMonth() ? ym(s) : ym(s) + ' – ' + ym(e);
    }
    return ym(state.base);
  }

  function syncToolbar() {
    $('btnDate').textContent = titleText();
    $('viewLabel').textContent = VIEW_LABEL[state.view];
    [...$('viewMenu').children].forEach(b => b.classList.toggle('is-on', b.dataset.v === state.view));
    $('fmCheck').innerHTML = state.filterOn ? window.ICONS.checkOn : window.ICONS.checkOff;
    // 篩選清單的項目：標題被截斷時才顯示 Tooltip（SRS 2.5／3.13）
    const nm = $('fmName');
    nm.title = nm.scrollWidth > nm.clientWidth ? nm.textContent : '';
  }

  /* ════════════ FullCalendar ════════════ */
  /* 卡片樣式只看「這個使用者的回覆狀態」，不判斷是誰建立的。
     建立者預設看到 Filled，是因為他的回覆狀態預設就是「參加」。 */
  function styleOf(e) {
    if (e.rsvp === 'yes') return 'ev-fill';       // 參加
    if (e.rsvp === 'no') return 'ev-strike';      // 否 → 線框＋刪除線
    return 'ev-outline';                          // 不確定／還沒回覆
  }
  const fcEvents = () => state.filterOn ? EVENTS.map(e => ({
    id: e.id, title: e.title || '無標題', start: e.start, end: e.end, allDay: e.allDay,
    classNames: [styleOf(e)], extendedProps: { raw: e },
  })) : [];

  function eventContent(arg) {
    const ev = arg.event;
    const inSlot = arg.view.type !== 'dayGridMonth' && !ev.allDay;
    const el = document.createElement('div');
    if (inSlot) {
      // 時段卡片：第一行起訖時間、第二行標題（#A03／#A13）
      el.innerHTML = `<span class="ev-line ev-time"></span><span class="ev-line ev-title"></span>`;
      el.firstChild.textContent = hm(ev.start) + ' – ' + hm(ev.end || ev.start);
      el.lastChild.textContent = ev.title;
      el.firstChild.style.whiteSpace = 'nowrap';
      return { domNodes: [el] };
    }
    // 月視圖／全天列：全天只顯示標題；有時間的顯示開始時間（跨週的後段不再顯示時間）
    el.className = 'ev-text';
    el.textContent = (!ev.allDay && arg.isStart ? hm(ev.start) + ' ' : '') + ev.title;
    return { domNodes: [el] };
  }

  function dayHeader(arg) {
    if (arg.view.type === 'dayGridMonth') return WD[arg.date.getDay()];
    const el = document.createElement('div');
    el.className = 'wk-head';
    el.innerHTML = `<span class="wd">${WD[arg.date.getDay()]}</span><span class="dn">${arg.date.getDate()}</span>`;
    return { domNodes: [el] };
  }

  function fcOptions() {
    return {
      initialView: FC_VIEW[state.view],
      initialDate: state.base,
      locale: 'zh-tw',
      headerToolbar: false,
      height: '100%',                 // 外層 .cal-area 用 flex:1 + min-height:0 給出明確高度
      fixedWeekCount: true,           // 月視圖固定 6 列
      showNonCurrentDates: true,      // 非當月日期照樣顯示、可互動
      dayHeaderContent: dayHeader,
      dayCellContent: arg => arg.view.type === 'dayGridMonth' ? String(arg.date.getDate()) : '',   // 全天列不顯示日期
      eventContent,
      eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
      nextDayThreshold: '00:00:00',
      editable: false,
      selectable: false,
      nowIndicator: false,

      /* 「還有 N 個」／「+N」：文字用 CSS 依位置決定，點擊改用自己的清單視窗 */
      moreLinkContent: arg => ({ html: `<span class="ml" data-n="${arg.num}"></span>` }),
      moreLinkClick: info => {
        const link = info.jsEvent.target.closest('.fc-more-link');
        openPop(sod(info.date), link);
        return true;                  // 回傳非字串的值 → FullCalendar 不開內建彈窗、也不跳視圖
      },

      views: {
        dayGridMonth: {
          dayMaxEvents: 2,            // 每格最多 2 筆，超過顯示「還有 N 個」
          eventDisplay: 'block',      // 單日有時間的行程也畫成卡片（預設是圓點）
          displayEventEnd: false,     // 月視圖只顯示開始時間
          expandRows: false,          // 格子固定 100px，不跟著畫面拉伸；放不下時捲動
        },
        timeGrid: {
          /* ── 捲動（工程師 09-17 詢問的部分） ── */
          slotMinTime: '00:00:00',
          slotMaxTime: '24:00:00',
          slotDuration: '01:00:00',   // ⚠️ 預設 00:30，改成一小時一格
          slotLabelInterval: '01:00',
          slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
          scrollTime: '06:00:00',     // 進畫面捲到 06:00
          scrollTimeReset: true,      // 預設值：日期範圍改變時捲回 scrollTime
          expandRows: true,           // 畫面夠高時列高平均放大
          /* ── 全天列 ── */
          allDaySlot: true,
          allDayContent: '全天',
          dayMaxEvents: 2,            // 全天列最多 2 筆＋「還有 N 個」
          /* ── 時段 ── */
          slotEventOverlap: true,
          displayEventEnd: true,
          eventMinHeight: 20,
        },
        timeGridWeek: { eventMaxStack: 5 },
        timeGridDay: { eventMaxStack: 12 },
      },

      events: fcEvents(),

      datesSet: () => { closePop(); syncToolbar(); requestAnimationFrame(afterRender); },
      viewDidMount: () => requestAnimationFrame(afterRender),
      windowResize: () => requestAnimationFrame(afterRender),

      eventDidMount: info => { info.el.dataset.id = info.event.id; },

      dateClick: info => {
        if (info.jsEvent.target.closest('.fc-event, .fc-more-link')) return;
        unpin();
        const d = info.date;
        if (info.view.type === 'dayGridMonth') {
          log(`點空白格 → 建立活動，帶入日期 <span class="val">${ymd(d)}</span>（時間依 #C03 預設規則）`);
          Forms.openCreate(d);
        } else if (info.allDay) {
          log(`點全天列 → 建立活動，帶入 <span class="val">${ymd(d)}</span>，預設勾選「全天」`);
          Forms.openCreate(d, { allDay: true });
        } else {
          const e = new Date(d.getTime() + 3600e3);
          log(`點時間格 → 建立活動，帶入 <span class="val">${ymd(d)} ${hm(d)}–${hm(e)}</span>（不套用 30 分鐘進位）`);
          Forms.openCreate(d, { hour: d.getHours() });
        }
        flash(info.dayEl);
      },
      eventClick: info => {
        info.jsEvent.preventDefault();
        unpin();
        Forms.openInfo(info.event.extendedProps.raw, info.el);
        flash(info.el);
      },
    };
  }

  function buildCalendar() {
    if (cal) cal.destroy();
    cal = new FullCalendar.Calendar($('cal'), fcOptions());
    cal.render();
    syncToolbar();
  }

  function refetch() {
    cal.removeAllEventSources();
    cal.addEventSource(fcEvents());
  }

  /* 每次畫完：補外框、判斷稿號 */
  function afterRender() {
    drawFrame();
    detectNarrow();
    syncSpec();
  }

  /* 外框：時間軸在框外，所以圓角框另外畫。四個角用主背景色蓋掉表格的直角 */
  function drawFrame() {
    const f = $('tgFrame');
    const sg = $('cal').querySelector('.fc-scrollgrid');
    if (!sg || state.left) { f.hidden = true; return; }
    const area = $('calArea').getBoundingClientRect();
    const r = sg.getBoundingClientRect();
    const axis = state.view === 'month' ? 0 : ($('cal').querySelector('.fc-col-header .fc-timegrid-axis') || { offsetWidth: 0 }).offsetWidth;
    Object.assign(f.style, {
      left: (r.left - area.left + axis) + 'px', top: (r.top - area.top) + 'px',
      width: (r.width - axis) + 'px', height: r.height + 'px',
    });
    const main = $('main').getBoundingClientRect();
    const col = y => {                       // $bg-gradient：#fefeff → #eceff6（由上到下）
      const t = Math.min(1, Math.max(0, (y - main.top) / main.height));
      const mix = (a, b) => Math.round(a + (b - a) * t);
      return `rgb(${mix(254, 236)},${mix(254, 239)},${mix(255, 246)})`;
    };
    const top = col(r.top), bot = col(r.bottom);
    f.innerHTML =
      `<i class="tl" style="background:radial-gradient(circle at 8px 8px,transparent 7.5px,${top} 8px)"></i>` +
      `<i class="tr" style="background:radial-gradient(circle at 1px 8px,transparent 7.5px,${top} 8px)"></i>` +
      `<i class="bl" style="background:radial-gradient(circle at 8px 1px,transparent 7.5px,${bot} 8px)"></i>` +
      `<i class="br" style="background:radial-gradient(circle at 1px 1px,transparent 7.5px,${bot} 8px)"></i>`;
    f.hidden = false;
  }

  /* 捲回 06:00：FullCalendar 只在「日期範圍改變」時自動捲回。
   * 已經在包含今天的週按「今天」、或 Date Picker 選同一週的日期時，範圍沒變，要自己呼叫。 */
  function resetScroll() {
    if (cal && state.view !== 'month') cal.scrollToTime('06:00:00');
  }

  /* ════════════ 基準日與導覽（SRS 1.4） ════════════ */
  function goto(date, why) {
    state.base = sod(date);
    cal.gotoDate(state.base);
    resetScroll();
    syncToolbar();
    if (why) log(why);
  }
  $('btnPrev').onclick = () => step(-1);
  $('btnNext').onclick = () => step(1);
  function step(dir) {
    unpin(); closeAll();
    const b = state.base;
    let nb;
    if (state.view === 'day') nb = addDays(b, dir);
    else if (state.view === 'week') nb = addDays(addDays(b, -b.getDay()), 7 * dir);   // 該週第一天（週日）
    else nb = new Date(b.getFullYear(), b.getMonth() + dir, 1);                         // 該月 1 日
    goto(nb, `${dir < 0 ? '←' : '→'} 基準日 → <span class="val">${ymd(nb)}</span>`);
  }
  $('btnToday').onclick = () => { unpin(); closeAll(); goto(today(), `點「今天」→ 基準日 → <span class="val">${ymd(today())}</span>${state.view !== 'month' ? '，捲回 06:00' : ''}`); };

  function setView(v, why) {
    state.view = v;
    store.setView(v);
    cal.changeView(FC_VIEW[v], state.base);   // 切換視圖不改變基準日
    syncToolbar();
    if (why) log(why);
  }

  /* ════════════ 下拉選單／Date Picker／篩選 ════════════ */
  const panels = () => [$('viewMenu'), $('dp'), $('filterMenu'), $('addMenu')];
  function closeAll(except) {
    panels().forEach(p => { if (p !== except) p.hidden = true; });
    if (except !== $('pop')) closePop();
    syncSpec();
  }
  function toggle(panel) {
    const open = panel.hidden;
    closeAll(panel);
    panel.hidden = !open;
    syncSpec();
    return open;
  }
  $('btnView').onclick = e => { e.stopPropagation(); unpin(); toggle($('viewMenu')); };
  $('viewMenu').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    $('viewMenu').hidden = true;
    setView(b.dataset.v, `切換到「${VIEW_LABEL[b.dataset.v]}」→ 基準日維持 <span class="val">${ymd(state.base)}</span>；檢視模式記到本次登入結束`);
  };

  $('btnDate').onclick = e => {
    e.stopPropagation(); unpin();
    if (toggle($('dp'))) { state.dpMonth = new Date(state.base.getFullYear(), state.base.getMonth(), 1); renderDp(); }
  };
  $('dpPrev').onclick = e => { e.stopPropagation(); state.dpMonth.setMonth(state.dpMonth.getMonth() - 1); renderDp(); };
  $('dpNext').onclick = e => { e.stopPropagation(); state.dpMonth.setMonth(state.dpMonth.getMonth() + 1); renderDp(); };
  function renderDp() {
    const m = state.dpMonth;
    $('dpTitle').textContent = `${m.getFullYear()} ${m.getMonth() + 1}月`;
    const first = addDays(m, -m.getDay());
    let html = WD.map(w => `<span class="wk">${w === '一' ? 'ㄧ' : w}</span>`).join('');
    for (let i = 0; i < 42; i++) {
      const d = addDays(first, i);
      const cls = d < m ? 'prev' : d.getMonth() !== m.getMonth() ? 'next' : '';
      const chosen = +d === +state.base ? ' chosen' : '';
      html += `<button class="${cls}${chosen}" data-d="${iso(d)}">${d.getDate()}</button>`;
    }
    $('dpGrid').innerHTML = html;
  }
  $('dpGrid').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    e.stopPropagation();
    const [y, mo, d] = b.dataset.d.split('-').map(Number);
    $('dp').hidden = true;
    goto(new Date(y, mo - 1, d), `Date Picker 選 <span class="val">${b.dataset.d.replace(/-/g, '/')}</span> → 基準日更新、視圖不變${state.view !== 'month' ? '，捲回 06:00' : ''}`);
  };

  $('btnFilter').onclick = e => { e.stopPropagation(); unpin(); toggle($('filterMenu')); };
  $('fmItem').onclick = e => {
    e.stopPropagation();
    state.filterOn = !state.filterOn;
    store.setFilter(state.filterOn);
    refetch();
    syncToolbar();
    log(`篩選「${ME}」${state.filterOn ? '勾選' : '取消勾選'} → 存到後端使用者設定（永久）`);
  };
  $('fmItem').onmouseenter = () => { if (!state.filterOn) $('fmCheck').innerHTML = window.ICONS.checkHover; };
  $('fmItem').onmouseleave = () => syncToolbar();

  $('btnAdd').onclick = e => {
    e.stopPropagation(); unpin(); closeAll();
    $('addMenu').hidden = !$('addMenu').hidden;
    if (!$('addMenu').hidden) { setCode('C01'); syncSpec(); }
  };
  $('addMenu').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    e.stopPropagation();
    $('addMenu').hidden = true;
    log(`「＋新增行程」→ 活動 → 建立活動，帶入基準日 <span class="val">${ymd(state.base)}</span>`);
    Forms.openCreate(state.base);
  };

  document.addEventListener('click', e => {
    if (e.target.closest('.menu, .dp, .pop, .demobar, .spec-panel')) return;
    if (e.target.closest('#btnView, #btnDate, #btnFilter, #btnAdd')) return;
    if (e.target.closest('.mask, .modal, .info-card, .alert, .toast-card, .dp, .add-menu')) return;
    if (e.target.closest('.fc-more-link')) return;
    const anyOpen = panels().some(p => !p.hidden) || !$('pop').hidden;
    if (anyOpen) { closeAll(); }
  });

  /* ════════════ 當日完整行程清單（#A06） ════════════ */
  let popDate = null, popAnchor = null;
  function eventsOn(d) {
    const s = +d, e = +addDays(d, 1);
    return cal.getEvents()
      .filter(ev => +ev.start < e && +(ev.end || ev.start) > s || (+ev.start === s && !ev.end))
      .sort((a, b) => (b.allDay - a.allDay) || (a.start - b.start));
  }
  function openPop(date, linkEl) {
    closeAll($('pop'));
    popDate = date;
    $('popTitle').textContent = ymd(date);
    const list = $('popList');
    list.innerHTML = '';
    for (const ev of eventsOn(date)) {
      const b = document.createElement('button');
      b.className = 'pop-item ' + ev.classNames.join(' ');
      b.textContent = (ev.allDay ? '' : hm(ev.start) + ' - ' + hm(ev.end || ev.start) + ' ') + ev.title;
      b.onclick = () => {
        unpin();
        const anchor = popAnchor;                  // 2026-09-21 Alvie 指示：貼回原本那個格子
        closePop();                                //（清單會關掉，貼在已消失的清單旁邊看起來像懸空）
        openInfo(ev.extendedProps.raw, anchor);
      };
      list.appendChild(b);
    }
    const pop = $('pop');
    pop.hidden = false;
    /* 觸發元素（SRS 3.13）：月視圖＝日期格、時間格的「+N」＝時間格、全天列的「還有 N 個」＝按鈕本身 */
    const inAllDay = !!(linkEl && linkEl.closest('.fc-timegrid .fc-daygrid-day'));
    const target = inAllDay ? linkEl
      : (linkEl && (linkEl.closest('td.fc-daygrid-day') || linkEl.closest('td.fc-timegrid-col'))) || linkEl;
    const from = inAllDay ? '全天列的「還有 N 個」按鈕'
      : (target.classList && target.classList.contains('fc-daygrid-day')) ? '日期格' : '時間格';
    const pos = window.POS.place(target, pop.offsetWidth || 260, pop.offsetHeight);
    pop.style.left = pos.left + 'px';
    pop.style.top = pos.top + 'px';
    popAnchor = { el: target, from };             // 記住觸發清單的那個格子／按鈕，供「從清單點一筆」時當參考對象
    const n = linkEl && linkEl.querySelector('.ml');
    const label = !n ? '' : linkEl.classList.contains('fc-timegrid-more-link') ? '+' + n.dataset.n : '還有' + n.dataset.n + '個';
    log(`點「${label}」→ <span class="val">${ymd(date)}</span> 的完整行程清單（${list.children.length} 筆）｜${window.POS.describe(pos, '清單視窗', from)}`);
    syncSpec();
  }
  function closePop() { $('pop').hidden = true; popDate = null; }
  $('popClose').onclick = e => { e.stopPropagation(); closePop(); syncSpec(); };
  // 週／天視圖捲動時清單會跟格子錯位，直接關掉。清單自己內部的捲動不算（#A06：超過 314 時清單內捲動）
  $('calArea').addEventListener('scroll', e => {
    if ($('pop').hidden || $('pop').contains(e.target)) return;
    closePop(); syncSpec();
  }, true);

  function openInfo(raw, anchor) {
    const role = raw.organizer === 'me' ? '我是主辦人' : `主辦人 ${raw.organizerName}，我是參與人`;
    log(`開啟活動資訊卡「${raw.title || '無標題'}」（${role}）`);
    Forms.openInfo(raw, anchor);
  }

  /* ════════════ 工具列放不下時換行（視窗接近最小寬度 800 時） ════════════ */
  function detectNarrow() {
    const row = $('datenavRow');
    const g = row.children;
    const need = g[0].offsetWidth + g[1].offsetWidth + g[2].offsetWidth + 32;
    const narrow = row.clientWidth < need;
    if (narrow !== $('main').classList.contains('is-narrow')) {
      $('main').classList.toggle('is-narrow', narrow);
      if (cal) cal.updateSize();
    }
  }
  new ResizeObserver(() => { detectNarrow(); if (cal) { cal.updateSize(); drawFrame(); } }).observe($('main'));

  /* ════════════ 記憶模擬 ════════════ */
  function enterCalendar() {
    state.left = false;
    state.base = today();                 // 日期不記憶
    state.view = store.getView();         // 檢視模式：本次登入期間
    state.filterOn = store.getFilter();   // 篩選：後端永久
    $('leftCover').hidden = true;
    renderNav();
    buildCalendar();                      // 重新進入 → 捲動位置回到 06:00
  }
  function leaveCalendar(name) {
    closeAll();
    state.left = true;
    $('leftCover').hidden = false;
    $('tgFrame').hidden = true;
    renderNav();
    log(`離開行事曆（切到「${name}」）`);
    syncSpec();
  }
  function returnToCalendar(why) {
    enterCalendar();
    log(`${why} → 檢視模式「<span class="val">${VIEW_LABEL[state.view]}</span>」、日期回到今天、篩選「${state.filterOn ? '勾選' : '未勾選'}」`);
  }
  $('dbLeave').onclick = () => {
    unpin();
    leaveCalendar('交談');
    setTimeout(() => returnToCalendar('切到交談再回來'), 700);
  };
  $('dbRelogin').onclick = () => {
    unpin();
    store.clearSession();
    closeAll();
    enterCalendar();
    log(`登出再登入 → 檢視模式回到預設「<span class="val">月</span>」、日期回到今天、篩選維持「${state.filterOn ? '勾選' : '未勾選'}」（存在後端）`);
  };
  $('dbDevice').onclick = () => {
    unpin();
    store.clearSession();
    closeAll();
    enterCalendar();
    log(`換一台裝置登入 → 檢視模式「<span class="val">月</span>」（新裝置沒有登入期間的記錄）、篩選從後端讀回「${state.filterOn ? '勾選' : '未勾選'}」`);
  };
  $('dbFold').onclick = () => { $('demobar').classList.toggle('is-folded'); };

  /* ════════════ 稿號 ════════════ */
  function detectCode() {
    if (state.pin) return state.pin;                       // 稿號選單指定時以它為準
    if (state.formCode && document.querySelector('.mask')) return state.formCode;
    if (!$('addMenu').hidden) return 'C01';
    if (!$('dp').hidden) return 'A09';
    if (!$('viewMenu').hidden) return 'A02';
    if (!$('filterMenu').hidden) return 'B01';
    if (!$('pop').hidden) return 'A06';
    const c = $('cal');
    if (state.view === 'month') return c.querySelector('.fc-daygrid-block-event:not(.fc-event-end), .fc-daygrid-more-link') ? 'A05' : 'A01';
    const busy = c.querySelector('.fc-timegrid-more-link, .fc-timegrid-event-harness + .fc-timegrid-event-harness');
    if (state.view === 'week') return busy ? 'A07' : 'A03';
    return busy ? 'A08' : 'A04';
  }

  const PRESETS = {
    A01: { view: 'month' }, A02: { view: 'month', open: 'viewMenu' },
    A03: { view: 'week', base: () => addDays(TODAY, nextSun + 1) },
    A04: { view: 'day', base: () => addDays(TODAY, nextSun + 1) },
    A05: { view: 'month' }, A06: { view: 'month', pop: 1 },
    A07: { view: 'week' }, A08: { view: 'day' },
    A09: { view: 'month', open: 'dp' },
    A10: { view: 'month', hover: 'cell' }, A11: { view: 'month', pop: 1, hover: 'pop' },
    A13: { view: 'week', base: () => addDays(TODAY, nextSun + 1) },
    A14: { view: 'day', base: () => addDays(TODAY, nextSun + 1) },
    A16: { view: 'month', hover: 'bar' },
    B01: { view: 'month', open: 'filterMenu' },

    /* #C 建立／編輯活動、資訊卡、選擇成員 */
    C01: { view: 'month', open: 'addMenu' },
    C02: { view: 'month', form: 'create' },
    C03: { view: 'month', form: 'create' },
    C04: { view: 'month', form: 'create', pill: 0 },
    C05: { view: 'month', form: 'create', pill: 1 },
    C06: { view: 'month', form: 'create', pill: 2 },
    C07: { view: 'month', form: 'create', pill: 6 },
    C08: { view: 'month', form: 'create', adv: true, pill: 7 },
    C09: { view: 'month', form: 'create', adv: true, pill: 8 },
    C10: { view: 'month', form: 'create', adv: true },
    C11: { view: 'month', form: 'create', then: 'notify' },
    C12: { view: 'month', then: 'toastSave' },
    C13: { view: 'month' },
    C14: { view: 'month', info: 'other', rsvp: 'none' },
    C15: { view: 'month', info: 'other', rsvp: 'no' },
    C16: { view: 'month', info: 'other', rsvp: 'yes' },
    C17: { view: 'month', info: 'other', rsvp: 'none', more: true },
    C18: { view: 'month', form: 'edit' },
    C19: { view: 'month', form: 'edit', dirty: true },
    C20: { view: 'month', then: 'rangeEdit' },
    C21: { view: 'month', then: 'confirmDel' },
    C22: { view: 'month', then: 'rangeDel' },
    C23: { view: 'month', then: 'toastDel' },
    C24: { view: 'month', info: 'other', rsvp: 'none' },   // 稿：別人建立、我可編輯 → 有 ⋯ 也有「是否參加？」，三顆預設未選取
    C25: { view: 'month', form: 'create', hoverSave: true },
    C26: { view: 'month', form: 'create', picker: true },
    C27: { view: 'month', form: 'create', picker: true },
    C28: { view: 'month', form: 'create', picker: true },
    C29: { view: 'month', form: 'create', allDay: true },
    C30: { view: 'month', form: 'create', bad: 'time' },
    C31: { view: 'month', form: 'create', bad: 'date' },
    C32: { view: 'month', form: 'create', allDay: true, bad: 'date' },

    /* #G01 在行事曆頁；#G02～#G05 在 notify.html；#H 在 mail.html */
    G01: { view: 'month', remind: true },
    G02: { href: 'notify.html' }, G03: { href: 'notify.html' },
    G04: { href: 'notify.html' }, G05: { href: 'notify.html' },
    H01: { href: 'mail.html?s=H01' }, H02: { href: 'mail.html?s=H02' }, H03: { href: 'mail.html?s=H03' },
    H04: { href: 'mail.html?s=H04' }, H05: { href: 'mail.html?s=H05' }, H06: { href: 'mail.html?s=H06' },
    H07: { href: 'mail.html?s=H07' }, H08: { href: 'mail.html?s=H08' },
  };
  function applyScreen(code) {
    const p = PRESETS[code];
    if (!p) return;
    if (p.href) { location.href = p.href; return; }
    Forms.close();
    closeAll();
    clearForceHover();
    if (state.left) enterCalendar();
    state.base = p.base ? sod(p.base()) : today();
    if (state.view !== p.view) { state.view = p.view; store.setView(p.view); cal.changeView(FC_VIEW[p.view], state.base); }
    else cal.gotoDate(state.base);
    resetScroll();
    syncToolbar();
    state.pin = code;
    setTimeout(() => {
      if (p.open === 'dp') { state.dpMonth = new Date(state.base.getFullYear(), state.base.getMonth(), 1); renderDp(); }
      if (p.open) $(p.open).hidden = false;
      const t1 = iso(addDays(TODAY, 1));
      const cell = $('cal').querySelector(`td.fc-daygrid-day[data-date="${t1}"]`);
      if (p.pop && cell) { const l = cell.querySelector('.fc-daygrid-more-link'); if (l) openPop(sod(addDays(TODAY, 1)), l); }
      if (p.hover === 'cell' && cell) cell.querySelectorAll('.fc-event, .fc-daygrid-more-link').forEach(el => el.classList.add('force-hover'));
      if (p.hover === 'pop') { const f = $('popList').firstElementChild; if (f) f.classList.add('force-hover'); }
      if (p.hover === 'bar') $('datenav').classList.add('force-hover-bar');
      applyFormPreset(p, code);
      state.pin = code;
      syncSpec();
    }, 60);
  }
  /* #C／#G01 的稿：直接把對應的視窗打開 */
  function applyFormPreset(p, code) {
    const mine = () => EVENTS.find(e => e.organizer === 'me' && !e.allDay && e.repeat !== '不重複') || EVENTS.find(e => e.organizer === 'me' && !e.allDay);
    const others = () => EVENTS.find(e => e.organizer === 'other' && !e.allDay && e.location && e.note) || EVENTS.find(e => e.organizer === 'other' && !e.allDay);
    if (p.remind) return showRemind('start');
    if (p.then === 'notify') return Forms.demo.confirmNotify(() => {});
    if (p.then === 'toastSave') return Forms.demo.toast('儲存成功', 'C12');
    if (p.then === 'toastDel') return Forms.demo.toast('刪除成功', 'C23');
    if (p.then === 'rangeEdit') return Forms.demo.openRange('edit', () => {});
    if (p.then === 'rangeDel') return Forms.demo.openRange('delete', () => {});
    if (p.then === 'confirmDel') return Forms.demo.confirmDelete(() => {});
    if (p.info) {
      const ev = p.info === 'mine' ? mine() : others();
      if (p.rsvp) ev.rsvp = p.rsvp;
      const anchor = document.querySelector(`.fc-event[data-id="${ev.id}"]`);
      const card = Forms.openInfo(ev, anchor);
      if (p.more) setTimeout(() => { const b = card.querySelector('.more'); if (b) b.click(); }, 80);
      return;
    }
    if (p.form) {
      if (p.form === 'edit') {
        const ev = mine();
        Forms.openEdit(ev);
        if (p.dirty) setTimeout(() => {
          const i = document.querySelector('.form-modal .text-input input');
          i.value = (i.value || '') + '（已修改）';
          i.dispatchEvent(new Event('input', { bubbles: true }));
        }, 60);
      } else {
        Forms.openCreate(state.base, { allDay: !!p.allDay, bad: p.bad });
      }
      setTimeout(() => {
        const q = sel => document.querySelector(sel);
        if (p.adv && q('.adv-toggle')) q('.adv-toggle').click();
        if (p.picker && q('.members-head .flatBtn')) q('.members-head .flatBtn').click();
        if (p.hoverSave && q('.form-modal .btn-primary')) q('.form-modal .btn-primary').classList.add('force-hover');
        if (p.pill != null) {
          const target = document.querySelectorAll('.form-modal .dd')[p.pill];
          if (target && target.querySelector('button')) target.querySelector('button').click();
        }
      }, p.adv ? 160 : 100);
    }
  }

  function clearForceHover() {
    document.querySelectorAll('.force-hover').forEach(el => el.classList.remove('force-hover'));
    $('datenav').classList.remove('force-hover-bar');
  }
  function unpin() {
    if (!state.pin) return;
    state.pin = null;
    clearForceHover();
    $('dbScreen').value = '';
  }

  const sel = $('dbScreen');
  sel.innerHTML = '<option value="">（依畫面自動判斷）</option>' +
    Object.entries(SCREENS).map(([k, v]) => `<option value="${k}">#${k} ${v.name}</option>`).join('');
  sel.onchange = () => { if (sel.value) applyScreen(sel.value); else unpin(); };

  /* ════════════ 規格模式 ════════════ */
  function log(html) {
    const now = new Date();
    logs.unshift(`<span class="hint">${hm(now)}:${pad(now.getSeconds())}</span> ${html}`);
    logs.length = Math.min(logs.length, 40);
    $('dbMsg').innerHTML = html.replace(/<[^>]+>/g, '');
    syncSpec();
  }
  function flash(el) {
    if (!el) return;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }

  function syncSpec() {
    const code = detectCode();
    if (!state.pin && sel.value !== '') sel.value = '';
    if (!state.spec) return;
    const s = SCREENS[code] || {};
    const fmtDate = ymd(state.base);
    $('specPanel').innerHTML = `
      <h2>目前畫面</h2>
      <div><span class="sp-code">#${code}</span> ${s.name || ''}</div>
      <div><a href="${link(s.node || '8442:192046')}" target="_blank" rel="noopener">在 Figma 開啟 ↗</a>
        <span class="hint">（Phase 1 頁）</span></div>

      <h2>狀態記憶（SRS 1.5）</h2>
      <table>
        <tr><th>項目</th><th>目前值</th><th>記多久／存哪裡</th></tr>
        <tr><td>檢視模式</td><td class="val">${VIEW_LABEL[state.view]}</td><td>同一次登入期間<br><span class="hint">前端 store，登出清空；預設「月」</span></td></tr>
        <tr><td>篩選勾選</td><td class="val">${state.filterOn ? '勾選' : '未勾選'}</td><td>永久、跨裝置<br><span class="hint">後端使用者設定</span></td></tr>
        <tr><td>基準日</td><td class="val">${fmtDate}</td><td>不記憶<br><span class="hint">每次進入行事曆＝今天</span></td></tr>
        <tr><td>捲動位置</td><td class="val">${state.view === 'month' ? '—' : '06:00 起'}</td><td>不記憶<br><span class="hint">切視圖、箭頭、今天、選日期、重新進入都回 06:00</span></td></tr>
      </table>
      <p class="hint">用下方 Demo 列的「切到交談再回來／登出再登入／換一台裝置登入」看差別。</p>

      <h2>事件紀錄</h2>
      <div class="log">${logs.length ? logs.map(l => `<div>${l}</div>`).join('') : '<span class="hint">點畫面上的東西，這裡會寫出「接下來會發生什麼、帶入哪些值」。</span>'}</div>

      <h2>#${code} 稿旁規則</h2>
      <ul>${(s.rules || []).map(r => `<li>${r}</li>`).join('')}</ul>

      <h2>FullCalendar 設定（週／天視圖捲動）</h2>
      <table>
        <tr><td>height</td><td>'100%'（外層要有明確高度）</td></tr>
        <tr><td>expandRows</td><td>true</td></tr>
        <tr><td>slotMinTime / slotMaxTime</td><td>'00:00:00' / '24:00:00'</td></tr>
        <tr><td>slotDuration</td><td><b>'01:00:00'</b>（預設 30 分鐘一格）</td></tr>
        <tr><td>scrollTime</td><td>'06:00:00'</td></tr>
        <tr><td>scrollTimeReset</td><td>true（預設）</td></tr>
        <tr><td>今天／選日期後</td><td>另外呼叫 <code>scrollToTime('06:00:00')</code></td></tr>
        <tr><td>CSS</td><td><code>.fc-timegrid-slot { height: 44px }</code></td></tr>
      </table>

      <p class="hint">滑鼠移到畫面元素上可看規格值。</p>`;
  }

  $('dbSpec').onclick = () => {
    state.spec = !state.spec;
    $('dbSpec').setAttribute('aria-pressed', state.spec);
    document.body.classList.toggle('spec-on', state.spec);
    $('specPanel').hidden = !state.spec;
    if (!state.spec) $('hoverTip').hidden = true;
    syncSpec();
    if (cal) setTimeout(() => { cal.updateSize(); drawFrame(); }, 0);
  };

  document.addEventListener('mousemove', e => {
    const tip = $('hoverTip');
    if (!state.spec || e.target.closest('.spec-panel, .demobar')) { tip.hidden = true; return; }
    let part = null;
    for (const p of FC_PARTS) { if (e.target.closest(p.sel)) { part = p; break; } }
    if (!part) {
      const el = e.target.closest('[data-spec]');
      if (el && el.dataset.spec !== 'main') part = PARTS[el.dataset.spec];
    }
    if (!part) { tip.hidden = true; return; }
    tip.innerHTML = `<b>${part.t}</b>` +
      (part.rows || []).map(([k, v]) => `<div><span class="k">${k}</span> ${v}</div>`).join('') +
      (part.rule ? `<div>▸ ${part.rule}</div>` : '') +
      (part.warn ? `<div class="warn">⚠ ${part.warn}</div>` : '') +
      (part.note ? `<div class="k">${part.note}</div>` : '') +
      `<div class="src">數值量自 Phase 1 的稿，<b>以 Figma 為準</b></div>`;
    tip.hidden = false;
    const x = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8);
    const y = e.clientY + 16 + tip.offsetHeight > innerHeight ? e.clientY - tip.offsetHeight - 10 : e.clientY + 16;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  });

  /* ════════════ #G01 通知_提示框 ════════════ */
  function showRemind(kind) {
    const ev = EVENTS.find(e => !e.allDay && e.organizer === 'other') || EVENTS.find(e => !e.allDay);
    const d = ev.start;
    $('remindText').textContent =
      `${ev.title || '無標題'}（${ev.organizerName}）即將於 ${ymd(d)} ${hm(d)} ${kind === 'end' ? '截止' : '開始'}。`;
    $('remind').hidden = false;
    $('remind').dataset.ev = ev.id;
    setCode('G01');
    log('#G01 提醒提示框：取消＝關閉；前往查看＝開啟活動資訊卡（目標已被刪除時不開啟，通知仍留在列表）');
  }
  $('dbRemind').onclick = () => { unpin(); showRemind('start'); };
  $('remindCancel').onclick = () => { $('remind').hidden = true; window.GCEP.syncCode(); };
  $('remindGo').onclick = () => {
    const ev = EVENTS.find(e => e.id === $('remind').dataset.ev);
    $('remind').hidden = true;
    if (!ev) { log('目標已不存在 → 不開啟資訊卡，通知保留在列表中'); return; }
    const anchor = document.querySelector(`.fc-event[data-id="${ev.id}"]`);
    Forms.openInfo(ev, anchor);
  };

  /* ════════════ 啟動 ════════════ */
  renderStaticIcons();
  renderNav();
  buildCalendar();
  const q = new URLSearchParams(location.search);
  if (q.get('spec') === '1') $('dbSpec').click();
  if (q.get('fold') === '1') $('demobar').classList.add('is-folded');
  const s = (q.get('s') || '').toUpperCase();
  if (PRESETS[s]) { sel.value = s; applyScreen(s); }
  if (q.get('g01')) setTimeout(() => showRemind('start'), 200);
  if (q.get('open') === 'info') setTimeout(() => {          // 由 #G／#H 的「前往查看」轉進來
    const ev = EVENTS.find(e => e.organizer === 'other' && !e.allDay);
    const anchor = document.querySelector(`.fc-event[data-id="${ev.id}"]`);
    Forms.openInfo(ev, anchor);
    log('從通知／Email 的「前往查看」進入 → 開啟活動資訊卡');
  }, 300);

  function setCode(c) { state.formCode = c; syncSpec(); }
  window.GCEP = {
    log, setCode,
    syncCode: () => { state.formCode = null; syncSpec(); },
    refresh: () => { refetch(); requestAnimationFrame(afterRender); },
    state, get cal() { return cal; },
  };
  window.__demo = { state, get cal() { return cal; }, applyScreen };
})();
