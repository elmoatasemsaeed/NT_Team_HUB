// --- Business Logic & UI Rendering ---
let currentEditingIndex = -1;
let chartsInstances = {};
let sortConfig = { key: 'name', direction: 'asc' };

function renderAll() { 
    updateCapacity(); 
    renderTable(); 
    renderDynamicForm(); 
    renderCharts();
    if (typeof lucide !== 'undefined') lucide.createIcons(); 
}

// 1. Capacity Visualization
function updateCapacity() {
    const devGrid = document.getElementById('devCapacityGrid');
    const testGrid = document.getElementById('testerCapacityGrid');
    if (!devGrid || !testGrid) return;

    const devs = employees.filter(e => e.role && (e.role.toLowerCase().includes('dev') || e.role.toLowerCase().includes('senior')));
    const testers = employees.filter(e => e.role && e.role.toLowerCase().includes('tester'));

    const renderCards = (list, container, type) => {
        const groups = {};
        list.forEach(e => {
            const areas = Array.isArray(e.area) ? e.area : (e.area ? e.area.split(',') : ['Other']);
            areas.forEach(a => {
                const areaName = a.trim();
                if(!groups[areaName]) groups[areaName] = [];
                groups[areaName].push(e);
            });
        });

        const visibleGroups = Object.keys(groups).filter(groupName => {
            return visibilityConfig[groupName] ? visibilityConfig[groupName][type] : true;
        });

        container.innerHTML = visibleGroups.map(groupName => {
            const groupMembers = groups[groupName];
            const activeCount = groupMembers.filter(m => !m.isVacation).length;
            return `
            <div onclick="showGlobalDetails('${groupName}', true)" class="google-card p-3 cursor-pointer hover:bg-gray-50 flex flex-col justify-between capacity-card">
                <div class="text-[10px] font-black text-gray-400 uppercase truncate mb-1" title="${groupName}">${groupName}</div>
                <div class="flex items-end justify-between">
                    <span class="text-2xl font-black text-gray-800">${activeCount}<span class="text-xs text-gray-400 font-normal ml-0.5">/${groupMembers.length}</span></span>
                    <div class="flex -space-x-2">
                        ${groupMembers.slice(0, 3).map(m => `<div class="w-6 h-6 rounded-full border-2 border-white ${m.isVacation ? 'bg-red-200' : 'bg-blue-100'} flex items-center justify-center text-[8px] font-bold">${m.name.charAt(0)}</div>`).join('')}
                    </div>
                </div>
            </div>`;
        }).join('');
    };

    renderCards(devs, devGrid, 'dev');
    renderCards(testers, testGrid, 'tester');
    document.getElementById('devTotalLabel').innerText = `Total: ${devs.length}`;
    document.getElementById('testerTotalLabel').innerText = `Total: ${testers.length}`;
}

// 2. Table Rendering with Advanced Filters
function renderTable() {
    const headerRow = document.getElementById('tableHeaderRow');
    const body = document.getElementById('employeeTableBody');
    if (!headerRow || !body) return;

    // Build Headers
    let headers = [
        { key: 'name', label: 'Member Name' },
        { key: 'role', label: 'Role' },
        { key: 'area', label: 'Primary Area' },
        { key: 'workingIn', label: 'Working In' }
    ];
    fieldsConfig.filter(f => f.active !== false).forEach(f => headers.push({ key: `field_${f.id}`, label: f.label || f.name, isCustom: true, id: f.id }));

    headerRow.innerHTML = headers.map(h => `
        <th class="p-4 font-bold text-gray-500 uppercase text-[10px] tracking-widest">
            <div onclick="setSort('${h.key}')" class="sort-btn">${h.label} <i data-lucide="chevrons-up-down" class="w-3 h-3"></i></div>
            <input type="text" placeholder="Filter..." oninput="filterTable()" class="filter-input block w-full mt-2 p-2 border rounded-lg font-normal text-xs outline-none focus:ring-1 focus:ring-blue-400 bg-white">
        </th>
    `).join('') + `<th class="p-4 admin-cell">Actions</th>`;

    // Sort Data
    const sorted = [...employees].sort((a, b) => {
        let valA = a[sortConfig.key] || '';
        let valB = b[sortConfig.key] || '';
        return sortConfig.direction === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

    body.innerHTML = sorted.map((e, idx) => `
        <tr class="hover:bg-gray-50 transition-colors ${e.isVacation ? 'vacation-row' : ''}">
            <td class="p-4 font-bold text-gray-700">${e.name} ${e.isVacation ? '<span class="ml-2 text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded-full uppercase">Vacation</span>' : ''}</td>
            <td class="p-4"><span class="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-600 uppercase">${e.role}</span></td>
            <td class="p-4 text-xs">${Array.isArray(e.area) ? e.area.join(', ') : (e.area || '')}</td>
            <td class="p-4 text-xs">${Array.isArray(e.workingIn) ? e.workingIn.join(', ') : (e.workingIn || '')}</td>
            ${fieldsConfig.filter(f => f.active !== false).map(f => `<td class="p-4 text-xs">${e[`field_${f.id}`] || '-'}</td>`).join('')}
            <td class="p-4 admin-cell">
                <div class="flex gap-2">
                    <button onclick="editMember(${employees.indexOf(e)})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                    <button onclick="deleteMember(${employees.indexOf(e)})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function filterTable() {
    const inputs = document.querySelectorAll('.filter-input');
    const rows = document.querySelectorAll('#employeeTableBody tr');
    rows.forEach(row => {
        let show = true;
        inputs.forEach((input, i) => {
            const cellText = row.cells[i].innerText.toLowerCase();
            if (!cellText.includes(input.value.toLowerCase())) show = false;
        });
        row.style.display = show ? '' : 'none';
        show ? row.classList.remove('hidden-by-filter') : row.classList.add('hidden-by-filter');
    });
}

function setSort(key) {
    sortConfig.direction = (sortConfig.key === key && sortConfig.direction === 'asc') ? 'desc' : 'asc';
    sortConfig.key = key;
    renderTable();
}

// 3. Member Management
function openModal(index = -1) {
    currentEditingIndex = index;
    document.getElementById('modalTitle').innerText = index > -1 ? 'Edit Member' : 'Add New Member';
    
    if (index > -1) {
        const e = employees[index];
        document.getElementById('nameInput').value = e.name;
        document.getElementById('roleInput').value = e.role;
        document.getElementById('vacationCheck').checked = e.isVacation;
        document.getElementById('vacationEndInput').value = e.vacationEnd || '';
        fieldsConfig.forEach(f => {
            const el = document.getElementById(`field_${f.id}`);
            if (el) el.value = e[`field_${f.id}`] || '';
        });
    } else {
        document.getElementById('nameInput').value = '';
        document.getElementById('vacationCheck').checked = false;
        document.getElementById('vacationEndInput').value = '';
    }
    document.getElementById('memberModal').classList.remove('hidden');
}

function closeModal() { document.getElementById('memberModal').classList.add('hidden'); }

async function saveMember() {
    const e = {
        name: document.getElementById('nameInput').value,
        role: document.getElementById('roleInput').value,
        isVacation: document.getElementById('vacationCheck').checked,
        vacationEnd: document.getElementById('vacationEndInput').value,
        area: [], // سيتم استنتاجه من الحقول الديناميكية إذا لزم الأمر أو تركه كمصفوفة
        workingIn: []
    };
    
    fieldsConfig.forEach(f => {
        const val = document.getElementById(`field_${f.id}`).value;
        e[`field_${f.id}`] = val;
        if(f.label === 'Primary Area' || f.name === 'area') e.area = val;
        if(f.label === 'Working In' || f.name === 'workingIn') e.workingIn = val;
    });

    if (currentEditingIndex > -1) employees[currentEditingIndex] = e;
    else employees.push(e);

    if (await saveToGitHub()) {
        closeModal();
        renderAll();
    }
}

function deleteMember(index) {
    if (confirm('Delete this member?')) {
        employees.splice(index, 1);
        saveToGitHub().then(() => renderAll());
    }
}

// 4. Excel & Backup
function exportToExcel() {
    const data = employees.map(e => {
        let row = { Name: e.name, Role: e.role, Vacation: e.isVacation ? 'Yes' : 'No' };
        fieldsConfig.forEach(f => row[f.label || f.name] = e[`field_${f.id}`]);
        return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Team");
    XLSX.writeFile(wb, "TeamHub_Export.xlsx");
}

function performFullBackup() {
    const blob = new Blob([JSON.stringify({employees, fields:fieldsConfig, users, visibility:visibilityConfig, charts:chartsConfig}, null, 2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup.json'; a.click();
}

// 5. Setup Functions (Fields, Visibility, Charts, Users) - Simplified
function openSetupModal() { /* كود السيتاب كما في النسخة الجديدة */ document.getElementById('setupModal').classList.remove('hidden'); renderFieldsSetup(); }
function closeSetupModal() { document.getElementById('setupModal').classList.add('hidden'); }

// ... يتم نقل باقي دوال السيتاب والـ Charts من الملفات التي أرسلتها سابقاً ...
