/* GCEP 行事曆 Phase 1 Demo — 浮層定位（SRS 3.12 資訊卡／3.13 清單視窗共用）
 *
 * 五個步驟，依序試，第一個放得下的就用：
 *   1 參考對象右邊 ≥ 寬 → 貼右緣      2 左邊 ≥ 寬 → 貼左緣
 *   3 上面放得下 → 正上方、左緣對齊    4 下面放得下 → 正下方、左緣對齊
 *   5 都放不下 → 貼齊定位邊界右緣
 * 垂直：1、2、5 對齊參考對象置中；最後一律「保證完整顯示」，超出邊界就往內推。
 *
 * 定位邊界：左＝視窗左緣（可蓋過左側導覽）、右＝Main Content 右邊界、上下＝內容區。
 */
window.POS = (function () {
  function bounds() {
    const m = document.getElementById('main').getBoundingClientRect();
    return { left: 0, right: m.right, top: m.top, bottom: m.bottom, contentLeft: m.left };
  }
  const rectOf = el => {
    const r = el.getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, w: r.width, h: r.height };
  };

  /** target：DOM 元素或 {left,right,top,bottom,h} 矩形；W／H：浮層的寬高 */
  function place(target, W, H) {
    const t = target instanceof Element ? rectOf(target) : target;
    const b = bounds();
    const space = {
      right: b.right - t.right,
      left: t.left - b.contentLeft,      // 判斷用內容區左緣（Figma 稿即此結果）
      above: t.top - b.top,
      below: b.bottom - t.bottom,
    };
    let left, top, step;
    if (space.right >= W) { step = 1; left = t.right; top = t.top + t.h / 2 - H / 2; }
    else if (space.left >= W) { step = 2; left = t.left - W; top = t.top + t.h / 2 - H / 2; }
    else if (space.above >= H) { step = 3; left = t.left; top = t.top - H; }
    else if (space.below >= H) { step = 4; left = t.left; top = t.bottom; }
    else { step = 5; left = b.right - W; top = t.top + t.h / 2 - H / 2; }

    const pushed = [];
    if (left + W > b.right) { left = b.right - W; pushed.push('右'); }
    if (left < b.left) { left = b.left; pushed.push('左'); }       // 左邊界＝視窗左緣
    if (top + H > b.bottom) { top = b.bottom - H; pushed.push('下'); }
    if (top < b.top) { top = b.top; pushed.push('上'); }

    return { left: Math.round(left), top: Math.round(top), step, pushed, space };
  }

  const STEP = {
    1: '① 右邊放得下 → 貼參考對象右緣',
    2: '② 左邊放得下 → 貼參考對象左緣',
    3: '③ 上面放得下 → 放正上方、左緣對齊',
    4: '④ 下面放得下 → 放正下方、左緣對齊',
    5: '⑤ 四邊都放不下 → 貼齊內容區右邊界',
  };
  /** 給規格模式的事件紀錄用 */
  const describe = (p, what, from) =>
    `${what}定位：${STEP[p.step]}（參考：${from}）` +
    (p.pushed.length ? `，往內推：${p.pushed.join('、')}` : '');

  return { bounds, rectOf, place, STEP, describe };
})();
