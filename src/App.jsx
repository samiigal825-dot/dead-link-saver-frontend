import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  const [links, setLinks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [countdown, setCountdown] = useState(30);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Fetch all data (links and incident logs)
  const fetchData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    setError(null);
    try {
      const linksRes = await fetch(`${API_URL}/api/links`);
      if (!linksRes.ok) throw new Error('Failed to fetch monitors');
      const linksData = await linksRes.json();
      setLinks(linksData);

      const logsRes = await fetch(`${API_URL}/api/logs`);
      if (!logsRes.ok) throw new Error('Failed to fetch incident logs');
      const logsData = await logsRes.json();
      setLogs(logsData);

      setCountdown(30);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Connection to backend failed. Please ensure the backend server is running.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    const refreshInterval = setInterval(() => {
      fetchData(true);
    }, 30000);

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 30));
    }, 1000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(countdownInterval);
    };
  }, []);

  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_URL}/api/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim(), url: url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add link');
      }

      setSuccess(`Successfully added monitor for "${name}"`);
      setName('');
      setUrl('');
      fetchData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLink = async (id, monitorName) => {
    if (!window.confirm(`Are you sure you want to stop monitoring "${monitorName}"?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_URL}/api/links/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete link');
      }

      setSuccess(`Stopped monitoring "${monitorName}"`);
      fetchData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTriggerCheck = async () => {
    setIsRefreshing(true);
    setError(null);
    setSuccess(null);
    try {
      const secret = prompt('Enter Cron Secret passphrase:', 'super_secret_cron_passphrase') || '';
      const res = await fetch(`${API_URL}/api/cron/check?secret=${encodeURIComponent(secret)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Manual check failed');
      }
      
      const summary = data.summary;
      setSuccess(`Check Complete! Total: ${summary.total}, Checked: ${summary.checked}, Failed: ${summary.failed}`);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Stats calculation
  const totalLinks = links.length;
  const upLinks = links.filter((l) => l.status === 'UP').length;
  const downLinks = links.filter((l) => l.status === 'DOWN').length;
  const avgLatency = links.length > 0 && links.filter(l => l.response_time > 0).length > 0
    ? Math.round(links.filter(l => l.response_time > 0).reduce((acc, curr) => acc + curr.response_time, 0) / links.filter(l => l.response_time > 0).length)
    : 0;

  const filteredLinks = links.filter(link => 
    link.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    link.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLogs = logs.filter(log => 
    log.link_name.toLowerCase().includes(logSearchQuery.toLowerCase()) || 
    log.error_message?.toLowerCase().includes(logSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex font-sans antialiased">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#09090b] border-r border-[#27272a]/60 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-[#27272a]/60 gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-black" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-wide bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            LinkSentinel
          </span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-zinc-800/60 text-white border border-zinc-700/50 shadow-inner'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/30 border border-transparent'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
            Overview
          </button>

          <button
            onClick={() => setActiveTab('monitors')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'monitors'
                ? 'bg-zinc-800/60 text-white border border-zinc-700/50 shadow-inner'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/30 border border-transparent'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Monitors
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'logs'
                ? 'bg-zinc-800/60 text-white border border-zinc-700/50 shadow-inner'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/30 border border-transparent'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Incident Logs
          </button>

          <button
            onClick={() => setActiveTab('integrations')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'integrations'
                ? 'bg-zinc-800/60 text-white border border-zinc-700/50 shadow-inner'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/30 border border-transparent'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            Integrations
          </button>
        </nav>

        <div className="p-4 border-t border-[#27272a]/60">
          <div className="flex items-center gap-3 bg-zinc-900/50 rounded-xl p-2.5 border border-zinc-800">
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 font-bold text-xs uppercase">
              LS
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-300">Live User</div>
              <div className="text-[10px] text-zinc-500">Free Tier Account</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className="h-16 border-b border-[#27272a]/60 bg-[#09090b] flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <div className="text-sm text-zinc-400 font-medium capitalize">
              {activeTab === 'dashboard' ? 'Overview' : activeTab}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 px-3 py-1.5 rounded-lg">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>Syncs in {countdown}s</span>
            </div>

            <button 
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="px-3 py-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-lg transition-colors border border-zinc-800 flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.306 7M7 9h8V1v8z" />
              </svg>
              Refresh
            </button>

            <button
              onClick={handleTriggerCheck}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/25"
            >
              Run Check
            </button>
          </div>
        </header>

        {/* Dynamic Views */}
        <div className="p-8 overflow-y-auto flex-1">
          {/* Notifications */}
          {error && (
            <div className="mb-6 p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-red-300 text-sm flex gap-3 items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-emerald-300 text-sm flex gap-3 items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          {/* VIEW: OVERVIEW DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-white">System Status Overview</h2>
                <p className="text-sm text-zinc-500">Live health analytics of all registered services.</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 hover:border-zinc-700/60 transition-all flex flex-col justify-between">
                  <span className="text-zinc-500 font-semibold text-xs tracking-wider uppercase">Monitored Services</span>
                  <span className="text-3xl font-bold mt-4 text-white font-mono">{totalLinks}</span>
                </div>
                <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 hover:border-zinc-700/60 transition-all flex flex-col justify-between">
                  <span className="text-emerald-500 font-semibold text-xs tracking-wider uppercase">Healthy (UP)</span>
                  <span className="text-3xl font-bold mt-4 text-emerald-400 font-mono">{upLinks}</span>
                </div>
                <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 hover:border-zinc-700/60 transition-all flex flex-col justify-between">
                  <span className="text-red-500 font-semibold text-xs tracking-wider uppercase">Outages (DOWN)</span>
                  <span className="text-3xl font-bold mt-4 text-red-400 font-mono">{downLinks}</span>
                </div>
                <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 hover:border-zinc-700/60 transition-all flex flex-col justify-between">
                  <span className="text-indigo-500 font-semibold text-xs tracking-wider uppercase">Avg Latency</span>
                  <span className="text-3xl font-bold mt-4 text-indigo-400 font-mono">{avgLatency ? `${avgLatency}ms` : 'N/A'}</span>
                </div>
              </div>

              {/* Layout split */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Quick Add Monitor */}
                <div className="p-6 bg-zinc-900/20 border border-zinc-800/80 rounded-2xl">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-4">Quick Add Link</h3>
                  <form onSubmit={handleAddLink} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Link Label"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-zinc-700 transition-all placeholder:text-zinc-700"
                      />
                    </div>
                    <div>
                      <input
                        type="url"
                        required
                        placeholder="https://example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-zinc-700 transition-all placeholder:text-zinc-700"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold rounded-xl text-sm transition-all"
                    >
                      {isLoading ? 'Creating...' : 'Register Monitor'}
                    </button>
                  </form>
                </div>

                {/* Right: Quick List & Recent incidents */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="p-6 bg-zinc-900/20 border border-zinc-800/80 rounded-2xl">
                    <h3 className="text-sm font-semibold text-zinc-300 mb-4">Recent Outage Events</h3>
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                      {logs.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500 text-sm">
                          🎉 System healthy. No incidents logged.
                        </div>
                      ) : (
                        logs.slice(0, 3).map((log) => (
                          <div key={log.id} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center justify-between text-xs">
                            <div>
                              <div className="font-semibold text-zinc-200">{log.link_name}</div>
                              <div className="text-red-400 mt-0.5">{log.error_message}</div>
                            </div>
                            <span className="text-zinc-500">{new Date(log.detected_at).toLocaleTimeString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: MONITORS LIST */}
          {activeTab === 'monitors' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-white">Registered Monitors</h2>
                  <p className="text-sm text-zinc-500">Manage target links, check latency, and observe uptime history.</p>
                </div>

                <div className="w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Search monitors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-zinc-700 transition-all placeholder:text-zinc-700"
                  />
                </div>
              </div>

              {/* Monitors Grid */}
              {filteredLinks.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
                  <p className="text-sm">No monitors found matching search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredLinks.map((link) => {
                    let historyArray = [];
                    try {
                      historyArray = Array.isArray(link.history) ? link.history : JSON.parse(link.history || '[]');
                    } catch (e) {
                      historyArray = [];
                    }

                    // Pad history array with dummy empty checks to show a consistent 15-pill bar chart
                    const displayHistory = [...Array(Math.max(0, 15 - historyArray.length)).fill({ status: 'NONE' }), ...historyArray].slice(-15);

                    return (
                      <div key={link.id} className="p-5 bg-zinc-900/20 border border-zinc-800/80 hover:border-zinc-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
                        <div className="space-y-1 min-w-0 md:max-w-md">
                          <div className="flex items-center gap-2.5">
                            <span className="font-semibold text-slate-100">{link.name}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider ${
                              link.status === 'UP' ? 'bg-emerald-500/10 text-emerald-400' :
                              link.status === 'DOWN' ? 'bg-red-500/10 text-red-400' :
                              'bg-zinc-500/10 text-zinc-400'
                            }`}>
                              {link.status}
                            </span>
                          </div>
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs text-zinc-500 hover:text-emerald-400 hover:underline block truncate"
                          >
                            {link.url}
                          </a>
                        </div>

                        {/* Uptime History Chart */}
                        <div className="space-y-1.5 shrink-0">
                          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Uptime History (Recent Checks)</span>
                          <div className="flex items-center gap-1">
                            {displayHistory.map((h, i) => (
                              <div 
                                key={i} 
                                title={h.status !== 'NONE' ? `${h.status} (Latency: ${h.latency}ms) at ${new Date(h.time).toLocaleTimeString()}` : 'No data'}
                                className={`h-4.5 w-2.5 rounded-sm transition-all ${
                                  h.status === 'UP' ? 'bg-emerald-500/80 hover:bg-emerald-400' :
                                  h.status === 'DOWN' ? 'bg-red-500/80 hover:bg-red-400' :
                                  'bg-zinc-800/80'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Latency and Actions */}
                        <div className="flex items-center gap-6 justify-between md:justify-end">
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">Latency</span>
                            <span className="font-mono text-sm font-semibold text-zinc-300">
                              {link.response_time ? `${link.response_time}ms` : 'N/A'}
                            </span>
                          </div>

                          <button
                            onClick={() => handleDeleteLink(link.id, link.name)}
                            className="text-xs font-semibold text-zinc-500 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-950/10 border border-zinc-800 hover:border-red-950/20 transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW: INCIDENT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-white">Outage History</h2>
                  <p className="text-sm text-zinc-500">Historical records of all failed connection checks.</p>
                </div>

                <div className="w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-zinc-700 transition-all placeholder:text-zinc-700"
                  />
                </div>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
                  <p className="text-sm">No downtime logs found.</p>
                </div>
              ) : (
                <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/40">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 text-xs font-semibold uppercase text-zinc-400 tracking-wider bg-zinc-900/20">
                          <th className="p-4">Link Name</th>
                          <th className="p-4">URL</th>
                          <th className="p-4 text-center">Status</th>
                          <th className="p-4">Diagnostic Error</th>
                          <th className="p-4 text-right">Time Detected</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800 text-sm">
                        {filteredLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-zinc-900/10 transition-colors">
                            <td className="p-4 font-semibold text-slate-200">{log.link_name}</td>
                            <td className="p-4 text-zinc-500 max-w-[200px] truncate">{log.link_url}</td>
                            <td className="p-4 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-900/30 text-xs font-semibold font-mono">
                                HTTP {log.status_code || 'N/A'}
                              </span>
                            </td>
                            <td className="p-4 text-red-400/80 text-xs">{log.error_message || 'Timeout / Outage'}</td>
                            <td className="p-4 text-right text-zinc-500 text-xs">{new Date(log.detected_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: INTEGRATIONS */}
          {activeTab === 'integrations' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-white">Alert Integrations</h2>
                <p className="text-sm text-zinc-500">Configure instant alerts to notify your team when a link goes offline.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Telegram Card */}
                <div className="p-6 bg-zinc-900/20 border border-zinc-800 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/25 text-sky-400 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-white mb-2">Telegram Outage Bot</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Configure your backend environment with `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to receive automated, instant markdown alerts directly in your Telegram channel or chat.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
                    <span>Status: Supported</span>
                    <span className="font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
                  </div>
                </div>

                {/* Slack Card */}
                <div className="p-6 bg-zinc-900/20 border border-zinc-800 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/25 text-purple-400 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-white mb-2">Slack Webhooks</h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Register your incoming Slack Webhook URL in your backend environment as `SLACK_WEBHOOK_URL` to receive rich formatted slack messages inside your company channels.
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
                    <span>Status: Supported</span>
                    <span className="font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">Active</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
