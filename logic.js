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

// 2. Table Rendering with Sorting & Filtering
function renderTable() {
    const headerRow = document.getElementById('tableHeaderRow');
    const body = document.getElementById('employeeTableBody');
    if (!headerRow || !body) return;

    // Header logic
    const baseHeaders = [{id:'name',label:'Name'}, {id:'role',label:'Role'}, {id:'area',label:'Primary Area'}, {id:'workingIn',label:'Working In'}, {id:'isVacation',label:'Status'}];
    const customHeaders = fieldsConfig.filter(f => f.active !== false && !['name','role','area','workingIn','isVacation'].includes(f.id));
    const allHeaders = [...baseHeaders, ...customHeaders];

    headerRow.innerHTML = allHeaders.map(h => `
        <th class="p-4 font-bold text-gray-600 sortable-header" onclick="setSort('${h.id}')">
            <div class="flex items-center gap-2">
                ${h.label || h.name}
                <i data-lucide="arrow-up-down" class="w-3 h-3 text-gray-400"></i>
            </div>
            <input type="text" placeholder="Filter..." class="filter-input no-print mt-2 w-full p-1 text-[10px] font-normal border rounded outline-none focus:ring-1 focus:ring-blue-400" 
                   onclick="event.stopPropagation()" onkeyup="filterTable()">
        </th>
    `).join('') + '<th class="p-4 admin-cell">Actions</th>';

    // Data Sorting
    const sortedData = [...employees].sort((a,b) => {
        let valA = a[sortConfig.key] || '';
        let valB = b[sortConfig.key] || '';
        return sortConfig.direction === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

    // Body logic
    body.innerHTML = sortedData.map((e, idx) => `
        <tr class="${e.isVacation ? 'vacation-row' : 'hover:bg-gray-50'} transition-colors">
            ${allHeaders.map(h => {
                if(h.id === 'isVacation') return `<td class="p-4 font-medium ${e.isVacation ? 'text-red-600' : 'text-emerald-600'}">${e.isVacation ? 'On Vacation' : 'Active'}</td>`;
                let val = e[h.id];
                if(Array.isArray(val)) val = val.join(', ');
                return `<td class="p-4 text-gray-600">${val || '-'}</td>`;
            }).join('')}
            <td class="p-4 admin-cell">
                <div class="flex gap-2">
                    <button onclick="editEmployee(${employees.indexOf(e)})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                    <button onclick="deleteEmployee(${employees.indexOf(e)})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function setSort(key) {
    if(sortConfig.key === key) sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    else { sortConfig.key = key; sortConfig.direction = 'asc'; }
    renderTable();
}

function filterTable() {
    const inputs = document.querySelectorAll('.filter-input');
    const table = document.getElementById('employeeTable');
    const rows = table.getElementsByTagName('tr');
    for (let i = 1; i < rows.length; i++) {
        let show = true;
        inputs.forEach((input, idx) => {
            const cellText = rows[i].getElementsByTagName('td')[idx]?.textContent.toLowerCase() || '';
            if (!cellText.includes(input.value.toLowerCase())) show = false;
        });
        rows[i].classList.toggle('hidden-by-filter', !show);
        rows[i].style.display = show ? '' : 'none';
    }
}

// 3. Dynamic Form & Fields Setup
function renderDynamicForm() {
    const container = document.getElementById('dynamicFieldsContainer');
    if(!container) return;
    
    container.innerHTML = fieldsConfig.filter(f => f.active !== false).map(f => {
        let val = currentEditingIndex > -1 ? (employees[currentEditingIndex][f.id] || '') : '';
        let inputHtml = '';
        if (f.type === 'select' || f.type === 'multiselect') {
            const options = (f.options || []).map(opt => `<option value="${opt}" ${Array.isArray(val) ? (val.includes(opt)?'selected':'') : (val===opt?'selected':'')}>${opt}</option>`).join('');
            inputHtml = `<select id="field_${f.id}" ${f.type === 'multiselect' ? 'multiple' : ''} class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                            ${options}
                         </select>`;
        } else if (f.type === 'checkbox') {
            inputHtml = `<div class="p-3 border rounded-xl flex items-center gap-4">
                            <label class="switch"><input type="checkbox" id="field_${f.id}" ${val ? 'checked' : ''}><span class="slider"></span></label>
                            <span class="text-sm font-bold text-gray-500 uppercase">Enable</span>
                         </div>`;
        } else {
            inputHtml = `<input type="${f.type}" id="field_${f.id}" value="${val}" class="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500">`;
        }

        return `<div><label class="block text-[10px] font-bold text-gray-400 mb-1 uppercase">${f.label || f.name}</label>${inputHtml}</div>`;
    }).join('');
}

// 4. Employee Management
function openModal() { currentEditingIndex = -1; document.getElementById('modalTitle').innerText = "Add New Member"; renderDynamicForm(); document.getElementById('memberModal').classList.remove('hidden'); }
function closeModal() { document.getElementById('memberModal').classList.add('hidden'); }

function saveEmployee() {
    const newEmp = {};
    fieldsConfig.forEach(f => {
        const el = document.getElementById(`field_${f.id}`);
        if(f.type === 'multiselect') newEmp[f.id] = Array.from(el.selectedOptions).map(o => o.value);
        else if(f.type === 'checkbox') newEmp[f.id] = el.checked;
        else newEmp[f.id] = el.value;
    });

    if(currentEditingIndex > -1) employees[currentEditingIndex] = newEmp;
    else employees.push(newEmp);

    saveToGitHub().then(() => { closeModal(); renderAll(); });
}

function editEmployee(idx) { currentEditingIndex = idx; document.getElementById('modalTitle').innerText = "Edit Member Info"; renderDynamicForm(); document.getElementById('memberModal').classList.remove('hidden'); }
function deleteEmployee(idx) { if(confirm("Are you sure?")) { employees.splice(idx,1); saveToGitHub().then(renderAll); } }

// 5. Excel & Backup
function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(employees);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Team");
    XLSX.writeFile(wb, "Team_Hub_Export.xlsx");
}

function performFullBackup() {
    const blob = new Blob([JSON.stringify({employees, fields:fieldsConfig, users, visibility:visibilityConfig, charts:chartsConfig}, null, 2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup.json'; a.click();
}

// 6. Charts Rendering
function renderCharts() {
    const container = document.getElementById('dynamicChartsGrid');
    container.innerHTML = (chartsConfig || []).map(c => `<div class="p-4 border rounded-2xl bg-white shadow-sm"><h3 class="font-bold mb-4 text-gray-700 border-b pb-2 uppercase text-[10px] tracking-widest">${c.title}</h3><div class="chart-container"><canvas id="chart_${c.id}"></canvas></div></div>`).join('');
    
    (chartsConfig || []).forEach(c => {
        const ctx = document.getElementById(`chart_${c.id}`).getContext('2d');
        if(chartsInstances[c.id]) chartsInstances[c.id].destroy();

        let filtered = employees;
        if(c.filterRoles && c.filterRoles.length > 0) filtered = employees.filter(e => c.filterRoles.includes(e.role));

        const counts = {};
        filtered.forEach(e => {
            const val = e[c.field] || 'N/A';
            const values = Array.isArray(val) ? val : [val];
            values.forEach(v => counts[v] = (counts[v] || 0) + 1);
        });

        chartsInstances[c.id] = new Chart(ctx, {
            type: c.type || 'doughnut',
            data: { labels: Object.keys(counts), datasets: [{ data: Object.values(counts), backgroundColor: ['#4285f4','#34a853','#fbbc05','#ea4335','#a142f4','#24c1e0'] }] },
            options: { responsive: true, maintainAspectRatio: false, onClick: (evt, elements) => { if(elements.length > 0) { const idx = elements[0].index; showGlobalDetails(c.filterRoles.join(','), true, Object.keys(counts)[idx], c.field); } } }
        });
    });
}

function showGlobalDetails(rolesStr, isFilterByValue = false, filterValue = '', filterKey = '') {
    const roles = rolesStr.split(',').map(s => s.trim());
    let list = employees.filter(e => roles.some(r => e.role && e.role.toLowerCase().includes(r.toLowerCase())));
    if(isFilterByValue) list = list.filter(e => { let val = e[filterKey]; return Array.isArray(val) ? val.includes(filterValue) : val === filterValue; });

    document.getElementById('popupTitleContainer').innerHTML = `<h3 class="text-2xl font-black text-gray-800 uppercase tracking-tighter">${filterValue || rolesStr} Members</h3><p class="text-sm text-gray-500 font-bold uppercase">${list.length} Members total</p>`;
    document.getElementById('popupList').innerHTML = list.map(e => `
        <div class="p-4 border rounded-xl ${e.isVacation ? 'bg-red-50 border-red-200' : 'bg-gray-50'}">
            <b class="${e.isVacation ? 'line-through text-red-600' : ''}">${e.name}</b><br>
            <small class="text-gray-500">${e.role} ${e.isVacation ? '(Returns: ' + (e.vacationEnd || 'N/A') + ')' : ''}</small>
        </div>
    `).join('') || '<div class="col-span-full text-center text-gray-400 py-10 font-bold uppercase italic">No members found</div>';
    document.getElementById('detailsPopup').classList.remove('hidden');
}
function closePopup() { document.getElementById('detailsPopup').classList.add('hidden'); }
function clearFilters() { document.querySelectorAll('.filter-input').forEach(i=>i.value=""); filterTable(); }
