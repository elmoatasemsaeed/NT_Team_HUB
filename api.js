// --- Data Management & API Logic ---

async function loadFromGitHub(manual = false) {
    if (!githubConfig.token) { 
        if (manual) alert("No Token provided!"); 
        return false; 
    }
    const loadingEl = document.getElementById('loadingStatus');
    if(loadingEl) loadingEl.classList.remove('hidden');

    try {
        const url = `https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}?ref=${githubConfig.branch}`;
        const response = await fetch(url, { 
            headers: { 'Authorization': `token ${githubConfig.token}` } 
        });
        
        if (response.ok) {
            const data = await response.json();
            githubConfig.sha = data.sha;
            
            // Safe Base64 Decoding for Arabic
            const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            
            employees = content.employees || [];
            fieldsConfig = content.fields || [];
            users = content.users || [];
            chartsConfig = content.charts || [];
            visibilityConfig = content.visibility || {};
            
            if(manual) {
                renderAll();
                alert("Sync Success!");
            }
            if(loadingEl) loadingEl.classList.add('hidden');
            return true;
        } else {
            if(manual) alert("Error syncing from GitHub. Check your settings.");
            if(loadingEl) loadingEl.classList.add('hidden');
            return false;
        }
    } catch (err) {
        console.error("Sync Error:", err);
        if(loadingEl) loadingEl.classList.add('hidden');
        return false;
    }
}

async function saveToGitHub() {
    if (!githubConfig.token) {
        alert("Token missing!");
        return false;
    }
    const loadingEl = document.getElementById('loadingStatus');
    if(loadingEl) loadingEl.classList.remove('hidden');

    const contentObj = { 
        employees, 
        fields: fieldsConfig, 
        users, 
        charts: chartsConfig, 
        visibility: visibilityConfig 
    };
    
    // Safe Base64 Encoding for Arabic
    const contentRaw = unescape(encodeURIComponent(JSON.stringify(contentObj, null, 2)));
    const contentBase64 = btoa(contentRaw);

    try {
        const url = `https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubConfig.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: `Update data: ${new Date().toISOString()}`,
                content: contentBase64,
                sha: githubConfig.sha,
                branch: githubConfig.branch
            })
        });

        if (response.ok) {
            const result = await response.json();
            githubConfig.sha = result.content.sha;
            if(loadingEl) loadingEl.classList.add('hidden');
            return true;
        } else {
            alert("Failed to save to GitHub. Check token permissions.");
            if(loadingEl) loadingEl.classList.add('hidden');
            return false;
        }
    } catch (err) {
        console.error("Save Error:", err);
        if(loadingEl) loadingEl.classList.add('hidden');
        return false;
    }
}

async function checkLogin() {
    const userVal = document.getElementById('userInput').value.trim();
    const passVal = document.getElementById('passInput').value.trim();
    const tokenVal = document.getElementById('ghTokenInput').value.trim();
    const remember = document.getElementById('rememberMe').checked;

    if (!userVal || !passVal || !tokenVal) { alert("Please fill all fields"); return; }
    
    githubConfig.token = tokenVal;
    const syncOk = await loadFromGitHub(false);
    
    if (syncOk) {
        const foundUser = users.find(u => u.username.toLowerCase() === userVal.toLowerCase() && u.password === passVal);
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
        document.getElementById('loginError').innerText = "GitHub Sync Failed! Check Token & Repo Path.";
        document.getElementById('loginError').classList.remove('hidden');
    }
}
