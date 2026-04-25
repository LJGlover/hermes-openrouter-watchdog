(function() {
    var SDK = window.__HERMES_PLUGIN_SDK__;
    var React = SDK.React;
    var Card = SDK.components.Card;
    var CardHeader = SDK.components.CardHeader;
    var CardTitle = SDK.components.CardTitle;
    var CardContent = SDK.components.CardContent;
    
    function WatchdogPage() {
        var [models, setModels] = React.useState([]);
        var [stats, setStats] = React.useState({count: 0, added: 0, removed: 0, stable: 0});
        var [changes, setChanges] = React.useState({added: [], removed: [], stable: []});
        var [history, setHistory] = React.useState([]);
        var [loading, setLoading] = React.useState(false);
        var [status, setStatus] = React.useState({text: 'Checking...', class: 'text-muted-foreground'});
        
        React.useEffect(function() {
            loadModels();
            loadHistory();
        }, []);
        
        function loadModels() {
            setLoading(true);
            fetch('/api/plugins/openrouter-model-watchdog/models')
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    if (data.success) {
                        setModels(data.models || []);
                        setStats({
                            count: data.count || 0,
                            added: data.changes.added.length,
                            removed: data.changes.removed.length,
                            stable: data.changes.stable.length
                        });
                        setChanges(data.changes || {added: [], removed: [], stable: []});
                        
                        if (!data.has_baseline) {
                            setStatus({text: '⚠️ No baseline set', class: 'text-yellow-600'});
                        } else if (data.changes.added.length > 0 || data.changes.removed.length > 0) {
                            setStatus({text: '🔔 Changes detected!', class: 'text-red-600'});
                        } else {
                            setStatus({text: '✅ All models stable', class: 'text-green-600'});
                        }
                    }
                    setLoading(false);
                })
                .catch(function(e) {
                    console.error('Failed to load models:', e);
                    setLoading(false);
                });
        }
        
        function setBaseline() {
            fetch('/api/plugins/openrouter-model-watchdog/baseline', {method: 'POST'})
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    if (data.success) {
                        alert('Baseline set successfully!');
                        loadModels();
                    }
                })
                .catch(function(e) { console.error('Failed:', e); });
        }
        
        function loadHistory() {
            fetch('/api/plugins/openrouter-model-watchdog/history')
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    if (data.success) {
                        setHistory(data.history || []);
                    }
                })
                .catch(function(e) { console.error('Failed to load history:', e); });
        }
        
        function formatContext(contextLength) {
            if (contextLength >= 1000000) return (contextLength / 1000000).toFixed(1) + 'M';
            if (contextLength >= 1000) return (contextLength / 1000).toFixed(0) + 'k';
            return contextLength + '';
        }
        
        return React.createElement(Card, null,
            React.createElement(CardHeader, null,
                React.createElement(CardTitle, null, '🐕 Model Watchdog')
            ),
            React.createElement(CardContent, null,
                React.createElement('div', {className: 'flex justify-between items-center mb-4'},
                    React.createElement('div', {className: 'text-sm ' + status.class}, status.text),
                    React.createElement('div', {className: 'flex gap-2'},
                        React.createElement('button', {
                            className: 'btn btn-sm btn-outline',
                            onClick: function() { loadModels(); }
                        }, 'Refresh 🔄'),
                        React.createElement('button', {
                            className: 'btn btn-sm btn-primary',
                            onClick: setBaseline
                        }, 'Set Baseline 📍')
                    )
                ),
                
                React.createElement('div', {className: 'grid grid-cols-4 gap-4 mb-6'},
                    React.createElement('div', {className: 'text-center'},
                        React.createElement('div', {className: 'text-2xl font-bold'}, stats.count),
                        React.createElement('div', {className: 'text-xs text-muted-foreground'}, 'Free Models')
                    ),
                    React.createElement('div', {className: 'text-center'},
                        React.createElement('div', {className: 'text-2xl font-bold text-green-600'}, stats.added),
                        React.createElement('div', {className: 'text-xs text-muted-foreground'}, 'Added')
                    ),
                    React.createElement('div', {className: 'text-center'},
                        React.createElement('div', {className: 'text-2xl font-bold text-red-600'}, stats.removed),
                        React.createElement('div', {className: 'text-xs text-muted-foreground'}, 'Removed')
                    ),
                    React.createElement('div', {className: 'text-center'},
                        React.createElement('div', {className: 'text-2xl font-bold'}, stats.stable),
                        React.createElement('div', {className: 'text-xs text-muted-foreground'}, 'Stable')
                    )
                ),
                
                changes.added.length > 0 || changes.removed.length > 0 ?
                    React.createElement('div', {className: 'mb-4'},
                        changes.added.length > 0 ?
                            React.createElement('div', {className: 'mb-2 p-2 bg-green-50 rounded'},
                                React.createElement('h4', {className: 'text-sm font-semibold mb-1'}, '✅ Added Models (' + changes.added.length + ')'),
                                changes.added.map(function(m) {
                                    return React.createElement('div', {key: m.id, className: 'text-xs'}, m.id);
                                })
                            ) : null,
                        changes.removed.length > 0 ?
                            React.createElement('div', {className: 'p-2 bg-red-50 rounded'},
                                React.createElement('h4', {className: 'text-sm font-semibold mb-1'}, '❌ Removed Models (' + changes.removed.length + ')'),
                                changes.removed.map(function(m) {
                                    return React.createElement('div', {key: m.id, className: 'text-xs'}, m.id);
                                })
                            ) : null
                    ) : null,
                
                React.createElement('div', {className: 'mb-4'},
                    React.createElement('h3', {className: 'text-sm font-semibold mb-2'}, 'Free Models Available'),
                    models.slice(0, 10).map(function(m) {
                        return React.createElement('div', {
                            key: m.id,
                            className: 'p-2 border rounded mb-1 flex justify-between'
                        },
                            React.createElement('span', {className: 'text-sm'}, m.name || m.id),
                            React.createElement('span', {className: 'text-xs text-muted-foreground'}, formatContext(m.context_length))
                        );
                    })
                ),
                
                React.createElement('div', null,
                    React.createElement('h3', {className: 'text-sm font-semibold mb-2'}, 'Change History'),
                    history.slice(-5).reverse().map(function(entry, idx) {
                        return React.createElement('div', {
                            key: idx,
                            className: 'text-xs p-1 border-b'
                        },
                            React.createElement('span', {className: 'text-muted-foreground'}, new Date(entry.timestamp).toLocaleString()),
                            entry.changes.added.length > 0 ?
                                React.createElement('span', {className: 'text-green-600 ml-2'}, '+' + entry.changes.added.length) : null,
                            entry.changes.removed.length > 0 ?
                                React.createElement('span', {className: 'text-red-600 ml-1'}, '-' + entry.changes.removed.length) : null
                        );
                    })
                )
            )
        );
    }
    
    window.__HERMES_PLUGINS__.register('openrouter-model-watchdog', WatchdogPage);
})();
