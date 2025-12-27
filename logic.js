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

// 1. Capacity Visualization (استعادة التصميم القديم والوظائف)
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

        const visibleGroups = Object.keys(groups).filter(area => {
            const config = visibilityConfig[area];
            return config ? config[type] : true;
        }).sort();

        container.innerHTML = visibleGroups.map(area => {
            const members = groups[area];
            const activeCount = members.filter(m => !m.isVacation).length;
            const vacationCount = members.length - activeCount;
            
            return `
                <div class="google-card p-3 capacity-card flex flex-col justify-between cursor-pointer" onclick="showGlobalDetails('${area}', ${type === 'dev'})">
                    <div class="text-[10px] font-black text-gray-400 uppercase truncate mb-1" title="${area}">${area}</div>
                    <div class="flex items-end justify-between">
                        <span class="text-2xl font-light text-gray-800">${activeCount}</span>
                        ${vacationCount > 0 ? `<span class="text-xs font-bold text-red-500 bg-red-50 px-1 rounded">-${vacationCount}</span>` : ''}
                    </div>
                    <div class="w-full bg-gray-100 h-1 mt-2 rounded-full overflow-hidden">
                        <div class="bg-${type === 'dev' ? 'blue' : 'green'}-500 h-full" style="width: ${(activeCount/members.length)*100}%"></div>
                    </div>
                </div>`;
        }).join('');

        return list.filter(e => !e.isVacation).length;
    };

    const totalDevs = renderCards(devs, devGrid, 'dev');
    const totalTesters = renderCards(testers, testGrid, 'tester');
    
    document.getElementById('devTotalLabel').innerText = `Active: ${totalDevs}`;
    document.getElementById('testerTotalLabel').innerText = `Active: ${totalTesters}`;
}

// 2. Table Rendering with Sorting & Filtering
function renderTable() {
    const headerRow = document.getElementById('tableHeaderRow');
    const body = document.getElementById('employeeTableBody');
    if (!headerRow || !body) return;

    // Build Headers
    let headers = [
        { key: 'name', label: 'Name' },
        { key: 'role', label: 'Role' },
        { key: 'area', label: 'Primary Area' },
        { key: 'workingIn', label: 'Working In' },
        { key: 'status', label: 'Status' }
    ];
    
    fieldsConfig.filter(f => f.active).forEach(f => {
        headers.push({ key: f.id, label: f.name });
    });

    headerRow.innerHTML = headers.map(h => `
        <th class="p-4 sortable-header" onclick="sortTable('${h.key}')">
            <div class="flex items-center gap-1">
                ${h.label}
                <i data-lucide="chevrons-up-down" class="w-3 h-3 text-gray-400"></i>
            </div>
            <input type="text" placeholder="Filter..." class="filter-input w-full mt-2 p-1 font-normal border rounded text-xs no-print" 
                   onclick="event.stopPropagation()" onkeyup="filterTable()">
        </th>
    `).join('') + `<th class="p-4 admin-cell">Actions</th>`;

    // Sort Data
    const sortedEmployees = [...employees].sort((a, b) => {
        let valA = (a[sortConfig.key] || '').toString().toLowerCase();
        let valB = (b[sortConfig.key] || '').toString().toLowerCase();
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    // Build Rows
    body.innerHTML = sortedEmployees.map((emp, idx) => {
        const isVac = emp.isVacation;
        return `
            <tr class="${isVac ? 'vacation-row' : 'hover:bg-gray-50'} transition-colors" data-index="${idx}">
                <td class="p-4 font-bold ${isVac ? 'line-through text-red-400' : 'text-blue-600'}">${emp.name || ''}</td>
                <td class="p-4 text-gray-600">${emp.role || ''}</td>
                <td class="p-4"><span class="px-2 py-1 bg-gray-100 rounded text-xs">${emp.area || ''}</span></td>
                <td class="p-4 text-gray-600">${emp.workingIn || ''}</td>
                <td class="p-4">
                    ${isVac ? `<span class="text-red-600 font-bold text-[10px] uppercase">Vacation (Until: ${emp.vacationEnd || '?'})</span>` 
                           : `<span class="text-emerald-600 font-bold text-[10px] uppercase">Available</span>`}
                </td>
                ${fieldsConfig.filter(f => f.active).map(f => `<td class="p-4 text-gray-500">${emp[f.id] || '-'}</td>`).join('')}
                <td class="p-4 admin-cell">
                    <div class="flex gap-2">
                        <button onclick="editEmployee(${idx})" class="p-1 hover:text-blue-600"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                        <button onclick="deleteEmployee(${idx})" class="p-1 hover:text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    </div>
                </td>
            </tr>`;
    }).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function filterTable() {
    const table = document.getElementById('employeeTable');
    const rows = table.querySelectorAll('tbody tr');
    const inputs = table.querySelectorAll('.filter-input');
    
    rows.forEach(row => {
        let show = true;
        inputs.forEach((input, idx) => {
            const filterValue = input.value.toLowerCase();
            const cellValue = row.cells[idx].innerText.toLowerCase();
            if (filterValue && !cellValue.includes(filterValue)) show = false;
        });
        row.style.display = show ? '' : 'none';
        show ? row.classList.remove('hidden-by-filter') : row.classList.add('hidden-by-filter');
    });
}

function sortTable(key) {
    if (sortConfig.key === key) {
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortConfig.key = key;
        sortConfig.direction = 'asc';
    }
    renderTable();
}

// 3. Dynamic Form for Custom Fields
function renderDynamicForm() {
    const container = document.getElementById('dynamicFieldsContainer');
    if(!container) return;
    container.innerHTML = fieldsConfig.filter(f => f.active).map(f => `
        <div>
            <label class="block text-xs font-bold text-gray-400 mb-1 uppercase">${f.name}</label>
            <input type="${f.type}" id="field_${f.id}" class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
        </div>
    `).join('');
}

// 4. Modal Controls
function openModal(idx = -1) {
    currentEditingIndex = idx;
    const modal = document.getElementById('memberModal');
    const title = document.getElementById('modalTitle');
    
    // Clear Form
    document.getElementById('empName').value = '';
    document.getElementById('empRole').value = '';
    document.getElementById('empArea').value = '';
    document.getElementById('empWorkingIn').value = '';
    document.getElementById('empVacation').value = 'false';
    document.getElementById('empVacationEnd').value = '';
    fieldsConfig.forEach(f => {
        const el = document.getElementById(`field_${f.id}`);
        if(el) el.value = '';
    });

    if (idx !== -1) {
        const emp = employees[idx];
        title.innerText = 'Edit Team Member';
        document.getElementById('empName').value = emp.name || '';
        document.getElementById('empRole').value = emp.role || '';
        document.getElementById('empArea').value = Array.isArray(emp.area) ? emp.area.join(', ') : emp.area || '';
        document.getElementById('empWorkingIn').value = Array.isArray(emp.workingIn) ? emp.workingIn.join(', ') : emp.workingIn || '';
        document.getElementById('empVacation').value = String(emp.isVacation);
        document.getElementById('empVacationEnd').value = emp.vacationEnd || '';
        fieldsConfig.forEach(f => {
            const el = document.getElementById(`field_${f.id}`);
            if(el) el.value = emp[f.id] || '';
        });
    } else {
        title.innerText = 'Add Team Member';
    }
    modal.classList.remove('hidden');
}

function closeModal() { document.getElementById('memberModal').classList.add('hidden'); }

async function saveEmployee() {
    const newEmp = {
        name: document.getElementById('empName').value,
        role: document.getElementById('empRole').value,
        area: document.getElementById('empArea').value.split(',').map(s => s.trim()),
        workingIn: document.getElementById('empWorkingIn').value.split(',').map(s => s.trim()),
        isVacation: document.getElementById('empVacation').value === 'true',
        vacationEnd: document.getElementById('empVacationEnd').value
    };
    
    fieldsConfig.forEach(f => {
        const el = document.getElementById(`field_${f.id}`);
        if(el) newEmp[f.id] = el.value;
    });

    if (currentEditingIndex === -1) employees.push(newEmp);
    else employees[currentEditingIndex] = newEmp;

    if (await saveToGitHub()) {
        closeModal();
        renderAll();
    }
}

function editEmployee(idx) { openModal(idx); }

async function deleteEmployee(idx) {
    if (confirm('Are you sure you want to delete this member?')) {
        employees.splice(idx, 1);
        if (await saveToGitHub()) renderAll();
    }
}

// 5. Details Popup Functions
function showGlobalDetails(area, isDev) {
    const roleFilter = isDev ? ['dev', 'senior'] : ['tester'];
    const list = employees.filter(e => {
        const areas = Array.isArray(e.area) ? e.area : (e.area ? e.area.split(',') : []);
        const matchesArea = areas.some(a => a.trim() === area);
        const matchesRole = roleFilter.some(r => e.role.toLowerCase().includes(r));
        return matchesArea && matchesRole;
    });

    document.getElementById('popupTitle').innerText = `${area} - ${isDev ? 'Developers' : 'Testers'}`;
    document.getElementById('popupList').innerHTML = list.length > 0 ? list.map(e => `
        <div class="p-4 border rounded-xl ${e.isVacation ? 'bg-red-50 border-red-200' : 'bg-gray-50'}">
            <b class="${e.isVacation ? 'line-through text-red-600' : ''}">${e.name}</b><br>
            <small class="text-gray-500">${e.role} ${e.isVacation ? '(Returns: ' + (e.vacationEnd || 'N/A') + ')' : ''}</small>
        </div>
    `).join('') : '<div class="col-span-full text-center text-gray-400 py-10 font-bold uppercase italic">No members found</div>';
    
    document.getElementById('detailsPopup').classList.remove('hidden');
}

function closePopup() { document.getElementById('detailsPopup').classList.add('hidden'); }

// 6. Charts Logic
function renderCharts() {
    const grid = document.getElementById('dynamicChartsGrid');
    if(!grid) return;
    
    // Clear old charts
    Object.values(chartsInstances).forEach(chart => chart.destroy());
    chartsInstances = {};
    
    grid.innerHTML = chartsConfig.map(c => `
        <div class="google-card p-6">
            <h4 class="font-bold text-gray-700 mb-4 flex items-center gap-2">
                <i data-lucide="pie-chart" class="w-4 h-4"></i> ${c.title}
            </h4>
            <div class="chart-container"><canvas id="chart-${c.id}"></canvas></div>
        </div>
    `).join('');

    chartsConfig.forEach(config => {
        const ctx = document.getElementById(`chart-${config.id}`);
        if (!ctx) return;

        const filtered = employees.filter(e => {
            if (!config.filterRoles || config.filterRoles.length === 0) return true;
            return config.filterRoles.some(r => e.role.toLowerCase().includes(r.toLowerCase()));
        });

        const stats = {};
        filtered.forEach(e => {
            let vals = e[config.field] || 'N/A';
            if (!Array.isArray(vals)) vals = [vals];
            vals.forEach(v => { stats[v] = (stats[v] || 0) + 1; });
        });

        chartsInstances[config.id] = new Chart(ctx, {
            type: config.type || 'doughnut',
            data: {
                labels: Object.keys(stats),
                datasets: [{
                    data: Object.values(stats),
                    backgroundColor: ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#8E24AA', '#00ACC1', '#F4511E']
                }]
            },
            options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }
        });
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 7. Data Management (Export/Backup)
function exportToExcel() {
    const wsData = employees.map(e => {
        const obj = {
            Name: e.name,
            Role: e.role,
            Area: Array.isArray(e.area) ? e.area.join(', ') : e.area,
            'Working In': Array.isArray(e.workingIn) ? e.workingIn.join(', ') : e.workingIn,
            Status: e.isVacation ? `Vacation (Until ${e.vacationEnd})` : 'Active'
        };
        fieldsConfig.forEach(f => { obj[f.name] = e[f.id] || ''; });
        return obj;
    });
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Team");
    XLSX.writeFile(wb, `Team_Hub_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
}

function performFullBackup() {
    const data = { employees, fields: fieldsConfig, users, visibility: visibilityConfig, charts: chartsConfig };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Backup_${new Date().getTime()}.json`;
    a.click();
}

function clearFilters() {
    document.querySelectorAll('.filter-input').forEach(i => i.value = "");
    filterTable();
}

// -- Setup & Config Functions (Simplified for brevity but fully functional) --
function openSetupModal() {
    const list = document.getElementById('fieldsList');
    list.innerHTML = fieldsConfig.map((f, i) => `
        <div class="flex gap-2 items-center bg-gray-50 p-2 rounded">
            <input type="text" value="${f.name}" onchange="fieldsConfig[${i}].name=this.value" class="flex-1 p-2 border rounded">
            <select onchange="fieldsConfig[${i}].type=this.value" class="p-2 border rounded">
                <option value="text" ${f.type==='text'?'selected':''}>Text</option>
                <option value="date" ${f.type==='date'?'selected':''}>Date</option>
                <option value="number" ${f.type==='number'?'selected':''}>Number</option>
            </select>
            <button onclick="removeField(${i})" class="text-red-500 p-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
    `).join('');
    document.getElementById('setupModal').classList.remove('hidden');
    lucide.createIcons();
}

function closeSetupModal() { document.getElementById('setupModal').classList.add('hidden'); }
function addNewFieldSetup() { fieldsConfig.push({id: 'custom_'+Date.now(), name: 'New Field', type: 'text', active: true}); openSetupModal(); }
function removeField(i) { fieldsConfig.splice(i,1); openSetupModal(); }
async function saveSetup() { if (await saveToGitHub()) { closeSetupModal(); renderAll(); } }

// Visibility Setup
function openVisibilityModal() {
    const container = document.getElementById('visibilityList');
    const allAreas = new Set();
    employees.forEach(e => {
        const areas = Array.isArray(e.area) ? e.area : (e.area ? e.area.split(',') : []);
        areas.forEach(a => allAreas.add(a.trim()));
    });

    container.innerHTML = Array.from(allAreas).sort().map(area => {
        const config = visibilityConfig[area] || { dev: true, tester: true };
        return `
            <tr>
                <td class="p-3 font-bold text-gray-700">${area}</td>
                <td class="p-3 text-center">
                    <label class="switch"><input type="checkbox" ${config.dev ? 'checked' : ''} onchange="updateVisVal('${area}', 'dev', this.checked)"><span class="slider"></span></label>
                </td>
                <td class="p-3 text-center">
                    <label class="switch"><input type="checkbox" ${config.tester ? 'checked' : ''} onchange="updateVisVal('${area}', 'tester', this.checked)"><span class="slider"></span></label>
                </td>
            </tr>`;
    }).join('');
    document.getElementById('visibilityModal').classList.remove('hidden');
}

function updateVisVal(area, type, val) {
    if(!visibilityConfig[area]) visibilityConfig[area] = { dev: true, tester: true };
    visibilityConfig[area][type] = val;
}
function closeVisibilityModal() { document.getElementById('visibilityModal').classList.add('hidden'); }
async function saveVisibility() { if (await saveToGitHub()) { closeVisibilityModal(); renderAll(); } }

// Users Management
function openUsersModal() {
    const list = document.getElementById('usersList');
    list.innerHTML = users.map((u, i) => `
        <div class="grid grid-cols-4 gap-2 bg-gray-50 p-3 rounded items-center">
            <input type="text" value="${u.username}" onchange="users[${i}].username=this.value" placeholder="User" class="p-2 border rounded">
            <input type="password" value="${u.password}" onchange="users[${i}].password=this.value" placeholder="Pass" class="p-2 border rounded">
            <select onchange="users[${i}].role=this.value" class="p-2 border rounded">
                <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                <option value="viewer" ${u.role==='viewer'?'selected':''}>Viewer</option>
            </select>
            <button onclick="users.splice(${i},1); openUsersModal()" class="text-red-500 justify-self-center"><i data-lucide="user-minus" class="w-5 h-5"></i></button>
        </div>
    `).join('');
    document.getElementById('usersModal').classList.remove('hidden');
    lucide.createIcons();
}
function addNewUser() { users.push({username: '', password: '', role: 'viewer'}); openUsersModal(); }
function closeUsersModal() { document.getElementById('usersModal').classList.add('hidden'); }
async function saveUsers() { if (await saveToGitHub()) { closeUsersModal(); alert("Users updated!"); } }

// Charts Setup
function openChartsSetupModal() {
    const list = document.getElementById('chartsConfigList');
    list.innerHTML = chartsConfig.map((c, i) => `
        <div class="bg-gray-50 p-4 rounded-xl border-l-4 border-emerald-500 mb-2">
            <div class="grid grid-cols-2 gap-3 mb-2">
                <input type="text" value="${c.title}" onchange="chartsConfig[${i}].title=this.value" class="p-2 border rounded text-sm" placeholder="Chart Title">
                <select onchange="chartsConfig[${i}].field=this.value" class="p-2 border rounded text-sm">
                    <option value="area" ${c.field==='area'?'selected':''}>Primary Area</option>
                    <option value="workingIn" ${c.field==='workingIn'?'selected':''}>Working In</option>
                    <option value="role" ${c.field==='role'?'selected':''}>Role</option>
                </select>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-[10px] font-bold text-gray-400">ROLES (comma separated):</span>
                <input type="text" value="${(c.filterRoles||[]).join(',')}" onchange="chartsConfig[${i}].filterRoles=this.value.split(',')" class="p-1 border rounded text-[10px] w-1/2">
                <button onclick="chartsConfig.splice(${i},1); openChartsSetupModal()" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>
    `).join('');
    document.getElementById('chartsSetupModal').classList.remove('hidden');
    lucide.createIcons();
}
function addNewChartConfig() { chartsConfig.push({id: 'c'+Date.now(), title: 'New Chart', field: 'workingIn', filterRoles: ['Dev'], type: 'doughnut'}); openChartsSetupModal(); }
function closeChartsSetupModal() { document.getElementById('chartsSetupModal').classList.add('hidden'); }
async function saveChartsConfig() { if (await saveToGitHub()) { closeChartsSetupModal(); renderAll(); } }
