document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');

  // Handle Login Submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = document.getElementById('loginPassword').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn.innerHTML;
    
    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Accessing...</span> <i class="fa-solid fa-spinner fa-spin"></i>';
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Incorrect security password.');
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
});
