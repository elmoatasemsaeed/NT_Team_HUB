let currentEditingIndex = -1;
let chartsInstances = {};

function renderAll() { 
    updateCapacity(); 
    renderTable(); 
    renderDynamicForm(); 
    renderCharts();
    if (typeof lucide !== 'undefined') lucide.createIcons(); 
}

function updateCapacity() {
    const devGrid = document.getElementById('devCapacityGrid');
    const testGrid = document.getElementById('testerCapacityGrid');
    if (!devGrid || !testGrid) return;

    devGrid.innerHTML = '';
    testGrid.innerHTML = '';

    const devs = employees.filter(e => e.role && (e.role.toLowerCase().includes('dev') || e.role.toLowerCase().includes('lead')));
    const testers = employees.filter(e => e.role && e.role.toLowerCase().includes('tester'));

    const renderCards = (list, container) => {
        const groups = {};
        list.forEach(e => {
            // ضمان أن area دائماً مصفوفة
            const areas = Array.isArray(e.area) ? e.area : [e.area || 'Other'];
            areas.forEach(a => {
                if(!groups[a]) groups[a] = [];
                groups[a].push(e);
            });
        });

        Object.keys(groups).forEach(groupName => {
            const section = document.createElement('div');
            section.className = 'mb-6';
            section.innerHTML = `<h4 class="text-sm font-bold text-gray-500 mb-2 border-b pb-1 uppercase">${groupName}</h4>
                                 <div class="grid grid-cols-2 gap-2"></div>`;
            const grid = section.querySelector('div');
            
            groups[groupName].forEach(emp => {
                const card = document.createElement('div');
                // توحيد كلاس الإجازة مع الـ CSS
                const statusClass = emp.isVacation ? 'vacation-row border-red-200' : 'bg-white border-gray-200';
                card.className = `p-3 border rounded-lg shadow-sm ${statusClass} transition-all`;
                card.innerHTML = `
                    <div class="font-bold text-gray-800">${emp.name}</div>
                    <div class="text-xs text-gray-500">${emp.role}</div>
                    ${emp.isVacation ? `<div class="text-[10px] text-red-600 font-bold mt-1">ON VACATION UNTIL: ${emp.vacationEnd}</div>` : ''}
                `;
                grid.appendChild(card);
            });
            container.appendChild(section);
        });
    };

    renderCards(devs, devGrid);
    renderCards(testers, testGrid);
}

function renderTable() {
    const tbody = document.querySelector('#employeeTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    employees.forEach((emp, index) => {
        const row = document.createElement('tr');
        row.className = emp.isVacation ? 'vacation-row' : 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="p-4 border-b text-sm">${emp.name}</td>
            <td class="p-4 border-b text-sm">${emp.role}</td>
            <td class="p-4 border-b text-sm">${Array.isArray(emp.area) ? emp.area.join(', ') : emp.area}</td>
            <td class="p-4 border-b text-center admin-only">
                <button onclick="editEmployee(${index})" class="text-blue-600 hover:text-blue-800 mr-2"><i data-lucide="edit-2"></i></button>
                <button onclick="deleteEmployee(${index})" class="text-red-600 hover:text-red-800"><i data-lucide="trash-2"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// دالة حفظ الموظف الجديدة تضمن تحويل النص لمصفوفة
function saveEmployee() {
    const formData = {};
    fieldsConfig.forEach(f => {
        const val = document.getElementById(`field_${f.id}`).value;
        // تحويل الـ area و workingIn لمصفوفة عند الحفظ
        if(f.id === 'area' || f.id === 'workingIn') {
            formData[f.id] = val.split(',').map(item => item.trim());
        } else {
            formData[f.id] = val;
        }
    });
    
    formData.isVacation = document.getElementById('field_isVacation').checked;
    formData.vacationEnd = document.getElementById('field_vacationEnd').value;

    if (currentEditingIndex > -1) employees[currentEditingIndex] = formData;
    else employees.push(formData);

    closeModal();
    renderAll();
}
