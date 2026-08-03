document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const showRegisterLink = document.getElementById('showRegister');
  const showLoginLink = document.getElementById('showLogin');

  // Toggle Forms
  showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    document.getElementById('authMessage').classList.add('hidden');
  });

  showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
    document.getElementById('authMessage').classList.add('hidden');
  });

  // Handle Login Submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn.innerHTML;
    
    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Signing In...</span> <i class="fa-solid fa-spinner fa-spin"></i>';
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed. Please check credentials.');
      }
      
      // Save details to LocalStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Update global state variables
      state.token = data.token;
      state.user = data.user;
      
      // Clear forms
      loginForm.reset();
      
      // Switch view
      updateAuthStateUI();
      
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHTML;
    }
  });

  // Handle Register Submission
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn.innerHTML;
    
    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Creating Account...</span> <i class="fa-solid fa-spinner fa-spin"></i>';
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }
      
      // Save details to LocalStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Update global state variables
      state.token = data.token;
      state.user = data.user;
      
      // Clear forms
      registerForm.reset();
      
      // Switch view
      updateAuthStateUI();
      
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHTML;
    }
  });
});
