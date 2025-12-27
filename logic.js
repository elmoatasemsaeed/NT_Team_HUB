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
}

// 2. Dynamic Form & Fields Setup
function renderDynamicForm() {
    const container = document.getElementById('dynamicFieldsContainer');
    if(!container) return;
    
    container.innerHTML = fieldsConfig.filter(f => f.active !== false).map(f => {
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
}

function openSetupModal() {
    const list = document.getElementById('fieldsList');
    list.innerHTML = fieldsConfig.map((f, i) => `
        <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
            <div class="flex gap-2 items-center mb-2">
                <input type="text" value="${f.label || f.name}" placeholder="Field Label" 
                       onchange="fieldsConfig[${i}].label=this.value; fieldsConfig[${i}].name=this.value" 
                       class="flex-1 p-2 border rounded font-bold">
                
                <select onchange="fieldsConfig[${i}].type=this.value; openSetupModal()" class="p-2 border rounded bg-white">
                    <option value="text" ${f.type==='text'?'selected':''}>Text</option>
                    <option value="number" ${f.type==='number'?'selected':''}>Number</option>
                    <option value="date" ${f.type==='date'?'selected':''}>Date</option>
                    <option value="select" ${f.type==='select'?'selected':''}>Dropdown</option>
                    <option value="multiselect" ${f.type==='multiselect'?'selected':''}>Multi-Select</option>
                </select>
                
                <button onclick="fieldsConfig.splice(${i},1); openSetupModal()" class="text-red-500 hover:bg-red-50 p-2 rounded">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>

            ${(f.type === 'select' || f.type === 'multiselect') ? `
                <div class="mt-2 pl-4 border-l-2 border-blue-200">
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Options (Comma Separated)</label>
                    <textarea class="w-full p-2 text-sm border rounded mt-1" 
                              placeholder="Option 1, Option 2, Option 3"
                              onchange="fieldsConfig[${i}].options = this.value.split(',').map(s => s.trim())">${(f.options || []).join(', ')}</textarea>
                </div>
            ` : ''}
            
            <div class="flex items-center gap-2 mt-2">
                <input type="checkbox" ${f.active !== false ? 'checked' : ''} 
                       onchange="fieldsConfig[${i}].active = this.checked" id="active_${i}">
                <label for="active_${i}" class="text-xs text-gray-500 font-bold">Show in System</label>
            </div>
        </div>
    `).join('');
    
    document.getElementById('setupModal').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function addNewFieldSetup() {
    fieldsConfig.push({ id: 'custom_'+Date.now(), name: 'New Field', label: 'New Field', type: 'text', active: true, options: [] });
    openSetupModal();
}

async function saveSetup() {
    if (confirm('Save these settings and backup to GitHub?')) {
        const success = await saveToGitHub();
        if (success) {
            closeSetupModal();
            renderAll();
            alert("Settings backed up successfully!");
        }
    }
}

function closeSetupModal() { document.getElementById('setupModal').classList.add('hidden'); }

// 3. Employee Management (Table, Add, Edit, Delete)
function renderTable() {
    const tbody = document.getElementById('employeeTableBody');
    const thead = document.getElementById('tableHeader');
    if(!tbody || !thead) return;

    const activeFields = fieldsConfig.filter(f => f.active !== false);

    // Render Header
    thead.innerHTML = `
        <th onclick="sortTable('name')" class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
            Name ${sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
        </th>
        ${activeFields.map(f => `
            <th class="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">${f.label || f.name}</th>
        `).join('')}
        <th class="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
    `;

    // Sort Employees
    const sortedEmployees = [...employees].sort((a, b) => {
        let valA = (a[sortConfig.key] || '').toString().toLowerCase();
        let valB = (b[sortConfig.key] || '').toString().toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Render Rows
    tbody.innerHTML = sortedEmployees.map((e, idx) => `
        <tr class="hover:bg-gray-50 border-b border-gray-100 transition-colors ${e.isVacation ? 'vacation-row' : ''}">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-bold text-gray-900">${e.name}</div>
                ${e.isVacation ? `<div class="text-[10px] text-red-500">On Vacation until: ${e.vacationEnd || 'N/A'}</div>` : ''}
            </td>
            ${activeFields.map(f => {
                const val = e[f.id] || e[f.name] || '';
                return `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${Array.isArray(val) ? val.join(', ') : val}</td>`;
            }).join('')}
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="editEmployee(${employees.indexOf(e)})" class="text-blue-600 hover:text-blue-900 mx-2 p-1 hover:bg-blue-50 rounded"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                <button onclick="deleteEmployee(${employees.indexOf(e)})" class="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
        </tr>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
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

async function addEmployee() {
    const name = document.getElementById('empName').value;
    if (!name) return alert("Name is required!");

    const newEmp = { 
        name, 
        isVacation: document.getElementById('empVacation').checked,
        vacationEnd: document.getElementById('vacationEndDate').value
    };
    
    fieldsConfig.forEach(f => {
        const el = document.getElementById(`field_${f.id}`);
        if(el) {
            if(f.type === 'multiselect') {
                newEmp[f.id] = Array.from(el.selectedOptions).map(opt => opt.value);
            } else {
                newEmp[f.id] = el.value;
            }
        }
    });

    if (currentEditingIndex > -1) {
        employees[currentEditingIndex] = newEmp;
        currentEditingIndex = -1;
    } else {
        employees.push(newEmp);
    }

    const success = await saveToGitHub();
    if (success) {
        closeModal();
        renderAll();
    }
}

function editEmployee(index) {
    currentEditingIndex = index;
    const e = employees[index];
    document.getElementById('modalTitle').innerText = "Edit Member";
    document.getElementById('empName').value = e.name;
    document.getElementById('empVacation').checked = e.isVacation || false;
    document.getElementById('vacationEndDate').value = e.vacationEnd || '';
    
    fieldsConfig.forEach(f => {
        const el = document.getElementById(`field_${f.id}`);
        if(el) {
            const val = e[f.id] || e[f.name] || '';
            if(f.type === 'multiselect' && Array.isArray(val)) {
                Array.from(el.options).forEach(opt => opt.selected = val.includes(opt.value));
            } else {
                el.value = val;
            }
        }
    });
    
    document.getElementById('employeeModal').classList.remove('hidden');
}

async function deleteEmployee(index) {
    if (confirm("Are you sure you want to delete this member?")) {
        employees.splice(index, 1);
        const success = await saveToGitHub();
        if (success) renderAll();
    }
}

function openModal() {
    currentEditingIndex = -1;
    document.getElementById('modalTitle').innerText = "Add New Member";
    document.getElementById('employeeForm').reset();
    document.getElementById('employeeModal').classList.remove('hidden');
}

function closeModal() { document.getElementById('employeeModal').classList.add('hidden'); }

// 4. Charts Management
function renderCharts() {
    const container = document.getElementById('chartsContainer');
    if(!container) return;
    container.innerHTML = '';
    
    Object.values(chartsInstances).forEach(chart => chart.destroy());
    chartsInstances = {};

    chartsConfig.forEach(config => {
        const wrapper = document.createElement('div');
        wrapper.className = 'google-card p-6 flex flex-col items-center';
        wrapper.innerHTML = `<h3 class="font-bold text-gray-700 mb-4 uppercase tracking-wide text-sm">${config.title}</h3>
                            <div class="relative w-full h-64"><canvas id="chart_${config.id}"></canvas></div>`;
        container.appendChild(wrapper);

        const filtered = employees.filter(e => {
            const roles = config.filterRoles || [];
            return roles.length === 0 || roles.includes(e.role);
        });

        const counts = {};
        filtered.forEach(e => {
            const val = e[config.field] || 'Unknown';
            const values = Array.isArray(val) ? val : [val];
            values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
        });

        const ctx = document.getElementById(`chart_${config.id}`).getContext('2d');
        chartsInstances[config.id] = new Chart(ctx, {
            type: config.type || 'doughnut',
            data: {
                labels: Object.keys(counts),
                datasets: [{
                    data: Object.values(counts),
                    backgroundColor: ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#8E24AA', '#00ACC1', '#F4511E']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } } }
        });
    });
}

function openChartsSetupModal() {
    const list = document.getElementById('chartsList');
    list.innerHTML = chartsConfig.map((c, i) => `
        <div class="bg-gray-50 p-3 rounded-lg border mb-3">
            <div class="flex gap-2 mb-2">
                <input type="text" value="${c.title}" onchange="chartsConfig[${i}].title=this.value" class="flex-1 p-2 border rounded text-sm font-bold">
                <select onchange="chartsConfig[${i}].field=this.value" class="p-2 border rounded text-sm">
                    <option value="area" ${c.field==='area'?'selected':''}>Primary Area</option>
                    <option value="workingIn" ${c.field==='workingIn'?'selected':''}>Working In</option>
                    <option value="role" ${c.field==='role'?'selected':''}>Role</option>
                </select>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-[10px] font-bold text-gray-400 uppercase">Roles:</span>
                <input type="text" value="${(c.filterRoles||[]).join(',')}" onchange="chartsConfig[${i}].filterRoles=this.value.split(',').map(s=>s.trim())" class="p-1 border rounded text-[10px] w-1/2">
                <button onclick="chartsConfig.splice(${i},1); openChartsSetupModal()" class="text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>
    `).join('');
    document.getElementById('chartsSetupModal').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function addNewChartConfig() { chartsConfig.push({id: 'c'+Date.now(), title: 'New Chart', field: 'area', filterRoles: [], type: 'doughnut'}); openChartsSetupModal(); }
async function saveChartsConfig() { const success = await saveToGitHub(); if(success) { document.getElementById('chartsSetupModal').classList.add('hidden'); renderAll(); } }
