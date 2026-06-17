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

  // Fetch all data (links and incident logs)
  const fetchData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    setError(null);
    try {
      // Fetch Links
      const linksRes = await fetch(`${API_URL}/api/links`);
      if (!linksRes.ok) throw new Error('Failed to fetch monitors');
      const linksData = await linksRes.json();
      setLinks(linksData);

      // Fetch Incident Logs
      const logsRes = await fetch(`${API_URL}/api/logs`);
      if (!logsRes.ok) throw new Error('Failed to fetch incident logs');
      const logsData = await logsRes.json();
      setLogs(logsData);

      setCountdown(30); // Reset countdown on successful fetch
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Connection to backend failed. Please ensure the backend server is running.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Run initial fetch and set up interval
  useEffect(() => {
    fetchData();

    // 30 seconds interval for refreshing data
    const refreshInterval = setInterval(() => {
      fetchData(true);
    }, 30000);

    // 1 second countdown interval
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 30));
    }, 1000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(countdownInterval);
    };
  }, []);

  // Handle Add Link
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
      fetchData(); // Refresh list immediately

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Delete Link
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
      fetchData(); // Refresh list immediately

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Trigger manual cron trigger check
  const handleTriggerCheck = async () => {
    setIsRefreshing(true);
    setError(null);
    setSuccess(null);
    try {
      const secret = prompt('Enter Cron Secret passphrase (if configured):', 'super_secret_cron_passphrase') || '';
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

  // Calculate quick stats
  const totalLinks = links.length;
  const upLinks = links.filter((l) => l.status === 'UP').length;
  const downLinks = links.filter((l) => l.status === 'DOWN').length;
  const pendingLinks = links.filter((l) => l.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-950 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-200 to-sky-400 bg-clip-text text-transparent">
                Dead Link Saver
              </h1>
              <p className="text-xs text-slate-400">Web Link Status Monitor</p>
            </div>
          </div>

          {/* Sync indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Syncing in {countdown}s</span>
            </div>

            <button 
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700 flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.306 7M7 9h8V1v8z" />
              </svg>
              Refresh
            </button>

            <button
              onClick={handleTriggerCheck}
              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-lg shadow-emerald-600/15"
            >
              Run Check Now
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        
        {/* Error / Success Banners */}
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-sm flex gap-3 items-start animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl text-emerald-300 text-sm flex gap-3 items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>{success}</div>
          </div>
        )}

        {/* Stats Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm">
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Monitors</div>
            <div className="text-3xl font-bold mt-2 text-slate-100">{totalLinks}</div>
          </div>
          <div className="p-5 rounded-2xl bg-emerald-950/10 border border-emerald-900/30 backdrop-blur-sm">
            <div className="text-emerald-400/80 text-xs font-semibold uppercase tracking-wider">Active (UP)</div>
            <div className="text-3xl font-bold mt-2 text-emerald-400">{upLinks}</div>
          </div>
          <div className="p-5 rounded-2xl bg-red-950/10 border border-red-900/30 backdrop-blur-sm">
            <div className="text-red-400/80 text-xs font-semibold uppercase tracking-wider">Down</div>
            <div className="text-3xl font-bold mt-2 text-red-400">{downLinks}</div>
          </div>
          <div className="p-5 rounded-2xl bg-sky-950/10 border border-sky-900/30 backdrop-blur-sm">
            <div className="text-sky-400/80 text-xs font-semibold uppercase tracking-wider">Pending Check</div>
            <div className="text-3xl font-bold mt-2 text-sky-400">{pendingLinks}</div>
          </div>
        </section>

        {/* Form and Monitors Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Add Link Form */}
          <section className="lg:col-span-1 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
              <h2 className="text-lg font-bold mb-4 text-slate-100 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Add New Link
              </h2>
              
              <form onSubmit={handleAddLink} className="space-y-4">
                <div>
                  <label htmlFor="link-name" className="block text-xs font-semibold text-slate-400 mb-1.5">Link Name</label>
                  <input
                    id="link-name"
                    type="text"
                    required
                    placeholder="e.g. My Company Homepage"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label htmlFor="link-url" className="block text-xs font-semibold text-slate-400 mb-1.5">Target Link URL</label>
                  <input
                    id="link-url"
                    type="url"
                    required
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-slate-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-950/20 disabled:opacity-50"
                >
                  {isLoading ? 'Adding...' : 'Add Monitor'}
                </button>
              </form>
            </div>
          </section>

          {/* Active Monitors Table */}
          <section className="lg:col-span-2">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md h-full flex flex-col">
              <h2 className="text-lg font-bold mb-4 text-slate-100 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Active Monitors
              </h2>

              <div className="overflow-x-auto flex-1">
                {links.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 stroke-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <p className="text-sm">No links being monitored yet.</p>
                    <p className="text-xs mt-1 text-slate-600">Add a website link on the left to start.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs font-semibold uppercase text-slate-400 tracking-wider">
                        <th className="pb-3 pr-4">Link Name</th>
                        <th className="pb-3 pr-4">Target URL</th>
                        <th className="pb-3 pr-4 text-center">Status</th>
                        <th className="pb-3 pr-4">Last Checked</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-sm">
                      {links.map((link) => (
                        <tr key={link.id} className="hover:bg-slate-900/30 transition-colors">
                          <td className="py-4 pr-4 font-semibold text-slate-200">{link.name}</td>
                          <td className="py-4 pr-4">
                            <a 
                              href={link.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-slate-400 hover:text-emerald-400 transition-colors break-all line-clamp-1 hover:underline"
                            >
                              {link.url}
                            </a>
                          </td>
                          <td className="py-4 pr-4 text-center">
                            {link.status === 'UP' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 shadow-sm shadow-emerald-400/5">
                                UP
                              </span>
                            )}
                            {link.status === 'DOWN' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-400/10 text-red-400 border border-red-400/20 shadow-sm shadow-red-400/5">
                                DOWN
                              </span>
                            )}
                            {link.status === 'PENDING' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-400/10 text-sky-400 border border-sky-400/20 shadow-sm shadow-sky-400/5">
                                PENDING
                              </span>
                            )}
                          </td>
                          <td className="py-4 pr-4 text-slate-400 text-xs">
                            {link.last_checked 
                              ? new Date(link.last_checked).toLocaleString() 
                              : 'Never'}
                          </td>
                          <td className="py-4 text-right">
                            <button
                              onClick={() => handleDeleteLink(link.id, link.name)}
                              className="text-xs font-semibold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-950/20 border border-transparent hover:border-red-905/30 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>

        </div>

        {/* Incident Logs */}
        <section className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <h2 className="text-lg font-bold mb-4 text-slate-100 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Downtime Incident Logs
          </h2>

          <div className="max-h-[300px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                🎉 No incidents logged! All links have been running smoothly.
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div 
                    key={log.id} 
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm hover:border-red-950/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">{log.link_name}</span>
                        <a 
                          href={log.link_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-slate-500 hover:text-slate-300 truncate max-w-[200px] md:max-w-sm"
                        >
                          {log.link_url}
                        </a>
                      </div>
                      <div className="text-xs text-red-400 font-medium">
                        {log.error_message || 'Unspecified response failure'}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs">
                      {log.status_code && (
                        <span className="px-2 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-900/30 font-semibold font-mono">
                          HTTP {log.status_code}
                        </span>
                      )}
                      <span className="text-slate-400 shrink-0">
                        {new Date(log.detected_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Dead Link Saver. 100% Free Stack Architecture.</p>
      </footer>
    </div>
  );
}

export default App;
