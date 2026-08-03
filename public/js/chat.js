let activeConversationId = null;

// Initialize Chat workspace
async function initChatWorkspace() {
  if (!state.token) return;
  await fetchConversations();
}

// Fetch and render conversation threads
async function fetchConversations() {
  try {
    const res = await fetch('/api/chat/conversations', {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) throw new Error('Failed to fetch threads.');
    
    const data = await res.json();
    renderConversationList(data.conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
  }
}

// Render Conversation list in sidebar
function renderConversationList(conversations) {
  const container = document.getElementById('chatListContainer');
  if (!container) return;
  
  if (!conversations || conversations.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p style="font-size: 0.8rem;">No active chat threads. Create one above!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = conversations.map(c => {
    const isActive = c.id === activeConversationId ? 'active' : '';
    return `
      <div class="chat-item ${isActive}" data-id="${c.id}" onclick="loadConversation('${c.id}')">
        <div class="chat-item-meta">
          <i class="fa-regular fa-message"></i>
          <span class="chat-item-title">${escapeHTML(c.title)}</span>
        </div>
        <div class="chat-item-actions">
          <button class="chat-action-btn rename" onclick="renameConversation(event, '${c.id}', '${escapeHTML(c.title)}')">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="chat-action-btn delete" onclick="deleteConversation(event, '${c.id}')">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Load messages for a conversation
async function loadConversation(id) {
  activeConversationId = id;
  
  // Highlight active item in sidebar
  document.querySelectorAll('.chat-item').forEach(item => {
    if (item.getAttribute('data-id') === id) {
      item.classList.add('active');
      const title = item.querySelector('.chat-item-title').textContent;
      document.getElementById('activeChatTitle').textContent = title;
    } else {
      item.classList.remove('active');
    }
  });
  
  try {
    const res = await fetch(`/api/chat/conversations/${id}/messages`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) throw new Error('Failed to load message history.');
    
    const data = await res.json();
    renderMessages(data.messages);
    
    // Clear textarea and enable text input
    const txtArea = document.getElementById('chatInputField');
    txtArea.value = '';
    txtArea.disabled = false;
    txtArea.placeholder = 'Message Kevin AI...';
    document.getElementById('charCounter').textContent = '0 characters';
    document.getElementById('chatSendBtn').disabled = true;
    
  } catch (error) {
    console.error('Error loading conversation:', error);
  }
}

// Render Messages inside Chat Log
function renderMessages(messages) {
  const container = document.getElementById('chatMessagesLog');
  if (!container) return;
  
  if (!messages || messages.length === 0) {
    container.innerHTML = `
      <div class="chat-welcome-state">
        <div class="welcome-icon">
          <i class="fa-solid fa-robot"></i>
        </div>
        <h2>Welcome to the Thread!</h2>
        <p>Type a prompt in the message box below to begin. Our responsive models support code highlighting and rich markdown formats.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = messages.map(m => {
    const isUser = m.role === 'user';
    const bodyHTML = isUser ? escapeHTML(m.content) : parseMarkdown(m.content);
    return `
      <div class="message ${m.role}">
        <div class="message-content">
          ${bodyHTML}
        </div>
      </div>
    `;
  }).join('');
  
  // Hook code copy buttons
  setupCopyCodeButtons();
  
  // Scroll to bottom
  scrollToBottom();
}

// Escape HTML utility
function escapeHTML(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Parse basic Markdown (headers, lists, bold, italics, code blocks)
function parseMarkdown(text) {
  let parsed = text;
  
  // Code Blocks matching ```lang\ncode\n```
  parsed = parsed.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const cleanedCode = escapeHTML(code.trim());
    const displayLang = lang || 'code';
    return `
      <div class="code-block-wrapper">
        <div class="code-block-header">
          <span>${displayLang.toUpperCase()}</span>
          <button class="copy-code-btn">
            <i class="fa-regular fa-copy"></i> Copy Code
          </button>
        </div>
        <pre><code class="language-${displayLang}">${cleanedCode}</code></pre>
      </div>
    `;
  });
  
  // Inline Code matching `code`
  parsed = parsed.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Headers (### Header)
  parsed = parsed.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  
  // Bold (**bold**)
  parsed = parsed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Italics (*italics*)
  parsed = parsed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Lists (- Item or * Item)
  parsed = parsed.replace(/^\s*[-*]\s+(.*$)/gim, '<li>$1</li>');
  // Wrap list items in <ul>
  parsed = parsed.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  
  return parsed;
}

// Attach listeners to Copy Code Buttons
function setupCopyCodeButtons() {
  document.querySelectorAll('.copy-code-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const codeWrapper = btn.closest('.code-block-wrapper');
      const codeEl = codeWrapper.querySelector('code');
      const textToCopy = codeEl.textContent;
      
      navigator.clipboard.writeText(textToCopy).then(() => {
        btn.innerHTML = '<i class="fa-solid fa-check" style="color: var(--alert-success-border)"></i> Copied!';
        setTimeout(() => {
          btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy Code';
        }, 2000);
      }).catch(err => {
        console.error('Copy failed:', err);
      });
    });
  });
}

function scrollToBottom() {
  const container = document.getElementById('chatMessagesLog');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

// Action: Create New Conversation
async function createNewConversation() {
  try {
    const res = await fetch('/api/chat/conversations', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title: 'New Conversation' })
    });
    
    const data = await res.json();
    
    await fetchConversations();
    loadConversation(data.conversation.id);
    
  } catch (error) {
    console.error('Error creating conversation:', error);
  }
}

// Action: Rename Conversation Title
async function renameConversation(e, id, oldTitle) {
  e.stopPropagation();
  const newTitle = prompt('Rename thread:', oldTitle);
  if (!newTitle || newTitle.trim() === '') return;
  
  try {
    const res = await fetch(`/api/chat/conversations/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title: newTitle.trim() })
    });
    
    if (res.ok) {
      await fetchConversations();
      if (activeConversationId === id) {
        document.getElementById('activeChatTitle').textContent = newTitle.trim();
      }
    }
  } catch (error) {
    console.error('Error renaming conversation:', error);
  }
}

// Action: Delete Conversation
async function deleteConversation(e, id) {
  e.stopPropagation();
  if (!confirm('Are you sure you want to delete this conversation thread?')) return;
  
  try {
    const res = await fetch(`/api/chat/conversations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (res.ok) {
      if (activeConversationId === id) {
        activeConversationId = null;
        document.getElementById('activeChatTitle').textContent = 'Start a Conversation';
        document.getElementById('chatMessagesLog').innerHTML = `
          <div class="chat-welcome-state">
            <div class="welcome-icon">
              <i class="fa-solid fa-robot"></i>
            </div>
            <h2>Choose a thread!</h2>
            <p>Select a thread in the sidebar or start a new chat to begin.</p>
          </div>
        `;
        document.getElementById('chatInputField').disabled = true;
        document.getElementById('chatInputField').placeholder = 'Select a conversation first...';
      }
      await fetchConversations();
    }
  } catch (error) {
    console.error('Error deleting conversation:', error);
  }
}

// Submit prompt to API
async function handleSendPrompt(e) {
  if (e) e.preventDefault();
  
  const txtArea = document.getElementById('chatInputField');
  const promptText = txtArea.value.trim();
  
  if (!promptText || !activeConversationId) return;
  
  // Disable fields during API call
  txtArea.value = '';
  txtArea.style.height = 'auto'; // Reset height
  txtArea.disabled = true;
  document.getElementById('chatSendBtn').disabled = true;
  document.getElementById('charCounter').textContent = '0 characters';
  
  const messagesLog = document.getElementById('chatMessagesLog');
  
  // Clear Welcome screen if showing
  const welcome = messagesLog.querySelector('.chat-welcome-state');
  if (welcome) welcome.remove();
  
  // 1. Append User Bubble
  messagesLog.insertAdjacentHTML('beforeend', `
    <div class="message user">
      <div class="message-content">${escapeHTML(promptText)}</div>
    </div>
  `);
  scrollToBottom();
  
  // 2. Append Loading Indicator
  messagesLog.insertAdjacentHTML('beforeend', `
    <div class="message assistant" id="chatTypingIndicator">
      <div class="message-content">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>
  `);
  scrollToBottom();
  
  try {
    const model = document.getElementById('chatModelSelect').value;
    
    const res = await fetch(`/api/chat/conversations/${activeConversationId}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content: promptText, model })
    });
    
    const data = await res.json();
    
    // Remove typing indicator
    const typing = document.getElementById('chatTypingIndicator');
    if (typing) typing.remove();
    
    if (!res.ok) throw new Error(data.error || 'Server error generating response.');
    
    // 3. Append Assistant response bubble
    messagesLog.insertAdjacentHTML('beforeend', `
      <div class="message assistant">
        <div class="message-content">${parseMarkdown(data.message.content)}</div>
      </div>
    `);
    
    setupCopyCodeButtons();
    scrollToBottom();
    
  } catch (err) {
    // Remove typing indicator
    const typing = document.getElementById('chatTypingIndicator');
    if (typing) typing.remove();
    
    messagesLog.insertAdjacentHTML('beforeend', `
      <div class="message assistant">
        <div class="message-content" style="color: var(--alert-error-border); border-color: var(--alert-error-border)">
          <i class="fa-solid fa-circle-exclamation"></i> ${err.message}
        </div>
      </div>
    `);
    scrollToBottom();
  } finally {
    txtArea.disabled = false;
    txtArea.placeholder = 'Message Kevin AI...';
    txtArea.focus();
  }
}

// DOM Setup
document.addEventListener('DOMContentLoaded', () => {
  const newChatBtn = document.getElementById('newChatBtn');
  const chatInputForm = document.getElementById('chatInputForm');
  const chatInputField = document.getElementById('chatInputField');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const modelSelect = document.getElementById('chatModelSelect');
  const toggleSidebarBtn = document.getElementById('toggleChatListBtn');
  const chatSidebar = document.getElementById('chatSidebar');
  
  // Set default model state in local storage
  const savedModel = localStorage.getItem('chat_model') || 'gpt-3.5-turbo';
  modelSelect.value = savedModel;
  
  modelSelect.addEventListener('change', () => {
    localStorage.setItem('chat_model', modelSelect.value);
  });
  
  // New chat event
  newChatBtn.addEventListener('click', createNewConversation);
  
  // Suggestion buttons click
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('welcome-suggest-btn')) {
      const promptText = e.target.getAttribute('data-prompt');
      chatInputField.value = promptText;
      chatInputField.dispatchEvent(new Event('input'));
      handleSendPrompt();
    }
  });
  
  // Text area dynamic resizing and send controls
  chatInputField.addEventListener('input', () => {
    const textLen = chatInputField.value.trim().length;
    document.getElementById('charCounter').textContent = `${textLen} characters`;
    
    // Toggle button active state
    chatSendBtn.disabled = textLen === 0;
    
    // Auto-adjust height
    chatInputField.style.height = 'auto';
    chatInputField.style.height = `${Math.min(chatInputField.scrollHeight, 120)}px`;
  });
  
  // Submit trigger (Enter submits, Shift+Enter adds newline)
  chatInputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (chatInputField.value.trim().length > 0) {
        handleSendPrompt();
      }
    }
  });
  
  // Form submission
  chatInputForm.addEventListener('submit', handleSendPrompt);
  
  // Mobile sidebar toggle
  toggleSidebarBtn.addEventListener('click', () => {
    chatSidebar.classList.toggle('active');
  });
  
  // Initially disable text input until a thread is loaded
  chatInputField.disabled = true;
  chatInputField.placeholder = 'Select a conversation first...';
});
