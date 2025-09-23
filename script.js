/* Theme toggle with localStorage */
(function(){
  const root = document.documentElement;
  const btn = document.getElementById('theme-toggle');
  const stored = localStorage.getItem('theme');
  if (stored === 'light') root.classList.add('light');
  btn.addEventListener('click', () => {
    root.classList.toggle('light');
    localStorage.setItem('theme', root.classList.contains('light') ? 'light' : 'dark');
    btn.textContent = root.classList.contains('light') ? '🌚' : '🌙';
  });
})();

/* Footer year */
document.getElementById('year').textContent = new Date().getFullYear();

/* Minimal animated background using Canvas */
(function(){
  const c = document.getElementById('bg');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const ctx = c.getContext('2d');
  let w, h, dots;

  function resize(){
    w = c.clientWidth; h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.scale(dpr, dpr);
    spawn();
  }
  function spawn(){
    const count = Math.floor((w*h)/25000);
    dots = Array.from({length: count}, () => ({
      x: Math.random()*w, y: Math.random()*h,
      vx: (Math.random()-.5)*0.6, vy:(Math.random()-.5)*0.6,
      r: Math.random()*1.8+0.4
    }));
  }
  function step(){
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    for(const d of dots){
      d.x+=d.vx; d.y+=d.vy;
      if(d.x<0||d.x>w) d.vx*=-1;
      if(d.y<0||d.y>h) d.vy*=-1;
      ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2); ctx.fill();
    }
    requestAnimationFrame(step);
  }
  resize(); step();
  window.addEventListener('resize', resize);
})();
