const chores = {
  morning: [
    { id: 'brush-teeth-m', name: 'Brush Teeth' },
    { id: 'water-animals', name: 'Water Animals' }
  ],
  evening: [
    { id: 'walk-dog', name: 'Walk the Dog' },
    { id: 'get-mail', name: 'Get Mail' },
    { id: 'unpack-bookbag', name: 'Unpack Bookbag' },
    { id: 'feed-animal', name: 'Feed Animal' },
    { id: 'clear-table', name: 'Clear Dinner Table' },
    { id: 'dirty-clothes', name: 'Dirty Clothes in Hamper' },
    { id: 'toys-away', name: 'Toys Put Away' },
    { id: 'brush-teeth-e', name: 'Brush Teeth' }
  ],
  weekly: [
    { id: 'sort-laundry', name: 'Sort Laundry' },
    { id: 'clean-sink', name: 'Clean Bathroom Sink' },
    { id: 'pick-up-yard', name: 'Pick Up Yard' },
    { id: 'get-trash', name: 'Get Trash Together' }
  ]
};

let currentDate = new Date();
let data = JSON.parse(localStorage.getItem('choreData')) || { days: {}, weekly: {}, streaks: {} };

const CIRCUMFERENCE = 2 * Math.PI * 52;

function getDateKey(date) {
  return date.toISOString().split('T')[0];
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isToday(date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function calculateStreak() {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = getDateKey(d);
    const dayData = data.days[key] || {};
    const completed = Object.values(dayData).filter(Boolean).length;
    if (completed >= 8) { // most of the day done
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

function renderList(containerId, list, isWeekly = false) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const dateKey = getDateKey(currentDate);
  const dayData = data.days[dateKey] || {};

  list.forEach(chore => {
    const checked = isWeekly ? !!data.weekly[chore.id] : !!dayData[chore.id];
    const item = document.createElement('div');
    item.className = `chore-item${checked ? ' completed' : ''}`;
    item.innerHTML = `
      <div class="checkbox">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
      </div>
      <span class="chore-name">${chore.name}</span>
    `;
    item.addEventListener('click', () => {
      const newState = !checked;
      if (isWeekly) {
        data.weekly[chore.id] = newState;
      } else {
        if (!data.days[dateKey]) data.days[dateKey] = {};
        data.days[dateKey][chore.id] = newState;
      }
      saveData();
      renderAll();
      updateStats();
      checkDayComplete();
    });
    container.appendChild(item);
  });
}

function renderAll() {
  renderList('morning-list', chores.morning);
  renderList('evening-list', chores.evening);
  renderList('weekly-list', chores.weekly, true);

  const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
  const dayDate = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  document.getElementById('day-name').textContent = dayName;
  document.getElementById('day-date').textContent = dayDate;
}

function updateStats() {
  const weekStart = getWeekStart(currentDate);
  let totalPossible = 0;
  let completed = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = getDateKey(d);
    const dayData = data.days[key] || {};
    totalPossible += 10;
    completed += Object.values(dayData).filter(Boolean).length;
  }
  totalPossible += 4;
  completed += Object.values(data.weekly).filter(Boolean).length;

  const percent = totalPossible > 0 ? (completed / totalPossible) * 100 : 0;
  const earned = (percent / 100) * 5;

  // Ring
  const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
  document.getElementById('ring-progress').style.strokeDashoffset = offset;

  document.getElementById('earned-amount').textContent = `$${earned.toFixed(2)}`;
  document.getElementById('mini-fill').style.width = percent + '%';
  document.getElementById('week-status').textContent = percent >= 100 ? 'Week complete!' : `${Math.round(percent)}% of weekly target`;

  // Today percent
  const todayKey = getDateKey(currentDate);
  const todayData = data.days[todayKey] || {};
  const todayDone = Object.values(todayData).filter(Boolean).length;
  const todayPct = Math.round((todayDone / 10) * 100);
  document.getElementById('today-percent').textContent = todayPct + '%';

  // Streak
  document.getElementById('streak').textContent = calculateStreak();
}

function checkDayComplete() {
  if (!isToday(currentDate)) return;
  const dateKey = getDateKey(currentDate);
  const dayData = data.days[dateKey] || {};
  const done = Object.values(dayData).filter(Boolean).length;
  if (done === 10) {
    showCelebration();
  }
}

function showCelebration() {
  const el = document.getElementById('celebration');
  el.classList.remove('hidden');
  spawnConfetti();
  setTimeout(() => el.classList.add('hidden'), 2200);
}

function spawnConfetti() {
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: canvas.height / 2 + (Math.random() - 0.5) * 200,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -8 - 2,
      life: 60 + Math.random() * 40,
      color: ['#00e5ff', '#7c4dff', '#00e676', '#ffab00'][Math.floor(Math.random() * 4)]
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life--;
      if (p.life > 0) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 80;
        ctx.fillRect(p.x, p.y, 6, 6);
      }
    });
    if (particles.some(p => p.life > 0)) requestAnimationFrame(animate);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  animate();
}

function saveData() {
  localStorage.setItem('choreData', JSON.stringify(data));
}

document.getElementById('prev-day').addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() - 1);
  renderAll();
  updateStats();
});

document.getElementById('next-day').addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() + 1);
  renderAll();
  updateStats();
});

document.getElementById('reset-btn').addEventListener('click', () => {
  if (confirm('Reset all progress for this week?')) {
    const weekStart = getWeekStart(currentDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      delete data.days[getDateKey(d)];
    }
    data.weekly = {};
    saveData();
    renderAll();
    updateStats();
  }
});

// Add SVG gradient for the ring
const svg = document.querySelector('.progress-ring');
const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
defs.innerHTML = `
  <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#00e5ff" />
    <stop offset="100%" stop-color="#00e676" />
  </linearGradient>
`;
svg.appendChild(defs);

// Init
renderAll();
updateStats();
