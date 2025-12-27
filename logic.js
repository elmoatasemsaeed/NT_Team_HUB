// --- Business Logic & UI Rendering ---

let currentEditingIndex = -1;
let chartsInstances = {};
let sortConfig = { key: 'name', direction: 'asc' };

function renderAll() { 
    updateCapacity(); 
    renderTable(); 
    renderDynamicForm(); 
    renderCharts();
    renderFilters();
    if (typeof lucide !== 'undefined') lucide.createIcons(); 
}

// 1. Capacity Visualization
function updateCapacity() {
    const devGrid = document.getElementById('devCapacityGrid');
    const testGrid = document.getElementById('testerCapacityGrid');
    if (!devGrid || !testGrid) return;

    const devs = employees.filter(e => e.role && (e.role.includes('Dev') || e.role.includes('Senior') || e.role.includes('Lead')));
    const testers = employees.filter(e => e.role && e.role.includes('Tester'));

    const renderCards = (list, container, type) => {
        const groups = {};
        list.forEach(e => {
            const areas = Array.isArray(e.area) ? e.area : [e.area];
            areas.forEach(a => {
                if(!groups[a]) groups[a] = [];
                groups[a].push(e);
            });
        });

        const visibleGroups = Object.keys(groups).filter(area => {
            return visibilityConfig[area] ? visibilityConfig[area][type] : true;
        });

        container.innerHTML = visibleGroups.map(area => {
            const members = groups[area];
            const workingCount = members.filter(m => !m.isVacation).length;
            const total = members.length;
            const percentage = (workingCount / total) * 100;
            const colorClass = percentage < 50 ? 'text-red-600' : (percentage < 80 ? 'text-orange-500' : 'text-emerald-600');

            return `
            <div onclick="showGlobalDetails('${area}', false, '${type}')" class="google-card p-3 cursor-pointer hover:bg-gray-50 border-l-4 border-l-blue-500">
                <div class="text-[10px] uppercase font-black text-gray-400 mb-1 truncate">${area}</div>
                <div class="flex items-end justify-between">
                    <span class="text-2xl font-bold ${colorClass}">${workingCount}<span class="text-gray-300 text-sm font-normal">/${total}</span></span>
                    <i data-lucide="chevron-right" class="w-4 h-4 text-gray-300"></i>
                </div>
            </div>`;
        }).join('');

        const totalLabelDev = document.getElementById('devTotalLabel');
        const totalLabelTester = document.getElementById('testerTotalLabel');
        if(type === 'dev' && totalLabelDev) totalLabelDev.innerText = `Total: ${list.length}`;
        if(type === 'tester' && totalLabelTester) totalLabelTester.innerText = `Total: ${list.length}`;
    };

    renderCards(devs, devGrid, 'dev');
    renderCards(testers, testGrid, 'tester');
}

// 2. Table Sorting & Rendering
function sortTable(key) {
    if (sortConfig.key === key) {
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortConfig.key = key;
        sortConfig.direction = 'asc';
    }
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('employeeTableBody');
    const header = document.getElementById('tableHeaderRow');
    if (!tbody || !header) return;
    
    const searchTerm = document.getElementById('memberSearch')?.value.toLowerCase() || "";

    const baseHeaders = [
        { name: 'Name', id: 'name' },
        { name: 'Role', id: 'role' },
        { name: 'Area', id: 'area' },
        { name: 'Working In', id: 'workingIn' },
        { name: 'Status', id: 'isVacation' }
    ];

    header.innerHTML = baseHeaders.map(h => `
        <th class="p-4 sortable-header" onclick="sortTable('${h.id}')">
            <div class="flex items-center gap-1 uppercase text-[11px] font-bold">
                ${h.name} 
                <i data-lucide="arrow-up-down" class="w-3 h-3 text-gray-400"></i>
            </div>
        </th>`).join('') +
        fieldsConfig.filter(f => f.active).map(f => `<th class="p-4 font-bold uppercase text-[11px] tracking-wider">${f.name}</th>`).join('') +
        `<th class="p-4 admin-cell">Actions</th>`;

    let filtered = employees.filter(e => {
        const nameStr = String(e.name || "").toLowerCase();
        const roleStr = String(e.role || "").toLowerCase();
        const matchesSearch = nameStr.includes(searchTerm) || roleStr.includes(searchTerm);
        const matchesFilters = Array.from(document.querySelectorAll('.filter-input-dynamic')).every(input => {
            if (!input.value) return true;
            const val = String(e[input.dataset.field] || '').toLowerCase();
            return val.includes(input.value.toLowerCase());
        });
        return matchesSearch && matchesFilters;
    });

    filtered.sort((a, b) => {
        let valA = a[sortConfig.key] || '';
        let valB = b[sortConfig.key] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    tbody.innerHTML = filtered.map((e, idx) => `
        <tr class="${e.isVacation ? 'vacation-row' : 'hover:bg-gray-50'} transition-colors">
            <td class="p-4 font-bold text-gray-800">${e.name}</td>
            <td class="p-4"><span class="px-2 py-1 bg-gray-100 rounded text-xs font-medium">${e.role}</span></td>
            <td class="p-4 text-xs">${Array.isArray(e.area) ? e.area.join(', ') : e.area}</td>
            <td class="p-4 text-xs">${Array.isArray(e.workingIn) ? e.workingIn.join(', ') : e.workingIn}</td>
            <td class="p-4">
                <span class="px-2 py-1 rounded-full text-[10px] font-black uppercase">
                    ${e.isVacation ? '🏖️ Vacation' : '🟢 Active'}
                </span>
            </td>
            ${fieldsConfig.filter(f => f.active).map(f => `<td class="p-4 text-xs">${e[f.id] || '-'}</td>`).join('')}
            <td class="p-4 admin-cell">
                <div class="flex gap-2">
                    <button onclick="editEmployee(${employees.indexOf(e)})" class="p-2 text-blue-600 hover:bg-blue-50 rounded"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                    <button onclick="deleteEmployee(${employees.indexOf(e)})" class="p-2 text-red-600 hover:bg-red-50 rounded"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </td>
        </tr>`).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 3. Modals & Forms
function openModal(index = -1) {
    currentEditingIndex = index;
    const title = document.getElementById('modalTitle');
    if(title) title.innerText = index === -1 ? 'ADD NEW MEMBER' : 'EDIT MEMBER';
    renderDynamicForm(index === -1 ? null : employees[index]);
    document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
}

function renderDynamicForm(data = null) {
    const container = document.getElementById('dynamicForm');
    if (!container) return; 

    let html = `
    <div class="space-y-1"><label class="text-[10px] font-bold text-gray-400 uppercase">Full Name</label><input type="text" id="empName" value="${data ? data.name : ''}" class="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-bold"></div>
    <div class="space-y-1"><label class="text-[10px] font-bold text-gray-400 uppercase">Role</label><input type="text" id="empRole" value="${data ? data.role : ''}" class="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-bold"></div>
    <div class="space-y-1"><label class="text-[10px] font-bold text-gray-400 uppercase">Area (Comma separated)</label><input type="text" id="empArea" value="${data ? (Array.isArray(data.area) ? data.area.join(', ') : data.area) : ''}" class="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-bold"></div>
    <div class="space-y-1"><label class="text-[10px] font-bold text-gray-400 uppercase">Working In (Comma separated)</label><input type="text" id="empWorkingIn" value="${data ? (Array.isArray(data.workingIn) ? data.workingIn.join(', ') : data.workingIn) : ''}" class="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-bold"></div>
    <div class="flex items-center gap-6 p-4 bg-gray-50 rounded-xl border">
        <label class="flex items-center gap-2 cursor-pointer font-bold text-sm">
            <input type="checkbox" id="empIsVacation" ${data && data.isVacation ? 'checked' : ''} class="w-5 h-5 accent-red-500">
            Is on Vacation?
        </label>
        <div class="flex-1">
            <label class="text-[10px] font-bold text-gray-400 uppercase block mb-1">Return Date</label>
            <input type="date" id="empVacationEnd" value="${data ? data.vacationEnd : ''}" class="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
        </div>
    </div>
    `;

    fieldsConfig.filter(f => f.active).forEach(f => {
        html += `
        <div class="space-y-1">
            <label class="text-[10px] font-bold text-gray-400 uppercase">${f.name}</label>
            <input type="text" data-field-id="${f.id}" value="${data ? (data[f.id] || '') : ''}" class="custom-field-input w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50">
        </div>`;
    });

    container.innerHTML = html;
}

async function saveEmployee() {
    const name = document.getElementById('empName').value;
    if (!name) return alert("Name is required");

    const emp = {
        name,
        role: document.getElementById('empRole').value,
        area: document.getElementById('empArea').value.split(',').map(s => s.trim()).filter(s => s),
        workingIn: document.getElementById('empWorkingIn').value.split(',').map(s => s.trim()).filter(s => s),
        isVacation: document.getElementById('empIsVacation').checked,
        vacationEnd: document.getElementById('empVacationEnd').value
    };

    document.querySelectorAll('.custom-field-input').forEach(input => {
        emp[input.dataset.fieldId] = input.value;
    });

    if (currentEditingIndex === -1) {
        employees.push(emp);
    } else {
        employees[currentEditingIndex] = emp;
    }

    const success = await saveToGitHub();
    if (success) {
        closeModal();
        renderAll();
    }
}

async function deleteEmployee(index) {
    if (confirm("Are you sure you want to delete this member?")) {
        employees.splice(index, 1);
        const success = await saveToGitHub();
        if (success) renderAll();
    }
}

// 4. Detailed View Popup
function showGlobalDetails(area, isVacation, type) {
    const list = employees.filter(e => {
        const areaList = Array.isArray(e.area) ? e.area : [e.area];
        const inArea = areaList.some(a => area.split(',').includes(a));
        
        let matchesType = false;
        if (type === 'dev') {
            matchesType = e.role && (e.role.includes('Dev') || e.role.includes('Senior') || e.role.includes('Lead'));
        } else if (type === 'tester') {
            matchesType = e.role && e.role.includes('Tester');
        } else {
            matchesType = true;
        }

        return inArea && matchesType && (isVacation ? e.isVacation : !e.isVacation);
    });

    const titleEl = document.getElementById('popupTitle');
    const listEl = document.getElementById('popupList');
    
    if(titleEl) titleEl.innerText = `${area} - ${isVacation ? 'On Vacation' : 'Active Members'}`;
    if(listEl) {
        listEl.innerHTML = list.length > 0 ? list.map(e => `
            <div class="p-4 border rounded-xl ${e.isVacation ? 'bg-red-50 border-red-200' : 'bg-gray-50'}">
                <b class="${e.isVacation ? 'line-through text-red-600' : ''}">${e.name}</b><br>
                <small class="text-gray-500">${e.role} ${e.isVacation ? '(Returns: ' + (e.vacationEnd || 'N/A') + ')' : ''}</small>
            </div>`).join('') : '<div class="text-center py-10 text-gray-400 font-bold">No members found</div>';
    }
    document.getElementById('detailsPopup').classList.remove('hidden');
}

function closePopup() { document.getElementById('detailsPopup').classList.add('hidden'); }

// 5. Setup & Configuration Handlers
function openSetupModal() {
    const list = document.getElementById('fieldsList');
    list.innerHTML = fieldsConfig.map((f, idx) => `
        <div class="flex gap-4 items-end p-4 bg-gray-50 rounded-xl border">
            <div class="flex-1"><label class="text-[10px] font-bold text-gray-400 uppercase">Field Name</label><input type="text" value="${f.name}" onchange="updateField(${idx}, 'name', this.value)" class="w-full p-3 border rounded-lg"></div>
            <div class="flex items-center gap-4 h-[50px]">
                <label class="switch"><input type="checkbox" ${f.active ? 'checked' : ''} onchange="updateField(${idx}, 'active', this.checked)"><span class="slider"></span></label>
                <button onclick="removeField(${idx})" class="text-red-500 p-2 hover:bg-red-50 rounded"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
            </div>
        </div>`).join('');
    lucide.createIcons();
    document.getElementById('setupModal').classList.remove('hidden');
}

function closeSetupModal() { document.getElementById('setupModal').classList.add('hidden'); }
function addNewField() { fieldsConfig.push({ id: 'custom_' + Date.now(), name: 'New Field', active: true }); openSetupModal(); }
function updateField(idx, key, val) { fieldsConfig[idx][key] = val; }
function removeField(idx) { fieldsConfig.splice(idx, 1); openSetupModal(); }
async function saveFieldsConfig() { if (await saveToGitHub()) { closeSetupModal(); renderAll(); } }

// Visibility
function openVisibilityModal() {
    const areas = [...new Set(employees.flatMap(e => Array.isArray(e.area) ? e.area : [e.area]))].filter(a => a);
    const tbody = document.getElementById('visibilityTableBody');
    tbody.innerHTML = areas.map(area => {
        const config = visibilityConfig[area] || { dev: true, tester: true };
        return `
        <tr>
            <td class="p-4 border font-bold">${area}</td>
            <td class="p-4 border text-center"><input type="checkbox" ${config.dev ? 'checked' : ''} onchange="updateVisibility('${area}', 'dev', this.checked)" class="w-5 h-5 accent-blue-600"></td>
            <td class="p-4 border text-center"><input type="checkbox" ${config.tester ? 'checked' : ''} onchange="updateVisibility('${area}', 'tester', this.checked)" class="w-5 h-5 accent-green-600"></td>
        </tr>`;
    }).join('');
    document.getElementById('visibilityModal').classList.remove('hidden');
}

function updateVisibility(area, role, val) {
    if (!visibilityConfig[area]) visibilityConfig[area] = { dev: true, tester: true };
    visibilityConfig[area][role] = val;
}

function closeVisibilityModal() { document.getElementById('visibilityModal').classList.add('hidden'); }
async function saveVisibility() { if (await saveToGitHub()) { closeVisibilityModal(); renderAll(); } }

// Charts Logic
function renderCharts() {
    const grid = document.getElementById('dynamicChartsGrid');
    if (!grid) return;
    grid.innerHTML = chartsConfig.map(c => `
        <div class="p-6 google-card bg-white relative">
            <h4 class="text-gray-500 font-bold mb-4 uppercase text-xs tracking-widest border-b pb-2">${c.title}</h4>
            <div class="chart-container"><canvas id="chart-${c.id}"></canvas></div>
        </div>`).join('');

    chartsConfig.forEach(c => {
        const ctx = document.getElementById(`chart-${c.id}`);
        if (!ctx) return;
        
        if (chartsInstances[c.id]) chartsInstances[c.id].destroy();

        const dataPoints = {};
        employees.forEach(e => {
            const roleMatch = c.filterRoles.some(r => e.role && e.role.includes(r));
            if (roleMatch) {
                const val = e[c.field] || 'N/A';
                const vals = Array.isArray(val) ? val : [val];
                vals.forEach(v => { dataPoints[v] = (dataPoints[v] || 0) + 1; });
            }
        });

        chartsInstances[c.id] = new Chart(ctx, {
            type: c.type,
            data: {
                labels: Object.keys(dataPoints),
                datasets: [{ data: Object.values(dataPoints), backgroundColor: ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#9334E6', '#F06292', '#4DD0E1', '#81C784'] }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10, weight: 'bold' } } } } }
        });
    });
}

// Additional Helpers
function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(employees);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Team");
    XLSX.utils.writeFile(wb, "Team_Hub_Export.xlsx");
}

function clearFilters() {
    document.querySelectorAll('.filter-input-dynamic').forEach(i => i.value = "");
    const searchInput = document.getElementById('memberSearch');
    if(searchInput) searchInput.value = "";
    renderTable();
}

function renderFilters() {
    // This can be expanded if dynamic filters are needed in the header
}

// User Management
function openUsersModal() {
    const list = document.getElementById('usersList');
    list.innerHTML = users.map((u, idx) => `
        <div class="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg border items-center">
            <input type="text" value="${u.username}" placeholder="User" onchange="users[idx].username=this.value" class="p-2 border rounded">
            <input type="password" value="${u.password}" placeholder="Pass" onchange="users[idx].password=this.value" class="p-2 border rounded">
            <select onchange="users[idx].role=this.value" class="p-2 border rounded">
                <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                <option value="viewer" ${u.role==='viewer'?'selected':''}>Viewer</option>
            </select>
            <button onclick="removeUser(${idx})" class="text-red-500 hover:bg-red-100 p-2 rounded"><i data-lucide="trash-2" class="w-4 h-4 mx-auto"></i></button>
        </div>`).join('');
    lucide.createIcons();
    document.getElementById('usersModal').classList.remove('hidden');
}
function closeUsersModal() { document.getElementById('usersModal').classList.add('hidden'); }
function addNewUser() { users.push({username:'', password:'', role:'viewer'}); openUsersModal(); }
function removeUser(idx) { users.splice(idx,1); openUsersModal(); }
async function saveUsers() { if (await saveToGitHub()) closeUsersModal(); }

// Charts Setup
function openChartsSetupModal() {
    const list = document.getElementById('chartsConfigList');
    list.innerHTML = chartsConfig.map((c, idx) => `
        <div class="p-4 border rounded-xl bg-gray-50 space-y-3">
            <div class="flex justify-between"><b>Chart #${idx+1}</b><button onclick="removeChart(${idx})" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div>
            <input type="text" value="${c.title}" placeholder="Title" onchange="chartsConfig[idx].title=this.value" class="w-full p-2 border rounded">
            <div class="grid grid-cols-2 gap-2">
                <input type="text" value="${c.field}" placeholder="Field ID (e.g. area)" onchange="chartsConfig[idx].field=this.value" class="p-2 border rounded">
                <select onchange="chartsConfig[idx].type=this.value" class="p-2 border rounded">
                    <option value="doughnut" ${c.type==='doughnut'?'selected':''}>Doughnut</option>
                    <option value="pie" ${c.type==='pie'?'selected':''}>Pie</option>
                    <option value="bar" ${c.type==='bar'?'selected':''}>Bar</option>
                </select>
            </div>
            <input type="text" value="${c.filterRoles.join(',')}" placeholder="Filter Roles (comma separated)" onchange="chartsConfig[idx].filterRoles=this.value.split(',')" class="w-full p-2 border rounded text-xs">
        </div>`).join('');
    lucide.createIcons();
    document.getElementById('chartsSetupModal').classList.remove('hidden');
}
function closeChartsSetupModal() { document.getElementById('chartsSetupModal').classList.add('hidden'); }
function addNewChart() { chartsConfig.push({id:'c'+Date.now(), title:'New Chart', field:'area', type:'doughnut', filterRoles:['Dev','Tester']}); openChartsSetupModal(); }
function removeChart(idx) { chartsConfig.splice(idx,1); openChartsSetupModal(); }
async function saveChartsConfig() { if (await saveToGitHub()) { closeChartsSetupModal(); renderCharts(); } }

function performFullBackup() {
    const data = { employees, fields: fieldsConfig, users, visibility: visibilityConfig, charts: chartsConfig };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}
