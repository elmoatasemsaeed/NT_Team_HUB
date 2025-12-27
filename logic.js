// --- Business Logic & UI Rendering ---

function renderAll() { 
    updateCapacity(); 
    renderTable(); 
    renderDynamicForm(); // التأكد من وجود الحاوية أولاً
    if (typeof lucide !== 'undefined') lucide.createIcons(); 
}

function renderDynamicForm() {
    const container = document.getElementById('dynamicFieldsContainer');
    if (!container) return; // حل مشكلة الـ null الأولى
    
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

// أضف هذا السطر في نهاية ملف logic.js لربط الفورم بشكل صحيح
document.addEventListener('DOMContentLoaded', () => {
    const empForm = document.getElementById('employeeForm');
    if (empForm) {
        empForm.onsubmit = handleEmployeeSubmit;
    }
});
