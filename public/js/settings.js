// Populate profile form fields
function loadProfileData() {
  if (!state.user) return;
  
  document.getElementById('profileUsername').value = state.user.username;
  document.getElementById('profileEmail').value = state.user.email;
  
  document.getElementById('profileNameDisplay').textContent = state.user.username;
  document.getElementById('profileEmailDisplay').textContent = state.user.email;
  
  const initials = state.user.username
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
    
  document.getElementById('profileLargeAvatar').textContent = initials;
}

// Load Theme configurations & API Key inputs
function loadSettingsPanel() {
  const currentTheme = localStorage.getItem('theme') || 'dark';
  
  // Highlight active theme option card
  document.querySelectorAll('.theme-option-card').forEach(card => {
    if (card.getAttribute('data-theme') === currentTheme) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
  
  // Populate API key placeholder if configured
  const keyInput = document.getElementById('settingsApiKey');
  if (state.customApiKey) {
    keyInput.placeholder = 'sk-••••••••••••••••••••••••';
    keyInput.value = ''; // Don't expose key in plain text
  } else {
    keyInput.placeholder = 'sk-...';
    keyInput.value = '';
  }
}

// Handle Theme changes
function changeTheme(themeName) {
  document.body.className = `theme-${themeName}`;
  localStorage.setItem('theme', themeName);
  
  // Re-draw chart to adapt to theme color variables
  if (typeof usageChartInstance !== 'undefined' && usageChartInstance) {
    loadDashboardData();
  }
}

// DOM Setup
document.addEventListener('DOMContentLoaded', () => {
  const profileForm = document.getElementById('profileForm');
  const apiKeyForm = document.getElementById('apiKeyForm');
  const clearApiKeyBtn = document.getElementById('clearApiKeyBtn');
  const seedDataBtn = document.getElementById('seedDataBtn');
  
  // Theme selectors listeners
  document.querySelectorAll('.theme-option-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.theme-option-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      
      const theme = card.getAttribute('data-theme');
      changeTheme(theme);
    });
  });
  
  // Profile form submission
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('profileUsername').value.trim();
    const currentPassword = document.getElementById('profileCurrentPassword').value;
    const newPassword = document.getElementById('profileNewPassword').value;
    
    const submitBtn = profileForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Saving Changes...</span> <i class="fa-solid fa-spinner fa-spin"></i>';
      
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ username, currentPassword, newPassword })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile.');
      }
      
      // Update local credentials
      localStorage.setItem('user', JSON.stringify(data.user));
      state.user = data.user;
      
      // Update UI components
      updateAuthStateUI();
      loadProfileData();
      
      // Clear password fields
      document.getElementById('profileCurrentPassword').value = '';
      document.getElementById('profileNewPassword').value = '';
      
      showNotification('Profile updated successfully!', 'success');
      
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
  
  // API Key Submission
  apiKeyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const keyVal = document.getElementById('settingsApiKey').value.trim();
    const msgEl = document.getElementById('settingsApiMessage');
    
    if (keyVal === '') {
      msgEl.className = 'alert alert-error';
      msgEl.textContent = 'Please enter a valid OpenAI API key prefixing sk-.';
      msgEl.classList.remove('hidden');
      return;
    }
    
    // Save locally
    localStorage.setItem('openai_api_key', keyVal);
    state.customApiKey = keyVal;
    
    // Toggle simulator warning banner in Chat
    document.getElementById('simulationPill').classList.add('hidden');
    
    // Clear input & reset placeholder
    document.getElementById('settingsApiKey').value = '';
    document.getElementById('settingsApiKey').placeholder = 'sk-••••••••••••••••••••••••';
    
    msgEl.className = 'alert alert-success';
    msgEl.textContent = 'Custom OpenAI API Key configured successfully!';
    msgEl.classList.remove('hidden');
    
    setTimeout(() => {
      msgEl.classList.add('hidden');
    }, 4000);
  });
  
  // Clear API Key
  clearApiKeyBtn.addEventListener('click', () => {
    localStorage.removeItem('openai_api_key');
    state.customApiKey = null;
    
    // Toggle simulator warning banner in Chat
    document.getElementById('simulationPill').classList.remove('hidden');
    
    document.getElementById('settingsApiKey').placeholder = 'sk-...';
    document.getElementById('settingsApiKey').value = '';
    
    const msgEl = document.getElementById('settingsApiMessage');
    msgEl.className = 'alert alert-success';
    msgEl.textContent = 'Custom API Key cleared successfully.';
    msgEl.classList.remove('hidden');
    
    setTimeout(() => {
      msgEl.classList.add('hidden');
    }, 4000);
  });
  
  // Seed Mock Data
  seedDataBtn.addEventListener('click', async () => {
    const msgEl = document.getElementById('sandboxMessage');
    
    try {
      seedDataBtn.disabled = true;
      seedDataBtn.innerHTML = '<span>Seeding Database...</span> <i class="fa-solid fa-spinner fa-spin"></i>';
      
      const response = await fetch('/api/analytics/seed', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to seed simulation data.');
      }
      
      msgEl.className = 'alert alert-success';
      msgEl.textContent = data.message;
      msgEl.classList.remove('hidden');
      
    } catch (err) {
      msgEl.className = 'alert alert-error';
      msgEl.textContent = err.message;
      msgEl.classList.remove('hidden');
    } finally {
      seedDataBtn.disabled = false;
      seedDataBtn.innerHTML = '<i class="fa-solid fa-database"></i> Seed Usage Logs';
      setTimeout(() => {
        msgEl.classList.add('hidden');
      }, 5000);
    }
  });
});
