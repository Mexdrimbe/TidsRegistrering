const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzzYXkdg3QOwktzwKxTJkAih0ZQleoRtE8LrU0DPZTobDz88VaM50qsQ30mwUcfwgVd/exec';

let userId = localStorage.getItem('userId');
if (!userId) {
  userId = Date.now().toString(36) + Math.random().toString(36).slice(2);
  localStorage.setItem('userId', userId);
}

const secProj    = document.getElementById('projects-section');
const secLog     = document.getElementById('timelog-section');
const listProj   = document.getElementById('project-list');
const btnAdd     = document.getElementById('btn-add-project');
const inProj     = document.getElementById('new-proj-name');
const btnBack    = document.getElementById('btn-back');
const titleH2    = document.getElementById('proj-title');
const btnTimer   = document.getElementById('btn-timer');
const timerCtr   = document.getElementById('timer-controls');
const prevM      = document.getElementById('prev-month');
const nextM      = document.getElementById('next-month');
const curM       = document.getElementById('current-month');
const grid       = document.getElementById('calendar-grid');
const daySummary = document.getElementById('day-summary');

let timerDisplay = document.getElementById('timer-display');
if (!timerDisplay) {
  timerDisplay = document.createElement('div');
  timerDisplay.id = 'timer-display';
  timerDisplay.style.fontSize = '1.2rem';
  timerDisplay.style.marginBottom = '8px';
  timerCtr.insertBefore(timerDisplay, btnTimer);
}

let projects = [];
let entries  = [];
let selectedProject = null;
let viewDate = new Date();
let timer     = {};
let timerInterval;

loadAll();
btnAdd.onclick    = addProject;
btnBack.onclick   = () => { secLog.classList.add('hidden'); secProj.classList.remove('hidden'); };
btnTimer.onclick  = () => { timer.projectId === selectedProject.id ? stopTimer() : startTimer(); };
prevM.onclick     = () => changeMonth(-1);
nextM.onclick     = () => changeMonth(1);

async function loadAll() {
  projects = await get('getProjects');
  entries  = await get('getEntries');
  renderProjectList();
}

async function addProject() {
  const name = inProj.value.trim();
  if (!name) return alert('Ange projektnamn');
  const params = new URLSearchParams({ action:'createProject', name, userId });
  await fetch(ENDPOINT, { method:'POST', body: params });
  inProj.value = '';
  await loadAll();
}

function renderProjectList() {
  listProj.innerHTML = '';
  projects.forEach(p => {
    const li = document.createElement('li');
    li.className = 'project-item';
    li.innerHTML = `<span>${p.name}</span><button>Välj</button>`;
    li.querySelector('button').onclick = () => openProject(p);
    listProj.appendChild(li);
  });
}

function openProject(p) {
  selectedProject = p;
  titleH2.textContent = p.name;
  secProj.classList.add('hidden');
  secLog.classList.remove('hidden');
  viewDate = new Date();
  renderCalendar();
  checkRunningTimer();
}

function changeMonth(dir) {
  viewDate.setMonth(viewDate.getMonth() + dir);
  renderCalendar();
}

function renderCalendar() {
  curM.textContent = viewDate.toLocaleDateString('sv-SE', { year:'numeric', month:'long' });
  grid.innerHTML = '';
  const y = viewDate.getFullYear(), m = viewDate.getMonth();
  const first = new Date(y,m,1).getDay();
  const days  = new Date(y,m+1,0).getDate();

  for (let i=1; i<first; i++) grid.appendChild(document.createElement('div'));
  for (let d=1; d<=days; d++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    const dateStr = new Date(y,m,d).toISOString().slice(0,10);
    if (dateStr === new Date().toISOString().slice(0,10)) cell.classList.add('today');
    const total = entries
      .filter(e => e.project == selectedProject.id)
      .filter(e => e.start.slice(0,10) === dateStr)
      .reduce((sum,e) => sum + ((new Date(e.end) - new Date(e.start))/36e5), 0);
    cell.innerHTML = `<div>${d}</div><small>${total.toFixed(2)}h</small>`;
    cell.onclick = () => daySummary.textContent = `Dag: ${d} ${total.toFixed(2)}h`;
    grid.appendChild(cell);
  }
  daySummary.textContent = '';
}

function checkRunningTimer() {
  const saved = localStorage.getItem(`timer_${selectedProject.id}`);
  if (saved) {
    timer = { projectId: selectedProject.id, startTime: saved };
    btnTimer.textContent = 'Stoppa timer';
    btnTimer.classList.add('running');
    startDisplay();
  } else {
    timer = {};
    btnTimer.textContent = 'Starta timer';
    btnTimer.classList.remove('running');
    stopDisplay();
  }
}

function startTimer() {
  const start = new Date().toISOString();
  timer = { projectId: selectedProject.id, startTime: start };
  localStorage.setItem(`timer_${selectedProject.id}`, start);
  btnTimer.textContent = 'Stoppa timer';
  btnTimer.classList.add('running');
  startDisplay();
}

async function stopTimer() {
  const end = new Date().toISOString();
  const params = new URLSearchParams({
    action:    'addEntry',
    projectId: timer.projectId,
    start:     timer.startTime,
    end,
    userId
  });
  await fetch(ENDPOINT, { method:'POST', body: params });
  localStorage.removeItem(`timer_${selectedProject.id}`);
  btnTimer.textContent = 'Starta timer';
  btnTimer.classList.remove('running');
  stopDisplay();
  timer = {};
  entries = await get('getEntries');
  renderCalendar();
}

function startDisplay() {
  updateDisplay();
  timerInterval = setInterval(updateDisplay, 1000);
}

function stopDisplay() {
  clearInterval(timerInterval);
  timerDisplay.textContent = '';
}

function updateDisplay() {
  if (!timer.startTime) return;
  const diff = Date.now() - new Date(timer.startTime).getTime();
  const hrs  = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  timerDisplay.textContent =
    `${hrs.toString().padStart(2,'0')}:` +
    `${mins.toString().padStart(2,'0')}:` +
    `${secs.toString().padStart(2,'0')}`;
}

async function get(action) {
  const res = await fetch(`${ENDPOINT}?action=${action}&userId=${userId}`);
  return await res.json();
}
