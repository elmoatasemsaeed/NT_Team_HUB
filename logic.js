// --- Business Logic & UI Rendering ---

function renderAll() { 
    updateCapacity(); 
    renderTable(); 
    renderDynamicForm(); 
    renderCharts();
    if (typeof lucide !== 'undefined') lucide.createIcons(); 
}

// 1. حساب السعة (Capacity) وتوزيع البطاقات
function updateCapacity() {
    const devGrid = document.getElementById('devCapacityGrid');
    const testGrid = document.getElementById('testerCapacityGrid');
    if (!devGrid || !testGrid) return;

    const devs = employees.filter(e => e.role && (e.role.includes('Dev') || e.role.includes('Senior') || e.role.includes('Lead')));
    const testers = employees.filter(e => e.role && e.role.includes('Tester'));

    if(document.getElementById('devTotalLabel')) document.getElementById('devTotalLabel').innerText = `Total: ${devs.length}`;
    if(document.getElementById('testerTotalLabel')) document.getElementById('testerTotalLabel').innerText = `Total: ${testers.length}`;

    const renderCards = (list, container) => {
        container.innerHTML = list.map(e => `
            <div class="google-card p-4 ${e.isVacation ? 'bg-red-50 border-red-200' : 'bg-white shadow-sm'}">
                <div class="font-bold text-sm text-gray-800">${e.name}</div>
                <div class="text-[11px] text-blue-600 font-semibold mb-1">${e.role}</div>
                <div class="text-xs text-gray-500">${Array.isArray(e.area) ? e.area.join(', ') : (e.area || '-')}</div>
                ${e.isVacation ? `<div class="text-[10px] text-red-600 mt-2 font-bold italic">Back: ${e.vacationEnd}</div>` : ''}
            </div>
        `).join('');
    };

    renderCards(devs, devGrid);
    renderCards(testers, testGrid);
}

// 2. بناء الجدول الرئيسي
function renderTable() {
    const headerRow = document.getElementById('tableHeaderRow');
    const body = document.getElementById('employeeTableBody');
    if (!headerRow || !body) return;

    headerRow.innerHTML = fieldsConfig.map(f => `<th class="p-4 font-semibold text-left border-b">${f.label}</th>`).join('') + 
                         '<th class="p-4 admin-only border-b text-center">Actions</th>';

    body.innerHTML = employees.map((emp, idx) => `
        <tr class="hover:bg-gray-50 border-b transition-colors">
            ${fieldsConfig.map(f => {
                let val = emp[f.id] || '-';
                if (Array.isArray(val)) val = val.join(', ');
                return `<td class="p-4 text-gray-600 text-sm">${val}</td>`;
            }).join('')}
            <td class="p-4 admin-only text-center">
                <div class="flex justify-center gap-2">
                    <button onclick="editEmployee(${idx})" class="text-blue-600 hover:text-blue-800"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                    <button onclick="deleteEmployee(${idx})" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 3. إدارة الموظفين (CRUD)
function openModal() {
    currentEditingIndex = -1;
    document.getElementById('employeeForm').reset();
    document.getElementById('modal').classList.remove('hidden');
    renderDynamicForm();
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

function editEmployee(idx) {
    currentEditingIndex = idx;
    const emp = employees[idx];
    document.getElementById('modal').classList.remove('hidden');
    renderDynamicForm();
    
    fieldsConfig.forEach(f => {
        const fieldEl = document.getElementById(`field_${f.id}`);
        if(f.type === 'multiselect') {
            const vals = emp[f.id] || [];
            document.querySelectorAll(`.multi-${f.id}`).forEach(cb => {
                cb.checked = vals.includes(cb.value);
            });
        } else if (fieldEl) {
            fieldEl.value = emp[f.id] || '';
        }
    });
    document.getElementById('empIsVacation').checked = emp.isVacation || false;
    document.getElementById('empVacationEnd').value = emp.vacationEnd || '';
}

function deleteEmployee(idx) {
    if(confirm("Are you sure you want to delete this member?")) {
        employees.splice(idx, 1);
        saveToGitHub();
    }
}

function handleEmployeeSubmit(e) {
    e.preventDefault();
    const newEmp = {
        isVacation: document.getElementById('empIsVacation').checked,
        vacationEnd: document.getElementById('empVacationEnd').value
    };

    fieldsConfig.forEach(f => {
        if(f.type === 'multiselect') {
            newEmp[f.id] = Array.from(document.querySelectorAll(`.multi-${f.id}:checked`)).map(c => c.value);
        } else {
            newEmp[f.id] = document.getElementById(`field_${f.id}`).value;
        }
    });

    if(currentEditingIndex > -1) employees[currentEditingIndex] = newEmp;
    else employees.push(newEmp);

    closeModal();
    saveToGitHub();
}

// 4. الرسوم البيانية
let chartsInstances = {};
function renderCharts() {
    const grid = document.getElementById('dynamicChartsGrid');
    if(!grid) return;
    grid.innerHTML = chartsConfig.map(c => `
        <div class="google-card p-6">
            <h3 class="font-bold text-gray-700 mb-4 text-center">${c.title}</h3>
            <div class="h-64"><canvas id="canvas_${c.id}"></canvas></div>
        </div>
    `).join('');

    chartsConfig.forEach(config => {
        const ctx = document.getElementById(`canvas_${config.id}`).getContext('2d');
        const dataMap = {};
        
        employees.filter(e => !config.filterRoles || config.filterRoles.length === 0 || config.filterRoles.includes(e.role))
        .forEach(e => {
            let vals = e[config.targetField];
            if(!Array.isArray(vals)) vals = [vals];
            vals.forEach(v => { if(v) dataMap[v] = (dataMap[v]||0)+1; });
        });

        if(chartsInstances[config.id]) chartsInstances[config.id].destroy();
        chartsInstances[config.id] = new Chart(ctx, {
            type: config.type || 'doughnut',
            data: {
                labels: Object.keys(dataMap),
                datasets: [{ data: Object.values(dataMap), backgroundColor: ['#4285F4','#34A853','#FBBC05','#EA4335','#9334E1','#FF6D01'] }]
            },
            options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } } }
        });
    });
}

// 5. إدارة الحقول والاعدادات (Schema)
function openSetupModal() {
    document.getElementById('setupModal').classList.remove('hidden');
    renderFieldsList();
}

function renderFieldsList() {
    const list = document.getElementById('fieldsList');
    list.innerHTML = fieldsConfig.map((f, i) => `
        <div class="flex gap-2 items-center bg-gray-50 p-3 rounded-lg border">
            <input type="text" value="${f.label}" onchange="updateFieldProp(${i}, 'label', this.value)" class="flex-1 p-2 border rounded">
            <select onchange="updateFieldProp(${i}, 'type', this.value)" class="p-2 border rounded">
                <option value="text" ${f.type==='text'?'selected':''}>Text</option>
                <option value="select" ${f.type==='select'?'selected':''}>Dropdown</option>
                <option value="multiselect" ${f.type==='multiselect'?'selected':''}>Multi-Select</option>
                <option value="date" ${f.type==='date'?'selected':''}>Date</option>
            </select>
            ${(f.type==='select'||f.type==='multiselect') ? `<button onclick="openOptionsManager(${i})" class="text-blue-600"><i data-lucide="list"></i></button>` : ''}
            <button onclick="fieldsConfig.splice(${i},1); renderFieldsList()" class="text-red-500"><i data-lucide="trash"></i></button>
        </div>
    `).join('');
    lucide.createIcons();
}

function saveSetup() {
    saveToGitHub();
    document.getElementById('setupModal').classList.add('hidden');
}

// 6. التنقل بين التبويبات
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active', 'border-blue-600', 'text-blue-600'));
    btn.classList.add('active', 'border-blue-600', 'text-blue-600');
    if(tabId === 'dashboard') renderCharts();
}

function renderDynamicForm() {
    const container = document.getElementById('dynamicFieldsContainer');
    if (!container) return; 
    container.innerHTML = fieldsConfig.map(f => {
        let input = '';
        const baseClass = "w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none";
        if(f.type==='select') {
            input = `<select id="field_${f.id}" class="${baseClass}">${(f.options||[]).map(o=>`<option value="${o}">${o}</option>`).join('')}</select>`;
        } else if(f.type==='multiselect') {
            input = `<div class="grid grid-cols-2 gap-2 border p-3 rounded-xl max-h-40 overflow-y-auto bg-gray-50">${(f.options||[]).map(o=>`<label class="flex items-center gap-2 text-sm"><input type="checkbox" value="${o}" class="multi-${f.id}"> ${o}</label>`).join('')}</div>`;
        } else if(f.type==='date') {
            input = `<input type="date" id="field_${f.id}" class="${baseClass}">`;
        } else {
            input = `<input type="${f.type}" id="field_${f.id}" class="${baseClass}" placeholder="Enter ${f.label}">`;
        }
        return `<div class="space-y-1"><label class="text-xs font-bold uppercase text-gray-400">${f.label}</label>${input}</div>`;
    }).join('');
}
