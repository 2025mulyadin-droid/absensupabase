let currentData = null;

// Initialize dates
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    // Adjust to local date string YYYY-MM-DD
    const formatDate = (d) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

    document.getElementById('startDate').value = formatDate(firstDay);
    document.getElementById('endDate').value = formatDate(today);
});

async function loadReport() {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;

    if (!start || !end) {
        alert("Pilih tanggal terlebih dahulu");
        return;
    }

    const btn = document.querySelector('button[onclick="loadReport()"]');
    const originalText = btn.textContent;
    btn.textContent = "Memuat...";
    btn.disabled = true;

    try {
        const res = await fetch(`/api/report?start=${start}&end=${end}`);
        const data = await res.json();
        currentData = data;

        renderSummary(data.summary, data.list, data.holidays);
        renderDetail(data.list);

        document.getElementById('reportResult').style.display = 'block';
    } catch (e) {
        console.error(e);
        alert("Gagal memuat laporan");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Helper: Generate array of dates between start and end (inclusive)
function getDatesInRange(startDate, endDate) {
    const dates = [];
    let curr = new Date(startDate);
    const last = new Date(endDate);

    while (curr <= last) {
        dates.push(new Date(curr).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }));
        curr.setDate(curr.getDate() + 1);
    }
    return dates;
}

// Helper: Check if date string YYYY-MM-DD is Weekend (Sat/Sun)
function isWeekend(dateStr) {
    const d = new Date(dateStr);
    const day = d.getUTCDay(); // 0=Sun, 6=Sat (Verified for YYYY-MM-DD format which parses as UTC)
    return day === 0 || day === 6;
}

function renderSummary(summary, list, holidays = []) {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const dateRange = getDatesInRange(startDate, endDate);

    const holidayDates = new Set(holidays.map(h => h.holiday_date));

    // Create a map for quick lookup: user_id + date -> status
    const attendanceMap = new Map();
    list.forEach(item => {
        attendanceMap.set(`${item.name}_${item.date}`, item.status);
    });

    const thead = document.querySelector('#summaryTable thead tr');
    const tbody = document.querySelector('#summaryTable tbody');

    // Build Header
    let headerHtml = '<th>Nama</th>';
    headerHtml += '<th class="text-center" style="background:#f1f5f9; white-space:normal; width:80px; font-size:0.8rem;">JML HARI KERJA</th>';
    headerHtml += '<th class="text-center" style="color:var(--status-hadir)">H</th>';
    headerHtml += '<th class="text-center" style="color:var(--status-sakit)">S</th>';
    headerHtml += '<th class="text-center" style="color:var(--status-izin)">I</th>';
    headerHtml += '<th class="text-center" style="color:var(--status-alpha)">TK</th>';

    dateRange.forEach(date => {
        const dayLabel = date.split('-')[2]; // Get DD
        headerHtml += `<th class="text-center" style="min-width:40px;">${dayLabel}</th>`;
    });
    thead.innerHTML = headerHtml;

    // Build Body
    tbody.innerHTML = '';

    summary.forEach(row => {
        const tr = document.createElement('tr');

        // Calculate stats
        let tkCount = 0;
        let cellsHtml = '';

        dateRange.forEach(date => {
            const status = attendanceMap.get(`${row.name}_${date}`);
            let cellContent = '-';
            let cellClass = 'status-cell status-a';

            if (status === 'Hadir') {
                cellContent = 'H';
                cellClass = 'status-cell status-h';
            } else if (status === 'Sakit') {
                cellContent = 'S';
                cellClass = 'status-cell status-s';
            } else if (status === 'Izin') {
                cellContent = 'I';
                cellClass = 'status-cell status-i';
            } else {
                // No status
                if (holidayDates.has(date)) {
                    cellContent = 'L';
                    cellClass = 'status-cell'; // Neutral
                    cellClass += ' style="background:#fee2e2; color:#ef4444;"'; // Inline style for holiday if no class
                } else if (isWeekend(date)) {
                    cellContent = '-';
                    cellClass = 'status-cell';
                } else {
                    tkCount++;
                    cellContent = 'TK';
                    cellClass = 'status-cell status-tk';
                }
            }

            // Fix for dynamic style if needed, better use a class or direct style
            if (cellContent === 'L') {
                cellsHtml += `<td class="text-center" style="background:#fee2e2; color:#ef4444; font-weight:bold;">${cellContent}</td>`;
            } else {
                cellsHtml += `<td class="${cellClass}">${cellContent}</td>`;
            }
        });

        // Calculate JML HARI KERJA (Total H + S + I + TK)
        const totalHariKerja = (row.total_hadir || 0) + (row.total_sakit || 0) + (row.total_izin || 0) + tkCount;

        // Construct Row
        let rowHtml = `<td>${row.name}</td>`;
        rowHtml += `<td class="text-center" style="font-weight:bold; background:#f8fafc;">${totalHariKerja}</td>`;
        rowHtml += `<td class="text-center status-h">${row.total_hadir || 0}</td>`;
        rowHtml += `<td class="text-center status-s">${row.total_sakit || 0}</td>`;
        rowHtml += `<td class="text-center status-i">${row.total_izin || 0}</td>`;
        rowHtml += `<td class="text-center status-a" style="font-weight:bold; color:var(--status-alpha);">${tkCount}</td>`;

        rowHtml += cellsHtml;

        tr.innerHTML = rowHtml;
        tbody.appendChild(tr);
    });
}

function renderDetail(list) {
    const tbody = document.querySelector('#detailTable tbody');
    tbody.innerHTML = '';

    list.forEach(row => {
        const tr = document.createElement('tr');
        const badgeClass = row.status.toLowerCase();
        tr.innerHTML = `
            <td>${row.date}</td>
            <td>${row.name}</td>
            <td><span class="badge ${badgeClass}">${row.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function exportToExcel() {
    if (!currentData) return;

    const startDateRaw = document.getElementById('startDate').value;
    const endDateRaw = document.getElementById('endDate').value;

    // Formatting Date for Title: DD-MM-YYYY
    const fmt = (d) => d.split('-').reverse().join('-');
    const startDate = fmt(startDateRaw);
    const endDate = fmt(endDateRaw);

    const dateRange = getDatesInRange(startDateRaw, endDateRaw);
    const holidayDates = new Set((currentData.holidays || []).map(h => h.holiday_date));
    const attendanceMap = new Map();
    currentData.list.forEach(item => {
        attendanceMap.set(`${item.name}_${item.date}`, item.status);
    });

    const wb = XLSX.utils.book_new();
    const ws_name = "Rekapitulasi";

    // Define Styles
    const sHeader = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
        fill: { fgColor: { rgb: "2563EB" } }, // Blue
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
            top: { style: "thin" }, bottom: { style: "thin" },
            left: { style: "thin" }, right: { style: "thin" }
        }
    };

    const sTitle = {
        font: { bold: true, sz: 16, color: { rgb: "1E3A8A" } },
        alignment: { horizontal: "left" }
    };

    const sBase = {
        border: {
            top: { style: "thin" }, bottom: { style: "thin" },
            left: { style: "thin" }, right: { style: "thin" }
        },
        alignment: { vertical: "center" }
    };

    const sCenter = { ...sBase, alignment: { horizontal: "center", vertical: "center" } };

    const styleStatus = {
        'H': { ...sCenter, fill: { fgColor: { rgb: "DCFCE7" } }, font: { color: { rgb: "166534" }, bold: true } },
        'S': { ...sCenter, fill: { fgColor: { rgb: "FEF3C7" } }, font: { color: { rgb: "92400E" }, bold: true } },
        'I': { ...sCenter, fill: { fgColor: { rgb: "DBEAFE" } }, font: { color: { rgb: "1E40AF" }, bold: true } },
        'TK': { ...sCenter, fill: { fgColor: { rgb: "FEE2E2" } }, font: { color: { rgb: "991B1B" }, bold: true } },
        'L': { ...sCenter, fill: { fgColor: { rgb: "FFE4E6" } }, font: { color: { rgb: "9F1239" }, bold: true } },
        '-': sCenter
    };

    // Construct Sheet Data manually to apply styles
    const rows = [];

    // Title Row
    rows.push([
        { v: `LAPORAN REKAPITULASI ABSENSI GTK MI ISLAMADINA`, s: sTitle }
    ]);
    rows.push([
        { v: `Periode: ${startDate} s/d ${endDate}`, font: { italic: true } }
    ]);
    rows.push([]); // Empty row

    // Header Row
    const headerCols = ["Nama", "HARI KERJA", "H", "S", "I", "TK"];
    dateRange.forEach(d => headerCols.push(d.split('-')[2]));

    const styledHeader = headerCols.map(h => ({ v: h, s: sHeader }));
    rows.push(styledHeader);

    // Data Rows
    currentData.summary.forEach(row => {
        const rowData = [];

        // Name
        rowData.push({ v: row.name, s: sBase });

        // Calculate Stats
        let tkCount = 0;
        const dailyCells = [];

        dateRange.forEach(date => {
            const status = attendanceMap.get(`${row.name}_${date}`);
            let val = '-';
            if (status === 'Hadir') val = 'H';
            else if (status === 'Sakit') val = 'S';
            else if (status === 'Izin') val = 'I';
            else {
                if (holidayDates.has(date)) val = 'L';
                else if (!isWeekend(date)) {
                    tkCount++;
                    val = 'TK';
                }
            }
            dailyCells.push({ v: val, s: styleStatus[val] || sCenter });
        });

        const totalHariKerja = (row.total_hadir || 0) + (row.total_sakit || 0) + (row.total_izin || 0) + tkCount;

        // Add Summaries
        rowData.push({ v: totalHariKerja, s: { ...sCenter, font: { bold: true } } });
        rowData.push({ v: row.total_hadir || 0, s: styleStatus['H'] });
        rowData.push({ v: row.total_sakit || 0, s: styleStatus['S'] });
        rowData.push({ v: row.total_izin || 0, s: styleStatus['I'] });
        rowData.push({ v: tkCount, s: styleStatus['TK'] });

        // Add Daily Cells
        rowData.push(...dailyCells);

        rows.push(rowData);
    });

    // Create worksheet from object
    const ws = {
        '!ref': `A1:${XLSX.utils.encode_col(headerCols.length - 1)}${rows.length}`,
        '!merges': [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Title merge
            { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }  // Subtitle merge
        ],
        '!cols': [
            { wch: 25 }, // Nama
            { wch: 12 }, // Hari Kerja
            { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }, // H S I TK
            ...dateRange.map(() => ({ wch: 4 })) // Daily cols
        ]
    };

    // Populate cells
    rows.forEach((row, r) => {
        row.forEach((cell, c) => {
            const cellRef = XLSX.utils.encode_cell({ r, c });
            ws[cellRef] = cell;
        });
    });

    XLSX.utils.book_append_sheet(wb, ws, ws_name);
    XLSX.writeFile(wb, `Laporan_Absensi_${startDate}.xlsx`);
}
