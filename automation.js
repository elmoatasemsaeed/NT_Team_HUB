/**
 * Smart Automation Engine - 5-Hour Logic
 * Based on the reference guide provided.
 */

let uploadedCSVData = null;

// 1. تنظيف الأسماء وتحويلها
function cleanName(rawName) {
    if (!rawName) return "";
    // التأكد من تحويل القيمة إلى نص قبل عمل split
    const nameStr = String(rawName); 
    return nameStr.split('<')[0].trim();
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
// متغير لتخزين الإعدادات (يتم تحميله من JSON)
let azureSettings = { pat: "EvZprueAFS5OmjugVJsScDYXYRwyvVmNOuofTLSoEe9PB89hBYPsJQQJ99CAACAAAAAcrDqRAAASAZDO1XIe", queryId: "3bff197e-a88f-4263-9410-92b150d4497f", org: "NTDotNet", project: "LDM" };

// دالة فتح مودال الإعدادات
function openAzureSetupModal() {
    document.getElementById('azOrg').value = azureSettings.org || "";
    document.getElementById('azProject').value = azureSettings.project || "";
    document.getElementById('azQueryId').value = azureSettings.queryId || "";
    document.getElementById('azPat').value = azureSettings.pat || "";
    document.getElementById('azureSetupModal').classList.remove('hidden');
    lucide.createIcons();
}

function closeAzureSetupModal() {
    document.getElementById('azureSetupModal').classList.add('hidden');
}

// دالة حفظ الإعدادات ورفعها لـ GitHub
async function saveAzureSettings() {
    azureSettings.org = document.getElementById('azOrg').value;
    azureSettings.project = document.getElementById('azProject').value;
    azureSettings.queryId = document.getElementById('azQueryId').value;
    azureSettings.pat = document.getElementById('azPat').value;
    
    if(!azureSettings.pat || !azureSettings.org) return alert("Please fill at least PAT and Org");

    // نستخدم دالة المزامنة الأصلية لحفظ الإعدادات في data.json
    const success = await syncToGitHub(); 
    if(success) {
        showToast("Azure Settings Saved Successfully!");
        closeAzureSetupModal();
    }
}

// الدالة الرئيسية لجلب البيانات من Azure بعد تعديل الحقول لتطابق الكويري
async function fetchFromAzure() {
    if (!azureSettings.pat || !azureSettings.org) {
        alert("Please configure Azure Settings first (PAT, Org, Project).");
        openAzureSetupModal();
        return;
    }

    if (typeof showToast === 'function') showToast("Connecting to Azure DevOps...");
    
    try {
        const authHeader = 'Basic ' + btoa(':' + azureSettings.pat);
        
        // 1. تنفيذ الكويري للحصول على الـ IDs
        // ملاحظة: بما أنها Link Query، سنحصل على علاقات (relations)
        const queryUrl = `https://dev.azure.com/${azureSettings.org}/${azureSettings.project}/_apis/wit/wiql/${azureSettings.queryId}?api-version=6.0`;
        const queryRes = await fetch(queryUrl, { headers: { 'Authorization': authHeader } });
        
        if (!queryRes.ok) throw new Error("Azure Query Failed. Check PAT and Org name.");
        const queryData = await queryRes.json();

        // استخراج الـ IDs الفريدة من علاقات الكويري (Source and Target)
        let ids = [];
        if (queryData.workItemRelations) {
            const allIds = new Set();
            queryData.workItemRelations.forEach(rel => {
                if (rel.source) allIds.add(rel.source.id);
                if (rel.target) allIds.add(rel.target.id);
            });
            ids = Array.from(allIds);
        } else if (queryData.workItems) {
            ids = queryData.workItems.map(wi => wi.id);
        }

        if (ids.length === 0) return showToast("No items found in Azure Query.");

        // 2. جلب تفاصيل الـ Work Items بناءً على الحقول الموجودة في الكويري الخاصة بك
        const batchUrl = `https://dev.azure.com/${azureSettings.org}/${azureSettings.project}/_apis/wit/workitemsbatch?api-version=6.0`;
        const batchRes = await fetch(batchUrl, {
            method: 'POST',
            headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ids: ids,
                fields: [
                    "System.Id",
                    "System.WorkItemType",
                    "System.Title",
                    "System.AssignedTo",
                    "System.State",
                    "Microsoft.VSTS.Common.ActivatedDate",
                    "MyCompany.MyProcess.EstDevEffort",
                    "MyCompany.MyProcess.EstTestEffort",
                    "MyCompany.MyProcess.Tester",
                    "Custom.CustomResolvedDate",
                    "NT.OriginalEstimation"
                ]
            })
        });

        const batchData = await batchRes.json();

      // ... داخل دالة fetchFromAzure بعد سطر batchData.value.map ...

        uploadedCSVData = batchData.value.map(item => {
            const f = item.fields;
            return {
                "ID": item.id,
                "Work Item Type": f["System.WorkItemType"],
                "Title": f["System.Title"],
                "Assigned To": f["System.AssignedTo"] ? (f["System.AssignedTo"].displayName || f["System.AssignedTo"]) : "",
                "State": f["System.State"],
                "Activated Date": f["Microsoft.VSTS.Common.ActivatedDate"] || "",
                "Est Dev Effort": f["MyCompany.MyProcess.EstDevEffort"] || 0,
                "Est Test Effort": f["MyCompany.MyProcess.EstTestEffort"] || 0,
                "Assigned To Tester": f["MyCompany.MyProcess.Tester"] || "", // تعديل المسمى ليتوافق مع Logic المعالجة
                "CustomResolvedDate": f["Custom.CustomResolvedDate"] || "", // تعديل المسمى ليتوافق مع Logic المعالجة
                "Original Estimation": f["NT.OriginalEstimation"] || 0
            };
        });

        showToast(`Ready! Fetched ${uploadedCSVData.length} items from Azure.`);

        // إضافة هذا السطر لتشغيل المعالجة فوراً وإظهار البيانات
        await startAutomationProcess();

        // 4. تفعيل زر البدء وتحديث الواجهة
        const btn = document.getElementById('btnStartProcess');
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('text-gray-400', 'cursor-not-allowed');
            btn.classList.add('text-emerald-700', 'hover:bg-emerald-50');
        }
        
        showToast(`Ready! Fetched ${uploadedCSVData.length} items from Azure.`);
        
    } catch (error) {
        console.error("Detailed Error:", error);
        alert("Azure Error: " + error.message);
    }
}
