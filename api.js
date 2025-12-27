// --- Data Management & API Logic ---
async function loadFromGitHub(manual = false) {
    if (!githubConfig.token) { if (manual) alert("No Token provided!"); return false; }
    const loadingEl = document.getElementById('loadingStatus');
    if(loadingEl) loadingEl.classList.remove('hidden');

    try {
        const url = `https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}?ref=${githubConfig.branch}`;
        const response = await fetch(url, { headers: { 'Authorization': `token ${githubConfig.token}` } });
        if (response.ok) {
            const data = await response.json();
            githubConfig.sha = data.sha;
            const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            
            employees = content.employees || [];
            fieldsConfig = content.fields || [];
            users = content.users || [];
            chartsConfig = content.charts || [];
            visibilityConfig = content.visibility || {};
            
            if(manual) { renderAll(); alert("Sync Success!"); }
            if(loadingEl) loadingEl.classList.add('hidden');
            return true;
        }
    } catch (err) { console.error(err); }
    if(loadingEl) loadingEl.classList.add('hidden');
    return false;
}

async function saveToGitHub() {
    if (!githubConfig.token) { alert("Token missing!"); return false; }
    const loadingEl = document.getElementById('loadingStatus');
    if(loadingEl) loadingEl.classList.remove('hidden');

    const contentObj = { employees, fields: fieldsConfig, users, charts: chartsConfig, visibility: visibilityConfig };
    const contentEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(contentObj, null, 2))));

    try {
        const response = await fetch(`https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}`, {
            method: 'PUT',
            headers: { 'Authorization': `token ${githubConfig.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: "Update Team Hub Data",
                content: contentEncoded,
                sha: githubConfig.sha,
                branch: githubConfig.branch
            })
        });
        if (response.ok) {
            const resData = await response.json();
            githubConfig.sha = resData.content.sha;
            if(loadingEl) loadingEl.classList.add('hidden');
            return true;
        }
    } catch (err) { console.error(err); }
    alert("Error saving to GitHub!");
    if(loadingEl) loadingEl.classList.add('hidden');
    return false;
}

async function checkLogin() {
    const userVal = document.getElementById('userInput').value;
    const passVal = document.getElementById('passInput').value;
    const tokenVal = document.getElementById('ghTokenInput').value;
    const remember = document.getElementById('rememberMe').checked;

    if (!userVal || !passVal || !tokenVal) { alert("Please fill all fields"); return; }
    
    githubConfig.token = tokenVal;
    const syncOk = await loadFromGitHub(false);
    
    if (syncOk) {
        const foundUser = users.find(u => u.username === userVal && u.password === passVal);
        if (foundUser) {
            currentUserRole = foundUser.role;
            document.body.setAttribute('data-user-role', currentUserRole);
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('mainContent').classList.remove('hidden');
            document.getElementById('displayRole').innerText = `${foundUser.username} (${foundUser.role})`;
            if (remember) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: userVal, pass: passVal, token: tokenVal }));
            }
            renderAll();
        } else { alert("Invalid Credentials!"); }
    }
}
