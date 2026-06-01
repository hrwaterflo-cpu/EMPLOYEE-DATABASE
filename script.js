// ============== CONFIGURATION ==============
// IMPORTANT: Update these with YOUR GitHub details
const CONFIG = {
    OWNER: 'hrwaterflo-cpu',           // Your GitHub username
    REPO: 'EMPLOYEE-DATABASE',          // Your repository name
    FILE_PATH: 'employees.json',
    BRANCH: 'main'
};

// ============== STATE ==============
let employees = [];

// ============== DOM ELEMENTS ==============
const form = document.getElementById('employeeForm');
const listContainer = document.getElementById('employeeList');
const searchInput = document.getElementById('searchInput');
const tokenInput = document.getElementById('githubToken');
const saveTokenBtn = document.getElementById('saveTokenBtn');

// ============== INITIALIZATION ==============
document.addEventListener('DOMContentLoaded', () => {
    // Load saved token from localStorage
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
        tokenInput.value = savedToken;
    }

    loadEmployees();
    form.addEventListener('submit', addEmployee);
    searchInput.addEventListener('input', filterEmployees);
    saveTokenBtn.addEventListener('click', saveToken);
});

// ============== TOKEN MANAGEMENT ==============
function saveToken() {
    const token = tokenInput.value.trim();
    if (token) {
        localStorage.setItem('github_token', token);
        showMessage('Token saved in browser!', 'success');
        // Token save hone ke baad immediately load karo
        loadEmployees();
    } else {
        showMessage('Please enter a token first!', 'error');
    }
}

// ============== GET TOKEN ==============
function getToken() {
    return tokenInput.value.trim() || localStorage.getItem('github_token');
}

// ============== STEP 1: LOAD DATA FROM GITHUB API (NO CACHE!) ==============
async function loadEmployees() {
    showLoading();

    const token = getToken();

    try {
        let data;

        if (token) {
            // ✅ METHOD 1: GitHub API se fetch (NO CACHE - REALTIME!)
            // API se data fetch karne pe CDN cache nahi lagta
            const apiUrl = `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.FILE_PATH}?ref=${CONFIG.BRANCH}`;

            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                const fileData = await response.json();
                // Content Base64 mein hota hai, decode karna padega
                const content = atob(fileData.content.replace(/\s/g, ''));
                data = JSON.parse(content);
                console.log('✅ Data loaded via GitHub API (Real-time)');
            } else if (response.status === 404) {
                // File exist nahi karti
                console.log('File not found, creating empty list');
                data = { employees: [] };
            } else {
                throw new Error(`API Error: ${response.status}`);
            }
        } else {
            // ⚠️ METHOD 2: Without token - raw URL (CACHE LAGEGA!)
            // Ye sirf pehli baar ke liye hai, token ke bina cache issue rahega
            const timestamp = new Date().getTime();
            const rawUrl = `https://raw.githubusercontent.com/${CONFIG.OWNER}/${CONFIG.REPO}/${CONFIG.BRANCH}/${CONFIG.FILE_PATH}?nocache=${timestamp}`;

            const response = await fetch(rawUrl, { cache: 'no-store' });

            if (response.ok) {
                data = await response.json();
                console.log('⚠️ Data loaded via raw URL (May be cached!)');
            } else {
                data = { employees: [] };
            }
        }

        employees = data.employees || [];
        renderEmployees();

    } catch (error) {
        console.error('Error loading:', error);
        employees = [];
        renderEmployees();

        if (!token) {
            showMessage('⚠️ Token daalo for real-time data! Bina token ke purana data dikhega.', 'error');
        }
    }
}

// ============== STEP 2: SAVE DATA TO GITHUB ==============
async function saveToGitHub() {
    const token = getToken();

    if (!token) {
        alert('❌ GitHub Token daalo!\n\nBina token ke data save nahi hoga!\n\nToken kaise banaye:\n1. GitHub → Settings → Developer settings\n2. Personal access tokens → Tokens (classic)\n3. Generate new token\n4. "repo" scope select karo\n5. Token copy karke yahan paste karo');
        return false;
    }

    try {
        showLoading('💾 Saving to GitHub...');

        // Pehle existing file ka SHA lena padega (update karne ke liye)
        const sha = await getFileSHA(token);

        // Data ko Base64 mein convert karna
        const content = btoa(unescape(encodeURIComponent(JSON.stringify({ employees }, null, 2))));

        const response = await fetch(
            `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.FILE_PATH}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `Update employees - ${new Date().toLocaleString()}`,
                    content: content,
                    sha: sha,
                    branch: CONFIG.BRANCH
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }

        showMessage('✅ Data saved! Refresh karke dekh lo (Ctrl+Shift+R)', 'success');
        return true;

    } catch (error) {
        showMessage('❌ Error: ' + error.message, 'error');
        console.error(error);
        return false;
    }
}

// ============== HELPER: Get File SHA ==============
async function getFileSHA(token) {
    try {
        const response = await fetch(
            `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.FILE_PATH}?ref=${CONFIG.BRANCH}`,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (response.ok) {
            const data = await response.json();
            return data.sha;
        }
        return null; // New file
    } catch {
        return null;
    }
}

// ============== STEP 3: ADD EMPLOYEE ==============
async function addEmployee(e) {
    e.preventDefault();

    const newEmployee = {
        id: Date.now(),
        name: document.getElementById('name').value.trim(),
        department: document.getElementById('department').value.trim(),
        salary: parseInt(document.getElementById('salary').value),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        joiningDate: document.getElementById('joiningDate').value
    };

    if (!newEmployee.name || !newEmployee.department || !newEmployee.email) {
        showMessage('❌ Please fill all required fields!', 'error');
        return;
    }

    employees.push(newEmployee);

    if (await saveToGitHub()) {
        renderEmployees();
        form.reset();
        document.getElementById('joiningDate').valueAsDate = new Date();
    } else {
        employees.pop();
        renderEmployees();
    }
}

// ============== STEP 4: DELETE EMPLOYEE ==============
async function deleteEmployee(id) {
    if (!confirm('⚠️ Kya aap sure ho delete karne ke liye?')) return;

    const originalEmployees = [...employees];
    employees = employees.filter(emp => emp.id !== id);

    if (await saveToGitHub()) {
        renderEmployees();
    } else {
        employees = originalEmployees;
        renderEmployees();
    }
}

// ============== STEP 5: EDIT EMPLOYEE ==============
async function editEmployee(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    const newName = prompt('Name:', emp.name);
    if (newName === null) return;

    const originalEmp = { ...emp };

    emp.name = newName.trim() || emp.name;
    emp.department = prompt('Department:', emp.department)?.trim() || emp.department;
    const newSalary = prompt('Salary:', emp.salary);
    emp.salary = newSalary ? parseInt(newSalary) : emp.salary;
    emp.email = prompt('Email:', emp.email)?.trim() || emp.email;
    emp.phone = prompt('Phone:', emp.phone)?.trim() || emp.phone;

    if (await saveToGitHub()) {
        renderEmployees();
    } else {
        Object.assign(emp, originalEmp);
        renderEmployees();
    }
}

// ============== RENDER FUNCTIONS ==============
function renderEmployees(data = employees) {
    if (data.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <h3>📭 Koi employee nahi hai!</h3>
                <p>Upar form se naya employee add karo.</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = data.map(emp => `
        <div class="employee-card">
            <div class="employee-info">
                <h3>${escapeHtml(emp.name)} <span class="badge">${escapeHtml(emp.department)}</span></h3>
                <p>📧 ${escapeHtml(emp.email)} | 📱 ${escapeHtml(emp.phone)}</p>
                <p>💰 Salary: ₹${emp.salary?.toLocaleString() || 'N/A'} | 📅 Joined: ${emp.joiningDate || 'N/A'}</p>
            </div>
            <div class="employee-actions">
                <button class="edit-btn" onclick="editEmployee(${emp.id})">✏️ Edit</button>
                <button class="delete-btn" onclick="deleteEmployee(${emp.id})">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

function filterEmployees() {
    const search = searchInput.value.toLowerCase().trim();
    if (!search) {
        renderEmployees();
        return;
    }

    const filtered = employees.filter(emp => 
        emp.name?.toLowerCase().includes(search) ||
        emp.department?.toLowerCase().includes(search) ||
        emp.email?.toLowerCase().includes(search)
    );
    renderEmployees(filtered);
}

function showLoading(message = '⏳ Loading employees...') {
    listContainer.innerHTML = `<div class="loading">${message}</div>`;
}

function showMessage(msg, type) {
    const div = document.createElement('div');
    div.className = type;
    div.innerHTML = msg;
    div.style.position = 'fixed';
    div.style.top = '20px';
    div.style.right = '20px';
    div.style.zIndex = '1000';
    div.style.maxWidth = '400px';
    document.body.appendChild(div);

    setTimeout(() => div.remove(), 5000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Set default date to today
document.getElementById('joiningDate').valueAsDate = new Date();
