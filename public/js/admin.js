let ADMIN_TOKEN = localStorage.getItem('admin_token');
let usersList = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (ADMIN_TOKEN) {
        showDashboard();
    }

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    document.getElementById('filterDate').value = today;
    document.getElementById('attnDate').value = today;
    document.getElementById('holidayDate').value = today;

    // Login Form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('adminPassword').value;
        const errorEl = document.getElementById('loginError');

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();
            if (data.success) {
                ADMIN_TOKEN = data.token;
                localStorage.setItem('admin_token', ADMIN_TOKEN);
                showDashboard();
            } else {
                errorEl.textContent = data.error;
                errorEl.style.display = 'block';
            }
        } catch (err) {
            errorEl.textContent = "Gagal login. Periksa koneksi.";
            errorEl.style.display = 'block';
        }
    });

    // Form Submissions
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
    document.getElementById('attendanceForm').addEventListener('submit', handleAttendanceSubmit);
    document.getElementById('holidayForm').addEventListener('submit', handleHolidaySubmit);
});

function showDashboard() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
    loadUsers();
    loadAttendanceList();
    loadHolidays();
}

function logout() {
    localStorage.removeItem('admin_token');
    window.location.reload();
}

function showSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(`section-${name}`).classList.add('active');
    // Highlight nav item - slightly complex selector for onclick match
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('onclick')?.includes(name)) {
            item.classList.add('active');
        }
    });
}

// API Helper
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ADMIN_TOKEN}`
        }
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(endpoint, options);
    if (res.status === 401) {
        logout();
        return null;
    }
    return res.json();
}

// --- USER MANAGEMENT ---
async function loadUsers() {
    const users = await apiCall('/api/admin/users');
    if (!users) return;
    usersList = users;
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';

    users.forEach(user => {
        tbody.innerHTML += `
            <tr>
                <td>${user.name}</td>
                <td>${user.role || '-'}</td>
                <td style="text-align: right;">
                    <button class="btn btn-outline" onclick='editUser(${JSON.stringify(user)})'>
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    // Update attendance select
    const select = document.getElementById('attnUserId');
    select.innerHTML = '<option value="">Pilih GTK...</option>';
    users.forEach(user => {
        select.innerHTML += `<option value="${user.id}">${user.name}</option>`;
    });
}

function openUserModal(user = null) {
    const modal = document.getElementById('userModal');
    const title = document.getElementById('userModalTitle');
    const form = document.getElementById('userForm');

    if (user) {
        title.textContent = 'Edit GTK';
        document.getElementById('userId').value = user.id;
        document.getElementById('userName').value = user.name;
        document.getElementById('userRole').value = user.role || '';
    } else {
        title.textContent = 'Tambah GTK';
        form.reset();
        document.getElementById('userId').value = '';
    }
    modal.style.display = 'flex';
}

function editUser(user) { openUserModal(user); }

async function handleUserSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('userId').value;
    const name = document.getElementById('userName').value;
    const role = document.getElementById('userRole').value;

    const res = await apiCall('/api/admin/users', id ? 'PUT' : 'POST', { id, name, role });
    if (res?.success) {
        closeModal('userModal');
        loadUsers();
    } else {
        alert(res?.error || "Gagal menyimpan data");
    }
}

async function deleteUser(id) {
    if (!confirm("Hapus GTK ini? Data absensi juga mungkin terpengaruh.")) return;
    const res = await apiCall(`/api/admin/users?id=${id}`, 'DELETE');
    if (res?.success) loadUsers();
}

// --- ATTENDANCE MANAGEMENT ---
async function loadAttendanceList() {
    const date = document.getElementById('filterDate').value;
    const data = await apiCall(`/api/admin/attendance?date=${date}`);
    if (!data) return;

    const tbody = document.getElementById('attendanceTableBody');
    tbody.innerHTML = '';
    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${item.date}</td>
                <td>${item.user_name}</td>
                <td><span class="badge ${item.status.toLowerCase()}">${item.status}</span></td>
                <td style="text-align: right;">
                    <button class="btn btn-outline" onclick='editAttendance(${JSON.stringify(item)})'>
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteAttendance(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function openAttendanceModal(attn = null) {
    const modal = document.getElementById('attendanceModal');
    const title = document.getElementById('attnModalTitle');
    const form = document.getElementById('attendanceForm');

    if (attn) {
        title.textContent = 'Edit Absensi';
        document.getElementById('attnId').value = attn.id;
        document.getElementById('attnUserId').value = attn.user_id;
        document.getElementById('attnUserId').disabled = true;
        document.getElementById('attnDate').value = attn.date;
        document.getElementById('attnStatus').value = attn.status;
    } else {
        title.textContent = 'Input Absensi Manual';
        form.reset();
        document.getElementById('attnId').value = '';
        document.getElementById('attnUserId').disabled = false;
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
        document.getElementById('attnDate').value = today;
    }
    modal.style.display = 'flex';
}

function editAttendance(attn) { openAttendanceModal(attn); }

async function handleAttendanceSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('attnId').value;
    const user_id = document.getElementById('attnUserId').value;
    const date = document.getElementById('attnDate').value;
    const status = document.getElementById('attnStatus').value;

    const res = await apiCall('/api/admin/attendance', id ? 'PUT' : 'POST', { id, user_id, date, status });
    if (res?.success) {
        closeModal('attendanceModal');
        loadAttendanceList();
    } else {
        alert(res?.error || "Gagal menyimpan data");
    }
}

async function deleteAttendance(id) {
    if (!confirm("Hapus data absensi ini?")) return;
    const res = await apiCall(`/api/admin/attendance?id=${id}`, 'DELETE');
    if (res?.success) loadAttendanceList();
}

// --- HOLIDAY SETTINGS ---
async function loadHolidays() {
    const data = await apiCall('/api/admin/holidays');
    if (!data) return;

    const tbody = document.getElementById('holidayTableBody');
    tbody.innerHTML = '';
    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${item.holiday_date}</td>
                <td>${item.description || '-'}</td>
                <td style="text-align: right;">
                    <button class="btn btn-outline" onclick='editHoliday(${JSON.stringify(item)})'>
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="deleteHoliday(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

function openHolidayModal(holiday = null) {
    const modal = document.getElementById('holidayModal');
    const title = document.getElementById('holidayModalTitle');
    const form = document.getElementById('holidayForm');

    if (holiday) {
        title.textContent = 'Edit Tanggal Libur';
        document.getElementById('holidayId').value = holiday.id;
        document.getElementById('holidayDate').value = holiday.holiday_date;
        document.getElementById('holidayDesc').value = holiday.description || '';
    } else {
        title.textContent = 'Tambah Tanggal Libur';
        form.reset();
        document.getElementById('holidayId').value = '';
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
        document.getElementById('holidayDate').value = today;
    }
    modal.style.display = 'flex';
}

function editHoliday(holiday) { openHolidayModal(holiday); }

async function handleHolidaySubmit(e) {
    e.preventDefault();
    const id = document.getElementById('holidayId').value;
    const holiday_date = document.getElementById('holidayDate').value;
    const description = document.getElementById('holidayDesc').value;

    const res = await apiCall('/api/admin/holidays', id ? 'PUT' : 'POST', { id, holiday_date, description });
    if (res?.success) {
        closeModal('holidayModal');
        loadHolidays();
    } else {
        alert(res?.error || "Gagal menyimpan data");
    }
}

async function deleteHoliday(id) {
    if (!confirm("Hapus tanggal libur ini?")) return;
    const res = await apiCall(`/api/admin/holidays?id=${id}`, 'DELETE');
    if (res?.success) loadHolidays();
}

// UI Helpers
function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}
