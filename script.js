const chores = {
  morning: [
    { id: 'brush-teeth-m', name: '🦷 Brush Teeth' },
    { id: 'water-animals', name: '🐾 Water Animals' }
  ],
  evening: [
    { id: 'walk-dog', name: '🐕 Walk the Dog' },
    { id: 'get-mail', name: '📬 Get Mail' },
    { id: 'unpack-bookbag', name: '🎒 Unpack Bookbag' },
    { id: 'feed-animal', name: '🍖 Feed Animal' },
    { id: 'clear-table', name: '🍽️ Clear Dinner Table' },
    { id: 'dirty-clothes', name: '👕 Dirty Clothes in Hamper' },
    { id: 'toys-away', name: '🧸 Toys Put Away' },
    { id: 'brush-teeth-e', name: '🦷 Brush Teeth' }
  ],
  weekly: [
    { id: 'sort-laundry', name: '🧺 Sort Laundry' },
    { id: 'clean-sink', name: '🚰 Clean Bathroom Sink' },
    { id: 'pick-up-yard', name: '🌳 Pick Up Yard (Thursday)' },
    { id: 'get-trash', name: '🗑️ Get Trash Together' }
  ]
};

let currentDate = new Date();
let data = JSON.parse(localStorage.getItem('choreData')) || { days: {}, weekly: {} };

function getDateKey(date) {
  return date.toISOString().split('T')[0];
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  d.setHours(0,0,0,0);
  return d;
}

function renderChores() {
  const dateKey = getDateKey(currentDate);
  const dayData = data.days[dateKey] || {};

  function renderSection(sectionId, list, isWeekly = false) {
    const container = document.getElementById(sectionId);
    container.innerHTML = '';
    list.forEach(chore => {
      const checked = isWeekly ? (data.weekly[chore.id] || false) : (dayData[chore.id] || false);
      const item = document.createElement('div');
      item.className = `chore-item ${checked ? 'completed' : ''}`;
      item.innerHTML = `
        <input type="checkbox" id="${chore.id}-${dateKey}" ${checked ? 'checked' : ''}>
        <label for="${chore.id}-${dateKey}">${chore.name}</label>
      `;
      item.querySelector('input').addEventListener('change', (e) => {
        if (isWeekly) {
          data.weekly[chore.id] = e.target.checked;
        } else {
          if (!data.days[dateKey]) data.days[dateKey] = {};
          data.days[dateKey][chore.id] = e.target.checked;
        }
        saveData();
        renderChores();
        updateEarnings();
      });
      container.appendChild(item);
    });
  }

  renderSection('morning-chores', chores.morning);
  renderSection('evening-chores', chores.evening);
  renderSection('weekly-chores', chores.weekly, true);

  document.getElementById('current-day').textContent = currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function updateEarnings() {
  const weekStart = getWeekStart(currentDate);
  let totalPossible = 0;
  let completed = 0;

  // Daily chores: 10 per day
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = getDateKey(d);
    const dayData = data.days[key] || {};
    totalPossible += 10;
    completed += Object.values(dayData).filter(Boolean).length;
  }

  // Weekly: 4
  totalPossible += 4;
  completed += Object.values(data.weekly).filter(Boolean).length;

  const percent = totalPossible > 0 ? (completed / totalPossible) * 100 : 0;
  const earned = (percent / 100) * 5;

  document.getElementById('progress-fill').style.width = percent + '%';
  document.getElementById('earnings-text').textContent = `$${earned.toFixed(2)} / $5.00`;
  document.getElementById('completion-text').textContent = `${Math.round(percent)}% complete`;
}

function saveData() {
  localStorage.setItem('choreData', JSON.stringify(data));
}

document.getElementById('prev-day').addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() - 1);
  renderChores();
});

document.getElementById('next-day').addEventListener('click', () => {
  currentDate.setDate(currentDate.getDate() + 1);
  renderChores();
});

document.getElementById('reset-week').addEventListener('click', () => {
  if (confirm('Reset all data for this week? This cannot be undone.')) {
    const weekStart = getWeekStart(currentDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      delete data.days[getDateKey(d)];
    }
    data.weekly = {};
    saveData();
    renderChores();
    updateEarnings();
  }
});

// Init
renderChores();
updateEarnings();
