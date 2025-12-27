// --- Data Management & API Logic ---

async function loadFromGitHub(manual = false) {
    if (!githubConfig.token) { if (manual) alert("No Token provided!"); return false; }
    document.getElementById('loadingStatus').classList.remove('hidden');
    try {
        const url = `https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}?ref=${githubConfig.branch}`;
        const response = await fetch(url, { headers: { 'Authorization': `token ${githubConfig.token}` } });
        if (response.ok) {
            const data = await response.json();
            githubConfig.sha = data.sha;
            const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            
            // تحديث المتغيرات العالمية من الملف المستلم
            if (content.employees) employees = content.employees;
            if (content.fields) fieldsConfig = content.fields;
            if (content.users) { users = content.users; localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
            if (content.visibility) visibilityConfig = content.visibility;
            if (content.charts) chartsConfig = content.charts;
            
            renderAll(); // استدعاء دالة الرسم من ملف logic.js
            if(manual) alert("Sync Success!");
            return true;
        } else { throw new Error("Failed to fetch data"); }
    } catch (err) { 
        console.error(err); 
        if(manual) alert("Cloud Sync Failed. Check Token and Connection.");
        return false;
    } finally { document.getElementById('loadingStatus').classList.add('hidden'); }
}

async function syncToGitHub() {
    if (!githubConfig.token) return;
    const fullData = { 
        employees, 
        fields: fieldsConfig, 
        users, 
        visibility: visibilityConfig, 
        charts: chartsConfig, 
        timestamp: new Date().toISOString() 
    };
    try {
        const url = `https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}`;
        const body = { 
            message: "Update Data Hub", 
            content: btoa(unescape(encodeURIComponent(JSON.stringify(fullData, null, 2)))), 
            branch: githubConfig.branch, 
            sha: githubConfig.sha 
        };
        const response = await fetch(url, { 
            method: 'PUT', 
            headers: { 'Authorization': `token ${githubConfig.token}` }, 
            body: JSON.stringify(body) 
        });
        if (response.ok) { 
            const resData = await response.json(); 
            githubConfig.sha = resData.content.sha; 
        }
    } catch (err) { console.error(err); }
}

async function checkLogin() {
    const userVal = document.getElementById('userInput').value.trim().toLowerCase();
    const passVal = document.getElementById('passInput').value;
    const tokenVal = document.getElementById('ghTokenInput').value.trim();
    const rememberMe = document.getElementById('rememberMe').checked;
    
    if (!userVal || !passVal) { alert("Please enter username and password"); return; }
    
    githubConfig.token = tokenVal;
    const syncOk = await loadFromGitHub(false);
    
    if (syncOk) {
        const foundUser = users.find(u => u.username.toLowerCase() === userVal && u.password === passVal);
        if (foundUser) {
            if (rememberMe) localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: userVal, pass: passVal, token: tokenVal }));
            else localStorage.removeItem(STORAGE_KEY);
            
            currentUserRole = foundUser.role;
            document.body.setAttribute('data-user-role', currentUserRole);
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('mainContent').classList.remove('hidden');
            document.getElementById('displayRole').innerText = `${foundUser.username} (${foundUser.role})`;
            renderAll();
        } else {
            document.getElementById('loginError').innerText = "Access Denied: User not found in Cloud Database!";
            document.getElementById('loginError').classList.remove('hidden');
        }
    } else {
        document.getElementById('loginError').innerText = "GitHub Sync Failed! Invalid Token or Repo unreachable.";
        document.getElementById('loginError').classList.remove('hidden');
    }
}