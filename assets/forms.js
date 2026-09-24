/* GCEP 行事曆 Phase 1 Demo — #C 建立／編輯活動、活動資訊卡、選擇成員
 *
 * 規則來源：Phase 1 頁 #C01～#C29 的稿旁筆記（時間選擇器、重複、通知、卡片樣式、更多選單…）
 * 與 SRS 3.2／3.3／3.4／3.5／3.7／3.10／3.12／6.3。
 */
window.Forms = (function () {
  const I = window.ICONS;
  const pad = n => String(n).padStart(2, '0');
  const WD = ['日', '一', '二', '三', '四', '五', '六'];
  const sod = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const hm = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
  const ymd = d => d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate());
  const ymdw = d => ymd(d) + '（' + WD[d.getDay()] + '）';
  const log = (...a) => window.GCEP && window.GCEP.log(...a);
  const code = c => window.GCEP && window.GCEP.setCode(c);

  const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };

  /* 通訊錄假資料：涵蓋 #C26～#C28 的四種列 */
  const PEOPLE = [
    { name: 'Lily', dept: '資訊管理處/系統維運部 - 資深工程師', state: 'invited' },      // 須邀請角色 → 邀請中、disabled
    { name: 'Molly', dept: '研發一處/產品規劃組 - 規劃師', state: 'ok', tag: '出差' },
    { name: 'Jessica', dept: '資訊管理處/系統維運部 - 經理', state: 'ok', tag: '出差' },
    { name: 'Amy Brown', dept: '行銷處/品牌組 - 專員', state: 'ok' },
    { name: 'Kevin Wu', dept: '業務處/北區業務部 - 副理', state: 'nope' },                // 不可邀請角色 → 隱藏 checkbox
    { name: 'Emma Tylor', dept: '資訊管理處/系統維運部 - 處長', state: 'ok' },
    { name: 'Leo Chen', dept: '人資管理部 - 專員', state: 'ok' },
    { name: '（隱藏受邀角色）', dept: '不顯示在清單中', state: 'hidden' },
  ];

  /* 一次只開一個下拉（選單、日期 Picker、更多選單互斥） */
  function closePopups(except) {
    document.querySelectorAll('.dd-menu, .form-modal .dp, .more-menu').forEach(m => { if (m !== except) m.hidden = true; });
  }

  /* ═══════════ 小元件 ═══════════ */
  function selectPill(value, options, onPick, opts = {}) {
    const wrap = el('div', 'dd');
    const btn = el('button', 'selectBtn', `<span>${value}</span><i>${I.caret}</i>`);
    btn.dataset.spec = opts.spec || 'formsel';
    wrap.appendChild(btn);
    const menu = el('div', 'dd-menu' + (opts.wide ? ' w-auto' : ''));
    menu.hidden = true;
    const build = () => {
      menu.innerHTML = '';
      for (const o of (typeof options === 'function' ? options() : options)) {
        const b = el('button', o.value === btn.firstChild.textContent ? 'is-on' : '', o.label || o.value);
        b.onclick = e => { e.stopPropagation(); menu.hidden = true; btn.firstChild.textContent = o.label || o.value; onPick(o.value, o); };
        menu.appendChild(b);
      }
    };
    btn.onclick = e => {
      e.stopPropagation();
      const willOpen = menu.hidden;
      closePopups(menu);
      if (willOpen) { build(); menu.hidden = false; } else menu.hidden = true;
    };
    wrap.appendChild(menu);
    wrap.setValue = v => { btn.firstChild.textContent = v; };
    return wrap;
  }

  /* 日期 pill（點開 #A09 樣式的 Picker_calender） */
  function datePill(date, onPick) {
    const wrap = el('div', 'dd');
    const btn = el('button', 'selectBtn', `<span>${ymdw(date)}</span><i>${I.caret}</i>`);
    btn.dataset.spec = 'formdate';
    const dp = el('div', 'dp');
    dp.hidden = true;
    dp.style.cssText = 'top:calc(100% + 4px);left:0';
    let cur = new Date(date.getFullYear(), date.getMonth(), 1), sel = sod(date);
    const render = () => {
      const first = addDays(cur, -cur.getDay());
      let g = WD.map(w => `<span class="wk">${w === '一' ? 'ㄧ' : w}</span>`).join('');
      for (let i = 0; i < 42; i++) {
        const d = addDays(first, i);
        const cls = d < cur ? 'prev' : d.getMonth() !== cur.getMonth() ? 'next' : '';
        g += `<button class="${cls}${+d === +sel ? ' chosen' : ''}" data-d="${d.toISOString()}">${d.getDate()}</button>`;
      }
      dp.innerHTML = `<div class="dp-head"><button class="dp-arrow" data-m="-1">${I.dpAngle}</button>
        <span class="dp-title">${cur.getFullYear()} ${cur.getMonth() + 1}月</span>
        <button class="dp-arrow is-next" data-m="1">${I.dpAngle}</button></div><div class="dp-grid">${g}</div>`;
    };
    dp.onclick = e => {
      e.stopPropagation();
      const arrow = e.target.closest('[data-m]');
      if (arrow) { cur.setMonth(cur.getMonth() + Number(arrow.dataset.m)); return render(); }
      const b = e.target.closest('[data-d]');
      if (!b) return;
      sel = sod(new Date(b.dataset.d));
      dp.hidden = true;
      btn.firstChild.textContent = ymdw(sel);
      onPick(sel);
    };
    btn.onclick = e => {
      e.stopPropagation();
      const willOpen = dp.hidden;
      closePopups(dp);
      if (willOpen) { render(); dp.hidden = false; } else dp.hidden = true;
    };
    wrap.append(btn, dp);
    wrap.setValue = d => { sel = sod(d); btn.firstChild.textContent = ymdw(d); };
    return wrap;
  }

  document.addEventListener('click', () => closePopups());

  /* ═══════════ 遮罩 ═══════════ */
  /* 遮罩用堆疊：選擇成員／確認彈窗開在表單上面，關掉時只收掉最上面那層 */
  const masks = [];
  function openMask(clear) {
    const m = el('div', 'mask' + (clear ? ' is-clear' : ''));
    m.style.zIndex = 100 + masks.length * 10;
    m.onclick = e => { if (e.target === m) closeMask(m); };
    document.body.appendChild(m);
    masks.push(m);
    return m;
  }
  function closeMask(target) {
    const m = target && masks.includes(target) ? target : masks[masks.length - 1];
    if (!m) return;
    m.remove();
    masks.splice(masks.indexOf(m), 1);
    if (window.GCEP) window.GCEP.syncCode();
  }
  function closeAllMasks() { while (masks.length) closeMask(); }

  /* ═══════════ 時間選項（SRS 3.3） ═══════════ */
  const HOURS = Array.from({ length: 24 }, (_, i) => ({ value: pad(i) }));
  const MINS = ['00', '15', '30', '45'].map(v => ({ value: v }));

  function nextSlot(now = new Date()) {                     // 下一個 30 分鐘刻度（#C03 筆記）
    const d = new Date(now);
    d.setSeconds(0, 0);
    const m = d.getMinutes();
    if (m === 0) d.setMinutes(30); else { d.setHours(d.getHours() + 1); d.setMinutes(0); }
    if (d.getDate() !== now.getDate()) { d.setTime(now.getTime()); d.setHours(23, 30, 0, 0); }  // 當日邊界
    return d;
  }

  /* 重複選項（#C07 筆記：依起始日動態產生） */
  function repeatOptions(start) {
    const wd = WD[start.getDay()];
    const nth = Math.ceil(start.getDate() / 7);
    const isLast = start.getDate() + 7 > new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const ord = ['第一個', '第二個', '第三個', '第四個', '第五個'][nth - 1];
    return [
      { value: '不重複' }, { value: '每天' },
      { value: '每週' + wd }, { value: '每週平日（週一至週五）' },
      { value: '每月的' + (isLast ? '最後一個' : ord) + '週' + wd },
    ];
  }

  /* ═══════════ 建立／編輯活動（#C02／#C03／#C18～#C20／#C29） ═══════════ */
  function openForm(mode, seed) {
    const isEdit = mode === 'edit';
    code(isEdit ? 'C18' : 'C03');
    const m = openMask();

    const ev = seed;
    const st = {
      title: ev.title || '',
      start: new Date(ev.start), end: new Date(ev.end),
      allDay: !!ev.allDay,
      repeat: ev.repeat || '不重複',
      location: ev.location || '', note: ev.note || '',
      reminders: (ev.reminders || [{ when: '開始前', offset: '30分鐘' }]).map(r => ({ ...r })),
      participants: (ev.participants || [{ name: window.DEMO_DATA.ME, dept: '資訊管理處/系統維運部 - 組長', perm: '可編輯', owner: true }]).map(p => ({ ...p })),
      adv: false,
    };
    const snapshot = JSON.stringify(st);

    const modal = el('div', 'modal form-modal');
    modal.dataset.spec = 'formmodal';
    modal.onclick = e => e.stopPropagation();
    modal.innerHTML = `<div class="modal-head">${isEdit ? '編輯活動' : '建立活動'}
        <button class="modal-close" aria-label="關閉">${I.cross}</button></div>
      <div class="modal-body"></div>
      <div class="modal-foot"><button class="btn btn-cancel">取消</button><button class="btn btn-primary">確定</button></div>`;
    const body = modal.querySelector('.modal-body');
    const okBtn = modal.querySelector('.btn-primary');

    /* — 標題 — */
    const fTitle = el('div', 'field col');
    fTitle.innerHTML = '<span class="label">標題</span>';
    const tInput = el('div', 'text-input', `<input maxlength="50" placeholder="請輸入標題" value="${st.title}"><span class="count">${st.title.length}/50</span>`);
    tInput.dataset.spec = 'input';
    tInput.querySelector('input').oninput = e => {
      st.title = e.target.value;
      tInput.querySelector('.count').textContent = st.title.length + '/50';
      sync();
    };
    fTitle.appendChild(tInput);

    /* — 時間 — */
    const fTime = el('div', 'field');
    const timeBox = el('div', '');
    fTime.append(el('span', 'label', '開始時間'), timeBox);
    const fEnd = el('div', 'field');
    const endBox = el('div', '');
    fEnd.append(el('span', 'label', '結束時間'), endBox);

    /* 稿上「結束時間」與「全天」是同一組（間距 16），其餘欄位間距 28 */
    const endGroup = el('div', 'end-group');
    const allDayRow = el('div', 'allday-row');
    allDayRow.dataset.spec = 'allday';
    allDayRow.innerHTML = `<span class="cb">${st.allDay ? I.checkOn : I.checkOff}</span><span>全天</span>`;
    allDayRow.onclick = () => {
      st.allDay = !st.allDay;
      if (!st.allDay) {                                  // 全天 → 非全天：沿用日期，時分帶入預設（#C04 筆記）
        const s = nextSlot(new Date(st.start));
        st.start = s; st.end = new Date(Math.min(+new Date(s).setHours(s.getHours() + 1), +sod(s) + 86399000));
      }
      allDayRow.querySelector('.cb').innerHTML = st.allDay ? I.checkOn : I.checkOff;
      renderTime(); sync();
      log(`切換「全天」→ ${st.allDay ? '時間欄合併為一行（開始日期 ～ 結束日期）' : '拆成開始／結束兩行，時分帶入預設值'}`);
      code(st.allDay ? 'C29' : (isEdit ? 'C18' : 'C03'));
    };

    const errLine = el('div', 'time-err', `<span class="ic">${I.alert}</span>開始時間不可大於結束時間`);
    errLine.dataset.spec = 'timeerr';
    errLine.hidden = true;
    function renderTime() {
      timeBox.innerHTML = ''; endBox.innerHTML = '';
      fTime.querySelector('.label').textContent = st.allDay ? '時間' : '開始時間';
      fEnd.hidden = st.allDay;
      if (st.allDay) {
        const row = el('div', 'time-row');
        row.append(
          datePill(st.start, d => { st.start = d; renderTime(); sync(); }),   // 不再自動把結束拉回來，錯了就標紅（#C32）
          el('span', 'tilde', '～'),
          datePill(st.end, d => { st.end = d; renderTime(); sync(); }));
        timeBox.appendChild(row);
        timeBox.appendChild(errLine);
        markTimeError();
        return;
      }
      const sRow = el('div', 'time-row');
      sRow.append(
        datePill(st.start, d => {
          const k = new Date(d); k.setHours(st.start.getHours(), st.start.getMinutes(), 0, 0);
          st.start = k;                                   // 只改開始，不動結束（#C31 就是這樣才做得出來）
          renderTime(); sync();
        }),
        selectPill(pad(st.start.getHours()), HOURS, v => { st.start.setHours(+v); renderTime(); sync(); }),
        selectPill(pad(st.start.getMinutes()), MINS, v => { st.start.setMinutes(+v); renderTime(); sync(); }));
      timeBox.appendChild(sRow);
      timeBox.appendChild(errLine);                       // 錯誤訊息掛在「開始時間」這一列下方

      const eRow = el('div', 'time-row');
      eRow.append(                                        // 選項固定 00:00～23:45，不依開始時間增減
        datePill(st.end, d => {
          const k = new Date(d); k.setHours(st.end.getHours(), st.end.getMinutes(), 0, 0);
          st.end = k; renderTime(); sync();
        }),
        selectPill(pad(st.end.getHours()), HOURS, v => { st.end.setHours(+v); renderTime(); sync(); }),
        selectPill(pad(st.end.getMinutes()), MINS, v => { st.end.setMinutes(+v); renderTime(); sync(); }));
      endBox.appendChild(eRow);
      markTimeError();
    }

    /* 開始晚於結束（#C30／#C31）——日期與時分合起來比，相等是合法的 0 分鐘活動 */
    function timeInvalid() {
      return st.allDay ? +sod(st.start) > +sod(st.end)      // 全天只比日期（#C32）
                       : +st.start > +st.end;               // 非全天：日期與時分合起來比（#C30／#C31）
    }
    function markTimeError() {
      const bad = timeInvalid();
      [timeBox, endBox].forEach(box => box.querySelectorAll('.time-row').forEach(r => r.classList.toggle('is-err', bad)));
      errLine.hidden = !bad;
    }

    /* — 重複 — */
    const fRepeat = el('div', 'field');
    const repeatSel = selectPill(st.repeat, () => repeatOptions(st.start), v => { st.repeat = v; sync(); }, { wide: true, spec: 'repeat' });
    fRepeat.append(el('span', 'label', '重複'), repeatSel);

    /* — 參與人 — */
    const fMembers = el('div', '');
    fMembers.dataset.spec = 'members';
    function renderMembers() {
      fMembers.innerHTML = '';
      const head = el('div', 'members-head');
      head.innerHTML = `<span class="t">參與人(${st.participants.length})</span>`;
      const add = el('button', 'create-btn', '＋新增成員');   // Button_Create：元件本身沒有 hover
      add.onclick = e => { e.stopPropagation(); openPicker(st.participants, list => { st.participants = list; renderMembers(); sync(); }); };
      head.appendChild(add);
      fMembers.appendChild(head);
      for (const p of st.participants) {
        const row = el('div', 'member-row' + (p.owner ? ' is-owner' : ''));
        row.innerHTML = `<span class="ava"><span class="pic">${I.userPic}</span>${p.owner ? `<span class="crown">${I.crown}</span>` : ''}</span>
          <span class="info"><span class="nm">${p.name}</span><div class="dept">${p.dept}</div></span>`;
        if (!p.owner) {
          row.appendChild(selectPill(p.perm || '僅檢視', [{ value: '僅檢視' }, { value: '可編輯' }], v => { p.perm = v; sync(); }, { spec: 'perm' }));
        }
        const del = el('button', 'del' + (p.owner ? ' locked' : ''), I.cross);
        del.title = '移除參與人';
        del.onclick = e => { e.stopPropagation(); st.participants = st.participants.filter(x => x !== p); renderMembers(); sync(); };
        row.appendChild(del);
        fMembers.appendChild(row);
      }
    }

    /* — 進階設定：通知／地點／備註 — */
    const advToggle = el('button', 'adv-toggle');
    advToggle.dataset.spec = 'adv';
    advToggle.setAttribute('aria-expanded', 'false');
    advToggle.innerHTML = `進階設定<i>${I.triangle}</i>`;
    const advBox = el('div', 'adv-box');
    advBox.hidden = true;
    advToggle.onclick = () => {
      st.adv = !st.adv;
      advBox.hidden = !st.adv;
      advToggle.setAttribute('aria-expanded', String(st.adv));
      log(`進階設定${st.adv ? '展開（通知、地點、備註）' : '收合'}`);
    };

    const fNotify = el('div', 'field');
    const notifyBox = el('div', '');
    fNotify.append(el('span', 'label', '通知'), notifyBox);
    function renderNotify() {
      notifyBox.innerHTML = '';
      st.reminders.forEach((r, i) => {
        const row = el('div', 'notify-row');
        row.dataset.spec = 'notify';
        row.append(
          selectPill(r.when, [{ value: '開始前' }, { value: '截止前' }], v => { r.when = v; sync(); }),
          selectPill(r.offset, ['5分鐘', '10分鐘', '30分鐘', '1小時', '2小時'].map(v => ({ value: v })), v => { r.offset = v; sync(); }));
        const del = el('button', 'del', I.cross);
        del.title = '刪除這組通知';
        if (i === 0) del.style.visibility = 'hidden';      // 第一組不可刪
        del.onclick = () => { st.reminders.splice(i, 1); renderNotify(); sync(); };
        row.appendChild(del);
        notifyBox.appendChild(row);
      });
      if (st.reminders.length < 5) {                       // 滿 5 組隱藏
        const add = el('button', 'add-notify', '＋ 新增通知');
        add.onclick = () => { st.reminders.push({ when: '開始前', offset: '30分鐘' }); renderNotify(); sync(); log('新增一組通知設定（上限 5 組，滿 5 組時按鈕隱藏）'); };
        notifyBox.appendChild(add);
      }
    }

    const fLoc = el('div', 'field col');
    fLoc.innerHTML = '<span class="label">地點</span>';
    const locInput = el('div', 'text-input', `<input maxlength="200" placeholder="請輸入地點" value="${st.location}"><span class="count">${st.location.length}/200</span>`);
    locInput.querySelector('input').oninput = e => { st.location = e.target.value; locInput.querySelector('.count').textContent = st.location.length + '/200'; sync(); };
    fLoc.appendChild(locInput);

    const fNote = el('div', 'field col');
    fNote.innerHTML = '<span class="label">備註</span>';
    const noteInput = el('div', 'text-input', `<input maxlength="50" placeholder="請輸入備註" value="${st.note}"><span class="count">${st.note.length}/50</span>`);
    noteInput.querySelector('input').oninput = e => { st.note = e.target.value; noteInput.querySelector('.count').textContent = st.note.length + '/50'; sync(); };
    fNote.appendChild(noteInput);

    advBox.append(fNotify, fLoc, fNote);
    endGroup.append(fEnd, allDayRow);
    body.append(fTitle, fTime, endGroup, fRepeat, fMembers, advToggle, advBox);
    renderTime(); renderMembers(); renderNotify();

    /* 確定按鈕：編輯時未修改 → disabled（SRS 6.3 / #C18 vs #C19） */
    function sync() {
      const changed = JSON.stringify(st) !== snapshot;
      const bad = timeInvalid();
      markTimeError();
      okBtn.disabled = (isEdit && !changed) || bad;       // 紅字狀態一律存不了
      okBtn.classList.toggle('is-err', bad);
      if (bad) code('C30');
      else if (isEdit) code(changed ? 'C19' : 'C18');
    }
    sync();

    modal.querySelector('.modal-close').onclick = () => closeMask(m);
    modal.querySelector('.btn-cancel').onclick = () => { log('取消 → 關閉視窗，暫存的變更不生效'); closeMask(m); };
    okBtn.onclick = () => {
      /* #C20：重複事件按確定才問套用範圍。
         但改的如果是「重複」這一欄本身（例如每週一改成每週五），就不問，直接改整組——
         改重複規則本來就不可能只改一筆（2026-09-23 更新）。 */
      const repeatChanged = st.repeat !== (ev.repeat || '不重複');
      if (isEdit && st.repeat !== '不重複' && !repeatChanged) {
        openRange('edit', scope => { log(`編輯範圍：${scope}`); askNotify(); });
      } else {
        if (isEdit && repeatChanged) log(`改的是「重複」欄位（${ev.repeat || '不重複'} → ${st.repeat}）→ 不問套用範圍，直接改整組`);
        askNotify();
      }
    };
    function askNotify() { confirmNotify(sent => save(sent)); }
    function save(sent) {
      const list = window.DEMO_DATA.EVENTS;
      /* 通知規則：編輯期間可以重複，儲存時相同的「時機＋時間」只留一組 */
      const before = st.reminders.length;
      const seen = new Set();
      st.reminders = st.reminders.filter(r => {
        const k = r.when + '|' + r.offset;
        if (seen.has(k)) return false;
        seen.add(k); return true;
      });
      if (before > st.reminders.length) log(`通知去重：${before} 組 → ${st.reminders.length} 組（相同的時機＋時間只留一組），再開啟 Modal 看到的是去重後的結果`);
      if (isEdit) Object.assign(ev, { title: st.title, start: st.start, end: st.end, allDay: st.allDay, repeat: st.repeat, location: st.location, note: st.note, reminders: st.reminders, participants: st.participants });
      else list.push({ id: 'n' + Date.now(), title: st.title, start: st.start, end: st.end, allDay: st.allDay, organizer: 'me', organizerName: window.DEMO_DATA.ME, rsvp: 'yes', repeat: st.repeat, location: st.location, note: st.note, reminders: st.reminders, participants: st.participants });
      closeMask(m);
      window.GCEP.refresh();
      toast('儲存成功', 'C12');
      log(`${isEdit ? '儲存編輯' : '建立活動'}「${st.title || '無標題'}」${sent ? '，並寄送通知給相關人員' : '，不寄送通知'}`);
    }

    m.appendChild(modal);
    setTimeout(() => { const i = tInput.querySelector('input'); i && i.focus(); }, 30);
    return st;
  }

  /* ═══════════ #C11 是否傳送通知 ═══════════ */
  function confirmNotify(done) {
    code('C11');
    const m = openMask();
    const a = el('div', 'alert');
    a.dataset.spec = 'alert';
    a.onclick = e => e.stopPropagation();
    a.innerHTML = `<div class="body"><div class="msg">要傳送通知給此行程的相關人員嗎？</div>
      <div class="acts"><button class="btn btn-cancel">不傳送</button><button class="btn btn-primary">傳送</button></div></div>`;
    a.querySelector('.btn-cancel').onclick = () => { closeMask(m); done(false); };
    a.querySelector('.btn-primary').onclick = () => { closeMask(m); done(true); };
    m.appendChild(a);
  }

  /* ═══════════ #C20／#C22 範圍選擇 ═══════════ */
  function openRange(kind, done) {
    code(kind === 'edit' ? 'C20' : 'C22');
    const m = openMask();
    let value = '僅此行程';
    const a = el('div', 'alert');
    a.dataset.spec = 'alert';
    a.onclick = e => e.stopPropagation();
    a.innerHTML = `<div class="head">請選擇${kind === 'edit' ? '編輯' : '刪除'}範圍</div>
      <div class="body">
        <label class="radio-row" data-v="僅此行程"><span class="rb">${I.radioOn}</span>僅此行程</label>
        <label class="radio-row" data-v="這項行程及之後的所有行程"><span class="rb">${I.radioOff}</span>這項行程及之後的所有行程</label>
        <div class="acts"><button class="btn btn-cancel">取消</button><button class="btn btn-primary">${kind === 'edit' ? '編輯' : '刪除'}</button></div>
      </div>`;
    a.querySelectorAll('.radio-row').forEach(r => r.onclick = () => {
      value = r.dataset.v;
      a.querySelectorAll('.radio-row').forEach(x => x.querySelector('.rb').innerHTML = x === r ? I.radioOn : I.radioOff);
    });
    a.querySelector('.btn-cancel').onclick = () => closeMask(m);
    a.querySelector('.btn-primary').onclick = () => { closeMask(m); done(value); };
    m.appendChild(a);
  }

  /* ═══════════ #C21 刪除確認 ═══════════ */
  function confirmDelete(done) {
    code('C21');
    const m = openMask();
    const a = el('div', 'alert');
    a.dataset.spec = 'alert';
    a.onclick = e => e.stopPropagation();
    a.innerHTML = `<div class="body"><div class="msg">您確定要刪除嗎？</div>
      <div class="acts"><button class="btn btn-cancel">取消</button><button class="btn btn-primary">刪除</button></div></div>`;
    a.querySelector('.btn-cancel').onclick = () => { log('取消刪除 → 關閉彈窗，不執行刪除'); closeMask(m); };
    a.querySelector('.btn-primary').onclick = () => { closeMask(m); done(); };
    m.appendChild(a);
  }

  /* ═══════════ #C12／#C23 成功提示 ═══════════ */
  function toast(text, c) {
    code(c);
    const m = openMask();
    const t = el('div', 'toast-card', `<span class="tick">${I.tickBig}</span>${text}`);
    t.dataset.spec = 'toast';
    m.appendChild(t);
    setTimeout(() => closeMask(m), 2000);   // 秒數依系統既有設定
  }

  /* ═══════════ #C26～#C28 選擇成員 ═══════════ */
  function openPicker(current, done) {
    code('C26');
    const m = openMask();
    const chosen = new Set(current.filter(p => !p.owner).map(p => p.name));
    const modal = el('div', 'modal picker');
    modal.dataset.spec = 'picker';
    modal.onclick = e => e.stopPropagation();
    modal.innerHTML = `<div class="modal-head">選擇成員<button class="modal-close">${I.cross}</button></div>
      <div class="tabs">
        <div class="tab is-on"><span class="dot"></span><span class="tx">通訊錄</span></div>
        <div class="tab"><span class="dot"></span><span class="tx">常用群組</span></div>
        <div class="tab"><span class="dot"></span><span class="tx">常用聯絡人</span></div>
      </div>
      <div class="search"><span>${I.search}</span><input placeholder="請輸入"><button class="adv">進階搜尋</button></div>
      <div class="org">${I.company}<span>互動資通</span></div>
      <div class="list"></div>
      <div class="modal-foot"><button class="btn btn-cancel">取消</button><button class="btn btn-primary">確定</button></div>`;
    const list = modal.querySelector('.list');
    const search = modal.querySelector('.search input');

    function render() {
      const kw = search.value.trim();
      list.innerHTML = '';
      const all = el('div', 'prow');
      all.innerHTML = `<span class="cb">${I.checkOff}</span><span>全選/清除</span>`;
      all.onclick = () => {
        const selectable = PEOPLE.filter(p => p.state === 'ok');
        const allOn = selectable.every(p => chosen.has(p.name));
        selectable.forEach(p => allOn ? chosen.delete(p.name) : chosen.add(p.name));
        render();
      };
      list.appendChild(all);
      for (const d of ['資訊管理部', '人資管理部']) {
        const row = el('div', 'prow');
        row.innerHTML = `<span class="cb" style="width:26px;flex:0 0 26px">${I.department}</span><span>${d}</span>`;
        list.appendChild(row);
      }
      for (const p of PEOPLE) {
        if (p.state === 'hidden') continue;                                  // #C28 隱藏受邀角色
        if (kw && !p.name.toLowerCase().includes(kw.toLowerCase())) continue;
        const row = el('div', 'prow member' + (p.state !== 'ok' ? ' is-disabled' : ''));
        const on = chosen.has(p.name);
        const tag = p.state === 'invited' ? '邀請中' : p.state === 'nope' ? '不可邀請' : (p.tag || '');
        row.innerHTML =
          `<span class="cb${p.state === 'nope' ? ' hidden-cb' : ''}">${p.state === 'invited' ? I.checkOn : on ? I.checkOn : I.checkOff}</span>
           <span class="ava">${I.userPic}</span>
           <span class="grow"><span class="nm">${p.name}</span>${tag ? ` <span class="tag">${tag}${p.state === 'ok' ? '｜目前上線中' : ''}</span>` : ''}
           <div class="dept">${p.dept}</div></span>`;
        if (p.state === 'ok') row.onclick = () => { on ? chosen.delete(p.name) : chosen.add(p.name); render(); };
        list.appendChild(row);
      }
    }
    search.oninput = render;
    render();

    modal.querySelector('.modal-close').onclick = () => closeMask(m);
    modal.querySelector('.btn-cancel').onclick = () => closeMask(m);
    modal.querySelector('.btn-primary').onclick = () => {
      const owner = current.find(p => p.owner);
      const picked = PEOPLE.filter(p => chosen.has(p.name)).map(p => ({ name: p.name, dept: p.dept, perm: (current.find(c => c.name === p.name) || {}).perm || '僅檢視' }));
      closeMask(m);
      done([owner, ...picked].filter(Boolean));
      log(`選擇成員：共 ${picked.length + 1} 人（主辦人固定第一位，其餘照加入順序）`);
    };
    m.appendChild(modal);
  }

  /* ═══════════ 活動資訊卡（#C14～#C17／#C24） ═══════════ */
  function openInfo(ev, anchorEl) {
    const isOwner = ev.organizer === 'me';
    const canEdit = isOwner || (ev.myPerm || '可編輯') === '可編輯';
    code(isOwner ? 'C24' : ev.rsvp === 'no' ? 'C15' : ev.rsvp === 'yes' ? 'C16' : 'C14');
    const m = openMask(true);                              // 稿上背景不變暗
    const card = el('div', 'info-card');
    card.dataset.spec = 'infocard';
    card.onclick = e => e.stopPropagation();

    const ME = window.DEMO_DATA.ME;
    /* 建立者那一列的回覆狀態就是他自己的 rsvp，所以他改回覆時徽章與統計都會跟著動 */
    const people = ev.participants || (ev.participants = isOwner
      ? [{ name: ME, dept: '', owner: true, rsvp: ev.rsvp }, { name: 'Lily', rsvp: 'no' }, { name: 'Amy Brown', rsvp: 'none' }]
      : [{ name: ev.organizerName, dept: '', owner: true, rsvp: 'yes' }, { name: 'Lily', rsvp: 'no' }, { name: ME, rsvp: ev.rsvp }]);
    const me = people.find(p => p.name === ME);      // 建立者也算，他也要能回覆
    /* 出席統計（3.12）＋ 參與人列（徽章＝回覆狀態） */
    const peopleHTML = () => {
      const cnt = { yes: 0, no: 0, none: 0 };
      people.forEach(p => { cnt[p.rsvp === 'yes' ? 'yes' : p.rsvp === 'no' ? 'no' : 'none']++; });
      return `參與人<div class="sub">${cnt.yes}人接受、${cnt.no}人婉拒、${cnt.none}人未回覆</div>
        <div class="info-people">${people.map(p => `
          <div class="who"><span class="ava"><span class="pic">${I.userPic}</span>${
            p.rsvp === 'yes' ? '<span class="badge yes">✓</span>' : p.rsvp === 'no' ? '<span class="badge no">✕</span>' : ''
          }</span><span><span class="tx">${p.name}</span>${p.owner ? '<div class="sub">主辦人</div>' : ''}</span></div>`).join('')}</div>`;
    };
    const timeText = ev.allDay
      ? ymd(ev.start) + (+sod(addDays(ev.end, -1)) > +sod(ev.start) ? ' – ' + ymd(addDays(ev.end, -1)) : '')
      : `${ymd(ev.start)}<span class="sep"></span>${hm(ev.start)} – ${hm(ev.end)}`;

    card.innerHTML = `
      <div class="info-head">活動資訊
        <span class="acts">${canEdit ? `<button class="more" aria-label="更多">${I.more}</button>` : ''}
          <button class="close" aria-label="關閉">${I.cross}</button></span></div>
      <div class="info-body">
        <div class="info-title"><span class="sq"></span><h2>${ev.title || '無標題'}</h2></div>
        <div class="info-row"><span class="ic">${I.clock}</span><span class="tx info-time">${timeText}</span></div>
        ${ev.location ? `<div class="info-row is-loc"><span class="ic">${I.location}</span><span class="tx">${ev.location}</span></div>` : ''}
        <div class="info-row"><span class="ic">${I.user}</span><span class="tx people-box" style="flex:1">${peopleHTML()}</span></div>
        ${ev.note ? `<div class="info-row"><span class="ic">${I.note}</span><span class="tx">${ev.note}</span></div>` : ''}
        <div class="info-row"><span class="ic">${I.calIcon}</span><span class="tx">${ev.organizerName}
          <div class="sub">建立者：${ev.organizerName}</div></span></div>
      </div>`;

    /* 是否參加？——不論是不是建立者都顯示；差別只在預設值（建立者預設「參加」） */
    {
      const bar = el('div', 'rsvp');
      bar.dataset.spec = 'rsvp';
      bar.innerHTML = '<span class="q">是否參加？</span>';
      [['yes', '是'], ['no', '否'], ['maybe', '不確定']].forEach(([v, label]) => {
        const b = el('button', '', label);
        b.setAttribute('aria-pressed', String(ev.rsvp === v));
        b.onclick = () => {
          ev.rsvp = v;
          if (me) me.rsvp = v;                       // 我在參與人清單裡的回覆狀態
          bar.querySelectorAll('button').forEach((x, i) => x.setAttribute('aria-pressed', String(['yes', 'no', 'maybe'][i] === v)));
          const box = card.querySelector('.people-box');
          if (box) box.innerHTML = peopleHTML();      // 徽章與出席統計即時更新（SRS 6.1）
          window.GCEP.refresh();                      // 月曆卡片樣式同步（3.10）
          log(`回覆「${label}」→ 我的徽章改為 ${v === 'yes' ? '打勾' : v === 'no' ? '打叉' : '無'}、出席統計重算、月曆卡片改為 ${v === 'yes' ? '實心' : v === 'no' ? '線框＋刪除線' : '線框'}` +
            (isOwner ? '（我是建立者，不寄通知給自己）' : '（通知主辦人）'));
          code(v === 'no' ? 'C15' : v === 'yes' ? 'C16' : 'C14');
        };
        bar.appendChild(b);
      });
      card.appendChild(bar);
    }

    card.querySelector('.close').onclick = () => closeMask(m);
    const moreBtn = card.querySelector('.more');
    if (moreBtn) moreBtn.onclick = e => {
      e.stopPropagation();
      closePopups();
      code('C17');
      const menu = el('div', 'more-menu');
      menu.innerHTML = '<button data-a="edit">編輯</button><button data-a="del">刪除</button>';
      menu.onclick = ee => {
        ee.stopPropagation();
        const a = ee.target.closest('button');
        if (!a) return;
        menu.remove();
        if (a.dataset.a === 'edit') { closeMask(m); openForm('edit', ev); }
        else {
          const del = () => {
            window.DEMO_DATA.EVENTS.splice(window.DEMO_DATA.EVENTS.indexOf(ev), 1);
            closeMask(m); window.GCEP.refresh(); toast('刪除成功', 'C23');
            log(`刪除活動「${ev.title || '無標題'}」`);
          };
          if (ev.repeat && ev.repeat !== '不重複') openRange('delete', scope => { log(`刪除範圍：${scope}`); del(); });
          else confirmDelete(del);
        }
      };
      card.appendChild(menu);
    };

    m.appendChild(card);
    position(card, anchorEl);
    return card;
  }

  /* 資訊卡定位：SRS 3.12 的五步規則，與清單視窗共用 window.POS */
  function position(card, anchor) {
    let target, from;
    if (anchor && anchor.el) { target = anchor.el; from = anchor.from || '格子'; }
    else if (anchor && anchor.rect) { target = anchor.rect; from = anchor.from || '清單視窗'; }
    else if (anchor instanceof Element) {
      const cell = anchor.closest('td.fc-daygrid-day') || anchor.closest('td.fc-timegrid-col') || anchor;
      target = cell;
      from = cell.classList.contains('fc-daygrid-day') ? '日期格' : cell.classList.contains('fc-timegrid-col') ? '時間格' : '行程卡';
    } else {
      const m = document.getElementById('main').getBoundingClientRect();
      target = { left: m.left + 200, right: m.left + 300, top: m.top + 200, bottom: m.top + 220, h: 20 };
      from = '（無參考對象）';
    }
    card.style.position = 'fixed';
    const put = () => {
      const r = window.POS.place(target, card.offsetWidth || 400, card.offsetHeight);
      card.style.left = r.left + 'px';
      card.style.top = r.top + 'px';
      return r;
    };
    const p = put();
    log(window.POS.describe(p, '資訊卡', from));
    put();   // 事件紀錄可能讓下方 DEMO 列換行、內容區變矮 → 用新的邊界再算一次
  }

  return {
    openCreate(dateOrEvent, opts = {}) {
      const d = dateOrEvent instanceof Date ? dateOrEvent : new Date();
      let start, end, allDay = !!opts.allDay;
      if (opts.hour != null) { start = new Date(d); start.setHours(opts.hour, 0, 0, 0); }
      else if (allDay) { start = sod(d); }
      else { const n = nextSlot(new Date()); start = sod(d); start.setHours(n.getHours(), n.getMinutes(), 0, 0); }
      end = allDay ? addDays(sod(d), 1) : new Date(+start + 3600e3);
      if (!allDay && +sod(end) > +sod(start)) { end = new Date(start); end.setHours(23, 45, 0, 0); }
      /* 規格模式用：直接開在錯誤狀態（#C30 同一天時分顛倒、#C31 結束日期早一天） */
      if (opts.bad === 'time') { start = new Date(d); start.setHours(11, 0, 0, 0); end = new Date(d); end.setHours(10, 0, 0, 0); }
      if (opts.bad === 'date') {
        start = allDay ? addDays(sod(d), 1) : new Date(d);
        if (!allDay) start.setHours(11, 0, 0, 0);
        end = addDays(sod(start), -1);
        if (!allDay) end.setHours(11, 0, 0, 0);
      }
      return openForm('create', { title: '', start, end, allDay });
    },
    openEdit: ev => openForm('edit', ev),
    openInfo,
    openPicker,
    close: closeAllMasks,
    /* Demo 的稿號選單用：直接跳到某一張稿的狀態 */
    demo: { confirmNotify, openRange, confirmDelete, toast, openForm },
  };
})();
