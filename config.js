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

// متغيرات عامة سيتم تعبئتها من الـ API
let fieldsConfig = [];
let chartsConfig = [];
let employees = [];
let users = []; 
let visibilityConfig = {};
let currentUserRole = null;
let activeCharts = [];
let currentEditingFieldIndex = null;
let currentSort = { column: null, direction: 'asc' };
