#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
//  CARMINE LIVE MONITOR — real-time terminal dashboard
//  Run:  node monitor.js
//  Exit: Ctrl+C
// ══════════════════════════════════════════════════════════════════════

const http = require('http');
const os = require('os');

const PORT = 3000;
const HOST = '127.0.0.1';
const POLL_MS = 2000;

// ── ANSI helpers ────────────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  bgBlack: '\x1b[40m',
};

const clear = () => process.stdout.write('\x1b[2J\x1b[H');
const hide  = () => process.stdout.write('\x1b[?25l');
const show  = () => process.stdout.write('\x1b[?25h');

// ── Fetch JSON from Carmine API ─────────────────────────────────────
function fetchJSON(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://${HOST}:${PORT}${path}`, { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('bad json')); }
      });
    }).on('error', reject);
  });
}

// ── Bar chart helper ────────────────────────────────────────────────
function bar(pct, width = 20, filled = '█', empty = '░') {
  const n = Math.round((pct / 100) * width);
  const color = pct > 80 ? C.red : pct > 50 ? C.yellow : C.green;
  return color + filled.repeat(n) + C.dim + empty.repeat(width - n) + C.reset;
}

function formatBytes(b) {
  if (b > 1e12) return (b / 1e12).toFixed(1) + ' TB';
  if (b > 1e9)  return (b / 1e9).toFixed(1) + ' GB';
  if (b > 1e6)  return (b / 1e6).toFixed(1) + ' MB';
  return (b / 1e3).toFixed(0) + ' KB';
}

// ── Activity log ring buffer ────────────────────────────────────────
const LOG_MAX = 12;
const activityLog = [];
let prevStats = null;

function pushLog(msg) {
  const t = new Date().toLocaleTimeString('en-US', { hour12: false });
  activityLog.push(`${C.dim}${t}${C.reset}  ${msg}`);
  if (activityLog.length > LOG_MAX) activityLog.shift();
}

// ── Sparkline ───────────────────────────────────────────────────────
const SPARKS = '▁▂▃▄▅▆▇█';
function sparkline(arr) {
  const max = Math.max(...arr, 1);
  return arr.map(v => {
    const i = Math.min(Math.floor((v / max) * (SPARKS.length - 1)), SPARKS.length - 1);
    return SPARKS[i];
  }).join('');
}

// ── Main render ─────────────────────────────────────────────────────
let cpuHistory = [];
let memHistory = [];
let tick = 0;

async function render() {
  tick++;
  let sys, stats;

  try {
    [sys, stats] = await Promise.all([
      fetchJSON('/api/system'),
      fetchJSON('/api/stats'),
    ]);
  } catch {
    clear();
    console.log(`
  ${C.red}${C.bold}  ╔══════════════════════════════════════════╗
  ║   CARMINE SERVER OFFLINE                ║
  ║   Waiting for connection on :${PORT}...     ║
  ╚══════════════════════════════════════════╝${C.reset}

  ${C.dim}Retrying every ${POLL_MS / 1000}s...${C.reset}
`);
    return;
  }

  // Track changes for activity log
  if (prevStats) {
    if (stats.videos !== prevStats.videos)
      pushLog(`${C.cyan}▶  Video library changed${C.reset}  → ${stats.videos} files`);
    if (stats.music !== prevStats.music)
      pushLog(`${C.green}♫  Music library changed${C.reset}  → ${stats.music} tracks`);
    if (stats.photos !== prevStats.photos)
      pushLog(`${C.magenta}◩  Photo library changed${C.reset} → ${stats.photos} photos`);
  }
  prevStats = stats;

  cpuHistory.push(sys.cpu.usage);
  memHistory.push(sys.memory.percentage);
  if (cpuHistory.length > 30) cpuHistory.shift();
  if (memHistory.length > 30) memHistory.shift();

  // Pulse indicator
  const pulse = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'][tick % 10];

  clear();
  const w = process.stdout.columns || 80;

  const lines = [];
  const ln = (s = '') => lines.push(s);

  ln();
  ln(`  ${C.magenta}${C.bold}┌──────────────────────────────────────────────────────────${C.reset}`);
  ln(`  ${C.magenta}${C.bold}│${C.reset}  ${C.red}█▀▀ █▀█ █▀█ █▀▄▀█ █ █▄░█ █▀▀${C.reset}   ${C.dim}live monitor${C.reset}   ${C.green}${pulse} ONLINE${C.reset}`);
  ln(`  ${C.magenta}${C.bold}│${C.reset}  ${C.red}█▄▄ █▀█ █▀▄ █░▀░█ █ █░▀█ ██▄${C.reset}   ${C.dim}:${PORT}${C.reset}`);
  ln(`  ${C.magenta}${C.bold}└──────────────────────────────────────────────────────────${C.reset}`);
  ln();

  // ── System Stats ──
  ln(`  ${C.bold}${C.white} SYSTEM ${C.reset}${C.dim}${'─'.repeat(54)}${C.reset}`);
  ln(`  ${C.cyan}CPU${C.reset}  ${bar(sys.cpu.usage)} ${String(sys.cpu.usage).padStart(3)}%   ${C.dim}${sys.cpu.cores} cores${C.reset}   ${C.cyan}${sparkline(cpuHistory)}${C.reset}`);
  ln(`  ${C.green}MEM${C.reset}  ${bar(sys.memory.percentage)} ${String(sys.memory.percentage).padStart(3)}%   ${C.dim}${formatBytes(sys.memory.used)} / ${formatBytes(sys.memory.total)}${C.reset}`);
  ln(`  ${C.yellow}DSK${C.reset}  ${bar(sys.disk.percentage)} ${String(sys.disk.percentage).padStart(3)}%   ${C.dim}${formatBytes(sys.disk.used)} / ${formatBytes(sys.disk.total)}${C.reset}`);
  ln(`  ${C.dim}UP ${sys.uptime.formatted}  │  HOST ${sys.network.hostname}  │  IP ${sys.network.ip}${C.reset}`);
  ln();

  // ── Media Library ──
  ln(`  ${C.bold}${C.white} LIBRARY ${C.reset}${C.dim}${'─'.repeat(53)}${C.reset}`);
  ln(`  ${C.cyan}▶  Videos${C.reset}  ${C.bold}${String(stats.videos).padStart(5)}${C.reset}   ${C.green}♫  Music${C.reset}  ${C.bold}${String(stats.music).padStart(5)}${C.reset}   ${C.magenta}◩  Photos${C.reset}  ${C.bold}${String(stats.photos).padStart(5)}${C.reset}`);
  ln(`  ${C.dim}Total: ${stats.totalFiles} files${C.reset}`);
  ln();

  // ── Activity Log ──
  ln(`  ${C.bold}${C.white} ACTIVITY ${C.reset}${C.dim}${'─'.repeat(52)}${C.reset}`);
  if (activityLog.length === 0) {
    ln(`  ${C.dim}  Watching for changes...${C.reset}`);
  } else {
    for (const entry of activityLog) {
      ln(`  ${entry}`);
    }
  }
  ln();
  ln(`  ${C.dim}Press Ctrl+C to exit  │  Polling every ${POLL_MS / 1000}s${C.reset}`);
  ln();

  process.stdout.write(lines.join('\n'));
}

// ── Start ───────────────────────────────────────────────────────────
hide();
process.on('SIGINT', () => { show(); clear(); process.exit(); });
process.on('exit', () => show());

pushLog(`${C.green}● Monitor started${C.reset}`);
render();
setInterval(render, POLL_MS);
