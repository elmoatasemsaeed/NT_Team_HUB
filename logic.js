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

    const devs = employees.filter(e => e.role && (e.role.includes('Dev') || e.role.includes('Senior') || e.role.includes('Lead')));
    const testers = employees.filter(e => e.role && e.role.includes('Tester'));

    const renderCards = (list, container, type) => {
        container.innerHTML = list.map(e => {
            // Check visibility for this area
            const isVisible = visibilityConfig[e.area] ? visibilityConfig[e.area][type] : true;
            if (!isVisible) return '';

            return `
            <div class="google-card p-3 ${e.isVacation ? 'bg-red-50 border-red-200' : 'bg-white shadow-sm'}">
                <div class="font-bold text-[13px] text-gray-800 truncate">${e.name}</div>
                <div class="text-[10px] text-blue-600 font-bold mb-1 uppercase tracking-tight">${e.role}</div>
                <div class="text-[10px] text-gray-400 truncate">${Array.isArray(e.area) ? e.area.join(', ') : (e.area || '-')}</div>
                ${e.isVacation ? `<div class="text-[9px] text-red-600 mt-2 font-black">BACK: ${e.vacationEnd}</div>` : ''}
            </div>
        `}).join('');
    };

    renderCards(devs, devGrid, 'dev');
    renderCards(testers, testGrid, 'tester');
    
    document.getElementById('devTotalLabel').innerText = `Total: ${devGrid.children.length}`;
    document.getElementById('testerTotalLabel').innerText = `Total: ${testGrid.children.length}`;
}

// 2. Table & Advanced Filters
function renderTable() {
    const headerRow = document.getElementById('tableHeaderRow');
    const body = document.getElementById('employeeTableBody');
    const searchTerm = document.getElementById('memberSearch')?.value.toLowerCase() || '';
    
    if (!headerRow || !body) return;

    headerRow.innerHTML = fieldsConfig.map(f => `<th class="p-4 font-bold text-gray-500 uppercase text-[11px]">${f.label}</th>`).join('') + 
                         '<th class="p-4 admin-only border-b text-center">Actions</th>';

    const filtered = employees.filter(emp => {
        const matchesSearch = Object.values(emp).some(val => String(val).toLowerCase().includes(searchTerm));
        let matchesFilters = true;
        
        fieldsConfig.filter(f => f.type === 'select' || f.type === 'multiselect').forEach(f => {
            const filterEl = document.getElementById(`filter_${f.id}`);
            if (filterEl && filterEl.value) {
                const val = emp[f.id];
                if (Array.isArray(val)) {
                    if (!val.includes(filterEl.value)) matchesFilters = false;
                } else if (val !== filterEl.value) {
                    matchesFilters = false;
                }
            }
        });
        return matchesSearch && matchesFilters;
    });

    body.innerHTML = filtered.map((emp, idx) => {
        const actualIdx = employees.indexOf(emp);
        return `
        <tr class="hover:bg-gray-50 border-b transition-colors ${emp.isVacation ? 'vacation-row' : ''}">
            ${fieldsConfig.map(f => {
                let val = emp[f.id] || '-';
                if (Array.isArray(val)) val = val.join(', ');
                return `<td class="p-4 text-gray-700 text-[13px] font-medium">${val}</td>`;
            }).join('')}
            <td class="p-4 admin-only text-center">
                <div class="flex justify-center gap-3">
                    <button onclick="editEmployee(${actualIdx})" class="text-blue-600 hover:scale-110 transition-transform"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                    <button onclick="deleteEmployee(${actualIdx})" class="text-red-500 hover:scale-110 transition-transform"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </td>
        </tr>
    `}).join('');
    lucide.createIcons();
}

function renderFilters() {
    const container = document.getElementById('filterContainer');
    if (!container) return;
    const searchDiv = container.querySelector('.relative');
    container.innerHTML = '';
    container.appendChild(searchDiv);

    fieldsConfig.filter(f => f.type === 'select' || f.type === 'multiselect').forEach(f => {
        const select = document.createElement('select');
        select.id = `filter_${f.id}`;
        select.onchange = renderTable;
        select.className = "p-2 bg-white border rounded-lg text-xs font-bold text-gray-600 outline-none focus:ring-2 focus:ring-blue-500";
        select.innerHTML = `<option value="">ALL ${f.label.toUpperCase()}</option>` + (f.options || []).map(o => `<option value="${o}">${o}</option>`).join('');
        container.appendChild(select);
    });
}

// 3. Employee Management
function openModal() {
    currentEditingIndex = -1;
    document.getElementById('modalTitle').innerText = 'Add New Member';
    document.getElementById('employeeForm').reset();
    document.getElementById('modal').classList.remove('hidden');
    renderDynamicForm();
}

function closeModal() { document.getElementById('modal').classList.add('hidden'); }

function editEmployee(idx) {
    currentEditingIndex = idx;
    const emp = employees[idx];
    document.getElementById('modalTitle').innerText = 'Edit Member';
    document.getElementById('modal').classList.remove('hidden');
    renderDynamicForm();
    
    fieldsConfig.forEach(f => {
        const el = document.getElementById(`field_${f.id}`);
        if(f.type === 'multiselect') {
            const vals = emp[f.id] || [];
            document.querySelectorAll(`.multi-${f.id}`).forEach(cb => cb.checked = vals.includes(cb.value));
        } else if (el) {
            el.value = emp[f.id] || '';
        }
    });
}

async function saveEmployee(e) {
    e.preventDefault();
    const newEmp = { isVacation: false, vacationEnd: "" };
    fieldsConfig.forEach(f => {
        if(f.type === 'multiselect') {
            newEmp[f.id] = Array.from(document.querySelectorAll(`.multi-${f.id}:checked`)).map(cb => cb.value);
        } else {
            newEmp[f.id] = document.getElementById(`field_${f.id}`).value;
        }
    });

    if (currentEditingIndex > -1) employees[currentEditingIndex] = newEmp;
    else employees.push(newEmp);

    await saveToGitHub();
    closeModal();
    renderAll();
}

async function deleteEmployee(idx) {
    if(confirm('Delete this member?')) {
        employees.splice(idx, 1);
        await saveToGitHub();
        renderAll();
    }
}

// 4. Dynamic Form Generation
function renderDynamicForm() {
    const container = document.getElementById('dynamicFormFields');
    if (!container) return;
    
    container.innerHTML = fieldsConfig.map(f => {
        const baseClass = "w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm font-medium";
        let input = '';
        if(f.type === 'select') {
            input = `<select id="field_${f.id}" class="${baseClass}">${(f.options||[]).map(o=>`<option value="${o}">${o}</option>`).join('')}</select>`;
        } else if(f.type === 'multiselect') {
            input = `<div class="grid grid-cols-2 gap-2 border p-3 rounded-xl max-h-40 overflow-y-auto bg-gray-50">${(f.options||[]).map(o=>`<label class="flex items-center gap-2 text-xs"><input type="checkbox" value="${o}" class="multi-${f.id}"> ${o}</label>`).join('')}</div>`;
        } else if(f.type === 'date') {
            input = `<input type="date" id="field_${f.id}" class="${baseClass}">`;
        } else {
            input = `<input type="${f.type}" id="field_${f.id}" class="${baseClass}" placeholder="Enter ${f.label}">`;
        }
        return `<div class="space-y-1"><label class="text-[10px] font-black uppercase text-gray-400 ml-1">${f.label}</label>${input}</div>`;
    }).join('');
}

// 5. Visibility Setup Functions
function openVisibilityModal() {
    const list = document.getElementById('visibilityList');
    const areas = fieldsConfig.find(f => f.id === 'area')?.options || [];
    
    list.innerHTML = areas.map(area => {
        const config = visibilityConfig[area] || { dev: true, tester: true };
        return `
            <div class="flex items-center justify-between p-4 hover:bg-gray-50">
                <span class="font-bold text-gray-700">${area}</span>
                <div class="flex gap-6">
                    <label class="flex items-center gap-2 text-xs font-bold text-blue-600">
                        <input type="checkbox" class="vis-dev" data-area="${area}" ${config.dev ? 'checked' : ''}> DEV
                    </label>
                    <label class="flex items-center gap-2 text-xs font-bold text-green-600">
                        <input type="checkbox" class="vis-test" data-area="${area}" ${config.tester ? 'checked' : ''}> TESTER
                    </label>
                </div>
            </div>
        `;
    }).join('');
    document.getElementById('visibilityModal').classList.remove('hidden');
}

function closeVisibilityModal() { document.getElementById('visibilityModal').classList.add('hidden'); }

async function saveVisibility() {
    document.querySelectorAll('.vis-dev').forEach(cb => {
        const area = cb.dataset.area;
        if(!visibilityConfig[area]) visibilityConfig[area] = {};
        visibilityConfig[area].dev = cb.checked;
    });
    document.querySelectorAll('.vis-test').forEach(cb => {
        const area = cb.dataset.area;
        if(!visibilityConfig[area]) visibilityConfig[area] = {};
        visibilityConfig[area].tester = cb.checked;
    });
    await saveToGitHub();
    closeVisibilityModal();
    renderAll();
}

// 6. Backup Tool
function performFullBackup() {
    const backupData = {
        employees,
        fields: fieldsConfig,
        users,
        visibility: visibilityConfig,
        charts: chartsConfig,
        timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `TeamHub_Backup_${new Date().toLocaleDateString()}.json`;
    a.click();
}

// 7. Export to Excel
function exportToExcel() {
    const wsData = employees.map(emp => {
        const row = {};
        fieldsConfig.forEach(f => {
            row[f.label] = Array.isArray(emp[f.id]) ? emp[f.id].join(', ') : emp[f.id];
        });
        return row;
    });
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Team Members");
    XLSX.writeFile(wb, "Team_Hub_Data.xlsx");
}

// 8. Setup Modal Logic
function openSetupModal() {
    renderFieldsList();
    document.getElementById('setupModal').classList.remove('hidden');
}
function closeSetupModal() { document.getElementById('setupModal').classList.add('hidden'); }

function renderFieldsList() {
    const list = document.getElementById('fieldsList');
    list.innerHTML = fieldsConfig.map((f, i) => `
        <div class="p-4 border rounded-xl bg-gray-50 flex flex-wrap gap-4 items-end">
            <div class="flex-1 min-w-[150px]">
                <label class="text-[10px] font-bold text-gray-400 block mb-1">FIELD LABEL</label>
                <input type="text" value="${f.label}" onchange="updateField(${i}, 'label', this.value)" class="w-full p-2 border rounded-lg">
            </div>
            <div class="w-32">
                <label class="text-[10px] font-bold text-gray-400 block mb-1">TYPE</label>
                <select onchange="updateField(${i}, 'type', this.value)" class="w-full p-2 border rounded-lg">
                    <option value="text" ${f.type==='text'?'selected':''}>Text</option>
                    <option value="select" ${f.type==='select'?'selected':''}>Dropdown</option>
                    <option value="multiselect" ${f.type==='multiselect'?'selected':''}>Multi-Select</option>
                    <option value="date" ${f.type==='date'?'selected':''}>Date</option>
                </select>
            </div>
            <button onclick="deleteField(${i})" class="p-2 text-red-500"><i data-lucide="trash-2"></i></button>
        </div>
    `).join('');
    lucide.createIcons();
}

function addNewField() {
    fieldsConfig.push({ id: 'custom_' + Date.now(), label: 'New Field', type: 'text', options: [] });
    renderFieldsList();
}
async function saveFields() {
    await saveToGitHub();
    closeSetupModal();
    renderAll();
}

// 9. Charts Logic (Dynamic Rendering)
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
            const val = emp[c.fieldId] || 'Not Set';
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
                    backgroundColor: ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#8E44AD', '#F39C12']
                }]
            },
            options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } } }
        });
    });
}
