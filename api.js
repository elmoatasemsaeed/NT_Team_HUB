// --- Data Management & API Logic ---

async function loadFromGitHub(manual = false) {
    if (!githubConfig.token) { 
        if (manual) alert("No Token provided!"); 
        return false; 
    }
    document.getElementById('loadingStatus').classList.remove('hidden');
    try {
        const url = `https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}?ref=${githubConfig.branch}`;
        const response = await fetch(url, { 
            headers: { 'Authorization': `token ${githubConfig.token}` } 
        });
        
        if (response.ok) {
            const data = await response.json();
            githubConfig.sha = data.sha;
            // فك التشفير مع دعم اللغة العربية
            const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            
            // تحديث المتغيرات العامة من الملف
            employees = content.employees || [];
            fieldsConfig = content.fields || [];
            users = content.users || [];
            chartsConfig = content.charts || [];
            visibilityConfig = content.visibility || {};
            
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
            renderAll(); 
            if(manual) alert("Sync Success!");
            return true;
        } else {
            return false;
        }
    } catch (err) { 
        console.error("Sync Error:", err);
        return false;
    } finally { 
        document.getElementById('loadingStatus').classList.add('hidden'); 
    }
}

async function saveToGitHub() {
    if (!githubConfig.token || !githubConfig.sha) {
        alert("Sync error: Token or SHA missing. Please login again.");
        return;
    }
    
    document.getElementById('loadingStatus').classList.remove('hidden');
    const fullData = {
        employees,
        fields: fieldsConfig,
        users,
        visibility: visibilityConfig,
        charts: chartsConfig,
        timestamp: new Date().toISOString()
    };

    try {
        const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(fullData, null, 2))));
        const response = await fetch(`https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubConfig.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: "Update Team Hub Data",
                content: contentBase64,
                sha: githubConfig.sha,
                branch: githubConfig.branch
            })
        });

        if (response.ok) {
            const resData = await response.json();
            githubConfig.sha = resData.content.sha;
            alert("Changes saved successfully to Cloud!");
            renderAll();
        } else {
            alert("Failed to save. Check console for details.");
        }
    } catch (err) {
        console.error("Save error:", err);
    } finally {
        document.getElementById('loadingStatus').classList.add('hidden');
    }
}

async function checkLogin() {
    const userVal = document.getElementById('userInput').value.trim().toLowerCase();
    const passVal = document.getElementById('passInput').value;
    const tokenVal = document.getElementById('ghTokenInput').value.trim();
    const remember = document.getElementById('rememberMe').checked;
    
    if (!userVal || !passVal) { alert("Please enter credentials"); return; }
    
    githubConfig.token = tokenVal;
    const syncOk = await loadFromGitHub(false);
    
    if (syncOk) {
        const foundUser = users.find(u => u.username.toLowerCase() === userVal && u.password === passVal);
        if (foundUser) {
            currentUserRole = foundUser.role;
            document.body.setAttribute('data-user-role', currentUserRole);
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('mainContent').classList.remove('hidden');
            document.getElementById('displayRole').innerText = `${foundUser.username} (${foundUser.role})`;
            
            if (remember) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    user: userVal,
                    pass: passVal,
                    token: tokenVal
                }));
            }
            renderAll();
        } else {
            document.getElementById('loginError').innerText = "Invalid Username or Password!";
            document.getElementById('loginError').classList.remove('hidden');
        }
    } else {
        document.getElementById('loginError').innerText = "GitHub Sync Failed! Check Token.";
        document.getElementById('loginError').classList.remove('hidden');
    }
}
