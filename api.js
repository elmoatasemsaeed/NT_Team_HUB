// --- Data Management & API Logic ---

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
            cache: 'no-store'
        });

        if (response.ok) {
            const data = await response.json();
            githubConfig.sha = data.sha;
            const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));
            
            employees = content.employees || [];
            fieldsConfig = content.fields || [];
            users = content.users || [];
            chartsConfig = content.charts || [];
            visibilityConfig = content.visibility || {};

            if (manual) alert("Data Refreshed Successfully!");
            return true;
        }
    } catch (e) {
        console.error("Load error:", e);
    } finally {
        if (loadingEl) loadingEl.classList.add('hidden');
    }
    return false;
}

async function saveToGitHub() {
    if (!githubConfig.token) return alert("Sync failed: No Token!");

    const content = {
        employees,
        fields: fieldsConfig,
        users,
        charts: chartsConfig,
        visibility: visibilityConfig
    };

    const b64Content = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));
    
    try {
        const url = `https://api.github.com/repos/${githubConfig.repoPath}/contents/${githubConfig.filePath}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Authorization': `token ${githubConfig.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `Update Team Hub: ${new Date().toLocaleString()}`,
                content: b64Content,
                sha: githubConfig.sha,
                branch: githubConfig.branch
            })
        });

        if (response.ok) {
            const data = await response.json();
            githubConfig.sha = data.content.sha;
            console.log("Saved successfully!");
            return true;
        } else {
            const err = await response.json();
            alert("Error saving: " + err.message);
        }
    } catch (e) {
        alert("Connection Error!");
    }
    return false;
}

async function checkLogin() {
    const userVal = document.getElementById('userInput').value;
    const passVal = document.getElementById('passInput').value;
    const tokenVal = document.getElementById('ghTokenInput').value;
    const remember = document.getElementById('rememberMe').checked;

    githubConfig.token = tokenVal;
    const success = await loadFromGitHub();

    if (success) {
        const foundUser = users.find(u => u.username === userVal && u.password === passVal);
        if (foundUser) {
            currentUserRole = foundUser.role;
            document.body.setAttribute('data-user-role', currentUserRole);
            document.getElementById('displayRole').innerText = `${foundUser.username} (${foundUser.role.toUpperCase()})`;
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('mainContent').classList.remove('hidden');

            if (remember) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: userVal, pass: passVal, token: tokenVal }));
            }
            renderAll();
        } else {
            document.getElementById('loginError').classList.remove('hidden');
            document.getElementById('loginError').innerText = "Invalid Username or Password!";
        }
    } else {
        alert("Failed to connect to GitHub. Please check Token and Repo.");
    }
}

function logout() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
}
