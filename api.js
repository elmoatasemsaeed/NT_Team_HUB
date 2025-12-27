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
            fieldsConfig = content.fields || [];
            users = content.users || [];
            chartsConfig = content.charts || [];
            visibilityConfig = content.visibility || {};
            
            // تحديث الواجهة بالبيانات الجديدة
            renderAll();

            if (manual) alert("Data synchronized successfully from Cloud!");
            if (loadingEl) loadingEl.classList.add('hidden');
            return true;
        } else {
            const errData = await response.json();
            console.error("GitHub API Error:", errData);
            if (manual) alert("Error fetching data: " + (errData.message || "Unknown error"));
        }
    } catch (err) {
        console.error("Connection Error:", err);
        if (manual) alert("Network error while syncing with GitHub.");
    }

    if (loadingEl) loadingEl.classList.add('hidden');
    return false;
}

/**
 * حفظ البيانات الحالية إلى GitHub
 */
async function saveToGitHub() {
    if (!githubConfig.token) { 
        alert("GitHub Token is missing! Please login again."); 
        return false; 
    }

    const loadingEl = document.getElementById('loadingStatus');
    if (loadingEl) {
        loadingEl.innerText = "Saving to Cloud...";
        loadingEl.classList.remove('hidden');
    }

    try {
        const url = `https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}`;
        
        // تجهيز الكائن الذي سيتم حفظه
        const fullData = {
            employees,
            fields: fieldsConfig,
            users,
            charts: chartsConfig,
            visibility: visibilityConfig
        };

        // تحويل البيانات لنظام Base64 مع دعم النصوص العربية
        const jsonStr = JSON.stringify(fullData, null, 2);
        const encodedContent = btoa(unescape(encodeURIComponent(jsonStr)));

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubConfig.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update via Team Hub [${new Date().toLocaleString()}]`,
                content: encodedContent,
                sha: githubConfig.sha, // ضروري لتحديث ملف موجود
                branch: githubConfig.branch
            })
        });

        if (response.ok) {
            const resData = await response.json();
            githubConfig.sha = resData.content.sha; // تحديث الـ SHA الجديد
            if (loadingEl) loadingEl.classList.add('hidden');
            return true;
        } else {
            const errData = await response.json();
            alert("Save Failed: " + (errData.message || "Conflict or invalid token"));
        }
    } catch (err) {
        console.error("Save Error:", err);
        alert("Network error while saving.");
    }

    if (loadingEl) {
        loadingEl.innerText = "Syncing with GitHub...";
        loadingEl.classList.add('hidden');
    }
    return false;
}

/**
 * التحقق من تسجيل الدخول وصلاحيات المستخدم
 */
async function checkLogin() {
    const userVal = document.getElementById('userInput').value.trim();
    const passVal = document.getElementById('passInput').value.trim();
    const tokenVal = document.getElementById('ghTokenInput').value.trim();
    const remember = document.getElementById('rememberMe').checked;

    if (!userVal || !passVal || !tokenVal) {
        alert("Please enter Username, Password and GitHub Token");
        return;
    }

    // تعيين التوكن للاتصال بـ GitHub
    githubConfig.token = tokenVal;
    
    // محاولة جلب البيانات كاختبار للتوكن وصحة الاتصال
    const syncOk = await loadFromGitHub(false);
    
    if (syncOk) {
        // البحث عن المستخدم في القائمة المحملة من السحاب
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
