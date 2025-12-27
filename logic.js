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

        container.innerHTML = visibleGroups.map(groupName => `
            <div class="google-card p-4">
                <div class="flex justify-between items-center mb-3 border-b pb-2">
                    <h3 class="font-bold text-gray-700 flex items-center gap-2">
                        <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                        ${groupName}
                    </h3>
                    <span class="bg-gray-100 text-[10px] px-2 py-1 rounded-full font-bold">${groups[groupName].length}</span>
                </div>
                <div class="space-y-2">
                    ${groups[groupName].map(e => `
                        <div class="flex items-center justify-between p-2 rounded-lg ${e.isVacation ? 'bg-red-50' : 'hover:bg-gray-50'} transition-colors">
                            <span class="text-sm ${e.isVacation ? 'text-red-600 font-medium' : 'text-gray-600'}">${e.name}</span>
                            ${e.isVacation ? '<span class="text-[10px] bg-red-100 text-red-600 px-1 rounded">VAC</span>' : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    };

    renderCards(devs, devGrid, 'dev');
    renderCards(testers, testGrid, 'tester');
    document.getElementById('devTotalLabel').innerText = `Total: ${devs.length}`;
    document.getElementById('testerTotalLabel').innerText = `Total: ${testers.length}`;
}

// 2. Dynamic Form & Fields Setup
function renderDynamicForm() {
    const container = document.getElementById('dynamicFieldsContainer');
    if(!container) return;
    
    // إضافة حقول أساسية دائماً
    let baseFields = `
        <div class="col-span-full">
            <label class="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Full Name</label>
            <input type="text" id="memberName" class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        <div>
            <label class="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Main Role</label>
            <input type="text" id="memberRole" placeholder="e.g. Dev, Tester, Senior" class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
        </div>
        <div class="flex items-center gap-4 p-3 bg-gray-50 rounded-xl mt-4">
            <span class="text-xs font-bold text-gray-500 uppercase">On Vacation?</span>
            <label class="switch">
                <input type="checkbox" id="memberVacation" onchange="document.getElementById('vacationDateGroup').classList.toggle('hidden', !this.checked)">
                <span class="slider"></span>
            </label>
        </div>
        <div id="vacationDateGroup" class="hidden">
            <label class="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Returns On</label>
            <input type="date" id="memberVacationEnd" class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-red-500 bg-red-50/30">
        </div>
    `;

    const customFields = fieldsConfig.filter(f => f.active !== false).map(f => {
        let inputHtml = '';
        if (f.type === 'select' || f.type === 'multiselect') {
            const options = (f.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join('');
            inputHtml = `<select id="field_${f.id}" ${f.type === 'multiselect' ? 'multiple' : ''} class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                            ${options}
                         </select>`;
        } else {
            inputHtml = `<input type="${f.type}" id="field_${f.id}" class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500">`;
        }

        return `
            <div>
                <label class="block text-[10px] font-bold text-gray-400 mb-1 uppercase">${f.label || f.name}</label>
                ${inputHtml}
            </div>
        `;
    }).join('');

    container.innerHTML = baseFields + customFields;
}

// --- Modals Renderers ---

function openSetupModal() {
    const list = document.getElementById('fieldsList');
    list.innerHTML = fieldsConfig.map((f, i) => `
        <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
            <div class="flex gap-2 items-center mb-2">
                <input type="text" value="${f.label || f.name}" onchange="fieldsConfig[${i}].label=this.value; fieldsConfig[${i}].name=this.value" class="flex-1 p-2 border rounded font-bold">
                <select onchange="fieldsConfig[${i}].type=this.value; openSetupModal()" class="p-2 border rounded bg-white">
                    <option value="text" ${f.type==='text'?'selected':''}>Text</option>
                    <option value="select" ${f.type==='select'?'selected':''}>Dropdown</option>
                    <option value="multiselect" ${f.type==='multiselect'?'selected':''}>Multi-Select</option>
                    <option value="date" ${f.type==='date'?'selected':''}>Date</option>
                </select>
                <button onclick="fieldsConfig.splice(${i},1); openSetupModal()" class="text-red-500"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
            </div>
            ${(f.type === 'select' || f.type === 'multiselect') ? `
                <input type="text" placeholder="Options (comma separated)" value="${(f.options || []).join(',')}" 
                onchange="fieldsConfig[${i}].options=this.value.split(',').map(s=>s.trim())" class="w-full p-2 text-sm border rounded">
            ` : ''}
        </div>
    `).join('');
    document.getElementById('setupModal').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openVisibilityModal() {
    const uniqueAreas = new Set();
    employees.forEach(e => {
        const areas = Array.isArray(e.area) ? e.area : (e.area ? e.area.split(',') : []);
        areas.forEach(a => uniqueAreas.add(a.trim()));
    });

    const tbody = document.getElementById('visibilityList');
    tbody.innerHTML = Array.from(uniqueAreas).map(area => {
        if (!visibilityConfig[area]) visibilityConfig[area] = { dev: true, tester: true };
        return `
            <tr class="border-b">
                <td class="py-3 font-bold text-gray-700">${area}</td>
                <td class="text-center">
                    <input type="checkbox" ${visibilityConfig[area].dev ? 'checked' : ''} onchange="visibilityConfig['${area}'].dev=this.checked" class="w-4 h-4">
                </td>
                <td class="text-center">
                    <input type="checkbox" ${visibilityConfig[area].tester ? 'checked' : ''} onchange="visibilityConfig['${area}'].tester=this.checked" class="w-4 h-4">
                </td>
            </tr>
        `;
    }).join('');
    document.getElementById('visibilityModal').classList.remove('hidden');
}

function openChartsSetupModal() {
    const list = document.getElementById('chartsSetupList');
    list.innerHTML = chartsConfig.map((c, i) => `
        <div class="p-4 border rounded-xl bg-gray-50">
            <input type="text" value="${c.title}" onchange="chartsConfig[${i}].title=this.value" class="w-full p-2 border rounded font-bold mb-2">
            <div class="flex justify-between items-center mb-2">
                <span class="text-xs text-gray-500">Source Field:</span>
                <select onchange="chartsConfig[${i}].field=this.value" class="p-2 border rounded text-sm">
                    <option value="area" ${c.field==='area'?'selected':''}>Primary Area</option>
                    <option value="role" ${c.field==='role'?'selected':''}>Role</option>
                </select>
            </div>
            <div class="flex justify-between items-center">
                <input type="text" placeholder="Filter Roles (e.g. Dev, Senior)" value="${(c.filterRoles||[]).join(',')}" onchange="chartsConfig[${i}].filterRoles=this.value.split(',').map(s=>s.trim())" class="p-2 border rounded text-xs w-2/3">
                <button onclick="chartsConfig.splice(${i},1); openChartsSetupModal()" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>
    `).join('');
    document.getElementById('chartsSetupModal').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openUsersModal() {
    const list = document.getElementById('usersList');
    list.innerHTML = users.map((u, i) => `
        <div class="flex gap-2 mb-3 bg-gray-50 p-3 rounded-xl border">
            <input type="text" value="${u.username}" onchange="users[${i}].username=this.value" class="flex-1 p-2 border rounded text-sm" placeholder="User">
            <input type="password" value="${u.password}" onchange="users[${i}].password=this.value" class="flex-1 p-2 border rounded text-sm" placeholder="Pass">
            <select onchange="users[${i}].role=this.value" class="p-2 border rounded text-sm">
                <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                <option value="viewer" ${u.role==='viewer'?'selected':''}>Viewer</option>
            </select>
            <button onclick="users.splice(${i},1); openUsersModal()" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
    `).join('');
    document.getElementById('usersModal').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// --- Rest of logic (renderTable, Charts, Save Functions) stays here ---
// (سأقوم باختصارها لضمان أن الكود يعمل، ولكن وظائف الحفظ مرتبطة بـ api.js)

function openModal(index = -1) {
    currentEditingIndex = index;
    renderDynamicForm();
    const modal = document.getElementById('memberModal');
    if (index > -1) {
        const e = employees[index];
        document.getElementById('modalTitle').innerText = "Edit Member Details";
        document.getElementById('memberName').value = e.name || '';
        document.getElementById('memberRole').value = e.role || '';
        document.getElementById('memberVacation').checked = e.isVacation || false;
        document.getElementById('memberVacationEnd').value = e.vacationEnd || '';
        document.getElementById('vacationDateGroup').classList.toggle('hidden', !e.isVacation);
        
        fieldsConfig.forEach(f => {
            const el = document.getElementById(`field_${f.id}`);
            if (el) {
                const val = e[f.id] || e[f.name] || '';
                if (f.type === 'multiselect') {
                    Array.from(el.options).forEach(opt => opt.selected = val.includes(opt.value));
                } else {
                    el.value = val;
                }
            }
        });
    } else {
        document.getElementById('modalTitle').innerText = "Add Team Member";
    }
    modal.classList.remove('hidden');
}

function closeModal() { document.getElementById('memberModal').classList.add('hidden'); }

async function saveMember() {
    const member = {
        name: document.getElementById('memberName').value,
        role: document.getElementById('memberRole').value,
        isVacation: document.getElementById('memberVacation').checked,
        vacationEnd: document.getElementById('memberVacationEnd').value,
    };

    fieldsConfig.forEach(f => {
        const el = document.getElementById(`field_${f.id}`);
        if (el) {
            if (f.type === 'multiselect') {
                member[f.id] = Array.from(el.selectedOptions).map(o => o.value);
                // مواءمة مع الحقول القديمة (area, workingIn)
                if (f.name.toLowerCase() === 'area') member.area = member[f.id];
                if (f.name.toLowerCase() === 'working in') member.workingIn = member[f.id];
            } else {
                member[f.id] = el.value;
            }
        }
    });

    if (currentEditingIndex > -1) employees[currentEditingIndex] = member;
    else employees.push(member);

    await saveToGitHub();
    closeModal();
    renderAll();
}

// وظائف مساعدة للإضافة
function addNewField() { fieldsConfig.push({id: 'custom_'+Date.now(), name: 'New Field', type: 'text', options: [], active: true}); openSetupModal(); }
function addNewUser() { users.push({username: 'new_user', password: '123', role: 'viewer'}); openUsersModal(); }
function addNewChartConfig() { chartsConfig.push({id: 'c'+Date.now(), title: 'New Chart', field: 'area', filterRoles: [], type: 'doughnut'}); openChartsSetupModal(); }

// حفظ الإعدادات المختلفة
async function saveFieldsConfig() { await saveToGitHub(); document.getElementById('setupModal').classList.add('hidden'); renderAll(); }
async function saveVisibility() { await saveToGitHub(); document.getElementById('visibilityModal').classList.add('hidden'); renderAll(); }
async function saveChartsConfig() { await saveToGitHub(); document.getElementById('chartsSetupModal').classList.add('hidden'); renderAll(); }
async function saveUsers() { await saveToGitHub(); document.getElementById('usersModal').classList.add('hidden'); }

function renderTable() {
    const header = document.getElementById('tableHeaderRow');
    const list = document.getElementById('memberList');
    if (!header || !list) return;

    const baseCols = ['Name', 'Role', 'Status'];
    header.innerHTML = baseCols.map(c => `<th class="px-4 py-3 text-[10px] font-black uppercase text-gray-400">${c}</th>`).join('') + 
                       fieldsConfig.map(f => `<th class="px-4 py-3 text-[10px] font-black uppercase text-gray-400">${f.label || f.name}</th>`).join('') +
                       `<th class="admin-cell px-4 py-3 text-[10px] font-black uppercase text-gray-400">Actions</th>`;

    list.innerHTML = employees.map((e, i) => `
        <tr class="border-b hover:bg-gray-50 ${e.isVacation ? 'vacation-row' : ''}">
            <td class="px-4 py-3 font-bold">${e.name}</td>
            <td class="px-4 py-3 text-sm">${e.role}</td>
            <td class="px-4 py-3 text-[10px] font-bold">${e.isVacation ? 'VACATION' : 'ACTIVE'}</td>
            ${fieldsConfig.map(f => {
                const val = e[f.id] || e[f.name] || '';
                return `<td class="px-4 py-3 text-sm">${Array.isArray(val) ? val.join(', ') : val}</td>`;
            }).join('')}
            <td class="admin-cell px-4 py-3">
                <div class="flex gap-2">
                    <button onclick="openModal(${i})" class="text-blue-600 hover:bg-blue-50 p-1 rounded"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                    <button onclick="deleteMember(${i})" class="text-red-600 hover:bg-red-50 p-1 rounded"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function deleteMember(i) { if(confirm('Delete this member?')) { employees.splice(i,1); await saveToGitHub(); renderAll(); } }

function filterTable() {
    const q = document.getElementById('tableFilter').value.toLowerCase();
    document.querySelectorAll('#memberList tr').forEach(tr => {
        tr.style.display = tr.innerText.toLowerCase().includes(q) ? '' : 'none';
    });
}

function renderCharts() {
    const grid = document.getElementById('dynamicChartsGrid');
    if (!grid) return;
    grid.innerHTML = chartsConfig.map(c => `
        <div class="google-card p-6">
            <h3 class="font-bold text-gray-700 mb-4 border-b pb-2 uppercase text-xs tracking-widest">${c.title}</h3>
            <div class="chart-container"><canvas id="chart_${c.id}"></canvas></div>
        </div>
    `).join('');

    chartsConfig.forEach(c => {
        const ctx = document.getElementById(`chart_${c.id}`).getContext('2d');
        const filtered = employees.filter(e => c.filterRoles.length === 0 || c.filterRoles.some(r => e.role.toLowerCase().includes(r.toLowerCase())));
        const counts = {};
        filtered.forEach(e => {
            const val = e[c.field] || 'N/A';
            const keys = Array.isArray(val) ? val : [val];
            keys.forEach(k => counts[k] = (counts[k] || 0) + 1);
        });

        if (chartsInstances[c.id]) chartsInstances[c.id].destroy();
        chartsInstances[c.id] = new Chart(ctx, {
            type: c.type || 'doughnut',
            data: {
                labels: Object.keys(counts),
                datasets: [{ data: Object.values(counts), backgroundColor: ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#A142F4', '#24C1E0'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    });
}

function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(employees);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Team");
    XLSX.writeFile(wb, "Team_Hub_Data.xlsx");
}

function performFullBackup() {
    const blob = new Blob([JSON.stringify({employees, fields:fieldsConfig, users, visibility:visibilityConfig, charts:chartsConfig}, null, 2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup.json'; a.click();
}
