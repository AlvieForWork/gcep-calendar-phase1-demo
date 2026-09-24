/* GCEP 行事曆 Phase 1 Demo — 假資料
 *
 * 日期全部以「今天」為基準平移，任何一天打開都看得到同樣的情境。
 * 只比版面與規則，不比文字內容（人名、行程名稱跟稿上不同是正常的）。
 *
 * organizer: 'me'    我建立的 → 卡片實心
 *            'other' 別人建立、我是參與人
 * rsvp:      「這個使用者自己的回覆狀態」，卡片樣式只看它，不看是誰建立的：
 *            'yes' 參加 → 實心｜'maybe' 不確定、'none' 未回覆 → 線框｜'no' 不參加 → 線框＋刪除線
 *            我自己建立的活動，這個欄位預設就是 'yes'（建立者預設參加），不是靠程式判斷建立者
 */
(function () {
  const ME = 'Johanna White';
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const at = (dayOffset, h = 0, m = 0) => {
    const d = new Date(t0); d.setDate(d.getDate() + dayOffset); d.setHours(h, m, 0, 0); return d;
  };
  // 下週日（週視圖、日視圖「只有一筆」的情境放在下週，避開今天那一堆）
  const nextSun = 7 - t0.getDay();

  let seq = 0;
  const ev = (title, start, end, o = {}) => ({
    id: 'e' + (++seq), title, start, end,
    allDay: !!o.allDay,
    organizer: o.organizer || 'me',
    organizerName: o.organizer === 'other' ? (o.by || 'Emma Tylor') : ME,
    rsvp: o.rsvp || 'yes',
    repeat: o.repeat || '不重複',
    location: o.location || '',
    note: o.note || '',
    reminders: o.reminders || [{ when: '開始前', offset: '30分鐘' }],
    participants: o.participants || null,     // null → 資訊卡用預設三人示範
    myPerm: o.myPerm || '可編輯',
  });
  const allDay = (title, fromOffset, days, o = {}) =>
    ev(title, at(fromOffset), at(fromOffset + days), { ...o, allDay: true });

  const EVENTS = [];

  /* ── 今天：全天 6 筆（#A08 全天列 2 筆＋還有 4 個） ── */
  const longTitle = '機關學校月會：政府單位或學校的例行性集會，用於公告、動員、表揚。';
  EVENTS.push(allDay(longTitle, 0, 1));
  EVENTS.push(allDay(longTitle, 0, 1, { organizer: 'other', rsvp: 'yes' }));
  EVENTS.push(allDay('員工健康檢查', 0, 1));
  EVENTS.push(allDay('資安稽核日', 0, 1, { organizer: 'other', rsvp: 'none' }));
  EVENTS.push(allDay('季度目標回顧', 0, 1));
  EVENTS.push(allDay('辦公室消毒', 0, 1, { organizer: 'other', rsvp: 'yes', by: 'Leo Chen' }));

  /* ── 今天 10:00 同一時段 15 筆（週視圖 5 筆＋「+10」、日視圖 12 筆＋「+3」） ── */
  const names = ['週會', '設計師會議', '週例會', '行銷團隊會議', '業務會議', '產品同步', '招募面談',
                 '客服檢討', '預算討論', '供應商會議', '品牌討論', '法務諮詢', '工程對焦', '營運週報', '教育訓練說明'];
  names.forEach((n, i) => EVENTS.push(ev(n, at(0, 10), at(0, 11),
    i === 3 ? { organizer: 'other', rsvp: 'maybe' } : i === 6 ? { organizer: 'other', rsvp: 'no' } : {})));

  /* ── 今天 14:00 單筆 ── */
  EVENTS.push(ev('週例會', at(0, 14), at(0, 15), {
    repeat: '每週' + ['日','一','二','三','四','五','六'][t0.getDay()],
    location: '竹北二廠 3F 會議室',
    note: '請攜帶筆電',
    participants: [
      { name: ME, dept: '資訊管理處/系統維運部 - 組長', perm: '可編輯', owner: true, rsvp: 'yes' },
      { name: 'Lily', dept: '資訊管理處/系統維運部 - 資深工程師', perm: '僅檢視', rsvp: 'no' },
      { name: 'Molly', dept: '研發一處/產品規劃組 - 規劃師', perm: '可編輯', rsvp: 'none' },
    ],
  }));

  /* ── 明天：三種卡片樣式（#A10 hover 用這格示範） ── */
  EVENTS.push(ev('', at(1, 11), at(1, 12)));                                                       // 無標題 → 實心
  EVENTS.push(ev('設計審查', at(1, 11), at(1, 12), {
    organizer: 'other', rsvp: 'none', location: '竹北二廠', note: '請攜帶筆電', myPerm: '可編輯',
    participants: [
      { name: 'Emma Tylor', dept: '資訊管理處/系統維運部 - 處長', owner: true, rsvp: 'yes' },
      { name: 'Lily', dept: '資訊管理處/系統維運部 - 資深工程師', rsvp: 'no' },
      { name: ME, dept: '資訊管理處/系統維運部 - 組長', rsvp: 'none' },
    ],
  }));          // 未回覆 → 線框
  EVENTS.push(ev('客戶簡報', at(1, 15), at(1, 16), { organizer: 'other', rsvp: 'no', myPerm: '僅檢視' }));   // 僅檢視 → 資訊卡沒有 ⋯           // 不參加 → 線框＋刪除線
  EVENTS.push(ev('專案啟動會', at(1, 16), at(1, 17), { organizer: 'other', rsvp: 'maybe' }));      // 不確定 → 線框
  EVENTS.push(ev('一對一面談', at(1, 17), at(1, 18)));
  EVENTS.push(ev('月底結帳', at(1, 18), at(1, 19)));

  /* ── 前天：長標題（卡片固定高度、裁切） ── */
  EVENTS.push(ev('產品規劃討論：第三季行事曆模組上線前的最後一次跨部門確認會議', at(-2, 9, 30), at(-2, 11)));
  EVENTS.push(ev('午餐會報', at(-2, 12), at(-2, 13), { organizer: 'other', rsvp: 'yes' }));

  /* ── 下週：跨天全天長條（週一～週四）＋ 單筆 14:00 ── */
  EVENTS.push(allDay('新人教育訓練', nextSun + 1, 4));
  EVENTS.push(ev('週例會', at(nextSun + 1, 14), at(nextSun + 1, 15)));

  /* ── 下週五 10:00 → 下下週二 12:00：有時間的跨週長條 ── */
  EVENTS.push(ev('南部客戶拜訪', at(nextSun + 5, 10), at(nextSun + 9, 12), { organizer: 'other', rsvp: 'yes' }));

  /* ── 上週：有時間的跨天（兩天） ── */
  EVENTS.push(ev('年度盤點', at(nextSun - 12, 9), at(nextSun - 11, 18)));

  /* ── 零星行程（讓月視圖不要太空） ── */
  EVENTS.push(ev('設計系統分享', at(-5, 15), at(-5, 16)));
  EVENTS.push(ev('部門聚餐', at(3, 18, 30), at(3, 20), { organizer: 'other', rsvp: 'maybe' }));
  EVENTS.push(ev('季度規劃', at(12, 9), at(12, 12)));
  EVENTS.push(ev('供應商評選', at(-20, 14), at(-20, 15)));
  EVENTS.push(ev('年終規劃', at(25, 10), at(25, 11)));
  EVENTS.push(allDay('國定假日', 18, 1, { organizer: 'other', rsvp: 'yes', by: '人資部' }));

  /* ── 讓每一欄都有東西可以點（驗資訊卡定位用） ──
     月視圖：本月每個星期欄至少有一格有行程卡
     週視圖：本週每一天都有一筆 09:00 的行程 */
  const monthFill = ['專案會議', '需求討論', '設計同步', '工程對焦', '進度追蹤', '客戶會議', '值班'];
  const seen = new Set(EVENTS.filter(e => !e.allDay).map(e => e.start.toDateString()));
  const firstOfMonth = new Date(t0.getFullYear(), t0.getMonth(), 1);
  const daysInMonth = new Date(t0.getFullYear(), t0.getMonth() + 1, 0).getDate();
  const filled = new Set();
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(t0.getFullYear(), t0.getMonth(), d);
    const wd = day.getDay();
    if (filled.has(wd)) continue;
    if (seen.has(day.toDateString())) { filled.add(wd); continue; }   // 那一欄本來就有行程了
    const s = new Date(day); s.setHours(9, 0, 0, 0);
    const e = new Date(day); e.setHours(10, 0, 0, 0);
    EVENTS.push(ev(monthFill[wd], s, e));
    filled.add(wd);
  }
  for (let i = 0; i < 7; i++) {                                        // 本週每一天 09:00
    const day = new Date(t0); day.setDate(t0.getDate() - t0.getDay() + i);
    const s = new Date(day); s.setHours(9, 0, 0, 0);
    const e = new Date(day); e.setHours(10, 0, 0, 0);
    if (!EVENTS.some(x => !x.allDay && +x.start === +s)) EVENTS.push(ev(monthFill[i], s, e));
  }

  /* ── 月曆每一格都放到「還有 N 個」會出現（2026-09-24 Alvie 指示：想看實際長相） ──
     筆數刻意有多有少（3～10 筆），這樣清單視窗的短版與滿版（超過 314 就內部捲動）都看得到。
     已經有行程的那一天只補到目標筆數，不覆蓋原本的情境資料。 */
  const fillTitles = ['晨會', '需求訪談', '設計審查', '週報', '跨部門同步', '客戶回訪', '技術評估', '驗收會議', '例行追蹤', '結案討論'];
  const gridFirst = new Date(t0.getFullYear(), t0.getMonth(), 1);
  gridFirst.setDate(gridFirst.getDate() - gridFirst.getDay());          // 月曆格第一格
  for (let i = 0; i < 42; i++) {
    const day = new Date(gridFirst); day.setDate(gridFirst.getDate() + i);
    const target = 3 + (i % 8);                                          // 3～10 筆
    const already = EVENTS.filter(e => !e.allDay && e.start.toDateString() === day.toDateString()).length;
    for (let k = already; k < target; k++) {
      const s2 = new Date(day); s2.setHours(8 + k, 0, 0, 0);
      const e2 = new Date(s2); e2.setHours(s2.getHours() + 1);
      EVENTS.push(ev(fillTitles[k % fillTitles.length], s2, e2));
    }
  }

  window.DEMO_DATA = { ME, EVENTS, TODAY: t0, nextSun };
})();
