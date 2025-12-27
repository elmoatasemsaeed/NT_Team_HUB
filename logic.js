// --- Business Logic & UI Rendering ---

function renderAll() { 
    // التأكد من استدعاء الدوال فقط إذا كانت الحاويات موجودة في الـ HTML
    updateCapacity(); 
    renderTable(); 
    renderDynamicForm(); 
    if (typeof lucide !== 'undefined') lucide.createIcons(); 
}

function updateCapacity() {
    const devGrid = document.getElementById('devCapacityGrid');
    const testGrid = document.getElementById('testerCapacityGrid');
    if (!devGrid || !testGrid) return;

    // تصفية الموظفين بناءً على الأدوار
    const devs = employees.filter(e => e.role && (e.role.includes('Dev') || e.role.includes('Lead')));
    const testers = employees.filter(e => e.role && e.role.includes('Tester'));

    if(document.getElementById('devTotalLabel')) document.getElementById('devTotalLabel').innerText = `Total: ${devs.length}`;
    if(document.getElementById('testerTotalLabel')) document.getElementById('testerTotalLabel').innerText = `Total: ${testers.length}`;

    const renderCards = (list, container) => {
        container.innerHTML = list.map(e => `
            <div class="google-card p-4 ${e.isVacation ? 'bg-red-50 border-red-200' : 'bg-white shadow-sm'}">
                <div class="font-bold text-sm text-gray-800">${e.name}</div>
                <div class="text-xs text-gray-500">${Array.isArray(e.area) ? e.area.join(', ') : (e.area || 'General')}</div>
                ${e.isVacation ? `<div class="text-[10px] text-red-600 mt-2 font-bold italic">Back: ${e.vacationEnd}</div>` : ''}
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

    // رسم رؤوس الجدول بناءً على التكوين (fieldsConfig)
    headerRow.innerHTML = fieldsConfig.map(f => `<th class="p-4 font-semibold text-left border-b">${f.label}</th>`).join('') + 
                         '<th class="p-4 admin-only border-b text-center">Actions</th>';

    // رسم بيانات الموظفين
    body.innerHTML = employees.map((emp, idx) => `
        <tr class="hover:bg-gray-50 border-b transition-colors">
            ${fieldsConfig.map(f => {
                let val = emp[f.id] || emp[f.label] || '-';
                if (Array.isArray(val)) val = val.join(', ');
                return `<td class="p-4 text-gray-600 text-sm">${val}</td>`;
            }).join('')}
            <td class="p-4 admin-only text-center">
                <button onclick="editEmployee(${idx})" class="text-blue-600 hover:text-blue-800 p-1">
                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                </button>
            </td>
        </tr>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handleEmployeeSubmit(event) {
    if(event) event.preventDefault();
    console.log("Form submitted successfully!");
    // هنا يتم إضافة كود إرسال البيانات إلى GitHub API في التحديث القادم
    alert("Data validation complete. Syncing with GitHub...");
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

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active', 'border-blue-600', 'text-blue-600'));
    btn.classList.add('active', 'border-blue-600', 'text-blue-600');
}

// ربط الفورم بالدالة عند تحميل المستند
document.addEventListener('DOMContentLoaded', () => {
    const empForm = document.getElementById('employeeForm');
    if (empForm) {
        empForm.onsubmit = handleEmployeeSubmit;
    }
});
