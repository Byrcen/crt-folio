/** "13 : 33" 24 小时制实时时钟，按分钟更新。 */
export function initClock() {
  const el = document.getElementById('hud-clock')!;
  const render = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    el.textContent = `${hh} : ${mm}`;
  };
  render();
  setInterval(render, 5_000);
}
