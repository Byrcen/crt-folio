/** "01 : 33 pm" style live clock, updates on the minute. */
export function initClock() {
  const el = document.getElementById('hud-clock')!;
  const render = () => {
    const d = new Date();
    let h = d.getHours();
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    const hh = String(h).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    el.textContent = `${hh} : ${mm} ${ampm}`;
  };
  render();
  setInterval(render, 5_000);
}
