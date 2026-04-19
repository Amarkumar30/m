import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    onSnapshot, 
    query, 
    orderBy, 
    doc, 
    updateDoc, 
    deleteDoc,
    where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import firebaseConfig from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// State Management
let currentSection = 'dashboard';
let currentDate = new Date();

// DOM Elements
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-links li');
const sectionTitle = document.getElementById('section-title');
const dateDisplay = document.getElementById('current-date');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    updateDateDisplay();
    initRealtimeListeners();
    setupForms();
    renderCalendar();
    renderYearly();
});

// Navigation Logic
function setupNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const target = link.getAttribute('data-section');
            switchSection(target);
        });
    });
}

function switchSection(target) {
    sections.forEach(s => s.classList.remove('active'));
    navLinks.forEach(l => l.classList.remove('active'));
    
    document.getElementById(target).classList.add('active');
    document.querySelector(`[data-section="${target}"]`).classList.add('active');
    
    currentSection = target;
    sectionTitle.textContent = target.charAt(0).toUpperCase() + target.slice(1);
}

function updateDateDisplay() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = new Date().toLocaleDateString(undefined, options);
}

// Modal Logic
window.showModal = (id) => {
    document.getElementById(id).style.display = 'flex';
};

window.hideModal = (id) => {
    document.getElementById(id).style.display = 'none';
};

// Firestore Operations
function initRealtimeListeners() {
    // Quizzes
    onSnapshot(query(collection(db, "quizzes"), orderBy("date", "asc")), (snapshot) => {
        const quizzes = [];
        snapshot.forEach(doc => quizzes.push({ id: doc.id, ...doc.data() }));
        renderQuizzes(quizzes);
        updateDashboardStats();
    });

    // Exams
    onSnapshot(query(collection(db, "exams"), orderBy("date", "asc")), (snapshot) => {
        const exams = [];
        snapshot.forEach(doc => exams.push({ id: doc.id, ...doc.data() }));
        renderExams(exams);
        updateDashboardStats();
    });

    // To-Do
    onSnapshot(query(collection(db, "todos"), orderBy("createdAt", "desc")), (snapshot) => {
        const todos = [];
        snapshot.forEach(doc => todos.push({ id: doc.id, ...doc.data() }));
        renderTodos(todos);
        updateDashboardStats();
    });
}

// Rendering Functions
function renderQuizzes(quizzes) {
    const container = document.getElementById('quizzes-list');
    container.innerHTML = quizzes.map(q => `
        <div class="card">
            <h3>${q.subject}</h3>
            <p class="date"><i class="far fa-calendar"></i> ${q.date}</p>
            <p>Topic: ${q.topic || 'N/A'}</p>
            ${q.score ? `<p class="score">Score: <strong>${q.score}/${q.total}</strong></p>` : ''}
            <div class="actions">
                <button class="btn-score" onclick="openScoreModal('${q.id}', 'quizzes')">
                    <i class="fas fa-edit"></i> ${q.score ? 'Update Score' : 'Add Score'}
                </button>
                <button class="btn-delete" onclick="deleteItem('${q.id}', 'quizzes')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderExams(exams) {
    const container = document.getElementById('exams-list');
    container.innerHTML = exams.map(e => `
        <div class="card">
            <h3>${e.subject}</h3>
            <p class="date"><i class="far fa-calendar"></i> ${e.date}</p>
            <p>Location: ${e.location || 'N/A'}</p>
            ${e.score ? `<p class="score">Score: <strong>${e.score}/${e.total}</strong></p>` : ''}
            <div class="actions">
                <button class="btn-score" onclick="openScoreModal('${e.id}', 'exams')">
                    <i class="fas fa-edit"></i> ${e.score ? 'Update Score' : 'Add Score'}
                </button>
                <button class="btn-delete" onclick="deleteItem('${e.id}', 'exams')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderTodos(todos) {
    const container = document.getElementById('todo-list');
    container.innerHTML = todos.map(t => `
        <li class="todo-item ${t.completed ? 'completed' : ''}">
            <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTodo('${t.id}', ${t.completed})">
            <span>${t.text}</span>
            <button class="btn-delete" style="margin-left: auto" onclick="deleteItem('${t.id}', 'todos')">
                <i class="fas fa-times"></i>
            </button>
        </li>
    `).join('');
}

// Form Handlers
function setupForms() {
    document.getElementById('quiz-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            subject: document.getElementById('quiz-subject').value,
            date: document.getElementById('quiz-date').value,
            topic: document.getElementById('quiz-topic').value,
            createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, "quizzes"), data);
        hideModal('quiz-modal');
        e.target.reset();
    };

    document.getElementById('exam-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            subject: document.getElementById('exam-subject').value,
            date: document.getElementById('exam-date').value,
            location: document.getElementById('exam-location').value,
            createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, "exams"), data);
        hideModal('exam-modal');
        e.target.reset();
    };

    document.getElementById('score-form').onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('score-item-id').value;
        const type = document.getElementById('score-item-type').value;
        const score = document.getElementById('score-value').value;
        const total = document.getElementById('score-total').value;
        
        await updateDoc(doc(db, type, id), { score, total });
        hideModal('score-modal');
        e.target.reset();
    };
}

window.addTodo = async () => {
    const input = document.getElementById('todo-input');
    if (!input.value.trim()) return;
    await addDoc(collection(db, "todos"), {
        text: input.value,
        completed: false,
        createdAt: new Date().toISOString()
    });
    input.value = '';
};

window.toggleTodo = async (id, currentStatus) => {
    await updateDoc(doc(db, "todos", id), { completed: !currentStatus });
};

window.deleteItem = async (id, collectionName) => {
    if (confirm('Are you sure you want to delete this item?')) {
        await deleteDoc(doc(db, collectionName, id));
    }
};

window.openScoreModal = (id, type) => {
    document.getElementById('score-item-id').value = id;
    document.getElementById('score-item-type').value = type;
    showModal('score-modal');
};

// Dashboard Stats
async function updateDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    
    const quizSnap = await getDocs(query(collection(db, "quizzes"), where("date", ">=", today)));
    document.getElementById('quiz-count').textContent = quizSnap.size;

    const examSnap = await getDocs(query(collection(db, "exams"), where("date", ">=", today)));
    document.getElementById('exam-count').textContent = examSnap.size;

    const todoSnap = await getDocs(query(collection(db, "todos"), where("completed", "==", false)));
    document.getElementById('task-count').textContent = todoSnap.size;

    // Recent Scores
    const recentScores = [];
    const qScores = await getDocs(query(collection(db, "quizzes"), where("score", "!=", null)));
    qScores.forEach(doc => recentScores.push({ ...doc.data(), type: 'Quiz' }));
    
    const eScores = await getDocs(query(collection(db, "exams"), where("score", "!=", null)));
    eScores.forEach(doc => recentScores.push({ ...doc.data(), type: 'Exam' }));

    const scoreList = document.getElementById('recent-scores-list');
    scoreList.innerHTML = recentScores
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(s => `
            <div class="todo-item">
                <span><strong>${s.type}:</strong> ${s.subject}</span>
                <span style="margin-left: auto; color: #10b981; font-weight: 600;">${s.score}/${s.total}</span>
            </div>
        `).join('') || '<p style="color: #94a3b8">No scores recorded yet.</p>';
}

// Calendar Logic
let calendarDate = new Date();

window.prevMonth = () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
};

window.nextMonth = () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
};

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthDisplay = document.getElementById('month-display');
    
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    monthDisplay.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(calendarDate);
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let html = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="calendar-day header">${d}</div>`).join('');
    
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="calendar-day other-month"></div>`;
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
        html += `<div class="calendar-day ${isToday ? 'today' : ''}">
            <span class="day-num">${day}</span>
        </div>`;
    }
    
    grid.innerHTML = html;
}

function renderYearly() {
    const grid = document.getElementById('yearly-grid');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
    grid.style.gap = '1rem';
    
    grid.innerHTML = months.map((m, i) => `
        <div class="card" style="text-align: center; cursor: pointer" onclick="goToMonth(${i})">
            <h3>${m}</h3>
            <p style="font-size: 0.8rem; color: var(--text-light)">View Schedule</p>
        </div>
    `).join('');
}

window.goToMonth = (monthIndex) => {
    calendarDate.setMonth(monthIndex);
    renderCalendar();
    switchSection('monthly');
};
