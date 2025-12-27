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
            // فك التشفير مع دعم كامل للغة العربية (Base64 Safe)
            const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            
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
            if(manual) alert("Error syncing from GitHub");
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
        alert("Sync error: Missing Token or SHA. Please login again.");
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
        // تشفير يدعم العربية قبل التحويل لـ Base64
        const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(fullData, null, 2))));
        
        const response = await fetch(`https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubConfig.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Update Team Hub data: ${new Date().toLocaleString()}`,
                content: contentBase64,
                sha: githubConfig.sha,
                branch: githubConfig.branch
            })
        });

        if (response.ok) {
            const data = await response.json();
            githubConfig.sha = data.content.sha;
            console.log("Saved Successfully");
        } else {
            alert("Failed to save to Cloud. Checking for updates...");
            await loadFromGitHub(); // محاولة جلب الـ SHA الجديد في حال حدوث تضارب
        }
    } catch (err) {
        console.error("Save Error:", err);
    } finally {
        document.getElementById('loadingStatus').classList.add('hidden');
    }
}

async function checkLogin() {
    const userVal = document.getElementById('userInput').value.trim();
    const passVal = document.getElementById('passInput').value.trim();
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
