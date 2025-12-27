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

function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }

function renderDynamicForm(data = null) {
    const container = document.getElementById('dynamicForm');
    if (!container) return; // منع الخطأ في حال لم يتم تحميل الصفحة بعد

    let html = `
        <div class="space-y-1"><label class="text-[10px] font-bold text-gray-400 uppercase">Full Name</label><input type="text" id="empName" value="${data ? data.name : ''}" class="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-bold"></div>
        <div class="space-y-1"><label class="text-[10px] font-bold text-gray-400 uppercase">Role</label><input type="text" id="empRole" value="${data ? data.role : ''}" class="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"></div>
        <div class="space-y-1"><label class="text-[10px] font-bold text-gray-400 uppercase">Areas (Comma separated)</label><input type="text" id="empArea" value="${data ? (Array.isArray(data.area) ? data.area.join(', ') : data.area) : ''}" class="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"></div>
        <div class="space-y-1"><label class="text-[10px] font-bold text-gray-400 uppercase">Working In (Comma separated)</label><input type="text" id="empWorking" value="${data ? (Array.isArray(data.workingIn) ? data.workingIn.join(', ') : data.workingIn) : ''}" class="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"></div>
        <div class="col-span-full border-t pt-4 mt-2 flex items-center justify-between">
            <div><label class="text-[10px] font-bold text-gray-400 uppercase block">On Vacation?</label>
            <div class="flex items-center gap-3 mt-1"><label class="switch"><input type="checkbox" id="empVacation" ${data && data.isVacation ? 'checked' : ''} onchange="document.getElementById('vacDateCont').classList.toggle('hidden', !this.checked)"><span class="slider"></span></label><span class="text-sm font-bold text-gray-600 uppercase">Vacation Mode</span></div></div>
            <div id="vacDateCont" class="${data && data.isVacation ? '' : 'hidden'}"><label class="text-[10px] font-bold text-gray-400 uppercase block">Return Date</label><input type="date" id="empVacationEnd" value="${data ? data.vacationEnd : ''}" class="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-red-500 bg-red-50 text-red-700 font-bold"></div>
        </div>`;
    
    fieldsConfig.filter(f => f.active).forEach(f => {
        html += `<div class="space-y-1"><label class="text-[10px] font-bold text-gray-400 uppercase">${f.name}</label><input type="text" id="field_${f.id}" value="${data ? (data[f.id] || '') : ''}" class="w-full p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"></div>`;
    });
    
    container.innerHTML = html;
}

// 4. Filters & Search
function renderFilters() {
    const container = document.getElementById('filterContainer');
    if(!container) return;
    const existing = container.querySelectorAll('.filter-input-dynamic');
    existing.forEach(e => e.remove());

    fieldsConfig.filter(f => f.active).forEach(f => {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Filter by ${f.name}...`;
        input.className = 'filter-input-dynamic px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 w-40';
        input.dataset.field = f.id;
        input.oninput = renderTable;
        container.appendChild(input);
    });
}

function clearFilters() {
    const search = document.getElementById('memberSearch');
    if(search) search.value = '';
    document.querySelectorAll('.filter-input-dynamic').forEach(i => i.value = '');
    renderTable();
}

// 5. Setup & Config
function openSetupModal() {
    const list = document.getElementById('fieldsList');
    if(!list) return;
    list.innerHTML = fieldsConfig.map((f, i) => `
        <div class="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border">
            <input type="text" value="${f.name}" onchange="fieldsConfig[${i}].name=this.value" class="flex-1 p-2 border rounded">
            <label class="flex items-center gap-2 text-xs font-bold"><input type="checkbox" ${f.active ? 'checked' : ''} onchange="fieldsConfig[${i}].active=this.checked"> ACTIVE</label>
            <button onclick="fieldsConfig.splice(${i},1); openSetupModal()" class="text-red-500 hover:bg-red-50 p-2 rounded"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>`).join('');
    document.getElementById('setupModal').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function addNewField() {
    fieldsConfig.push({ id: 'custom_' + Date.now(), name: 'New Field', active: true });
    openSetupModal();
}

async function saveSetup() {
    if(await saveToGitHub()) { alert("System Config Updated!"); closeSetupModal(); renderAll(); }
}

// 6. User Management
function openUsersModal() {
    const list = document.getElementById('usersList');
    if(!list) return;
    list.innerHTML = users.map((u, i) => `
        <div class="flex flex-wrap gap-2 items-center bg-gray-50 p-3 rounded-xl border">
            <input type="text" placeholder="User" value="${u.username}" onchange="users[${i}].username=this.value" class="p-2 border rounded text-xs w-32">
            <input type="password" placeholder="Pass" value="${u.password}" onchange="users[${i}].password=this.value" class="p-2 border rounded text-xs w-32">
            <select onchange="users[${i}].role=this.value" class="p-2 border rounded text-xs">
                <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                <option value="viewer" ${u.role==='viewer'?'selected':''}>Viewer</option>
            </select>
            <button onclick="users.splice(${i},1); openUsersModal()" class="text-red-500 p-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>`).join('');
    document.getElementById('usersModal').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function addNewUser() {
    users.push({ username: '', password: '', role: 'viewer' });
    openUsersModal();
}

async function saveUsers() {
    if(await saveToGitHub()) { alert("Users Updated!"); closeUsersModal(); }
}

// 7. Visibility Setup
function openVisibilityModal() {
    const list = document.getElementById('visibilityList');
    if(!list) return;
    const allAreas = [...new Set(employees.flatMap(e => Array.isArray(e.area) ? e.area : [e.area]))];
    
    list.innerHTML = allAreas.map(area => {
        const config = visibilityConfig[area] || { dev: true, tester: true };
        return `
        <div class="p-4 border rounded-xl bg-gray-50">
            <div class="font-bold text-xs mb-3 text-blue-700 uppercase tracking-tighter">${area}</div>
            <div class="flex gap-6">
                <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" class="vis-check" data-area="${area}" data-type="dev" ${config.dev ? 'checked' : ''}> <span class="text-[10px] font-black">DEV</span></label>
                <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" class="vis-check" data-area="${area}" data-type="tester" ${config.tester ? 'checked' : ''}> <span class="text-[10px] font-black">TESTER</span></label>
            </div>
        </div>`;
    }).join('');
    document.getElementById('visibilityModal').classList.remove('hidden');
}

async function saveVisibility() {
    const checks = document.querySelectorAll('.vis-check');
    checks.forEach(c => {
        const area = c.dataset.area;
        const type = c.dataset.type;
        if (!visibilityConfig[area]) visibilityConfig[area] = {};
        visibilityConfig[area][type] = c.checked;
    });
    if(await saveToGitHub()) { alert("Visibility Updated!"); closeVisibilityModal(); renderAll(); }
}

// 8. Charts Rendering
function renderCharts() {
    const container = document.getElementById('dynamicChartsGrid');
    if(!container) return;
    container.innerHTML = chartsConfig.filter(c => c.active).map(c => `
        <div class="google-card p-4">
            <h4 class="text-[10px] font-black text-gray-400 uppercase mb-4 border-b pb-2">${c.title}</h4>
            <div class="chart-container"><canvas id="chart_${c.id}"></canvas></div>
        </div>`).join('');

    chartsConfig.filter(c => c.active).forEach(c => {
        const canvas = document.getElementById(`chart_${c.id}`);
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        const counts = {};
        employees.forEach(e => {
            const val = e[c.field] || 'N/A';
            const keys = Array.isArray(val) ? val : [val];
            keys.forEach(k => counts[k] = (counts[k] || 0) + 1);
        });

        if (chartsInstances[c.id]) chartsInstances[c.id].destroy();
        chartsInstances[c.id] = new Chart(ctx, {
            type: c.type,
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    data: Object.values(counts),
                    backgroundColor: ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#8E44AD', '#F39C12']
                }]
            },
            options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10, weight: 'bold' } } } } }
        });
    });
}

function openChartsSetupModal() {
    const list = document.getElementById('chartsConfigList');
    if(!list) return;
    const fields = [{id: 'role', name: 'Role'}, {id: 'area', name: 'Area'}, {id: 'workingIn', name: 'Working In'}, ...fieldsConfig.filter(f=>f.active)];
    
    list.innerHTML = chartsConfig.map((c, i) => `
        <div class="p-4 border rounded-xl bg-gray-50 flex flex-wrap gap-3 items-center">
            <input type="text" value="${c.title}" onchange="chartsConfig[${i}].title=this.value" class="p-2 border rounded text-xs flex-1">
            <select onchange="chartsConfig[${i}].field=this.value" class="p-2 border rounded text-xs">
                ${fields.map(f => `<option value="${f.id}" ${c.field===f.id?'selected':''}>${f.name}</option>`).join('')}
            </select>
            <select onchange="chartsConfig[${i}].type=this.value" class="p-2 border rounded text-xs">
                <option value="pie" ${c.type==='pie'?'selected':''}>Pie</option>
                <option value="bar" ${c.type==='bar'?'selected':''}>Bar</option>
                <option value="doughnut" ${c.type==='doughnut'?'selected':''}>Doughnut</option>
            </select>
            <label class="flex items-center gap-1 text-[10px] font-bold"><input type="checkbox" ${c.active?'checked':''} onchange="chartsConfig[${i}].active=this.checked"> ACTIVE</label>
            <button onclick="chartsConfig.splice(${i},1); openChartsSetupModal()" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>`).join('');
    document.getElementById('chartsSetupModal').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function addNewChart() {
    chartsConfig.push({ id: Date.now(), title: 'New Chart', field: 'role', type: 'pie', active: true });
    openChartsSetupModal();
}

async function saveChartsConfig() {
    if(await saveToGitHub()) { alert("Charts Updated!"); closeChartsSetupModal(); renderAll(); }
}

// 9. Operations (CRUD)
async function saveEmployee() {
    const name = document.getElementById('empName').value;
    if(!name) return alert("Name is required");

    const empData = {
        name,
        role: document.getElementById('empRole').value,
        area: document.getElementById('empArea').value.split(',').map(s => s.trim()),
        workingIn: document.getElementById('empWorking').value.split(',').map(s => s.trim()),
        isVacation: document.getElementById('empVacation').checked,
        vacationEnd: document.getElementById('empVacationEnd').value
    };

    fieldsConfig.filter(f => f.active).forEach(f => {
        empData[f.id] = document.getElementById(`field_${f.id}`).value;
    });

    if (currentEditingIndex === -1) employees.push(empData);
    else employees[currentEditingIndex] = empData;

    if(await saveToGitHub()) { closeModal(); renderAll(); }
}

async function deleteEmployee(index) {
    if(confirm("Are you sure?")) {
        employees.splice(index, 1);
        if(await saveToGitHub()) renderAll();
    }
}

function editEmployee(index) { openModal(index); }

function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(employees);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Team");
    XLSX.writeFile(wb, "Team_Hub_Export.xlsx");
}

function performFullBackup() {
    const dataStr = JSON.stringify({ employees, fields: fieldsConfig, users, visibility: visibilityConfig, charts: chartsConfig }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

// New function for details popup
function showGlobalDetails(area, isVacation, type) {
    const list = employees.filter(e => {
        const inArea = Array.isArray(e.area) ? e.area.includes(area) : e.area === area;
        const matchesType = type === 'dev' ? (e.role && (e.role.includes('Dev') || e.role.includes('Senior') || e.role.includes('Lead'))) : (e.role && e.role.includes('Tester'));
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
            </div>`).join('') : '<div class="col-span-full text-center text-gray-400 py-10 font-bold uppercase italic">No members found</div>';
    }
    document.getElementById('detailsPopup').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closePopup() { document.getElementById('detailsPopup').classList.add('hidden'); }
