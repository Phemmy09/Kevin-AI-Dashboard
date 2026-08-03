const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const DB = require('../db');
const { verifyToken } = require('./auth');

// Helper to simulate smart AI responses in case of API Key failure
function getMockAIResponse(userPrompt, model) {
  const prompt = userPrompt.toLowerCase();
  
  let content = '';
  
  if (prompt.includes('code') || prompt.includes('program') || prompt.includes('write a function') || prompt.includes('javascript') || prompt.includes('html') || prompt.includes('css')) {
    content = `Here is an example of a modern, premium card design using **HTML & CSS variables** to support theme switching dynamically. 

### 1. HTML Structure
\`\`\`html
<div class="card glassmorphism">
  <div class="card-badge">New Feature</div>
  <h3 class="card-title">AI Assistant Console</h3>
  <p class="card-description">Experience lightning-fast response times and token tracking dashboard tools.</p>
  <button id="actionBtn" class="btn btn-primary">Launch Console</button>
</div>
\`\`\`

### 2. Styling (CSS)
\`\`\`css
/* CSS custom design tokens */
:root {
  --bg-card: rgba(30, 41, 59, 0.7);
  --border-card: rgba(255, 255, 255, 0.08);
  --text-primary: #F8FAFC;
  --accent-cyan: #06B6D4;
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border-card);
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease, border-color 0.3s ease;
}

.card:hover {
  transform: translateY(-4px);
  border-color: var(--accent-cyan);
}
\`\`\`

### 3. Logic (JavaScript)
\`\`\`javascript
// Smooth interactive micro-animations
const button = document.getElementById('actionBtn');
button.addEventListener('mouseenter', () => {
  button.style.boxShadow = '0 0 15px var(--accent-cyan)';
});
button.addEventListener('mouseleave', () => {
  button.style.boxShadow = 'none';
});
\`\`\`

You can copy this into your project. Since your OpenAI API key was not configured or is currently invalid, I am running in **Developer Simulation Mode**. You can input a custom OpenAI API Key in the **Settings** page to connect to live models.`;
  } else if (prompt.includes('help') || prompt.includes('explain') || prompt.includes('what is') || prompt.includes('how to')) {
    content = `### How to use Kevin AI Dashboard

1. **Dashboard Overview**: Check aggregate metrics such as total requests, token counts, and API response speeds.
2. **AI Chat**: Engage in thread-based conversations with model selections. Features markdown rendering and code copying.
3. **Settings Panel**:
   - Customize color themes (Dark Slate, Light, Cyberpunk).
   - Enter your own **OpenAI API Key** to switch from *Simulation Mode* to live models.
   - Toggle simulated logs to test analytics.

*Note: You are currently chatting in **Simulation Mode** because a valid OpenAI API key was not found. If you add your key in Settings, chats will connect directly to OpenAI's servers.*`;
  } else {
    content = `Hello! I am **Kevin AI**, your assistant.

I am currently running in **Simulation Mode** because your OpenAI API key is missing or invalid. I can still simulate conversation history and analytics, and help you check the layout:

- **Bullet lists** are supported.
- **Bold text** and *italics* display cleanly.
- Code blocks render with copy-to-clipboard options.

To get live responses, simply configure a valid \`OPENAI_API_KEY\` in your environment or enter one in the **Settings** tab. What would you like to build today?`;
  }

  // Generate random token usage and response time
  const promptTokens = Math.floor(userPrompt.length / 4) + 5;
  const completionTokens = Math.floor(content.length / 4) + 15;
  const totalTokens = promptTokens + completionTokens;
  const responseTime = Math.floor(Math.random() * 800) + 600; // 600ms - 1400ms

  return {
    content,
    tokens: totalTokens,
    responseTime,
    mode: 'simulation'
  };
}

// GET all conversations
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const list = await DB.Conversation.listByUserId(req.user.id);
    res.status(200).json({ conversations: list });
  } catch (error) {
    console.error('Fetch conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
});

// CREATE a conversation
router.post('/conversations', verifyToken, async (req, res) => {
  try {
    const { title } = req.body;
    const newTitle = title || 'New Conversation';
    const conv = await DB.Conversation.create(req.user.id, newTitle);
    res.status(201).json({ conversation: conv });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation.' });
  }
});

// RENAME conversation
router.put('/conversations/:id', verifyToken, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    await DB.Conversation.rename(req.params.id, req.user.id, title);
    res.status(200).json({ message: 'Conversation renamed successfully' });
  } catch (error) {
    console.error('Rename conversation error:', error);
    res.status(500).json({ error: 'Failed to rename conversation.' });
  }
});

// DELETE conversation
router.delete('/conversations/:id', verifyToken, async (req, res) => {
  try {
    await DB.Conversation.delete(req.params.id, req.user.id);
    res.status(200).json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation.' });
  }
});

// GET messages for a conversation
router.get('/conversations/:id/messages', verifyToken, async (req, res) => {
  try {
    // Verify conversation belongs to user
    const conversations = await DB.Conversation.listByUserId(req.user.id);
    const belongsToUser = conversations.some(c => c.id === req.params.id);
    
    if (!belongsToUser) {
      return res.status(403).json({ error: 'Unauthorized to view these messages.' });
    }
    
    const messages = await DB.Message.listByConversationId(req.params.id);
    res.status(200).json({ messages });
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// POST message (Send prompt to AI)
router.post('/conversations/:id/messages', verifyToken, async (req, res) => {
  const startTime = Date.now();
  try {
    const { content, model } = req.body;
    const activeModel = model || 'gpt-3.5-turbo';
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required.' });
    }
    
    // 1. Verify conversation ownership
    const conversations = await DB.Conversation.listByUserId(req.user.id);
    const belongsToUser = conversations.some(c => c.id === req.params.id);
    if (!belongsToUser) {
      return res.status(403).json({ error: 'Unauthorized conversation access.' });
    }
    
    // Save User Message
    await DB.Message.create(req.params.id, 'user', content, 0, activeModel);
    
    // Get API Key (either custom header or env variable)
    const customApiKey = req.headers['x-openai-key'];
    const apiKey = customApiKey || process.env.OPENAI_API_KEY;
    
    let aiResponse = '';
    let tokensUsed = 0;
    let isMock = false;
    
    // Verify if it's a dummy key
    const isDummyKey = !apiKey || apiKey.startsWith('sk-uis-') || apiKey === 'YOUR_OPENAI_API_KEY';
    
    if (isDummyKey) {
      // Simulate response for placeholder keys
      const mockResult = getMockAIResponse(content, activeModel);
      aiResponse = mockResult.content;
      tokensUsed = mockResult.tokens;
      isMock = true;
      
      // Delay simulated response to feel realistic
      await new Promise(resolve => setTimeout(resolve, mockResult.responseTime));
    } else {
      try {
        const openai = new OpenAI({ apiKey });
        
        const response = await openai.chat.completions.create({
          model: activeModel,
          messages: [{ role: 'user', content }]
        });
        
        aiResponse = response.choices[0].message.content;
        tokensUsed = response.usage.total_tokens;
      } catch (apiError) {
        console.warn('OpenAI API call failed, falling back to mock response:', apiError.message);
        // Fallback to mock on API errors
        const mockResult = getMockAIResponse(content, activeModel);
        aiResponse = mockResult.content + `\n\n*(Note: Connected to OpenAI failed due to: ${apiError.message})*`;
        tokensUsed = mockResult.tokens;
        isMock = true;
        
        await new Promise(resolve => setTimeout(resolve, mockResult.responseTime));
      }
    }
    
    const responseTime = Date.now() - startTime;
    
    // Save AI Message
    const savedMsg = await DB.Message.create(req.params.id, 'assistant', aiResponse, tokensUsed, activeModel);
    
    // Log to Analytics database
    await DB.Analytics.logRequest(req.user.id, tokensUsed, responseTime);
    
    res.status(200).json({
      message: savedMsg,
      isMock,
      stats: { tokensUsed, responseTime }
    });
    
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to process AI message.' });
  }
});

module.exports = router;
