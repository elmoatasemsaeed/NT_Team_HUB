// --- Business Logic & UI Rendering ---

let currentEditingIndex = -1;
let chartsInstances = {};

function renderAll() { 
    updateCapacity(); 
    renderTable(); 
    renderDynamicForm(); 
    renderCharts();
    renderFilters();
    if (typeof lucide !== 'undefined') lucide.createIcons(); 
}

// 1. Capacity Visualization (Enhanced with Visibility)
function updateCapacity() {
    const devGrid = document.getElementById('devCapacityGrid');
    const testGrid = document.getElementById('testerCapacityGrid');
    if (!devGrid || !testGrid) return;

    // Filter by role tags
    const devs = employees.filter(e => e.role && (e.role.includes('Dev') || e.role.includes('Senior') || e.role.includes('Lead')));
    const testers = employees.filter(e => e.role && e.role.includes('Tester'));

    const renderCards = (list, container, type) => {
        // Group by Area
        const groups = {};
        list.forEach(e => {
            const areas = Array.isArray(e.area) ? e.area : [e.area];
            areas.forEach(a => {
                if(!groups[a]) groups[a] = [];
                groups[a].push(e);
            });
        });

        // Filter groups based on Visibility Setup
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

        // Update Labels
        if(type === 'dev') document.getElementById('devTotalLabel').innerText = `Total: ${list.length}`;
        if(type === 'tester') document.getElementById('testerTotalLabel').innerText = `Total: ${list.length}`;
    };

    renderCards(devs, devGrid, 'dev');
    renderCards(testers, testGrid, 'tester');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 2. Global Details Popup
function showGlobalDetails(area, showVacationOnly = false, typeFilter = '') {
    const title = document.getElementById('popupTitle');
    const listCont = document.getElementById('popupList');
    
    let list = employees.filter(e => {
        const areas = Array.isArray(e.area) ? e.area : [e.area];
        const inArea = areas.includes(area) || area.split(',').some(r => e.role && e.role.includes(r));
        const matchesType = typeFilter === '' ? true : (typeFilter === 'dev' ? (e.role.includes('Dev') || e.role.includes('Senior') || e.role.includes('Lead')) : e.role.includes('Tester'));
        return inArea && matchesType;
    });

    if (showVacationOnly) list = list.filter(e => e.isVacation);

    title.innerText = `${area} - ${showVacationOnly ? 'On Vacation' : 'Team Members'}`;
    listCont.innerHTML = list.length > 0 ? list.map(e => `
        <div class="p-4 border rounded-xl ${e.isVacation ? 'bg-red-50 border-red-200' : 'bg-gray-50'}">
            <div class="flex justify-between items-start">
                <div>
                    <b class="${e.isVacation ? 'line-through text-red-600' : 'text-gray-800'}">${e.name}</b>
                    <div class="text-[11px] text-gray-500 uppercase font-bold mt-1">${e.role}</div>
                </div>
                ${e.isVacation ? '<span class="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">VACATION</span>' : ''}
            </div>
            ${e.isVacation ? `<div class="text-[11px] text-red-500 mt-2 font-medium">Returns: ${e.vacationEnd || 'N/A'}</div>` : ''}
        </div>
    `).join('') : '<div class="col-span-full text-center py-10 text-gray-400 font-bold uppercase italic">No members found</div>';
    
    document.getElementById('detailsPopup').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closePopup() { document.getElementById('detailsPopup').classList.add('hidden'); }

// 3. Table Rendering
function renderTable() {
    const tbody = document.getElementById('employeeTableBody');
    const header = document.getElementById('tableHeaderRow');
    const searchTerm = document.getElementById('memberSearch').value.toLowerCase();

    // Headers
    const baseHeaders = ['Name', 'Role', 'Area', 'Working In', 'Status'];
    header.innerHTML = baseHeaders.map(h => `<th class="p-4 font-bold uppercase text-[11px] tracking-wider">${h}</th>`).join('') +
        fieldsConfig.filter(f => f.active).map(f => `<th class="p-4 font-bold uppercase text-[11px] tracking-wider">${f.name}</th>`).join('') +
        `<th class="p-4 admin-cell">Actions</th>`;

    // Data rows
    const filtered = employees.filter(e => {
        const matchesSearch = e.name.toLowerCase().includes(searchTerm) || e.role.toLowerCase().includes(searchTerm);
        const matchesFilters = Array.from(document.querySelectorAll('.filter-input')).every(input => {
            if (!input.value) return true;
            const val = String(e[input.dataset.field] || '').toLowerCase();
            return val.includes(input.value.toLowerCase());
        });
        return matchesSearch && matchesFilters;
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
        </tr>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 4. Form & Member Management
function renderDynamicForm() {
    const container = document.getElementById('dynamicFormFields');
    const baseFields = [
        { id: 'name', label: 'Full Name', type: 'text', required: true },
        { id: 'role', label: 'Role (e.g. Senior Dev, Tester)', type: 'text', required: true },
        { id: 'area', label: 'Area / Squad (Comma separated)', type: 'text', required: true },
        { id: 'workingIn', label: 'Working In (Comma separated)', type: 'text' }
    ];

    let html = baseFields.map(f => `
        <div>
            <label class="block text-xs font-black text-gray-500 uppercase mb-2">${f.label}</label>
            <input type="${f.type}" name="${f.id}" class="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" ${f.required ? 'required' : ''}>
        </div>
    `).join('');

    html += `
        <div class="md:col-span-2 p-4 bg-orange-50 rounded-2xl border border-orange-100">
            <div class="flex items-center justify-between mb-4">
                <span class="font-bold text-orange-800">Vacation Mode</span>
                <label class="switch"><input type="checkbox" name="isVacation" onchange="toggleVacationDate(this.checked)"><span class="slider"></span></label>
            </div>
            <input type="date" name="vacationEnd" id="vacationEndDate" class="w-full p-3 border rounded-xl hidden">
        </div>
    `;

    html += fieldsConfig.filter(f => f.active).map(f => `
        <div>
            <label class="block text-xs font-black text-gray-500 uppercase mb-2">${f.name}</label>
            ${f.type === 'dropdown' ? 
                `<select name="${f.id}" class="w-full p-3 border rounded-xl">${f.options.split(',').map(o => `<option value="${o.trim()}">${o.trim()}</option>`).join('')}</select>` : 
                `<input type="${f.type}" name="${f.id}" class="w-full p-3 border rounded-xl">`}
        </div>
    `).join('');

    container.innerHTML = html;
}

function toggleVacationDate(show) {
    document.getElementById('vacationEndDate').classList.toggle('hidden', !show);
}

function openModal(index = -1) {
    currentEditingIndex = index;
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('employeeForm').reset();
    document.getElementById('vacationEndDate').classList.add('hidden');
    
    if (index > -1) {
        const e = employees[index];
        const form = document.getElementById('employeeForm');
        form.name.value = e.name;
        form.role.value = e.role;
        form.area.value = Array.isArray(e.area) ? e.area.join(', ') : e.area;
        form.workingIn.value = Array.isArray(e.workingIn) ? e.workingIn.join(', ') : e.workingIn;
        form.isVacation.checked = e.isVacation;
        if(e.isVacation) {
            form.vacationEnd.value = e.vacationEnd;
            document.getElementById('vacationEndDate').classList.remove('hidden');
        }
        fieldsConfig.forEach(f => { if(form[f.id]) form[f.id].value = e[f.id] || ''; });
    }
}

function closeModal() { document.getElementById('modal').classList.add('hidden'); }

async function saveEmployee(event) {
    event.preventDefault();
    const fd = new FormData(event.target);
    const data = Object.fromEntries(fd.entries());
    
    data.isVacation = fd.get('isVacation') === 'on';
    data.area = data.area.split(',').map(s => s.trim());
    data.workingIn = data.workingIn.split(',').map(s => s.trim());

    if (currentEditingIndex > -1) employees[currentEditingIndex] = data;
    else employees.push(data);

    const success = await saveToGitHub();
    if (success) { closeModal(); renderAll(); }
}

async function deleteEmployee(index) {
    if (confirm('Are you sure you want to delete this member?')) {
        employees.splice(index, 1);
        const success = await saveToGitHub();
        if (success) renderAll();
    }
}

// 5. Setup (Fields)
function openSetupModal() {
    document.getElementById('setupModal').classList.remove('hidden');
    renderSetupFields();
}

function closeSetupModal() { document.getElementById('setupModal').classList.add('hidden'); }

function renderSetupFields() {
    const list = document.getElementById('fieldsConfigList');
    list.innerHTML = fieldsConfig.map((f, i) => `
        <div class="p-4 border rounded-xl bg-gray-50 space-y-3">
            <div class="flex gap-2">
                <input type="text" value="${f.name}" onchange="updateField(${i}, 'name', this.value)" class="flex-1 p-2 border rounded text-sm font-bold" placeholder="Field Name">
                <select onchange="updateField(${i}, 'type', this.value)" class="p-2 border rounded text-sm">
                    <option value="text" ${f.type === 'text' ? 'selected' : ''}>Text</option>
                    <option value="date" ${f.type === 'date' ? 'selected' : ''}>Date</option>
                    <option value="dropdown" ${f.type === 'dropdown' ? 'selected' : ''}>Dropdown</option>
                </select>
                <button onclick="removeField(${i})" class="text-red-500 p-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
            ${f.type === 'dropdown' ? `<input type="text" value="${f.options || ''}" onchange="updateField(${i}, 'options', this.value)" class="w-full p-2 border rounded text-xs" placeholder="Options (comma separated)">` : ''}
            <label class="flex items-center gap-2 text-xs"><input type="checkbox" ${f.active ? 'checked' : ''} onchange="updateField(${i}, 'active', this.checked)"> Active Field</label>
        </div>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function addNewField() {
    fieldsConfig.push({ id: 'custom_' + Date.now(), name: 'New Field', type: 'text', active: true, options: '' });
    renderSetupFields();
}

function updateField(i, key, val) { fieldsConfig[i][key] = val; renderSetupFields(); }
function removeField(i) { fieldsConfig.splice(i, 1); renderSetupFields(); }
async function saveSetup() { await saveToGitHub(); closeSetupModal(); renderAll(); }

// 6. Visibility Logic
function openVisibilityModal() {
    const areas = [...new Set(employees.flatMap(e => Array.isArray(e.area) ? e.area : [e.area]))];
    const list = document.getElementById('visibilityList');
    list.innerHTML = areas.map(area => `
        <tr>
            <td class="p-4 font-bold text-gray-700">${area}</td>
            <td class="p-4 text-center">
                <input type="checkbox" ${(!visibilityConfig[area] || visibilityConfig[area].dev) ? 'checked' : ''} 
                    onchange="updateVis('${area}', 'dev', this.checked)" class="w-5 h-5">
            </td>
            <td class="p-4 text-center">
                <input type="checkbox" ${(!visibilityConfig[area] || visibilityConfig[area].tester) ? 'checked' : ''} 
                    onchange="updateVis('${area}', 'tester', this.checked)" class="w-5 h-5">
            </td>
        </tr>
    `).join('');
    document.getElementById('visibilityModal').classList.remove('hidden');
}

function updateVis(area, type, val) {
    if(!visibilityConfig[area]) visibilityConfig[area] = { dev: true, tester: true };
    visibilityConfig[area][type] = val;
}

function closeVisibilityModal() { document.getElementById('visibilityModal').classList.add('hidden'); }
async function saveVisibility() { await saveToGitHub(); closeVisibilityModal(); renderAll(); }

// 7. Users Management
function openUsersModal() {
    const list = document.getElementById('usersList');
    list.innerHTML = users.map((u, i) => `
        <div class="flex gap-2 p-2 border rounded-lg bg-gray-50">
            <input type="text" value="${u.username}" onchange="users[i].username = this.value" class="p-2 border rounded text-sm w-1/3" placeholder="User">
            <input type="text" value="${u.password}" onchange="users[i].password = this.value" class="p-2 border rounded text-sm w-1/3" placeholder="Pass">
            <select onchange="users[i].role = this.value" class="p-2 border rounded text-sm w-1/4">
                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>Viewer</option>
            </select>
            <button onclick="users.splice(${i}, 1); openUsersModal()" class="text-red-500 px-2">×</button>
        </div>
    `).join('');
    document.getElementById('usersModal').classList.remove('hidden');
}

function addNewUser() { users.push({ username: '', password: '', role: 'viewer' }); openUsersModal(); }
function closeUsersModal() { document.getElementById('usersModal').classList.add('hidden'); }
async function saveUsers() { await saveToGitHub(); closeUsersModal(); }

// 8. Charts Setup
function openChartsSetupModal() {
    const list = document.getElementById('chartsConfigList');
    const fields = [{id: 'role', name: 'Role'}, {id: 'area', name: 'Area'}, ...fieldsConfig];
    list.innerHTML = chartsConfig.map((c, i) => `
        <div class="p-4 border rounded-xl bg-gray-50 flex gap-4 items-end">
            <div class="flex-1">
                <label class="block text-[10px] font-bold mb-1">Chart Title</label>
                <input type="text" value="${c.title}" onchange="chartsConfig[i].title = this.value" class="w-full p-2 border rounded text-sm">
            </div>
            <div>
                <label class="block text-[10px] font-bold mb-1">Field</label>
                <select onchange="chartsConfig[i].fieldId = this.value" class="p-2 border rounded text-sm">
                    ${fields.map(f => `<option value="${f.id}" ${c.fieldId === f.id ? 'selected' : ''}>${f.name}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="block text-[10px] font-bold mb-1">Type</label>
                <select onchange="chartsConfig[i].type = this.value" class="p-2 border rounded text-sm">
                    <option value="pie" ${c.type === 'pie' ? 'selected' : ''}>Pie</option>
                    <option value="bar" ${c.type === 'bar' ? 'selected' : ''}>Bar</option>
                    <option value="doughnut" ${c.type === 'doughnut' ? 'selected' : ''}>Doughnut</option>
                </select>
            </div>
            <button onclick="chartsConfig.splice(${i}, 1); openChartsSetupModal()" class="bg-red-50 text-red-500 p-2 rounded hover:bg-red-100"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
    `).join('');
    document.getElementById('chartsSetupModal').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function addNewChartConfig() {
    chartsConfig.push({ id: Date.now(), title: 'New Chart', fieldId: 'role', type: 'pie' });
    openChartsSetupModal();
}

function closeChartsSetupModal() { document.getElementById('chartsSetupModal').classList.add('hidden'); }
async function saveChartsConfig() { await saveToGitHub(); closeChartsSetupModal(); renderAll(); }

// 9. Charts Rendering
function renderCharts() {
    const grid = document.getElementById('dynamicChartsGrid');
    if(!grid) return;
    grid.innerHTML = chartsConfig.map(c => `
        <div class="google-card p-6 bg-white">
            <h4 class="font-bold text-gray-700 mb-4 border-b pb-2 uppercase text-xs tracking-widest">${c.title}</h4>
            <div class="h-[300px]"><canvas id="chart_${c.id}"></canvas></div>
        </div>
    `).join('');

    chartsConfig.forEach(c => {
        const ctx = document.getElementById(`chart_${c.id}`).getContext('2d');
        const counts = {};
        employees.forEach(emp => {
            let val = emp[c.fieldId] || 'Not Set';
            const vals = Array.isArray(val) ? val : [val];
            vals.forEach(v => counts[v] = (counts[v] || 0) + 1);
        });

        if(chartsInstances[c.id]) chartsInstances[c.id].destroy();
        chartsInstances[c.id] = new Chart(ctx, {
            type: c.type,
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    data: Object.values(counts),
                    backgroundColor: ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#A142F4', '#24C1E0', '#F439A0'],
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    });
}

function renderFilters() {
    const container = document.getElementById('filterContainer');
    const existing = container.querySelectorAll('.filter-input-dynamic');
    existing.forEach(e => e.remove());

    fieldsConfig.filter(f => f.active).forEach(f => {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Filter by ${f.name}...`;
        input.className = 'filter-input filter-input-dynamic px-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 w-40';
        input.dataset.field = f.id;
        input.oninput = renderTable;
        container.appendChild(input);
    });
}

function clearFilters() {
    document.getElementById('memberSearch').value = '';
    document.querySelectorAll('.filter-input').forEach(i => i.value = '');
    renderTable();
}

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
    a.download = 'team_hub_backup.json';
    a.click();
}
