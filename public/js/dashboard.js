let usageChartInstance = null;

async function loadDashboardData() {
  if (!state.token) return;
  
  try {
    // 1. Fetch Stats Metrics
    const statsRes = await fetch('/api/analytics/stats', {
      headers: getAuthHeaders()
    });
    
    if (statsRes.status === 401) {
      handleLogout();
      return;
    }
    
    const stats = await statsRes.json();
    
    // Populate cards
    document.getElementById('statRequests').textContent = stats.totalRequests || 0;
    document.getElementById('statTokens').textContent = (stats.totalTokens || 0).toLocaleString();
    document.getElementById('statTime').textContent = `${stats.avgResponseTime || 0} ms`;
    
    // Retrieve model from localStorage or default
    const savedModel = localStorage.getItem('chat_model') || 'gpt-3.5-turbo';
    document.getElementById('statModel').textContent = savedModel;
    
    // 2. Fetch Usage History & Draw Chart
    const daysSelect = document.getElementById('chartPeriodSelect');
    const days = daysSelect ? daysSelect.value : 7;
    
    const historyRes = await fetch(`/api/analytics/history?days=${days}`, {
      headers: getAuthHeaders()
    });
    const history = await historyRes.json();
    
    renderUsageChart(history);
    
    // 3. Fetch Recent Activity (Conversations)
    const convsRes = await fetch('/api/chat/conversations', {
      headers: getAuthHeaders()
    });
    const convsData = await convsRes.json();
    
    renderRecentActivity(convsData.conversations);
    
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
  }
}

// Render Line Chart using Chart.js
function renderUsageChart(historyData) {
  const ctx = document.getElementById('usageChart');
  if (!ctx) return;
  
  // Destruct previous chart instance to avoid overlay glitches
  if (usageChartInstance) {
    usageChartInstance.destroy();
  }
  
  // Extract CSS variables for theme matching
  const styles = getComputedStyle(document.body);
  const textColor = styles.getPropertyValue('--text-secondary').trim() || '#94A3B8';
  const gridColor = styles.getPropertyValue('--border').trim() || 'rgba(255, 255, 255, 0.08)';
  const accentBlue = styles.getPropertyValue('--accent').trim() || '#2563EB';
  const accentCyan = styles.getPropertyValue('--accent-cyan').trim() || '#06B6D4';
  
  const labels = historyData.map(d => {
    const parts = d.date.split('-');
    return `${parts[1]}/${parts[2]}`; // MM/DD format
  });
  
  const tokenData = historyData.map(d => d.tokens);
  const requestData = historyData.map(d => d.requests);
  
  usageChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Tokens Used',
          data: tokenData,
          borderColor: accentCyan,
          backgroundColor: 'transparent',
          yAxisID: 'yTokens',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: accentCyan
        },
        {
          label: 'API Requests',
          data: requestData,
          borderColor: accentBlue,
          backgroundColor: 'transparent',
          yAxisID: 'yRequests',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: accentBlue
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { family: 'Inter', size: 11 }
          }
        },
        tooltip: {
          padding: 12,
          backgroundColor: styles.getPropertyValue('--bg-secondary').trim() || '#1E293B',
          titleColor: styles.getPropertyValue('--text-primary').trim() || '#F8FAFC',
          bodyColor: textColor,
          borderColor: gridColor,
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Inter', size: 10 } }
        },
        yTokens: {
          type: 'linear',
          position: 'left',
          grid: { color: gridColor },
          ticks: {
            color: accentCyan,
            font: { family: 'Inter', size: 10 },
            callback: value => value.toLocaleString()
          },
          title: {
            display: true,
            text: 'Tokens',
            color: accentCyan,
            font: { family: 'Inter', size: 10 }
          }
        },
        yRequests: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false }, // Avoid duplicate grid lines
          ticks: {
            color: accentBlue,
            font: { family: 'Inter', size: 10 }
          },
          title: {
            display: true,
            text: 'Requests',
            color: accentBlue,
            font: { family: 'Inter', size: 10 }
          }
        }
      }
    }
  });
}

// Render Recent Activity lists
function renderRecentActivity(conversations) {
  const container = document.getElementById('recentActivityList');
  if (!container) return;
  
  if (!conversations || conversations.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-comment-dots"></i>
        <p>No chat history available. Start a new chat to log data!</p>
      </div>
    `;
    return;
  }
  
  // Display up to 5 recent threads
  const recentList = conversations.slice(0, 5);
  const activeModel = localStorage.getItem('chat_model') || 'gpt-3.5-turbo';
  
  container.innerHTML = recentList.map(c => {
    const formattedDate = new Date(c.updatedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `
      <div class="activity-item" onclick="switchPanel('chatPanel'); loadConversation('${c.id}');">
        <div class="activity-avatar">
          <i class="fa-regular fa-comments"></i>
        </div>
        <div class="activity-details">
          <h5 class="activity-prompt">${c.title}</h5>
          <div class="activity-meta">
            <span><i class="fa-regular fa-clock"></i> ${formattedDate}</span>
            <span class="activity-badge">${activeModel}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Hook Period selector event listener
document.addEventListener('DOMContentLoaded', () => {
  const periodSelect = document.getElementById('chartPeriodSelect');
  if (periodSelect) {
    periodSelect.addEventListener('change', () => {
      loadDashboardData();
    });
  }
});
