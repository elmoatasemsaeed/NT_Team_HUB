let currentEditingIndex = -1;
let chartsInstances = {};

function renderAll() {
    updateCapacity();
    renderTable();
    renderDynamicForm();
    renderCharts();
    populateSelects();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// استخراج القيم الفريدة من الموظفين لتغذية القوائم المنسدلة
function populateSelects() {
    const roles = [...new Set(employees.map(e => e.role))].filter(Boolean);
    const filterRole = document.getElementById('filterRole');
    const empRole = document.getElementById('empRole');
    
    if (filterRole) {
        filterRole.innerHTML = '<option value="">All Roles</option>' + 
            roles.map(r => `<option value="${r}">${r}</option>`).join('');
    }
    if (empRole) {
        empRole.innerHTML = roles.map(r => `<option value="${r}">${r}</option>`).join('');
    }
}

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

        container.innerHTML = Object.keys(groups).map(area => {
            const members = groups[area];
            const activeCount = members.filter(m => !m.isVacation).length;
            return `
                <div class="google-card p-5">
                    <div class="flex justify-between items-start mb-4">
                        <h4 class="font-black text-gray-800 uppercase text-sm">${area}</h4>
                        <span class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">${activeCount}/${members.length}</span>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        ${members.map(m => `<span class="w-3 h-3 rounded-full ${m.isVacation ? 'bg-red-200' : 'bg-green-500'}" title="${m.name}"></span>`).join('')}
                    </div>
                </div>
            `;
        }).join('');
    };

    renderCards(devs, devGrid, 'dev');
    renderCards(testers, testGrid, 'tester');
}

function renderTable() {
    const tbody = document.getElementById('rosterTable');
    if (!tbody) return;
    
    tbody.innerHTML = employees.map((emp, idx) => `
        <tr class="${emp.isVacation ? 'vacation-row' : ''} hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 font-bold text-gray-900">${emp.name}</td>
            <td class="px-6 py-4 text-sm font-medium text-gray-600">${emp.role}</td>
            <td class="px-6 py-4 text-xs font-bold text-blue-600 uppercase">${Array.isArray(emp.area) ? emp.area.join(', ') : emp.area}</td>
            <td class="px-6 py-4 text-right space-x-2 admin-only">
                <button onclick="editEmployee(${idx})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                <button onclick="deleteEmployee(${idx})" class="p-2 text-red-600 hover:bg-red-50 rounded-lg"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

function renderCharts() {
    const grid = document.getElementById('dynamicChartsGrid');
    if(!grid) return;
    grid.innerHTML = chartsConfig.map((c, i) => `
        <div class="google-card p-6">
            <h4 class="font-black text-gray-800 uppercase mb-4 text-center">${c.title}</h4>
            <canvas id="chart_${i}"></canvas>
        </div>
    `).join('');

    chartsConfig.forEach((c, i) => {
        const ctx = document.getElementById(`chart_${i}`).getContext('2d');
        const dataMap = {};
        employees.forEach(e => {
            const val = e[c.field] || 'Unknown';
            dataMap[val] = (dataMap[val] || 0) + 1;
        });

        new Chart(ctx, {
            type: c.type || 'pie',
            data: {
                labels: Object.keys(dataMap),
                datasets: [{ data: Object.values(dataMap), backgroundColor: ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#8E24AA'] }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    });
}

// شاشة المستخدمين
function openUsersModal() {
    const list = document.getElementById('usersList');
    list.innerHTML = users.map((u, i) => `
        <div class="flex gap-2 items-center bg-gray-50 p-3 rounded-xl">
            <input type="text" value="${u.username}" onchange="users[${i}].username=this.value" class="flex-1 p-2 border rounded-lg text-sm">
            <input type="text" value="${u.password}" onchange="users[${i}].password=this.value" class="flex-1 p-2 border rounded-lg text-sm">
            <select onchange="users[${i}].role=this.value" class="p-2 border rounded-lg text-sm">
                <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                <option value="viewer" ${u.role==='viewer'?'selected':''}>Viewer</option>
            </select>
            <button onclick="users.splice(${i},1); openUsersModal()" class="text-red-500"><i data-lucide="x-circle"></i></button>
        </div>
    `).join('');
    document.getElementById('usersModal').classList.remove('hidden');
    lucide.createIcons();
}

function addNewUser() {
    users.push({username: 'new_user', password: '123', role: 'viewer'});
    openUsersModal();
}

async function saveUsersConfig() {
    if (await saveToGitHub()) document.getElementById('usersModal').classList.add('hidden');
}

// وظائف الـ Modals المساعدة
function openModal() { currentEditingIndex = -1; document.getElementById('memberModal').classList.remove('hidden'); }
function closeModal() { document.getElementById('memberModal').classList.add('hidden'); }
function openSetupModal() { /* ... مماثل للمستخدمين لعرض الحقول ... */ document.getElementById('setupModal').classList.remove('hidden'); }
function closeSetupModal() { document.getElementById('setupModal').classList.add('hidden'); }
function openChartsSetupModal() { document.getElementById('chartsSetupModal').classList.remove('hidden'); }
function closeChartsSetupModal() { document.getElementById('chartsSetupModal').classList.add('hidden'); }

// توفير الوظائف للـ API
window.renderAll = renderAll;
