/**
 * =========================================================
 *  CANVAS FX - Feliz 2026
 *  - Separado em script.js para boas práticas
 *  - Código comentado por blocos funcionais
 * =========================================================
 */

/* =========================================================
 * 1) Referências do DOM (elementos da página)
 * ========================================================= */
const canvas = document.getElementById("fx");
const ctx = canvas.getContext("2d");

const hint = document.getElementById("hint");
const card = document.getElementById("card");
const countdownEl = document.getElementById("countdown");
const cardTitle = document.getElementById("cardTitle");
const cardMsg = document.getElementById("cardMsg");

/* =========================================================
 * 2) Variáveis de tela (canvas responsivo)
 * ========================================================= */
let w = window.innerWidth;
let h = window.innerHeight;
let dpr = window.devicePixelRatio || 1;

/* =========================================================
 * 3) Coleções de partículas / objetos animados
 * ========================================================= */

/**
 * Estrelas de fundo: pontinhos com brilho suave que “respiram”
 */
let bgStars = [];

/**
 * Fogos:
 * - rockets: foguetes que sobem até um alvo
 * - sparks: partículas da explosão
 */
let rockets = [];
let sparks = [];

/**
 * Confete: quadradinhos que caem de leve
 */
let confetti = [];

/* =========================================================
 * 4) Máquina de estados da animação
 * =========================================================
 * idle     -> esperando clique (mostra hint)
 * counting -> card visível com contagem 10..0
 * finale   -> card some; fogos intensos por 5s
 * message  -> blur no fundo; card com mensagem final; fogos continuam
 */
let state = "idle";

/* =========================================================
 * 5) Timers e controle de tempo
 * ========================================================= */
let countdown = 10;
let countdownInterval = null;

let finaleStart = 0;
let lastFirework = 0;

let lastTime = performance.now();

/* Cadência de fogos conforme o estado */
const FIREWORK_RATE_FINALE = [90, 150];    // muito intenso (durante 5s)
const FIREWORK_RATE_MESSAGE = [250, 420];  // continua ao fundo com mensagem

/* =========================================================
 * 6) Utilitários
 * ========================================================= */
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

/* =========================================================
 * 7) Resize: ajusta canvas ao tamanho da tela
 * ========================================================= */
function resize() {
  w = window.innerWidth;
  h = window.innerHeight;
  dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);

  // Define transformação para desenhar em “pixels CSS”
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  createBgStars();
}

window.addEventListener("resize", resize);
resize();

/* =========================================================
 * 8) Fundo: estrelas e gradiente
 * ========================================================= */

/**
 * Cria um conjunto de estrelas no topo do céu
 */
function createBgStars() {
  bgStars = [];
  const count = Math.floor((w * h) / 9000);

  for (let i = 0; i < count; i++) {
    bgStars.push({
      x: Math.random() * w,
      y: Math.random() * h * 0.85,
      r: Math.random() * 1.4 + 0.25,
      t: Math.random() * Math.PI * 2,          // fase
      s: 0.002 + Math.random() * 0.004,        // velocidade do “piscar”
      hue: Math.random() < 0.5 ? 190 : 310     // tom frio/rosa
    });
  }
}

/**
 * Desenha gradiente noturno no fundo
 */
function drawBackground() {
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, "#0a0b30");
  grd.addColorStop(0.55, "#040417");
  grd.addColorStop(1, "#02020c");

  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Desenha estrelas com brilho pulsante
 */
function drawBgStars(dt) {
  for (const s of bgStars) {
    s.t += s.s * dt;
    const a = 0.35 + Math.sin(s.t) * 0.35;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 8;
    ctx.shadowColor = `hsl(${s.hue}, 100%, 70%)`;
    ctx.fill();
    ctx.restore();
  }
}

/* =========================================================
 * 9) Fogos: criação e explosão
 * ========================================================= */

/**
 * Cria um foguete indo do chão até um alvo no céu.
 * O foguete guarda um "tail" (rastro) para desenhar a cauda.
 */
function createFirework(x = null, y = null) {
  const tx = x ?? rand(120, w - 120);
  const ty = y ?? rand(90, h * 0.55);

  rockets.push({
    x: tx + rand(-24, 24),
    y: h + rand(10, 70),
    tx, ty,
    speed: rand(8.0, 12.0),
    color: `hsl(${Math.random() * 360}, 100%, 62%)`,
    radius: rand(2.6, 3.6),
    tail: []
  });
}

/**
 * Explode em partículas (sparks) quando o foguete chega ao alvo.
 */
function explode(x, y, baseColor) {
  let hue = Math.floor(Math.random() * 360);

  // Tenta extrair o hue do "hsl(...)" do foguete para manter paleta consistente
  const m = /hsl\((\d+)/.exec(baseColor);
  if (m) hue = parseInt(m[1], 10);

  // Paleta de cores para a explosão
  const palette = [
    `hsl(${hue}, 100%, 70%)`,
    `hsl(${(hue + 40) % 360}, 100%, 70%)`,
    `hsl(${(hue + 90) % 360}, 100%, 72%)`,
    "#ffffff"
  ];

  const count = 120 + Math.floor(Math.random() * 80);

  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = rand(1.8, 7.2);

    sparks.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      g: rand(0.03, 0.09),           // gravidade
      r: rand(1.0, 2.7),
      a: 1,
      da: rand(0.010, 0.022),        // fade
      color: palette[Math.floor(Math.random() * palette.length)]
    });
  }

  // Em algumas explosões, solta confete
  if (Math.random() < 0.45) spawnConfetti();
}

/* =========================================================
 * 10) Fogos: renderização (rockets + sparks)
 * ========================================================= */

/**
 * Move foguetes, desenha rastro e explode ao chegar no alvo
 */
function drawRockets(dt) {
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];

    const dx = r.tx - r.x;
    const dy = r.ty - r.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // Guarda rastro
    r.tail.push({ x: r.x, y: r.y });
    if (r.tail.length > 12) r.tail.shift();

    // Chegou perto o bastante: explode
    if (dist < r.speed) {
      explode(r.x, r.y, r.color);
      rockets.splice(i, 1);
      continue;
    }

    // Move direção ao alvo
    r.x += (dx / dist) * r.speed * (dt / 16.67);
    r.y += (dy / dist) * r.speed * (dt / 16.67);

    // Desenha rastro + cabeça
    ctx.save();
    ctx.lineWidth = 2;

    for (let t = 0; t < r.tail.length - 1; t++) {
      const p = t / (r.tail.length - 1);
      ctx.globalAlpha = (1 - p) * 0.45;

      ctx.beginPath();
      ctx.moveTo(r.tail[t].x, r.tail[t].y);
      ctx.lineTo(r.tail[t + 1].x, r.tail[t + 1].y);

      ctx.strokeStyle = r.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = r.color;
      ctx.stroke();
    }

    // Cabeça do foguete
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.fillStyle = r.color;
    ctx.shadowBlur = 18;
    ctx.shadowColor = r.color;
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Move e desenha partículas da explosão (sparks)
 */
function drawSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const p = sparks[i];

    p.x += p.vx * (dt / 16.67);
    p.y += p.vy * (dt / 16.67);
    p.vy += p.g * (dt / 16.67);
    p.a -= p.da * (dt / 16.67);

    // Remove quando some
    if (p.a <= 0 || p.y > h + 90) {
      sparks.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = clamp01(p.a);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.shadowBlur = p.r * 6;
    ctx.shadowColor = p.color;
    ctx.fill();
    ctx.restore();
  }
}

/* =========================================================
 * 11) Confete: criação e renderização
 * ========================================================= */

/**
 * Gera confetes (partículas quadradas) que caem na tela
 */
function spawnConfetti() {
  const count = 120;

  for (let i = 0; i < count; i++) {
    confetti.push({
      x: rand(0, w),
      y: rand(-h * 0.2, 0),
      vx: rand(-1.4, 1.4),
      vy: rand(1.2, 3.9),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.12, 0.12),
      size: rand(3, 7),
      a: 1,
      hue: rand(0, 360)
    });
  }

  // Mantém a lista sob controle
  if (confetti.length > 1000) confetti.splice(0, confetti.length - 1000);
}

/**
 * Desenha confetes caindo
 */
function drawConfetti(dt) {
  for (let i = confetti.length - 1; i >= 0; i--) {
    const c = confetti[i];

    c.x += c.vx * (dt / 16.67);
    c.y += c.vy * (dt / 16.67);
    c.rot += c.vr * (dt / 16.67);
    c.a -= 0.0017 * (dt / 16.67);

    if (c.a <= 0 || c.y > h + 60) {
      confetti.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = clamp01(c.a);
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);

    const color = `hsl(${c.hue}, 100%, 70%)`;
    ctx.fillStyle = color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.62);
    ctx.restore();
  }
}

/* =========================================================
 * 12) Fluxo principal (contagem -> show -> mensagem)
 * ========================================================= */

/**
 * Para o intervalo da contagem se estiver rodando
 */
function stopCountdownInterval() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

/**
 * Inicia o fluxo no clique inicial:
 * - Esconde a hint
 * - Mostra card com contagem
 * - Faz fogos leves durante contagem
 */
function startFlow() {
  state = "counting";
  countdown = 10;

  hint.classList.add("hidden");
  card.classList.add("visible");
  canvas.classList.remove("canvas-blur");

  cardTitle.textContent = "";
  countdownEl.textContent = "10";
  cardMsg.textContent = "Prepare-se… ✨";

  stopCountdownInterval();

  countdownInterval = setInterval(() => {
    countdown--;

    // Atualiza card
    if (countdown >= 0) {
      countdownEl.textContent = String(countdown);

      // Fogos leves durante contagem
      createFirework();
      if (Math.random() < 0.25) createFirework();
    }

    // Chegou em 0: encerra contagem, some card, inicia show
    if (countdown <= 0) {
      stopCountdownInterval();
      card.classList.remove("visible"); // card some após contagem
      startFinale();
    }
  }, 1000);
}

/**
 * Inicia o "show" intenso por 5 segundos
 */
function startFinale() {
  state = "finale";
  finaleStart = performance.now();

  // Burst inicial
  for (let i = 0; i < 8; i++) setTimeout(() => createFirework(), i * 120);
  spawnConfetti();
}

/**
 * Exibe mensagem final:
 * - Aplica blur no canvas
 * - Mostra card com mensagem final
 * - Mantém fogos ao fundo (controlado no loop)
 */
function startMessage() {
  state = "message";

  canvas.classList.add("canvas-blur");

  cardTitle.textContent = "FELIZ";
  countdownEl.textContent = "2026!";
  cardMsg.textContent = "Desejamos um ano incrível a todos: saúde, paz, prosperidade, amor, união, felicidade e muitas conquistas! ✨";

  card.classList.add("visible");
}

/**
 * Retorna tudo ao estado inicial
 */
function resetAll() {
  state = "idle";
  stopCountdownInterval();

  // Limpa partículas
  rockets = [];
  sparks = [];
  confetti = [];

  canvas.classList.remove("canvas-blur");
  card.classList.remove("visible");
  hint.classList.remove("hidden");

  countdownEl.textContent = "10";
  cardTitle.textContent = "";
  cardMsg.textContent = "";
}

/* =========================================================
 * 13) Eventos de clique (interação do usuário)
 * ========================================================= */

/**
 * Clique no canvas:
 * - idle: inicia fluxo
 * - message: reseta (volta ao início)
 * - counting/finale: dispara fogos extras
 */
canvas.addEventListener("click", () => {
  if (state === "idle") {
    startFlow();
    return;
  }

  if (state === "message") {
    resetAll();
    return;
  }

  // Counting/finale: fogos extras
  createFirework();
});

/**
 * Clique no card:
 * - só reseta se estiver na mensagem final (state === "message")
 */
card.addEventListener("click", () => {
  if (state === "message") resetAll();
});

/* =========================================================
 * 14) Loop principal (requestAnimationFrame)
 * ========================================================= */

function animate(now) {
  const dt = now - lastTime;
  lastTime = now;

  // Fundo
  drawBackground();
  drawBgStars(dt);

  // Lógica de disparo de fogos por estado
  if (state === "finale") {
    const elapsed = now - finaleStart;

    // Dispara fogos intensos por 5 segundos
    const rate = rand(FIREWORK_RATE_FINALE[0], FIREWORK_RATE_FINALE[1]);
    if (now - lastFirework > rate) {
      createFirework();
      if (Math.random() < 0.55) createFirework();
      lastFirework = now;
    }

    // Ao fim de 5s, entra na mensagem final
    if (elapsed >= 12000) {
      startMessage();
    }
  }

  if (state === "message") {
    // Fogos continuam ao fundo enquanto mensagem aparece
    const rate = rand(FIREWORK_RATE_MESSAGE[0], FIREWORK_RATE_MESSAGE[1]);
    if (now - lastFirework > rate) {
      createFirework();
      if (Math.random() < 0.35) createFirework();
      lastFirework = now;
    }
  }

  // Render FX
  drawRockets(dt);
  drawSparks(dt);
  drawConfetti(dt);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
