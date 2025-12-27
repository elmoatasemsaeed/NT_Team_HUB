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

// 2. Table Rendering
function renderTable() {
    const headerRow = document.getElementById('tableHeaderRow');
    const body = document.getElementById('employeeTableBody');
    if (!headerRow || !body) return;

    headerRow.innerHTML = fieldsConfig.map(f => `
        <th class="p-4 sortable-header" onclick="sortTable('${f.id}')">
            <div class="flex items-center gap-1">
                ${f.label}
                <i data-lucide="chevrons-up-down" class="w-3 h-3 text-gray-400"></i>
            </div>
            <input type="text" placeholder="Filter..." class="filter-input w-full mt-2 p-1 font-normal border rounded text-xs no-print" 
                   onclick="event.stopPropagation()" onkeyup="filterTable()">
        </th>
    `).join('') + `
        <th class="p-4 sortable-header" onclick="sortTable('isVacation')">Status</th>
        <th class="p-4 admin-cell">Actions</th>`;

    const sortedEmployees = [...employees].sort((a, b) => {
        let valA = (a[sortConfig.key] || '').toString().toLowerCase();
        let valB = (b[sortConfig.key] || '').toString().toLowerCase();
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    body.innerHTML = sortedEmployees.map((emp, idx) => {
        const isVac = emp.isVacation;
        return `
            <tr class="${isVac ? 'vacation-row' : 'hover:bg-gray-50'} transition-colors" data-index="${idx}">
                ${fieldsConfig.map(f => {
                    let val = emp[f.id] || '';
                    if (Array.isArray(val)) val = val.join(', ');
                    return `<td class="p-4 ${f.id === 'name' ? 'font-bold text-blue-600' : 'text-gray-600'}">${val}</td>`;
                }).join('')}
                <td class="p-4">
                    ${isVac ? `<span class="text-red-600 font-bold text-[10px] uppercase">Vacation (Until: ${emp.vacationEnd || '?'})</span>` 
                           : `<span class="text-emerald-600 font-bold text-[10px] uppercase">Available</span>`}
                </td>
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

// 3. Dynamic Form for Add/Edit Member
function renderDynamicForm() {
    const container = document.getElementById('dynamicFieldsContainer');
    if(!container) return;

    container.innerHTML = fieldsConfig.map(f => {
        let inputHtml = '';
        if (f.type === 'select') {
            inputHtml = `<select id="field_${f.id}" class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select ${f.label}...</option>
                ${f.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
            </select>`;
        } else if (f.type === 'multiselect') {
            inputHtml = `<div class="border rounded-xl p-3 bg-gray-50 max-h-40 overflow-y-auto" id="container_${f.id}">
                ${f.options.map(opt => `
                    <label class="flex items-center gap-2 mb-1 cursor-pointer hover:bg-white p-1 rounded">
                        <input type="checkbox" name="field_${f.id}" value="${opt}" class="w-4 h-4">
                        <span class="text-sm">${opt}</span>
                    </label>
                `).join('')}
            </div>`;
        } else {
            inputHtml = `<input type="${f.type}" id="field_${f.id}" class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500" placeholder="${f.label}">`;
        }

        return `<div class="mb-4">
            <label class="block text-xs font-bold text-gray-400 mb-1 uppercase">${f.label}${f.required ? ' *' : ''}</label>
            ${inputHtml}
        </div>`;
    }).join('');
}

// 4. Modal Controls
function openModal(idx = -1) {
    currentEditingIndex = idx;
    const modal = document.getElementById('memberModal');
    const title = document.getElementById('modalTitle');
    
    // Reset Form
    fieldsConfig.forEach(f => {
        if (f.type === 'multiselect') {
            const checks = document.querySelectorAll(`input[name="field_${f.id}"]`);
            checks.forEach(c => c.checked = false);
        } else {
            const el = document.getElementById(`field_${f.id}`);
            if(el) el.value = '';
        }
    });
    document.getElementById('empVacation').value = 'false';
    document.getElementById('empVacationEnd').value = '';

    if (idx !== -1) {
        const emp = employees[idx];
        title.innerText = 'Edit Team Member';
        fieldsConfig.forEach(f => {
            const val = emp[f.id];
            if (f.type === 'multiselect') {
                const checks = document.querySelectorAll(`input[name="field_${f.id}"]`);
                const selected = Array.isArray(val) ? val : (val ? [val] : []);
                checks.forEach(c => c.checked = selected.includes(c.value));
            } else {
                const el = document.getElementById(`field_${f.id}`);
                if(el) el.value = val || '';
            }
        });
        document.getElementById('empVacation').value = String(emp.isVacation);
        document.getElementById('empVacationEnd').value = emp.vacationEnd || '';
    } else {
        title.innerText = 'Add Team Member';
    }
    modal.classList.remove('hidden');
}

function closeModal() { document.getElementById('memberModal').classList.add('hidden'); }

async function saveEmployee() {
    const newEmp = {};
    
    for (const f of fieldsConfig) {
        if (f.type === 'multiselect') {
            const checked = Array.from(document.querySelectorAll(`input[name="field_${f.id}"]:checked`)).map(c => c.value);
            newEmp[f.id] = checked;
        } else {
            newEmp[f.id] = document.getElementById(`field_${f.id}`).value;
        }
        if (f.required && (!newEmp[f.id] || newEmp[f.id].length === 0)) {
            alert(`Please fill the required field: ${f.label}`);
            return;
        }
    }

    newEmp.isVacation = document.getElementById('empVacation').value === 'true';
    newEmp.vacationEnd = document.getElementById('empVacationEnd').value;

    if (currentEditingIndex === -1) employees.push(newEmp);
    else employees[currentEditingIndex] = newEmp;

    if (await saveToGitHub()) {
        closeModal();
        renderAll();
    }
}

function editEmployee(idx) { openModal(idx); }

async function deleteEmployee(idx) {
    if (confirm('Are you sure?')) {
        employees.splice(idx, 1);
        if (await saveToGitHub()) renderAll();
    }
}

// 5. Setup Fields Modal (تعديل ليعرض الحقول الحالية من data.json)
function openSetupModal() {
    const container = document.getElementById('fieldsSetupContainer');
    container.innerHTML = fieldsConfig.map((f, i) => `
        <div class="p-4 border rounded-xl bg-gray-50 space-y-3">
            <div class="flex gap-2">
                <input type="text" value="${f.label}" onchange="fieldsConfig[${i}].label=this.value" class="flex-1 p-2 border rounded text-sm font-bold" placeholder="Label">
                <select onchange="fieldsConfig[${i}].type=this.value; openSetupModal()" class="p-2 border rounded text-sm">
                    <option value="text" ${f.type==='text'?'selected':''}>Text</option>
                    <option value="select" ${f.type==='select'?'selected':''}>Single Select</option>
                    <option value="multiselect" ${f.type==='multiselect'?'selected':''}>Multi Select</option>
                    <option value="date" ${f.type==='date'?'selected':''}>Date</option>
                </select>
                <button onclick="fieldsConfig.splice(${i},1); openSetupModal()" class="text-red-500"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
            </div>
            ${(f.type==='select' || f.type==='multiselect') ? `
                <textarea onchange="fieldsConfig[${i}].options=this.value.split(',').map(s=>s.trim())" 
                          class="w-full p-2 border rounded text-xs" placeholder="Options (comma separated)">${(f.options||[]).join(', ')}</textarea>
            ` : ''}
        </div>
    `).join('');
    document.getElementById('setupModal').classList.remove('hidden');
    lucide.createIcons();
}

function addNewField() {
    const id = 'custom_' + Date.now();
    fieldsConfig.push({ id, label: 'New Field', type: 'text', required: false, options: [] });
    openSetupModal();
}

async function saveFieldsConfig() {
    if (await saveToGitHub()) {
        document.getElementById('setupModal').classList.add('hidden');
        renderAll();
    }
}

// 6. Charts Setup
function openChartsSetupModal() {
    const container = document.getElementById('chartsSetupContainer');
    container.innerHTML = chartsConfig.map((c, i) => `
        <div class="p-4 border rounded-xl bg-gray-50 mb-4">
            <div class="grid grid-cols-2 gap-2 mb-2">
                <input type="text" value="${c.title}" onchange="chartsConfig[${i}].title=this.value" class="p-2 border rounded text-sm font-bold" placeholder="Chart Title">
                <select onchange="chartsConfig[${i}].field=this.value" class="p-2 border rounded text-sm">
                    ${fieldsConfig.filter(f => f.type === 'select' || f.type === 'multiselect').map(f => `
                        <option value="${f.id}" ${c.field===f.id?'selected':''}>${f.label}</option>
                    `).join('')}
                </select>
            </div>
            <div class="flex justify-between items-center">
                <input type="text" value="${(c.filterRoles||[]).join(',')}" onchange="chartsConfig[${i}].filterRoles=this.value.split(',')" class="p-1 border rounded text-[10px] w-1/2" placeholder="Filter Roles (e.g. Dev,Senior)">
                <button onclick="chartsConfig.splice(${i},1); openChartsSetupModal()" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>
    `).join('');
    document.getElementById('chartsSetupModal').classList.remove('hidden');
    lucide.createIcons();
}

function addNewChartConfig() { 
    chartsConfig.push({id: 'c'+Date.now(), title: 'New Chart', field: 'role', filterRoles: [], type: 'doughnut'}); 
    openChartsSetupModal(); 
}

async function saveChartsConfig() {
    if (await saveToGitHub()) {
        document.getElementById('chartsSetupModal').classList.add('hidden');
        renderCharts();
    }
}

// 7. Render Charts
function renderCharts() {
    const container = document.getElementById('chartsGrid');
    if (!container) return;
    container.innerHTML = chartsConfig.map(c => `
        <div class="google-card p-6 flex flex-col items-center">
            <h3 class="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">${c.title}</h3>
            <div class="chart-container"><canvas id="canvas_${c.id}"></canvas></div>
        </div>
    `).join('');

    chartsConfig.forEach(c => {
        const ctx = document.getElementById(`canvas_${c.id}`).getContext('2d');
        if(chartsInstances[c.id]) chartsInstances[c.id].destroy();

        const dataMap = {};
        const filteredEmps = c.filterRoles && c.filterRoles.length > 0 
            ? employees.filter(e => c.filterRoles.some(r => e.role && e.role.includes(r)))
            : employees;

        filteredEmps.forEach(e => {
            const val = e[c.field];
            const vals = Array.isArray(val) ? val : (val ? [val] : ['N/A']);
            vals.forEach(v => {
                dataMap[v] = (dataMap[v] || 0) + 1;
            });
        });

        chartsInstances[c.id] = new Chart(ctx, {
            type: c.type || 'doughnut',
            data: {
                labels: Object.keys(dataMap),
                datasets: [{
                    data: Object.values(dataMap),
                    backgroundColor: ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#9334E6', '#FF6D01', '#46BDC6']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } } }
        });
    });
}

// 8. Visibility Modal
function openVisibilityModal() {
    const container = document.getElementById('visibilityContainer');
    const areaField = fieldsConfig.find(f => f.id === 'area');
    if (!areaField) { container.innerHTML = "Area field not found."; return; }

    container.innerHTML = areaField.options.map(area => `
        <div class="flex items-center justify-between p-3 border-b">
            <span class="text-sm font-bold text-gray-700">${area}</span>
            <div class="flex gap-4">
                <label class="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase">
                    Dev <input type="checkbox" ${(!visibilityConfig[area] || visibilityConfig[area].dev !== false) ? 'checked' : ''} 
                    onchange="updateVis('${area}', 'dev', this.checked)">
                </label>
                <label class="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                    Tester <input type="checkbox" ${(!visibilityConfig[area] || visibilityConfig[area].tester !== false) ? 'checked' : ''} 
                    onchange="updateVis('${area}', 'tester', this.checked)">
                </label>
            </div>
        </div>
    `).join('');
    document.getElementById('visibilityModal').classList.remove('hidden');
}

function updateVis(area, type, val) {
    if(!visibilityConfig[area]) visibilityConfig[area] = { dev: true, tester: true };
    visibilityConfig[area][type] = val;
}

async function saveVisibility() {
    if (await saveToGitHub()) {
        document.getElementById('visibilityModal').classList.add('hidden');
        updateCapacity();
    }
}

// 9. Users Management
function openUsersModal() {
    const container = document.getElementById('usersListContainer');
    container.innerHTML = users.map((u, i) => `
        <div class="flex gap-2 mb-2 items-center">
            <input type="text" value="${u.username}" onchange="users[${i}].username=this.value" class="flex-1 p-2 border rounded text-xs" placeholder="Username">
            <input type="password" value="${u.password}" onchange="users[${i}].password=this.value" class="flex-1 p-2 border rounded text-xs" placeholder="Password">
            <select onchange="users[${i}].role=this.value" class="p-2 border rounded text-xs">
                <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                <option value="viewer" ${u.role==='viewer'?'selected':''}>Viewer</option>
            </select>
            <button onclick="users.splice(${i},1); openUsersModal()" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
    `).join('');
    document.getElementById('usersModal').classList.remove('hidden');
    lucide.createIcons();
}

function addNewUser() { users.push({username: '', password: '', role: 'viewer'}); openUsersModal(); }

async function saveUsers() {
    if (await saveToGitHub()) document.getElementById('usersModal').classList.add('hidden');
}

// Helpers
function showGlobalDetails(area, isDev) {
    alert(`Area: ${area}\nRole Filter: ${isDev ? 'Developers' : 'Testers'}\n(Feature implementation pending)`);
}
