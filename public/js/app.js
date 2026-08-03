// Global State
const state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user')) || null,
  activePanel: 'dashboardPanel',
  customApiKey: localStorage.getItem('openai_api_key') || null
};

// Global Notifications Utility
function showNotification(message, type = 'error', duration = 4000) {
  // Check if we are in auth or app layout
  const targetId = state.token ? 'profileMessage' : 'authMessage';
  const alertEl = document.getElementById(targetId);
  
  if (!alertEl) return;
  
  alertEl.className = `alert alert-${type === 'error' ? 'error' : 'success'}`;
  alertEl.textContent = message;
  alertEl.classList.remove('hidden');
  
  setTimeout(() => {
    alertEl.classList.add('hidden');
  }, duration);
}

// Check authorization headers helper
function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${state.token}`
  };
  if (state.customApiKey) {
    headers['x-openai-key'] = state.customApiKey;
  }
  return headers;
}

// Update UI elements based on auth state
function updateAuthStateUI() {
  const authContainer = document.getElementById('authContainer');
  const appContainer = document.getElementById('appContainer');
  
  if (state.token && state.user) {
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    
    // Update Profile Pills
    document.getElementById('userNamePill').textContent = state.user.username;
    document.getElementById('dashWelcomeName').textContent = state.user.username;
    
    const initials = state.user.username
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
      
    document.getElementById('userAvatarPill').textContent = initials;
    document.getElementById('userAvatarPillMobile').textContent = initials;
    
    // Check if custom API key is configured and toggle simulator warning in chat
    const simPill = document.getElementById('simulationPill');
    if (state.customApiKey) {
      simPill.classList.add('hidden');
    } else {
      simPill.classList.remove('hidden');
    }
    
    // Switch to active panel
    switchPanel(state.activePanel);
  } else {
    authContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
  }
}

// Switch between panels
function switchPanel(panelId) {
  state.activePanel = panelId;
  
  // Update sidebar links active class
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-target') === panelId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  
  // Toggle content panels
  document.querySelectorAll('.content-panel').forEach(panel => {
    if (panel.id === panelId) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });
  
  // Trigger panel-specific load routines
  if (panelId === 'dashboardPanel') {
    if (typeof loadDashboardData === 'function') loadDashboardData();
  } else if (panelId === 'chatPanel') {
    if (typeof initChatWorkspace === 'function') initChatWorkspace();
  } else if (panelId === 'profilePanel') {
    if (typeof loadProfileData === 'function') loadProfileData();
  } else if (panelId === 'settingsPanel') {
    if (typeof loadSettingsPanel === 'function') loadSettingsPanel();
  }
}

// LOGOUT Handler
function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  state.token = null;
  state.user = null;
  updateAuthStateUI();
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Render Date
  const dateOptions = { month: 'long', day: 'numeric', year: 'numeric' };
  document.getElementById('currentDateStr').textContent = new Date().toLocaleDateString('en-US', dateOptions);
  
  // Set default theme from localStorage
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.body.className = `theme-${savedTheme}`;
  
  // Navigation switchers
  document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('data-target');
      switchPanel(target);
      
      // Close mobile sidebar if open
      document.getElementById('sidebar').classList.remove('active');
    });
  });
  
  // Mobile menu toggle
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const sidebar = document.getElementById('sidebar');
  
  mobileToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('active');
  });
  
  // Close mobile sidebar on outer clicks
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 991 && sidebar.classList.contains('active')) {
      if (!sidebar.contains(e.target) && e.target !== mobileToggle) {
        sidebar.classList.remove('active');
      }
    }
  });
  
  // Logout click event
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    handleLogout();
  });
  
  // Initial Auth verification check
  updateAuthStateUI();
});
