// ============== CONFIGURATION ==============
const CONFIG = {
    OWNER: 'TUMHARA_GITHUB_USERNAME',      // <-- Yahan apna username daalo
    REPO: 'employee-database',               // <-- Repository ka naam
    FILE_PATH: 'employees.json',             // <-- JSON file ka path
    BRANCH: 'main'                           // <-- Branch name
};

// ============== STATE ==============
let employees = [];
let isLoading = false;

// ============== DOM ELEMENTS ==============
const form = document.getElementById('employeeForm');
const listContainer = document.getElementById('employeeList');
const searchInput = document.getElementById('searchInput');
const tokenInput = document.getElementById('githubToken');

// ============== INITIALIZATION ==============
document.addEventListener('DOMContentLoaded', () => {
    loadEmployees();
    form.addEventListener('submit', addEmployee);
    searchInput.addEventListener('input', filterEmployees);
});

// ============== STEP 1: DATA LOAD KARNA ==============
async function loadEmployees() {
    showLoading();
    try {
        // GitHub raw URL se data fetch karna (No token needed for reading)
        const url = `https://raw.githubusercontent.com/${CONFIG.OWNER}/${CONFIG.REPO}/${CONFIG.BRANCH}/${CONFIG.FILE_PATH}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Data load nahi hua! Pehli baar hai toh empty list dikhayenge.');
        }
        
        const data = await response.json();
        employees = data.employees || [];
        renderEmployees();
        
    } catch (error) {
        console.log('Pehli baar load ho raha hai ya file missing hai:', error);
        employees = [];
        renderEmployees();
    }
}

// ============== STEP 2: DATA SAVE KARNA (GitHub API) ==============
async function saveToGitHub() {
    const token = tokenInput.value.trim();
    
    if (!token) {
        alert('❌ GitHub Token daalo! Bina token ke save nahi hoga!');
        return false;
    }

    try {
        // Pehle existing file ka SHA lena padega (update karne ke liye)
        const sha = await getFileSHA(token);
        
        const content = btoa(JSON.stringify({ employees }, null, 2));
        
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

        alert('✅ Data successfully saved to GitHub!');
        return true;
        
    } catch (error) {
        alert('❌ Error: ' + error.message);
        console.error(error);
        return false;
    }
}

// ============== HELPER: File SHA Lena ==============
async function getFileSHA(token) {
    try {
        const response = await fetch(
            `https://api.github.com/repos/${CONFIG.OWNER}/${CONFIG.REPO}/contents/${CONFIG.FILE_PATH}?ref=${CONFIG.BRANCH}`,
            {
                headers: {
                    'Authorization': `token ${token}`
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
        id: Date.now(), // Unique ID
        name: document.getElementById('name').value,
        department: document.getElementById('department').value,
        salary: parseInt(document.getElementById('salary').value),
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        joiningDate: document.getElementById('joiningDate').value
    };

    employees.push(newEmployee);
    
    if (await saveToGitHub()) {
        renderEmployees();
        form.reset();
    } else {
        // Agar save fail hua toh employee hata do (rollback)
        employees.pop();
    }
}

// ============== STEP 4: DELETE EMPLOYEE ==============
async function deleteEmployee(id) {
    if (!confirm('Kya aap sure ho delete karne ke liye?')) return;
    
    const originalEmployees = [...employees];
    employees = employees.filter(emp => emp.id !== id);
    
    if (await saveToGitHub()) {
        renderEmployees();
    } else {
        employees = originalEmployees; // Rollback
    }
}

// ============== STEP 5: EDIT EMPLOYEE ==============
async function editEmployee(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    const newName = prompt('Name:', emp.name);
    if (newName === null) return; // Cancel kiya
    
    const originalEmp = { ...emp };
    
    emp.name = newName || emp.name;
    emp.department = prompt('Department:', emp.department) || emp.department;
    emp.salary = parseInt(prompt('Salary:', emp.salary)) || emp.salary;
    emp.email = prompt('Email:', emp.email) || emp.email;
    emp.phone = prompt('Phone:', emp.phone) || emp.phone;

    if (await saveToGitHub()) {
        renderEmployees();
    } else {
        // Rollback
        Object.assign(emp, originalEmp);
    }
}

// ============== RENDER FUNCTIONS ==============
function renderEmployees(data = employees) {
    if (data.length === 0) {
        listContainer.innerHTML = '<div class="loading">📭 Koi employee nahi hai! Naya add karo.</div>';
        return;
    }

    listContainer.innerHTML = data.map(emp => `
        <div class="employee-card">
            <div class="employee-info">
                <h3>${emp.name} <span class="badge">${emp.department}</span></h3>
                <p>📧 ${emp.email} | 📱 ${emp.phone}</p>
                <p>💰 Salary: ₹${emp.salary.toLocaleString()} | 📅 Joined: ${emp.joiningDate}</p>
            </div>
            <div class="employee-actions">
                <button class="edit-btn" onclick="editEmployee(${emp.id})">✏️ Edit</button>
                <button class="delete-btn" onclick="deleteEmployee(${emp.id})">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

function filterEmployees() {
    const search = searchInput.value.toLowerCase();
    const filtered = employees.filter(emp => 
        emp.name.toLowerCase().includes(search) ||
        emp.department.toLowerCase().includes(search)
    );
    renderEmployees(filtered);
}

function showLoading() {
    listContainer.innerHTML = '<div class="loading">⏳ Loading employees...</div>';
}
