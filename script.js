// ============== JSONBIN.IO CONFIGURATION ==============
// YAHAN APNI DETAILS DAALO
const CONFIG = {
    // JSONBin.io se Master Key (API Keys section mein milegi)
    // Format: $2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxx
    JSONBIN_KEY: '$2a$10$gU8iLwW3hsihpFYUuavgNeOstqcUPermMm1sjjpiPLWfG0DNbFf2.',

    // JSONBin.io se Bin ID (Create Bin ke baad milegi)
    // Format: 64a1b2c3d4e5f6g7h8i9j0k1
    BIN_ID: '6a1d1d4fddf5aa59f77e3deb
'
};

// ============== STATE ==============
let employees = [];

// ============== DOM ELEMENTS ==============
const form = document.getElementById('employeeForm');
const listContainer = document.getElementById('employeeList');
const searchInput = document.getElementById('searchInput');
const binIdInput = document.getElementById('binId');
const masterKeyInput = document.getElementById('masterKey');
const saveConfigBtn = document.getElementById('saveConfigBtn');

// ============== INITIALIZATION ==============
document.addEventListener('DOMContentLoaded', () => {
    // Load saved config from localStorage
    const savedBinId = localStorage.getItem('jsonbin_bin_id');
    const savedKey = localStorage.getItem('jsonbin_master_key');

    if (savedBinId) {
        binIdInput.value = savedBinId;
        CONFIG.BIN_ID = savedBinId;
    }
    if (savedKey) {
        masterKeyInput.value = savedKey;
        CONFIG.JSONBIN_KEY = savedKey;
    }

    // Agar config saved hai toh immediately load karo
    if (CONFIG.BIN_ID && CONFIG.JSONBIN_KEY) {
        loadEmployees();
    } else {
        listContainer.innerHTML = `
            <div class="empty-state">
                <h3>⚙️ Configuration Needed!</h3>
                <p>Upar apni JSONBin Bin ID aur Master Key daalo.</p>
                <p style="margin-top:10px; font-size:12px;">
                    <a href="https://jsonbin.io" target="_blank" style="color:#667eea;">jsonbin.io</a> pe jao → Sign In → API Keys
                </p>
            </div>
        `;
    }

    form.addEventListener('submit', addEmployee);
    searchInput.addEventListener('input', filterEmployees);
    saveConfigBtn.addEventListener('click', saveConfig);
});

// ============== SAVE CONFIG ==============
function saveConfig() {
    const binId = binIdInput.value.trim();
    const masterKey = masterKeyInput.value.trim();

    if (!binId || !masterKey) {
        showMessage('❌ Bin ID aur Master Key dono daalo!', 'error');
        return;
    }

    CONFIG.BIN_ID = binId;
    CONFIG.JSONBIN_KEY = masterKey;

    localStorage.setItem('jsonbin_bin_id', binId);
    localStorage.setItem('jsonbin_master_key', masterKey);

    showMessage('✅ Config saved! Ab data load ho raha hai...', 'success');
    loadEmployees();
}

// ============== STEP 1: LOAD DATA FROM JSONBIN (NO CACHE!) ==============
async function loadEmployees() {
    if (!CONFIG.BIN_ID || !CONFIG.JSONBIN_KEY) {
        return;
    }

    showLoading();

    try {
        // JSONBin API - NO CACHE ISSUE! Real-time data!
        const url = `https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID}/latest`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Master-Key': CONFIG.JSONBIN_KEY
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                // Bin exist nahi karti
                showMessage('⚠️ Bin nahi mili! Nayi bin banao ya ID check karo.', 'error');
                employees = [];
                renderEmployees();
                return;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Data loaded from JSONBin:', result);

        // JSONBin ka structure: { record: { employees: [...] } }
        employees = result.record?.employees || [];
        renderEmployees();

    } catch (error) {
        console.error('Error loading:', error);
        showMessage('❌ Load error: ' + error.message, 'error');
        employees = [];
        renderEmployees();
    }
}

// ============== STEP 2: SAVE DATA TO JSONBIN ==============
async function saveData() {
    if (!CONFIG.BIN_ID || !CONFIG.JSONBIN_KEY) {
        alert('❌ Pehle Bin ID aur Master Key daalo!');
        return false;
    }

    try {
        showLoading('💾 Saving to JSONBin...');

        const url = `https://api.jsonbin.io/v3/b/${CONFIG.BIN_ID}`;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': CONFIG.JSONBIN_KEY
            },
            body: JSON.stringify({ employees })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Data saved to JSONBin:', result);

        showMessage('✅ Data saved! Refresh karke dekh lo - INSTANT update!', 'success');
        return true;

    } catch (error) {
        showMessage('❌ Save error: ' + error.message, 'error');
        console.error(error);
        return false;
    }
}

// ============== STEP 3: ADD EMPLOYEE ==============
async function addEmployee(e) {
    e.preventDefault();

    const newEmployee = {
        id: Date.now(),
        name: document.getElementById('name').value.trim(),
        department: document.getElementById('department').value.trim(),
        salary: parseInt(document.getElementById('salary').value) || 0,
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        joiningDate: document.getElementById('joiningDate').value
    };

    // Validation
    if (!newEmployee.name || !newEmployee.department || !newEmployee.email) {
        showMessage('❌ Name, Department aur Email required hain!', 'error');
        return;
    }

    employees.push(newEmployee);

    if (await saveData()) {
        renderEmployees();
        form.reset();
        document.getElementById('joiningDate').valueAsDate = new Date();
    } else {
        // Rollback
        employees.pop();
        renderEmployees();
    }
}

// ============== STEP 4: DELETE EMPLOYEE ==============
async function deleteEmployee(id) {
    if (!confirm('⚠️ Kya aap sure ho delete karne ke liye?')) return;

    const originalEmployees = [...employees];
    employees = employees.filter(emp => emp.id !== id);

    if (await saveData()) {
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

    if (await saveData()) {
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
    // Remove old messages
    document.querySelectorAll('.error, .success').forEach(el => {
        if (el.style.position === 'fixed') el.remove();
    });

    const div = document.createElement('div');
    div.className = type;
    div.innerHTML = msg;
    div.style.position = 'fixed';
    div.style.top = '20px';
    div.style.right = '20px';
    div.style.zIndex = '1000';
    div.style.maxWidth = '400px';
    div.style.boxShadow = '0 5px 20px rgba(0,0,0,0.2)';
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
