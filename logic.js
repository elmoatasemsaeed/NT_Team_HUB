// --- Business Logic & UI Rendering ---

function renderAll() { 
    updateCapacity(); 
    renderTable(); 
    renderDynamicForm(); 
    lucide.createIcons(); 
}

function renderDynamicForm() {
    const container = document.getElementById('dynamicFieldsContainer');
    if (!container) return;
    container.innerHTML = fieldsConfig.map(f => {
        let input = '';
        if(f.type==='select') {
            input = `<select id="field_${f.id}" class="w-full p-3 border rounded-xl">${(f.options||[]).map(o=>`<option value="${o}">${o}</option>`).join('')}</select>`;
        } else if(f.type==='multiselect') {
            input = `<div class="grid grid-cols-2 gap-2 border p-3 rounded-xl h-32 overflow-y-auto">${(f.options||[]).map(o=>`<label class="flex items-center gap-2"><input type="checkbox" value="${o}" class="multi-${f.id}"> ${o}</label>`).join('')}</div>`;
        } else if(f.type==='date') {
            input = `<input type="date" id="field_${f.id}" class="w-full p-3 border rounded-xl">`;
        } else {
            input = `<input type="${f.type}" id="field_${f.id}" class="w-full p-3 border rounded-xl">`;
        }
        return `<div class="space-y-1"><label class="text-xs font-bold uppercase text-gray-500">${f.label}</label>${input}</div>`;
    }).join('');
}

function renderTable() {
    const visibleFields = fieldsConfig.filter(f => f.showInTable !== false);
    let headerHtml = visibleFields.map(f => `<th class="py-4 px-6 min-w-[150px] sortable-header" onclick="sortTable('${f.id}')"><div class="sort-btn">${f.label} <i data-lucide="${currentSort.column === f.id ? (currentSort.direction === 'asc' ? 'arrow-up' : 'arrow-down') : 'arrow-up-down'}" class="w-3 h-3 ml-1 ${currentSort.column === f.id ? 'text-blue-600' : 'opacity-40'}"></i></div><input type="text" placeholder="Filter..." class="filter-input no-print text-black font-normal p-1 w-full border rounded mt-1" onclick="event.stopPropagation()" onkeyup="filterTable()"></th>`).join('');
    headerHtml += `<th class="py-4 px-6 text-center sortable-header" onclick="sortTable('isVacation')">Vacation</th><th class="py-4 px-6 status-cell">Status</th><th class="py-4 px-6 admin-cell no-print">Actions</th>`;
    document.getElementById('tableHeaderRow').innerHTML = headerHtml;
    
    document.getElementById('employeeTableBody').innerHTML = employees.map((emp, idx) => `
        <tr class="${emp.isVacation ? 'vacation-row' : ''} hover:bg-gray-50">
            ${visibleFields.map(f => `<td class="py-4 px-6">${Array.isArray(emp[f.id]) ? emp[f.id].join(', ') : (emp[f.id] || '')}</td>`).join('')}
            <td class="py-4 px-6 text-center">
                <input type="checkbox" ${emp.isVacation ? 'checked' : ''} ${currentUserRole === 'admin' ? 'onchange="toggleVac(' + idx + ', this.checked)"' : 'disabled'} class="w-5 h-5 accent-red-600">
            </td>
            <td class="py-4 px-6 font-bold ${emp.isVacation ? 'text-red-500' : 'text-emerald-500'}">
                ${emp.isVacation ? 'Returns: ' + (emp.vacationEnd || 'N/A') : 'Active'}
            </td>
            <td class="py-4 px-6 admin-cell no-print">
                <div class="flex gap-4">
                    <button onclick="editEmp(${idx})" class="text-blue-500 hover:text-blue-700"><i data-lucide="edit" class="w-5 h-5"></i></button>
                    <button onclick="deleteEmp(${idx})" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
                </div>
            </td>
        </tr>`).join('');
    lucide.createIcons();
}

function updateCapacity() {
    const areaField = fieldsConfig.find(f => f.id === 'area');
    const AREAS = (areaField && areaField.options) ? areaField.options.filter(a => a !== "Team Leader") : [];
    const isVisible = (area, type) => (!visibilityConfig[area] || visibilityConfig[area][type]);

    const renderCard = (area, roleFilter, color) => {
        const areaEmps = employees.filter(e => (Array.isArray(e.area) ? e.area.includes(area) : e.area === area) && roleFilter.includes(e.role));
        const active = areaEmps.filter(e => !e.isVacation);
        const vac = areaEmps.filter(e => e.isVacation);

        const detailsHtml = roleFilter.map(role => {
            const count = active.filter(e => e.role === role).length;
            return count > 0 ? `<div class="flex justify-between text-[9px] mb-1"><span class="opacity-70">${role}:</span><span class="font-bold">${count}</span></div>` : '';
        }).join('');

        return `
            <div class="google-card border-l-4 border-l-${color}-500 p-3 cursor-pointer hover:bg-${color}-50" 
                 onclick="showDetailsExtended('${area}', '${roleFilter.join(',')}', false)">
                <div class="flex justify-between items-center border-b pb-2 mb-2">
                    <span class="text-[10px] uppercase font-black text-gray-600">${area}</span>
                    <span class="bg-${color}-100 text-${color}-700 px-2 py-0.5 rounded-full text-xs font-bold">${active.length}</span>
                </div>
                <div>${detailsHtml || '<div class="text-gray-400 italic text-[9px]">No active</div>'}</div>
                <div class="mt-2 pt-2 border-t border-dashed">
                    <div class="text-[10px] p-1 rounded text-red-500 font-bold hover:bg-red-100 flex justify-between" 
                         onclick="event.stopPropagation(); showDetailsExtended('${area}', '${roleFilter.join(',')}', true)">
                        <span>VACATION:</span><span>${vac.length}</span>
                    </div>
                </div>
            </div>`;
    };

    document.getElementById('devCapacityGrid').innerHTML = AREAS.filter(a => isVisible(a, 'dev')).map(a => renderCard(a, ['Dev','Senior'], 'blue')).join('');
    document.getElementById('testerCapacityGrid').innerHTML = AREAS.filter(a => isVisible(a, 'tester')).map(a => renderCard(a, ['Tester','Senior tester'], 'green')).join('');
    document.getElementById('devTotalLabel').innerText = "Total: " + employees.filter(e => ['Dev','Senior'].includes(e.role) && !e.isVacation).length;
    document.getElementById('testerTotalLabel').innerText = "Total: " + employees.filter(e => ['Tester','Senior tester'].includes(e.role) && !e.isVacation).length;
    renderCharts();
}

function renderCharts() {
    const chartsGrid = document.getElementById('dynamicChartsGrid');
    if(!chartsGrid) return;
    chartsGrid.innerHTML = '';
    activeCharts.forEach(c => c.destroy());
    activeCharts = [];
    chartsConfig.forEach(config => {
        const wrapper = document.createElement('div');
        wrapper.className = 'p-6 border rounded-2xl bg-white shadow-sm flex flex-col items-center';
        wrapper.innerHTML = `<h3 class="font-bold mb-6 text-center uppercase text-xs tracking-widest text-gray-600">${config.title}</h3><div class="relative h-[250px] w-full"><canvas id="canvas_${config.id}"></canvas></div>`;
        chartsGrid.appendChild(wrapper);
        const stats = {};
        employees.filter(e => !e.isVacation && (!config.filterRoles || config.filterRoles.includes(e.role))).forEach(emp => {
            const val = emp[config.targetField] || 'N/A';
            (Array.isArray(val) ? val : [val]).forEach(v => stats[v] = (stats[v]||0)+1);
        });
        const chart = new Chart(document.getElementById(`canvas_${config.id}`).getContext('2d'), {
            type: config.type,
            data: { labels: Object.keys(stats), datasets: [{ data: Object.values(stats), backgroundColor: ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#673AB7', '#3F51B5', '#00BCD4', '#009688', '#FF9800', '#FF5722'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } } }
        });
        activeCharts.push(chart);
    });
}

// --- Management Functions ---
function save(render = true) { syncToGitHub(); if(render) renderAll(); }
function toggleVac(idx, val) { employees[idx].isVacation = val; save(); }
function deleteEmp(idx) { if(confirm('Are you sure you want to delete this member?')) { employees.splice(idx,1); save(); } }

function sortTable(columnId) {
    if (currentSort.column === columnId) currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    else { currentSort.column = columnId; currentSort.direction = 'asc'; }
    employees.sort((a, b) => {
        let vA = a[columnId] ?? '', vB = b[columnId] ?? '';
        vA = vA.toString().toLowerCase(); vB = vB.toString().toLowerCase();
        return currentSort.direction === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
    });
    renderTable();
}

function filterTable() {
    const filters = Array.from(document.querySelectorAll('.filter-input'));
    const rows = document.querySelectorAll('#employeeTableBody tr');
    rows.forEach(row => {
        let show = true;
        filters.forEach((input, i) => { 
            if(input.value && !row.cells[i].innerText.toLowerCase().includes(input.value.toLowerCase())) show = false; 
        });
        row.style.display = show ? '' : 'none';
    });
}

function editEmp(idx) {
    const emp = employees[idx]; 
    document.getElementById('editIndex').value = idx;
    fieldsConfig.forEach(f => {
        const el = document.getElementById(`field_${f.id}`);
        if(f.type === 'multiselect') {
            document.querySelectorAll(`.multi-${f.id}`).forEach(c => c.checked = (emp[f.id]||[]).includes(c.value));
        } else if(el) {
            el.value = emp[f.id] || '';
        }
    });
    document.getElementById('empIsVacation').checked = emp.isVacation;
    document.getElementById('empVacationEnd').value = emp.vacationEnd || '';
    openModal();
}

// Handle Form Submit (Added to logic)
function handleEmployeeSubmit(e) {
    e.preventDefault();
    const idx = document.getElementById('editIndex').value;
    const emp = { 
        isVacation: document.getElementById('empIsVacation').checked, 
        vacationEnd: document.getElementById('empVacationEnd').value 
    };
    fieldsConfig.forEach(f => {
        if(f.type==='multiselect') {
            emp[f.id] = Array.from(document.querySelectorAll(`.multi-${f.id}:checked`)).map(c=>c.value);
        } else {
            emp[f.id] = document.getElementById(`field_${f.id}`).value;
        }
    });
    if(idx !== "") employees[idx] = emp; else employees.push(emp);
    save(); 
    closeModal();
}

// --- UI Helpers ---
function switchTab(t, btn) { 
    document.querySelectorAll('.tab-content').forEach(c=>c.classList.add('hidden')); 
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active')); 
    document.getElementById(t).classList.remove('hidden'); 
    btn.classList.add('active'); 
}
function openModal() { document.getElementById('modal').classList.remove('hidden'); }
function closeModal() { 
    document.getElementById('modal').classList.add('hidden'); 
    document.getElementById('employeeForm').reset(); 
    document.getElementById('editIndex').value=""; 
}

function openSetupModal() {
    document.getElementById('fieldsList').innerHTML = fieldsConfig.map((f, i) => `
        <div class="p-4 border rounded-xl bg-gray-50 grid grid-cols-1 md:grid-cols-6 gap-3 items-end shadow-sm">
            <div class="md:col-span-2"><label class="text-[10px] font-bold">Label</label><input type="text" value="${f.label}" onchange="fieldsConfig[${i}].label=this.value" class="w-full p-2 border rounded text-sm"></div>
            <div><label class="text-[10px] font-bold">Type</label><select onchange="fieldsConfig[${i}].type=this.value; openSetupModal()" class="w-full p-2 border rounded text-sm"><option value="text" ${f.type==='text'?'selected':''}>Text</option><option value="select" ${f.type==='select'?'selected':''}>Select</option><option value="multiselect" ${f.type==='multiselect'?'selected':''}>Multi</option><option value="date" ${f.type==='date'?'selected':''}>Date</option></select></div>
            <div>${['select','multiselect'].includes(f.type) ? `<button onclick="openOptionsManager(${i})" class="w-full p-2 bg-white border border-blue-400 text-blue-600 rounded text-[10px] font-bold uppercase">Options (${(f.options || []).length})</button>` : ''}</div>
            <div class="flex flex-col items-center"><label class="text-[10px] mb-1">Table</label><input type="checkbox" ${f.showInTable !== false ? 'checked' : ''} onchange="fieldsConfig[${i}].showInTable = this.checked" class="w-5 h-5"></div>
            <button onclick="fieldsConfig.splice(${i},1); openSetupModal()" class="text-red-500 p-2"><i data-lucide="trash-2"></i></button>
        </div>`).join('');
    document.getElementById('setupModal').classList.remove('hidden'); 
    lucide.createIcons();
}

function renderOptionsList() { 
    const list = fieldsConfig[currentEditingFieldIndex].options || []; 
    document.getElementById('optionsItemsContainer').innerHTML = list.map((opt, i) => `
        <div class="flex gap-2 bg-gray-50 p-1 rounded border">
            <input type="text" value="${opt}" onchange="fieldsConfig[${currentEditingFieldIndex}].options[${i}]=this.value" class="flex-1 p-2 bg-transparent text-sm outline-none">
            <button onclick="fieldsConfig[${currentEditingFieldIndex}].options.splice(${i},1); renderOptionsList()" class="text-red-400 p-2"><i data-lucide="x-circle" class="w-4 h-4"></i></button>
        </div>`).join(''); 
    lucide.createIcons(); 
}

function openOptionsManager(idx) { currentEditingFieldIndex = idx; if(!fieldsConfig[idx].options) fieldsConfig[idx].options = []; renderOptionsList(); document.getElementById('optionsModal').classList.remove('hidden'); }
function addOptionField() { fieldsConfig[currentEditingFieldIndex].options.push(""); renderOptionsList(); }
function closeOptionsManager() { document.getElementById('optionsModal').classList.add('hidden'); openSetupModal(); }
function addNewFieldSetup() { fieldsConfig.push({id:'f'+Date.now(), label:'New Field', type:'text', showInTable:true, options: []}); openSetupModal(); }
function saveSetup() { save(false); location.reload(); }
function closeSetupModal() { document.getElementById('setupModal').classList.add('hidden'); }

function openVisibilityModal() {
    const areaField = fieldsConfig.find(f=>f.id==='area');
    const areas = areaField ? areaField.options.filter(a=>a!=="Team Leader") : [];
    document.getElementById('visibilityList').innerHTML = areas.map(a => {
        const cfg = visibilityConfig[a] || {dev:true, tester:true};
        return `<tr><td class="p-4 font-bold border-b">${a}</td><td class="text-center border-b"><input type="checkbox" class="v-dev" data-area="${a}" ${cfg.dev?'checked':''}></td><td class="text-center border-b"><input type="checkbox" class="v-tester" data-area="${a}" ${cfg.tester?'checked':''}></td></tr>`;
    }).join('');
    document.getElementById('visibilityModal').classList.remove('hidden');
}

function saveVisibility() {
    document.querySelectorAll('#visibilityList tr').forEach(tr => {
        const devBox = tr.querySelector('.v-dev'); if(!devBox) return;
        const area = devBox.dataset.area;
        visibilityConfig[area] = { dev: tr.querySelector('.v-dev').checked, tester: tr.querySelector('.v-tester').checked };
    });
    save(); document.getElementById('visibilityModal').classList.add('hidden');
}

function openUsersModal() {
    document.getElementById('usersList').innerHTML = users.map((u, idx) => `
        <div class="p-4 border rounded-xl bg-gray-50 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div><label class="text-[10px]">User</label><input type="text" value="${u.username}" onchange="users[${idx}].username=this.value" class="w-full p-2 border rounded text-sm"></div>
            <div><label class="text-[10px]">Pass</label><input type="text" value="${u.password}" onchange="users[${idx}].password=this.value" class="w-full p-2 border rounded text-sm"></div>
            <div><label class="text-[10px]">Role</label><select onchange="users[${idx}].role=this.value" class="w-full p-2 border rounded text-sm"><option value="admin" ${u.role==='admin'?'selected':''}>Admin</option><option value="viewer" ${u.role==='viewer'?'selected':''}>Viewer</option></select></div>
            <button onclick="users.splice(${idx},1); openUsersModal()" class="p-2 text-red-500"><i data-lucide="trash-2"></i></button>
        </div>`).join('');
    document.getElementById('usersModal').classList.remove('hidden'); 
    lucide.createIcons();
}

function showDetailsExtended(area, roles, isVac) {
    const roleList = roles.split(',');
    const list = employees.filter(e => (Array.isArray(e.area)?e.area.includes(area):e.area===area) && roleList.includes(e.role) && e.isVacation === isVac);
    document.getElementById('popupTitle').innerText = `${area} - ${isVac ? 'On Vacation' : 'Active Members'}`;
    document.getElementById('popupList').innerHTML = list.length > 0 ? list.map(e => `<div class="p-4 border rounded-xl ${e.isVacation ? 'bg-red-50' : 'bg-gray-50'}"><b>${e.name || 'Unknown'}</b><br><small class="text-gray-500">${e.role} ${e.isVacation ? '(Returns: ' + (e.vacationEnd || 'N/A') + ')' : ''}</small></div>`).join('') : '<div class="col-span-full text-center py-10 text-gray-400">No members found</div>';
    document.getElementById('detailsPopup').classList.remove('hidden');
}

function closePopup() { document.getElementById('detailsPopup').classList.add('hidden'); }
function closeVisibilityModal() { document.getElementById('visibilityModal').classList.add('hidden'); }
function addNewUser() { users.push({username:'newuser', password:'123', role:'viewer'}); openUsersModal(); }
function saveUsers() { save(false); alert('Users Saved locally, syncing...'); }
function closeUsersModal() { document.getElementById('usersModal').classList.add('hidden'); }

function openChartsSetupModal() {
    document.getElementById('chartsConfigList').innerHTML = chartsConfig.map((c, idx) => `
        <div class="p-4 border rounded-xl bg-gray-50 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div><label class="text-[10px]">Title</label><input type="text" value="${c.title}" onchange="chartsConfig[${idx}].title=this.value" class="w-full p-2 border rounded text-sm"></div>
            <div><label class="text-[10px]">Field</label><select onchange="chartsConfig[${idx}].targetField=this.value" class="w-full p-2 border rounded text-sm">${fieldsConfig.map(f => `<option value="${f.id}" ${c.targetField===f.id?'selected':''}>${f.label}</option>`).join('')}</select></div>
            <div><label class="text-[10px]">Type</label><select onchange="chartsConfig[${idx}].type=this.value" class="w-full p-2 border rounded text-sm"><option value="doughnut" ${c.type==='doughnut'?'selected':''}>Doughnut</option><option value="bar" ${c.type==='bar'?'selected':''}>Bar</option></select></div>
            <button onclick="chartsConfig.splice(${idx},1); openChartsSetupModal()" class="text-red-500 p-2"><i data-lucide="trash-2"></i></button>
        </div>`).join('');
    document.getElementById('chartsSetupModal').classList.remove('hidden'); 
    lucide.createIcons();
}
function addNewChartConfig() { chartsConfig.push({ id: 'c'+Date.now(), title: 'New Chart', targetField: 'area', type: 'doughnut' }); openChartsSetupModal(); }
function saveChartsConfig() { save(); document.getElementById('chartsSetupModal').classList.add('hidden'); }
function closeChartsSetupModal() { document.getElementById('chartsSetupModal').classList.add('hidden'); }
function clearFilters() { document.querySelectorAll('.filter-input').forEach(i=>i.value=""); filterTable(); }

function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(employees);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Team");
    XLSX.writeFile(wb, "Team_Report.xlsx");
}
