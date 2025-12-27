// --- Core Configuration & Constants ---
const githubConfig = { 
    repoPath: 'elmoatasemsaeed/NT_Team_HUB', 
    filePath: 'data.json',
    branch: 'main', 
    token: '', 
    sha: null 
};

const USERS_KEY = 'team_hub_users';
const STORAGE_KEY = 'rememberedUser';

let fieldsConfig = [];
let chartsConfig = [];
let employees = [];
let users = []; 
let visibilityConfig = {};
let currentUserRole = null;
