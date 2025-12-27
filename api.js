// --- Data Management & API Logic ---

/**
 * تحميل البيانات من GitHub
 * @param {boolean} manual - هل الطلب يدوي (من زر التحديث) أم تلقائي عند الدخول
 */
async function loadFromGitHub(manual = false) {
    if (!githubConfig.token) { 
        if (manual) alert("No GitHub Token provided!"); 
        return false; 
    }

    const loadingEl = document.getElementById('loadingStatus');
    if (loadingEl) loadingEl.classList.remove('hidden');

    try {
        const url = `https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}?ref=${githubConfig.branch}`;
        const response = await fetch(url, { 
            headers: { 'Authorization': `token ${githubConfig.token}` },
            cache: 'no-store' // لضمان جلب أحدث بيانات دائماً
        });

        if (response.ok) {
            const data = await response.json();
            githubConfig.sha = data.sha; // تخزين الـ SHA الحالي لعملية الحفظ لاحقاً
            
            // فك التشفير والتعامل مع النصوص العربية بشكل صحيح
            const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            
            // تحديث المتغيرات العامة في التطبيق
            employees = content.employees || [];
            fieldsConfig = content.fields || []; // تحميل إعدادات الحقول والخيارات
            users = content.users || [];
            chartsConfig = content.charts || [];
            visibilityConfig = content.visibility || {};

            if (manual) alert("Data Refreshed Successfully!");
            return true;
        } else {
            if (manual) alert("Failed to load data. Please check Repo Path and Token.");
        }
    } catch (e) { 
        console.error("Load error:", e);
        if (manual) alert("Error connecting to GitHub.");
    } finally { 
        if (loadingEl) loadingEl.classList.add('hidden'); 
    }
    return false;
}

/**
 * حفظ البيانات والنسخ الاحتياطي إلى GitHub
 */
async function saveToGitHub() {
    const loadingEl = document.getElementById('loadingStatus');
    if (loadingEl) loadingEl.classList.remove('hidden');

    // تجميع الكائن الذي سيتم رفعه (يشمل الحقول والموظفين والإعدادات)
    const contentObj = {
        employees: employees,
        fields: fieldsConfig, // النسخة الاحتياطية للسيتاب (Backup)
        users: users,
        charts: chartsConfig,
        visibility: visibilityConfig
    };

    // تحويل الكائن إلى Base64 مع دعم العربية
    const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(contentObj, null, 2))));

    try {
        const url = `https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 
                'Authorization': `token ${githubConfig.token}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                message: `Update Fields & Data: ${new Date().toLocaleString()}`,
                content: contentBase64,
                sha: githubConfig.sha,
                branch: githubConfig.branch
            })
        });

        if (response.ok) {
            const data = await response.json();
            githubConfig.sha = data.content.sha; // تحديث الـ SHA الجديد بعد الحفظ
            return true;
        } else {
            const err = await response.json();
            alert("Save failed: " + (err.message || "Unknown error"));
        }
    } catch (e) { 
        console.error("Save error:", e);
        alert("Network error while saving to GitHub."); 
    } finally { 
        if (loadingEl) loadingEl.classList.add('hidden'); 
    }
    return false;
}

/**
 * التحقق من تسجيل الدخول
 */
async function checkLogin() {
    const userVal = document.getElementById('userInput').value;
    const passVal = document.getElementById('passInput').value;
    const tokenVal = document.getElementById('ghTokenInput').value;
    const remember = document.getElementById('rememberMe').checked;

    if (!userVal || !passVal || !tokenVal) {
        alert("Please fill all login fields!");
        return;
    }

    // إعداد التوكن لبدء التحميل
    githubConfig.token = tokenVal;

    const loaded = await loadFromGitHub();
    
    if (loaded) {
        // البحث عن المستخدم في البيانات التي تم تحميلها
        const foundUser = users.find(u => u.username === userVal && u.password === passVal);
        
        if (foundUser) {
            currentUserRole = foundUser.role; // 'admin' or 'viewer'
            
            // تطبيق الصلاحيات على الواجهة
            document.body.setAttribute('data-user-role', currentUserRole);
            document.getElementById('displayRole').innerText = `${foundUser.username} (${foundUser.role.toUpperCase()})`;
            
            // إخفاء شاشة الدخول وإظهار المحتوى
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('mainContent').classList.remove('hidden');

            // حفظ البيانات محلياً إذا تم اختيار "Remember me"
            if (remember) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    user: userVal,
                    pass: passVal,
                    token: tokenVal
                }));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }

            // تشغيل الرسوم البيانية والأيقونات
            renderAll();
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } else {
            document.getElementById('loginError').classList.remove('hidden');
            document.getElementById('loginError').innerText = "Invalid Username or Password!";
        }
    } else {
        alert("Login failed! Could not connect to GitHub. Please check your Token and Repo Path.");
    }
}

/**
 * تسجيل الخروج
 */
function logout() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
}
