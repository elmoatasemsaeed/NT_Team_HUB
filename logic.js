// --- Business Logic & UI Rendering ---

function renderAll() { 
    updateCapacity(); 
    renderTable(); 
    renderDynamicForm(); 
    renderCharts();
    if (typeof lucide !== 'undefined') lucide.createIcons(); 
}

function renderTable() {
    const tbody = document.getElementById('employeeTableBody');
    const thead = document.getElementById('tableHeader');
    if (!tbody || !thead) return;

    // Build Header
    let headHtml = `<th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase cursor-pointer" onclick="handleSort('name')">Name</th>`;
    headHtml += `<th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase cursor-pointer" onclick="handleSort('role')">Role</th>`;
    fieldsConfig.forEach(f => {
        headHtml += `<th class="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase cursor-pointer" onclick="handleSort('${f.id}')">${f.label}</th>`;
    });
    headHtml += `<th class="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>`;
    thead.innerHTML = `<tr>${headHtml}</tr>`;

    // Filter and Sort
    let filtered = [...employees];
    const nameFilter = document.getElementById('filterName')?.value.toLowerCase();
    if (nameFilter) filtered = filtered.filter(e => e.name.toLowerCase().includes(nameFilter));

    filtered.sort((a, b) => {
        let valA = a[sortConfig.key] || '';
        let valB = b[sortConfig.key] || '';
        return sortConfig.direction === 'asc' ? valA.toString().localeCompare(valB) : valB.toString().localeCompare(valA);
    });

    // Build Body
    tbody.innerHTML = filtered.map((e, idx) => `
        <tr class="border-t hover:bg-gray-50 transition ${e.isVacation ? 'vacation-row' : ''}">
            <td class="px-4 py-3 font-medium ${e.isVacation ? 'line-through text-red-500' : ''}">${e.name}</td>
            <td class="px-4 py-3"><span class="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 font-bold">${e.role}</span></td>
            ${fieldsConfig.map(f => `<td class="px-4 py-3 text-sm">${Array.isArray(e[f.id]) ? e[f.id].join(', ') : (e[f.id] || '-')}</td>`).join('')}
            <td class="px-4 py-3 text-right space-x-2">
                <button onclick="editEmployee(${employees.indexOf(e)})" class="text-blue-600 hover:text-blue-900"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                <button onclick="deleteEmployee(${employees.indexOf(e)})" class="text-red-600 hover:text-red-900 admin-only"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
        </tr>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateCapacity() {
    const devGrid = document.getElementById('devCapacityGrid');
    const testGrid = document.getElementById('testerCapacityGrid');
    if (!devGrid || !testGrid) return;

    const devs = employees.filter(e => e.role?.toLowerCase().includes('dev') || e.role?.toLowerCase().includes('senior'));
    const testers = employees.filter(e => e.role?.toLowerCase().includes('tester'));

    const buildGrid = (list) => {
        const groups = {};
        list.forEach(e => {
            const areas = Array.isArray(e.area) ? e.area : [e.area || 'Other'];
            areas.forEach(a => { groups[a] = groups[a] || []; groups[a].push(e); });
        });

        return Object.entries(groups).map(([name, members]) => {
            const vacationCount = members.filter(m => m.isVacation).length;
            const activeCount = members.length - vacationCount;
            return `
                <div class="google-card p-4 cursor-pointer" onclick="showDetails('${name}', ${JSON.stringify(members).replace(/"/g, '&quot;')})">
                    <h4 class="font-bold text-gray-700 border-b pb-2 mb-2">${name}</h4>
                    <div class="flex justify-between text-sm">
                        <span class="text-green-600">Active: ${activeCount}</span>
                        <span class="text-red-500">Vacation: ${vacationCount}</span>
                    </div>
                </div>
            `;
        }).join('');
    };

    devGrid.innerHTML = buildGrid(devs);
    testGrid.innerHTML = buildGrid(testers);
}

function showDetails(title, list) {
    document.getElementById('popupTitle').innerText = title;
    document.getElementById('popupList').innerHTML = list.map(e => `
        <div class="p-3 border rounded-lg ${e.isVacation ? 'bg-red-50' : 'bg-gray-50'}">
            <b class="${e.isVacation ? 'line-through text-red-600' : ''}">${e.name}</b>
            <div class="text-xs text-gray-500">${e.role} ${e.isVacation ? '(Ends: '+e.vacationEnd+')' : ''}</div>
        </div>
    `).join('');
    document.getElementById('detailsPopup').classList.remove('hidden');
}

function closePopup() { document.getElementById('detailsPopup').classList.add('hidden'); }

function renderCharts() {
    chartsConfig.forEach(c => {
        const canvas = document.getElementById(`chart_${c.id}`);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const filtered = employees.filter(e => c.filterRoles.length === 0 || c.filterRoles.some(r => e.role.toLowerCase().includes(r.toLowerCase())));
        const counts = {};
        filtered.forEach(e => {
            const val = e[c.field] || 'N/A';
            const keys = Array.isArray(val) ? val : [val];
            keys.forEach(k => counts[k] = (counts[k] || 0) + 1);
        });

        if (chartsInstances[c.id]) chartsInstances[c.id].destroy();
        chartsInstances[c.id] = new Chart(ctx, {
            type: c.type,
            data: {
                labels: Object.keys(counts),
                datasets: [{ data: Object.values(counts), backgroundColor: ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#A142F4'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    });
}
