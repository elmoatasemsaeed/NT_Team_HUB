/**
 * Smart Automation Engine - 5-Hour Logic
 * Based on the reference guide provided.
 */

let uploadedCSVData = null;

// 1. تنظيف الأسماء وتحويلها
function cleanName(rawName) {
    if (!rawName) return "";
    return rawName.split('<')[0].trim();
}

// 2. محرك الجدولة الذكي (The 5-Hour Logic Engine)
function calculateFinishDate(startDateStr, effortHours) {
    if (!startDateStr || !effortHours) return null;
    
    let current = new Date(startDateStr);
    let remaining = parseFloat(effortHours);
    
    if (isNaN(remaining)) return null;

    while (remaining > 0) {
        // تخطي الجمعة (5) والسبت (6)
        if (current.getDay() === 5 || current.getDay() === 6) {
            current.setDate(current.getDate() + (current.getDay() === 5 ? 2 : 1));
            current.setHours(9, 0, 0, 0);
        }

        // ضبط وقت البداية ليكون 9 صباحاً كحد أدنى
        if (current.getHours() < 9) current.setHours(9, 0, 0, 0);
        
        // إذا كان الوقت الحالي بعد 8 مساءً، ننتقل لليوم التالي
        if (current.getHours() >= 20) {
            current.setDate(current.getDate() + 1);
            current.setHours(9, 0, 0, 0);
            continue;
        }

        // حساب الساعات المتبقية في نافذة اليوم (بحد أقصى 5 ساعات عمل أو حتى الساعة 8 مساءً)
        let workDayEnd = new Date(current);
        workDayEnd.setHours(20, 0, 0, 0);
        
        let hoursUntil8PM = (workDayEnd - current) / (1000 * 60 * 60);
        let hoursCanWorkToday = Math.min(5, hoursUntil8PM, remaining);

        current.setMilliseconds(current.getMilliseconds() + (hoursCanWorkToday * 60 * 60 * 1000));
        remaining -= hoursCanWorkToday;

        // إذا تبقى عمل، ننتقل لليوم التالي
        if (remaining > 0) {
            current.setDate(current.getDate() + 1);
            current.setHours(9, 0, 0, 0);
        }
    }
    return current;
}

// 3. معالجة سطر الـ CSV بناءً على القواعد
function processCSVRow(row) {
    const type = row["Work Item Type"];
    let finishDate = null;
    let assignee = "";

    switch(type) {
        case "User Story":
            if (row["Assigned To"]) {
                assignee = cleanName(row["Assigned To"]);
                let effort = row["Est Dev Effort"] || 0;
                finishDate = effort > 0 ? calculateFinishDate(row["Activated Date"], effort) : new Date();
                if (effort == 0) finishDate.setHours(20,0,0,0);
            } 
            else if (row["Assigned To Tester"]) {
                assignee = cleanName(row["Assigned To Tester"]);
                finishDate = calculateFinishDate(row["CustomResolvedDate"], row["Est Test Effort"]);
            }
            break;
        case "Task":
        case "Bug":
        case "Support Log":
            assignee = cleanName(row["Assigned To"]);
            finishDate = calculateFinishDate(row["Activated Date"], row["Original Estimation"]);
            break;
    }

    return { assignee, finishDate, id: row["ID"], title: row["Title"] };
}

// 4. دالة بدء المعالجة الرئيسية
// 4. دالة بدء المعالجة الرئيسية المحدثة
async function startAutomationProcess() {
    if (!uploadedCSVData) return;
    
    // إظهار تنبيه ببدء المعالجة الذكية
    if (typeof showToast === 'function') showToast("Starting Smart Process...");

    // إعداد البيانات وتصفير الحقول المخصصة للموظفين قبل التحديث
    employees.forEach(emp => {
        emp.f1766917553886 = ""; 
        emp.f1766929340598 = ""; 
    });

    const tasksPerEmployee = {};

    // معالجة كل سطر في ملف CSV المرفوع
    uploadedCSVData.forEach(row => {
        const result = processCSVRow(row);
        if (result.assignee && result.finishDate) {
            if (!tasksPerEmployee[result.assignee]) tasksPerEmployee[result.assignee] = [];
            tasksPerEmployee[result.assignee].push(result);
        }
    });

    // توزيع المهام على الموظفين وتحديد آخر موعد انتهاء
    for (let name in tasksPerEmployee) {
        let empTasks = tasksPerEmployee[name];
        empTasks.sort((a, b) => b.finishDate - a.finishDate);

        const top3 = empTasks.slice(0, 3);
        const taskStrings = top3.map(t => {
            const shortTitle = t.title ? t.title.split(' ').slice(0, 6).join(' ') : "Task";
            return `${t.id} ${shortTitle}`;
        });

        const employee = employees.find(e => e.name === name);
        if (employee) {
            employee.f1766917553886 = taskStrings.join(", ");
            employee.f1766929340598 = top3[0].finishDate.toISOString().slice(0, 16); 
        }
    }

    // المزامنة مع GitHub مع إضافة رسائل توضح حالة الـ Deployment
    const token = document.getElementById('ghTokenInput').value;
    if(!token) {
        alert("Please provide GitHub Token first!");
        return;
    }
    
    githubConfig.token = token; 

    // إظهار رسالة للمستخدم أن البيانات تُرفع الآن
    if (typeof showToast === 'function') showToast("Uploading data to GitHub...");

    const success = await syncToGitHub();

    if (success) {
        // رسالة توضح أن الرفع تم، وجارٍ انتظار معالجة GitHub (Deployment)
        if (typeof showToast === 'function') {
            showToast("Sync Successful! Waiting for GitHub Deployment (30s)...");
        }
        
        // تأخير إعادة التحميل لمدة 30 ثانية لضمان ظهور البيانات الجديدة
        setTimeout(() => {
            location.reload();
        }, 30000); 
    } else {
        alert("Sync Failed! Please check your Token or Internet connection.");
    }
}

async function syncProcessedDataToGitHub() {
    const token = document.getElementById('ghTokenInput').value;
    if(!token) {
        alert("Please provide GitHub Token first!");
        return;
    }
    
    githubConfig.token = token; 

    const success = await syncToGitHub(); 

    if (success) {
        if (typeof showToast === 'function') showToast("Process Completed & Cloud Updated!");
        setTimeout(() => location.reload(), 2000);
    } else {
        alert("Sync Failed! Please check your Token or Internet connection.");
    }
}

// معالجة ملف الـ CSV المرفوع
function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                uploadedCSVData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                
                const btn = document.getElementById('btnStartProcess');
                btn.disabled = false;
                btn.classList.remove('text-gray-400', 'cursor-not-allowed');
                btn.classList.add('text-emerald-700', 'hover:bg-emerald-50');
                
                if (typeof showToast === 'function') showToast("CSV Loaded Successfully");
            } catch (err) {
                console.error("Error reading CSV:", err);
                alert("Error reading CSV file.");
            }
        };
        reader.readAsBinaryString(file);
    }
}
// تم حذف القوس الزائد من هنا ليعمل الملف بشكل صحيح
