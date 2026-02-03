// Helper for Local Date YYYY-MM-DD
function getLocalDate() {
    const date = new Date();
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

const today = getLocalDate();
let allUsers = [];

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('currentDateDisplay').textContent = new Date().toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta'
    });

    // Validasi Weekend (Sabtu/Minggu)
    const day = new Date().getDay(); // 0 is Sunday, 6 is Saturday
    if (day === 0 || day === 6) {
        const msg = day === 0 ? "Minggu (Libur)" : "Sabtu (Libur)";
        const btns = document.querySelectorAll('.btn-hadir, .btn-sakit, .btn-izin');
        btns.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.title = `Tidak bisa absen pada hari ${msg}`;
        });

        const container = document.querySelector('.card');
        const alertDiv = document.createElement('div');
        alertDiv.style.backgroundColor = '#fee2e2';
        alertDiv.style.color = '#ef4444';
        alertDiv.style.padding = '1rem';
        alertDiv.style.borderRadius = '12px';
        alertDiv.style.marginBottom = '1rem';
        alertDiv.style.textAlign = 'center';
        alertDiv.style.fontWeight = '600';
        alertDiv.innerHTML = `⚠️ Absensi Ditutup Hari ${msg}`;
        container.insertBefore(alertDiv, container.firstChild);
    }

    try {
        await loadUsers();
        await loadTodayAttendance();
    } catch (e) {
        console.error("Init Error:", e);
    }
});

async function loadUsers() {
    try {
        const res = await fetch('/api/users');
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Gagal mengambil data user');
        }
        const users = await res.json();
        allUsers = users;

        const select = document.getElementById('userSelect');
        select.innerHTML = '<option value="">-- Pilih Nama Anda --</option>';

        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            select.appendChild(option);
        });

        const savedUser = localStorage.getItem('lastUserId');
        if (savedUser) {
            select.value = savedUser;
        }
    } catch (e) {
        console.error('Failed to load users', e);
    }
}

async function loadTodayAttendance() {
    try {
        const res = await fetch(`/api/attendance?date=${today}`);
        if (!res.ok) {
            console.error("Attendance fetch failed status:", res.status);
            return;
        }
        const data = await res.json();
        const list = document.getElementById('todayList');
        const notPresentList = document.getElementById('notPresentList');

        list.innerHTML = '';
        if (notPresentList) notPresentList.innerHTML = '';

        const attendedUserIds = new Set();

        if (!Array.isArray(data) || data.length === 0) {
            list.innerHTML = '<li style="padding:1rem; text-align:center; color:gray;">Belum ada yang absen hari ini.</li>';
        } else {
            data.forEach(item => {
                attendedUserIds.add(item.user_id);
                let isLate = false;
                let timeStr = '';
                if (item.created_at) {
                    const absDate = new Date(item.created_at.replace(' ', 'T') + 'Z');
                    timeStr = absDate.toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZone: 'Asia/Jakarta'
                    });

                    // Cek jam keterlambatan (setelah jam 07:00)
                    const hour = absDate.getUTCHours() + 7; // Convert to WIB, assumption DB stores UTC
                    const adjustedHour = hour >= 24 ? hour - 24 : hour;
                    const minutes = absDate.getUTCMinutes();

                    if (item.status === 'Hadir' && (adjustedHour > 7 || (adjustedHour === 7 && minutes > 0))) {
                        isLate = true;
                    }
                }

                const li = document.createElement('li');
                li.className = 'history-item';
                li.innerHTML = `
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600;">${item.name}</span>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <span style="font-size:0.75rem; color:var(--text-secondary);">${timeStr} WIB</span>
                            ${isLate ? '<span style="font-size:0.65rem; background:#fee2e2; color:#ef4444; padding:2px 6px; border-radius:4px; font-weight:700;">TERLAMBAT</span>' : ''}
                        </div>
                    </div>
                    <span class="badge ${item.status.toLowerCase()}">${item.status}</span>
                `;
                list.appendChild(li);
            });
        }

        if (notPresentList && allUsers.length > 0) {
            const notPresent = allUsers.filter(u => !attendedUserIds.has(u.id));

            if (notPresent.length === 0 && attendedUserIds.size > 0) {
                notPresentList.innerHTML = '<li style="padding:1rem; text-align:center; color:green;">Semua sudah absen! 🎉</li>';
            } else if (notPresent.length > 0) {
                notPresent.forEach(user => {
                    const li = document.createElement('li');
                    li.className = 'history-item';
                    li.style.opacity = '0.6';
                    li.innerHTML = `
                        <span>${user.name}</span>
                        <span class="badge" style="background:#e2e8f0; color:#64748b; font-weight:normal;">Belum Absen</span>
                    `;
                    notPresentList.appendChild(li);
                });
            } else if (notPresent.length === 0 && attendedUserIds.size === 0) {
                // Should not happen if allUsers > 0, but logical safety:
                // If no one attended, all should be in notPresent.
                // Unless allUsers is empty, which is checked by outer if.
            }
        }

    } catch (e) {
        console.error('Failed to load attendance', e);
    }
}

async function submitAttendance(status) {
    const userId = document.getElementById('userSelect').value;
    if (!userId) {
        showModal('⚠️ Perhatian', 'Silakan pilih nama Anda terlebih dahulu.', 'warning');
        return;
    }

    const loading = document.getElementById('loadingMsg');
    loading.style.display = 'block';

    try {
        const res = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, status: status, date: today })
        });

        const result = await res.json();
        loading.style.display = 'none';

        if (res.status === 201) {
            localStorage.setItem('lastUserId', userId);
            let msg = '';
            let icon = '';
            if (status === 'Hadir') { msg = 'Terima kasih sudah hadir hari ini.'; icon = '✅'; }
            else if (status === 'Sakit') { msg = 'Semoga Allah sembuhkan.'; icon = '🤲'; }
            else { msg = 'Semoga Allah mudahkan urusannya.'; icon = '📝'; }

            showModal('Berhasil Absen', msg, 'success', icon);
            loadTodayAttendance();
        } else if (res.status === 409) {
            showModal('Gagal', 'Anda sudah melakukan absensi hari ini.', 'error');
        } else {
            showModal('Error', result.error || 'Terjadi kesalahan.', 'error');
        }
    } catch (e) {
        loading.style.display = 'none';
        showModal('Error', 'Gagal menghubungi server.', 'error');
    }
}

const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalIcon = document.getElementById('modalIcon');

function showModal(title, message, type, iconVal) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    if (iconVal) {
        modalIcon.textContent = iconVal;
        modalIcon.style.display = 'block';
    } else {
        modalIcon.style.display = 'none';
    }

    if (type === 'error') modalTitle.style.color = '#ef4444';
    else if (type === 'warning') modalTitle.style.color = '#f59e0b';
    else modalTitle.style.color = 'var(--primary)';

    modalOverlay.classList.add('active');
}

function closeModal() {
    modalOverlay.classList.remove('active');
}

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});
