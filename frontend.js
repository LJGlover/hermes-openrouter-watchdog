/**
 * OpenRouter Free Model Watchdog Plugin - Frontend
 * Monitors free model availability and changes
 */

(function() {
    'use strict';
    
    const SDK = window.__HERMES_PLUGIN_SDK__;
    
    // Main render function
    function render(container) {
        container.innerHTML = `
            <div class="orw-plugin">
                <div class="orw-header">
                    <h2>🐕 Model Watchdog</h2>
                    <div class="orw-actions">
                        <button class="orw-btn" id="orw-refresh">Refresh 🔄</button>
                        <button class="orw-btn orw-btn-primary" id="orw-baseline">Set Baseline 📍</button>
                    </div>
                </div>
                
                <div class="orw-status" id="orw-status"></div>
                
                <div class="orw-stats" id="orw-stats"></div>
                
                <div class="orw-changes" id="orw-changes"></div>
                
                <div class="orw-models">
                    <h3>Free Models Available</h3>
                    <div class="orw-model-list" id="orw-model-list"></div>
                </div>
                
                <div class="orw-history">
                    <h3>Change History</h3>
                    <div class="orw-history-list" id="orw-history-list"></div>
                </div>
            </div>
        `;
        
        attachEventListeners();
        loadModels();
        loadHistory();
    }
    
    function attachEventListeners() {
        document.getElementById('orw-refresh').addEventListener('click', () => {
            loadModels();
            showNotification('Refreshing model list...', 'info');
        });
        
        document.getElementById('orw-baseline').addEventListener('click', setBaseline);
    }
    
    async function loadModels() {
        const statusEl = document.getElementById('orw-status');
        statusEl.innerHTML = '<p class="orw-loading">Loading models...</p>';
        
        try {
            const response = await fetch('/api/plugins/openrouter-watchdog/models');
            const data = await response.json();
            
            if (!data.success) {
                statusEl.innerHTML = `<p class="orw-error">Error: ${data.error}</p>`;
                return;
            }
            
            renderStatus(data);
            renderStats(data);
            renderChanges(data.changes);
            renderModels(data.models);
            
        } catch (error) {
            statusEl.innerHTML = `<p class="orw-error">Failed to load: ${error.message}</p>`;
        }
    }
    
    async function setBaseline() {
        const btn = document.getElementById('orw-baseline');
        btn.disabled = true;
        btn.textContent = 'Setting...';
        
        try {
            const response = await fetch('/api/plugins/openrouter-watchdog/baseline', {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                showNotification('Baseline set successfully! 📍', 'success');
                loadModels();
            } else {
                showNotification('Error: ' + data.error, 'error');
            }
        } catch (error) {
            showNotification('Failed: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Set Baseline 📍';
        }
    }
    
    async function loadHistory() {
        try {
            const response = await fetch('/api/plugins/openrouter-watchdog/history');
            const data = await response.json();
            
            if (data.success) {
                renderHistory(data.history);
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }
    
    function renderStatus(data) {
        const statusEl = document.getElementById('orw-status');
        const hasBaseline = data.has_baseline;
        const changes = data.changes;
        const hasChanges = changes.added.length > 0 || changes.removed.length > 0;
        
        let statusClass = 'orw-status-ok';
        let statusText = '✅ All models stable';
        
        if (!hasBaseline) {
            statusClass = 'orw-status-warning';
            statusText = '⚠️ No baseline set';
        } else if (hasChanges) {
            statusClass = 'orw-status-alert';
            statusText = '🔔 Changes detected!';
        }
        
        statusEl.innerHTML = `
            <div class="orw-status-badge ${statusClass}">
                ${statusText}
            </div>
            <p class="orw-timestamp">
                Last checked: ${new Date(data.current_timestamp).toLocaleString()}
            </p>
        `;
    }
    
    function renderStats(data) {
        const statsEl = document.getElementById('orw-stats');
        statsEl.innerHTML = `
            <div class="orw-stat">
                <span class="orw-stat-value">${data.count}</span>
                <span class="orw-stat-label">Free Models</span>
            </div>
            <div class="orw-stat">
                <span class="orw-stat-value">${data.changes.added.length}</span>
                <span class="orw-stat-label">Added</span>
            </div>
            <div class="orw-stat">
                <span class="orw-stat-value">${data.changes.removed.length}</span>
                <span class="orw-stat-label">Removed</span>
            </div>
            <div class="orw-stat">
                <span class="orw-stat-value">${data.changes.stable.length}</span>
                <span class="orw-stat-label">Stable</span>
            </div>
        `;
    }
    
    function renderChanges(changes) {
        const changesEl = document.getElementById('orw-changes');
        
        if (changes.added.length === 0 && changes.removed.length === 0) {
            changesEl.innerHTML = '';
            return;
        }
        
        changesEl.innerHTML = `
            ${changes.added.length > 0 ? `
                <div class="orw-change-section orw-added">
                    <h4>✅ Added Models (${changes.added.length})</h4>
                    ${changes.added.map(m => `
                        <div class="orw-change-item">
                            <span class="orw-model-id">${m.id}</span>
                            <span class="orw-context">${formatContext(m.context_length)}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            ${changes.removed.length > 0 ? `
                <div class="orw-change-section orw-removed">
                    <h4>❌ Removed Models (${changes.removed.length})</h4>
                    ${changes.removed.map(m => `
                        <div class="orw-change-item">
                            <span class="orw-model-id">${m.id}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        `;
    }
    
    function renderModels(models) {
        const listEl = document.getElementById('orw-model-list');
        
        if (models.length === 0) {
            listEl.innerHTML = '<p class="orw-empty">No free models found.</p>';
            return;
        }
        
        listEl.innerHTML = models.map(m => `
            <div class="orw-model-card">
                <div class="orw-model-header">
                    <span class="orw-model-name">${m.name}</span>
                    <span class="orw-model-id">${m.id}</span>
                </div>
                <div class="orw-model-details">
                    <span class="orw-detail">Context: ${formatContext(m.context_length)}</span>
                    <span class="orw-detail">Last checked: ${new Date(m.last_checked).toLocaleString()}</span>
                </div>
            </div>
        `).join('');
    }
    
    function renderHistory(history) {
        const historyEl = document.getElementById('orw-history-list');
        
        if (!history || history.length === 0) {
            historyEl.innerHTML = '<p class="orw-empty">No history yet.</p>';
            return;
        }
        
        historyEl.innerHTML = history.slice(-10).reverse().map(entry => {
            const date = new Date(entry.timestamp);
            const changes = entry.changes;
            const hasChanges = changes.added.length > 0 || changes.removed.length > 0;
            
            return `
                <div class="orw-history-item">
                    <span class="orw-history-date">${date.toLocaleString()}</span>
                    ${hasChanges ? `
                        <div class="orw-history-changes">
                            ${changes.added.length > 0 ? `<span class="orw-history-added">+${changes.added.length} added</span>` : ''}
                            ${changes.removed.length > 0 ? `<span class="orw-history-removed">-${changes.removed.length} removed</span>` : ''}
                        </div>
                    ` : '<span class="orw-history-stable">No changes</span>'}
                </div>
            `;
        }).join('');
    }
    
    function formatContext(contextLength) {
        if (contextLength >= 1000000) {
            return `${(contextLength / 1000000).toFixed(1)}M tokens`;
        } else if (contextLength >= 1000) {
            return `${(contextLength / 1000).toFixed(0)}k tokens`;
        }
        return `${contextLength} tokens`;
    }
    
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `orw-notification orw-notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Register with Hermes Plugin SDK
    if (SDK && SDK.registerPlugin) {
        SDK.registerPlugin('openrouter-model-watchdog', { render });
    }
    
    // Export for manual initialization
    window.OpenRouterWatchdogPlugin = { render };
})();
