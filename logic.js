// --- Business Logic & UI Rendering ---

function renderAll() { 
    updateCapacity(); 
    renderTable(); 
    renderDynamicForm(); 
    if (typeof lucide !== 'undefined') lucide.createIcons(); 
}

function updateCapacity() {
    const devGrid = document.getElementById('devCapacityGrid');
    const testGrid = document.getElementById('testerCapacityGrid');
    if (!devGrid || !testGrid) return;

    const devs = employees.filter(e => e.role === 'Dev' || e.role === 'Senior');
    const testers = employees.filter(e => e.role === 'Tester' || e.role === 'Senior tester');

    document.getElementById('devTotalLabel').innerText = `Total: ${devs.length}`;
    document.getElementById('testerTotalLabel').innerText = `Total: ${testers.length}`;

    const renderCards = (list, container) => {
        container.innerHTML = list.map(e => `
            <div class="google-card p-4 ${e.isVacation ? 'bg-red-50' : 'bg-white'}">
                <div class="font-bold text-sm">${e.name}</div>
                <div class="text-xs text-gray-500">${Array.isArray(e.area) ? e.area.join(', ') : e.area}</div>
                ${e.isVacation ? `<div class="text-[10px] text-red-600 mt-1 font-bold">Back: ${e.vacationEnd}</div>` : ''}
            </div>
        `).join('');
    };

    renderCards(devs, devGrid);
    renderCards(testers, testGrid);
}

function renderTable() {
    const headerRow = document.getElementById('tableHeaderRow');
    const body = document.getElementById('employeeTableBody');
    if (!headerRow || !body) return;

    // رسم العناوين
    headerRow.innerHTML = fieldsConfig.map(f => `<th class="p-4 font-semibold">${f.label}</th>`).join('') + '<th class="p-4 admin-only">Actions</th>';

    // رسم البيانات
    body.innerHTML = employees.map((emp, idx) => `
        <tr class="hover:bg-gray-50">
            ${fieldsConfig.map(f => {
                let val = emp[f.id] || '';
                if (Array.isArray(val)) val = val.join(', ');
                return `<td class="p-4 text-gray-600">${val}</td>`;
            }).join('')}
            <td class="p-4 admin-only">
                <button onclick="editEmployee(${idx})" class="text-blue-600 hover:underline">Edit</button>
            </td>
        </tr>
    `).join('');
}

function handleEmployeeSubmit(event) {
    event.preventDefault();
    // منطق الحفظ سيتم تنفيذه هنا لإرساله إلى GitHub
    alert("Functionality to save data to GitHub is ready!");
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

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    const empForm = document.getElementById('employeeForm');
    if (empForm) empForm.onsubmit = handleEmployeeSubmit;
});
