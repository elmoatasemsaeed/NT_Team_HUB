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
            <div class="google-card p-3 border-l-4 border-l-blue-500">
                <div class="text-[10px] uppercase font-black text-gray-400 mb-1 truncate">${area}</div>
                <div class="flex items-end justify-between">
                    <span class="text-2xl font-bold ${colorClass}">${workingCount}<span class="text-gray-300 text-sm font-normal">/${total}</span></span>
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

// 2. Table & Custom Fields Logic
function renderTable() {
    const tbody = document.getElementById('employeeTableBody');
    const header = document.getElementById('tableHeaderRow');
    if (!tbody || !header) return;

    const baseHeaders = [
        { name: 'Name', id: 'name' },
        { name: 'Role', id: 'role' },
        { name: 'Area', id: 'area' },
        { name: 'Working In', id: 'workingIn' },
        { name: 'Status', id: 'isVacation' }
    ];

    header.innerHTML = baseHeaders.map(h => `<th class="p-4 uppercase text-[11px] font-bold">${h.name}</th>`).join('') +
        fieldsConfig.filter(f => f.active).map(f => `<th class="p-4 font-bold uppercase text-[11px] tracking-wider">${f.name}</th>`).join('') +
        `<th class="p-4 admin-cell">Actions</th>`;

    tbody.innerHTML = employees.map((e, idx) => `
        <tr class="${e.isVacation ? 'vacation-row' : 'hover:bg-gray-50'} transition-colors">
            <td class="p-4 font-bold text-gray-800">${e.name}</td>
            <td class="p-4 text-xs font-medium">${e.role}</td>
            <td class="p-4 text-xs">${Array.isArray(e.area) ? e.area.join(', ') : e.area}</td>
            <td class="p-4 text-xs">${Array.isArray(e.workingIn) ? e.workingIn.join(', ') : e.workingIn}</td>
            <td class="p-4"><span class="text-[10px] font-black uppercase">${e.isVacation ? '🏖️ Vacation' : '🟢 Active'}</span></td>
            ${fieldsConfig.filter(f => f.active).map(f => {
                const val = e[f.id] || '';
                // إذا كان الحقل "Popup" يظهر كزر
                if(f.type === 'popup') {
                    return `<td class="p-4 text-xs"><button onclick="alert('${val}')" class="text-blue-600 underline">View</button></td>`;
                }
                return `<td class="p-4 text-xs">${Array.isArray(val) ? val.join(', ') : val}</td>`;
            }).join('')}
            <td class="p-4 admin-cell">
                <div class="flex gap-2">
                    <button onclick="editEmployee(${idx})" class="p-2 text-blue-600 hover:bg-blue-50 rounded"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                    <button onclick="deleteEmployee(${idx})" class="p-2 text-red-600 hover:bg-red-50 rounded"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </td>
        </tr>`).join('');
    lucide.createIcons();
}

// 3. Setup & Visibility Modals (إصلاح الدوال المفقودة)
function openSetupModal() {
    const list = document.getElementById('fieldsList');
    list.innerHTML = fieldsConfig.map((f, i) => `
        <div class="flex gap-2 items-center bg-gray-50 p-3 rounded-xl border">
            <input type="text" value="${f.name}" onchange="fieldsConfig[${i}].name=this.value" class="flex-1 p-2 border rounded">
            <select onchange="fieldsConfig[${i}].type=this.value" class="p-2 border rounded">
                <option value="text" ${f.type==='text'?'selected':''}>Text</option>
                <option value="popup" ${f.type==='popup'?'selected':''}>Popup (Long Text)</option>
            </select>
            <button onclick="removeField(${i})" class="text-red-500 p-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>`).join('');
    document.getElementById('setupModal').classList.remove('hidden');
    lucide.createIcons();
}
function closeSetupModal() { document.getElementById('setupModal').classList.add('hidden'); }

function openVisibilityModal() {
    const areas = [...new Set(employees.flatMap(e => Array.isArray(e.area) ? e.area : [e.area]))];
    const list = document.getElementById('visibilityList');
    list.innerHTML = areas.map(area => {
        const config = visibilityConfig[area] || { dev: true, tester: true };
        return `
        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
            <span class="font-bold text-gray-700">${area}</span>
            <div class="flex gap-6">
                <label class="flex items-center gap-2 text-xs font-black uppercase">Dev <label class="switch"><input type="checkbox" ${config.dev?'checked':''} onchange="updateVis('${area}','dev',this.checked)"><span class="slider"></span></label></label>
                <label class="flex items-center gap-2 text-xs font-black uppercase">Test <label class="switch"><input type="checkbox" ${config.tester?'checked':''} onchange="updateVis('${area}','tester',this.checked)"><span class="slider"></span></label></label>
            </div>
        </div>`;
    }).join('');
    document.getElementById('visibilityModal').classList.remove('hidden');
}
function closeVisibilityModal() { document.getElementById('visibilityModal').classList.add('hidden'); }

function updateVis(area, type, val) {
    if(!visibilityConfig[area]) visibilityConfig[area] = { dev: true, tester: true };
    visibilityConfig[area][type] = val;
}

async function saveVisibilityConfig() { if (await saveToGitHub()) { closeVisibilityModal(); renderAll(); } }

// 4. باقي الدوال (Add, Edit, Delete)
function openModal(idx = -1) {
    currentEditingIndex = idx;
    const data = idx === -1 ? null : employees[idx];
    document.getElementById('modalTitle').innerText = idx === -1 ? 'ADD NEW MEMBER' : 'EDIT MEMBER';
    renderDynamicForm(data);
    document.getElementById('modalOverlay').classList.remove('hidden');
}
function closeModal() { document.getElementById('modalOverlay').classList.add('hidden'); }

function renderDynamicForm(data = null) {
    const container = document.getElementById('dynamicForm');
    let html = `
        <div class="space-y-1"><label class="text-[10px] font-bold text-gray-400 uppercase">Name</label><input type="text" id="empName" value="${data ? data.name : ''}" class="w-full p-4 border rounded-xl"></div>
        <div class="space-y-1"><label class="text-[10px] font-bold text-gray-400 uppercase">Role</label><input type="text" id="empRole" value="${data ? data.role : ''}" class="w-full p-4 border rounded-xl"></div>
        <div class="space-y-1"><label class="text-[10px] font-bold text-gray-400 uppercase">Area (Comma separated)</label><input type="text" id="empArea" value="${data ? (Array.isArray(data.area)?data.area.join(','):data.area) : ''}" class="w-full p-4 border rounded-xl"></div>
        <div class="space-y-1"><label class="text-[10px] font-bold text-gray-400 uppercase">Vacation Mode</label><select id="empVacation" class="w-full p-4 border rounded-xl"><option value="false" ${data?.isVacation===false?'selected':''}>Active</option><option value="true" ${data?.isVacation===true?'selected':''}>On Vacation</option></select></div>
    `;
    fieldsConfig.forEach(f => {
        html += `<div class="space-y-1"><label class="text-[10px] font-bold text-gray-400 uppercase">${f.name}</label>
                 <textarea id="field_${f.id}" class="w-full p-4 border rounded-xl">${data ? (data[f.id] || '') : ''}</textarea></div>`;
    });
    container.innerHTML = html;
}

async function saveEmployee() {
    const newEmp = {
        name: document.getElementById('empName').value,
        role: document.getElementById('empRole').value,
        area: document.getElementById('empArea').value.split(',').map(s => s.trim()),
        isVacation: document.getElementById('empVacation').value === 'true'
    };
    fieldsConfig.forEach(f => { newEmp[f.id] = document.getElementById(`field_${f.id}`).value; });
    
    if(currentEditingIndex === -1) employees.push(newEmp);
    else employees[currentEditingIndex] = newEmp;

    if (await saveToGitHub()) { closeModal(); renderAll(); }
}

async function deleteEmployee(idx) { if(confirm('Delete this member?')) { employees.splice(idx, 1); await saveToGitHub(); renderAll(); } }
function addNewField() { fieldsConfig.push({id: 'custom_'+Date.now(), name: 'New Field', type: 'text', active: true}); openSetupModal(); }
function removeField(i) { fieldsConfig.splice(i,1); openSetupModal(); }
async function saveFieldsConfig() { if (await saveToGitHub()) { closeSetupModal(); renderAll(); } }

function renderCharts() {
    const grid = document.getElementById('dynamicChartsGrid');
    if(!grid) return;
    grid.innerHTML = chartsConfig.map(c => `<div class="p-4 google-card shadow-sm"><h3 class="font-bold mb-4 text-gray-700">${c.title}</h3><canvas id="chart_${c.id}"></canvas></div>`).join('');
    // Chart.js logic remains same as before...
}
