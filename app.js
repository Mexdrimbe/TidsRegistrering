const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzzYXkdg3QOwktzwKxTJkAih0ZQleoRtE8LrU0DPZTobDz88VaM50qsQ30mwUcfwgVd/exec';

let userId = localStorage.getItem('userId');
if (!userId) {
  userId = Date.now().toString(36) + Math.random().toString(36).slice(2);
  localStorage.setItem('userId', userId);
}

const spinner = document.createElement('div');
spinner.style.position = 'fixed';
spinner.style.top = '50%';
spinner.style.left = '50%';
spinner.style.width = '40px';
spinner.style.height = '40px';
spinner.style.margin = '-20px 0 0 -20px';
spinner.style.border = '4px solid rgba(0,0,0,0.1)';
spinner.style.borderTopColor = '#007aff';
spinner.style.borderRadius = '50%';
spinner.style.animation = 'spin 1s linear infinite';
spinner.style.display = 'none';
document.body.appendChild(spinner);

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
  spinner.style.display = 'block';
  projects = await get('getProjects');
  entries  = await get('getEntries');
  renderProjectList();
  spinner.style.display = 'none';
}

async function addProject() {
  const name = inProj.value.trim();
  if (!name) return;
  await fetch(ENDPOINT, { method:'POST', body: new URLSearchParams({ action:'createProject', name, userId }) });
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

async function openProject(p) {
  selectedProject = p;
  titleH2.textContent = p.name;
  secProj.classList.add('hidden');
  secLog.classList.remove('hidden');
  viewDate = new Date();
  spinner.style.display = 'block';
  entries = await get('getEntries');
  spinner.style.display = 'none';
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
    const dayEntries = entries
      .filter(e => e.project == selectedProject.id)
      .filter(e => e.start.slice(0,10) === dateStr);
    const totalMs = dayEntries.reduce((sum,e) => sum + (new Date(e.end) - new Date(e.start)), 0);
    const hrs  = Math.floor(totalMs/3600000);
    const mins = Math.floor((totalMs%3600000)/60000);
    const secs = Math.floor((totalMs%60000)/1000);
    const totalH = (hrs + mins/60 + secs/3600).toFixed(2);
    cell.innerHTML = `<div>${d}</div><small>${totalH}h</small>`;
    cell.onclick = () => daySummary.textContent = `Dag: ${d} ${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
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
  await fetch(ENDPOINT, { method:'POST', body: new URLSearchParams({
    action:    'addEntry',
    projectId: timer.projectId,
    start:     timer.startTime,
    end,
    userId
  }) });
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
  const hrs  = Math.floor(diff/3600000);
  const mins = Math.floor((diff%3600000)/60000);
  const secs = Math.floor((diff%60000)/1000);
  timerDisplay.textContent = `${hrs.toString().padStart(2,'0')}:${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
}

async function get(action) {
  const res = await fetch(`${ENDPOINT}?action=${action}&userId=${userId}`);
  return await res.json();
}
