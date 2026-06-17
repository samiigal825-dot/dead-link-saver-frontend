import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  // Check if we are viewing a public status page
  const queryParams = new URLSearchParams(window.location.search);
  const statusPageUserId = queryParams.get('status_page');

  // Authentication states
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Core app states
  const [links, setLinks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [countdown, setCountdown] = useState(30);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [logSearchQuery, setLogSearchQuery] = useState('');

  // Selected monitor details view
  const [selectedMonitor, setSelectedMonitor] = useState(null);

  // Monitor creation states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMonitorName, setNewMonitorName] = useState('');
  const [newMonitorUrl, setNewMonitorUrl] = useState('');
  const [newMonitorType, setNewMonitorType] = useState('HTTP');
  const [newMonitorInterval, setNewMonitorInterval] = useState('10');
  const [newMonitorKeyword, setNewMonitorKeyword] = useState('');
  const [newMonitorPort, setNewMonitorPort] = useState('80');
  
  // Alert integration states in create modal
  const [newSlackWebhook, setNewSlackWebhook] = useState('');
  const [newTelegramBot, setNewTelegramBot] = useState('');
  const [newTelegramChat, setNewTelegramChat] = useState('');
  const [newEmailAlert, setNewEmailAlert] = useState('');

  // Billing states
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [billingPlanName, setBillingPlanName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Public status page viewer states
  const [publicStatusData, setPublicStatusData] = useState(null);
  const [publicStatusLoading, setPublicStatusLoading] = useState(false);

  // API Keys developer states
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState('python');

  // Fetch current user details
  const fetchUser = async (authToken) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        // Token expired or invalid
        handleLogout();
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
  };

  // Fetch dashboard data
  const fetchData = async (showRefreshIndicator = false) => {
    if (!token) return;
    if (showRefreshIndicator) setIsRefreshing(true);
    setError(null);
    try {
      const linksRes = await fetch(`${API_URL}/api/links`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!linksRes.ok) throw new Error('Failed to fetch monitors');
      const linksData = await linksRes.json();
      setLinks(linksData);

      // If the selected monitor is open, update its state dynamically
      if (selectedMonitor) {
        const updated = linksData.find(l => l.id === selectedMonitor.id);
        if (updated) setSelectedMonitor(updated);
      }

      const logsRes = await fetch(`${API_URL}/api/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!logsRes.ok) throw new Error('Failed to fetch incident logs');
      const logsData = await logsRes.json();
      setLogs(logsData);

      setCountdown(30);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Connection to backend failed. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch public status data
  const fetchPublicStatus = async () => {
    setPublicStatusLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/status/${statusPageUserId}`);
      if (res.ok) {
        const data = await res.json();
        setPublicStatusData(data);
      } else {
        setError('Public status page not found');
      }
    } catch (err) {
      console.error('Error fetching public status page:', err);
      setError('Failed to load status page');
    } finally {
      setPublicStatusLoading(false);
    }
  };

  // Run periodic updates
  useEffect(() => {
    if (statusPageUserId) {
      fetchPublicStatus();
      const interval = setInterval(fetchPublicStatus, 60000);
      return () => clearInterval(interval);
    }
  }, [statusPageUserId]);

  // API Key management functions
  const fetchApiKeys = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/apikeys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data);
      }
    } catch (err) {
      console.error('Error fetching API keys:', err);
    }
  };

  const handleGenerateApiKey = async () => {
    setIsGeneratingKey(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/apikeys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newKeyName.trim() || 'Default API Key' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate API key');
      setRevealedKey(data.api_key);
      setNewKeyName('');
      fetchApiKeys();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleRevokeApiKey = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this API key? Any scripts using it will stop working immediately.')) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/apikeys/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to revoke API key');
      }
      setSuccess('API key revoked successfully');
      fetchApiKeys();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUser(token);
      fetchData();
      fetchApiKeys();
      
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
    }
  }, [token]);

  // Auth operations
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/signup';
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      setAuthEmail('');
      setAuthPassword('');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setLinks([]);
    setLogs([]);
    setSelectedMonitor(null);
  };

  // Monitor operations
  const handleCreateMonitor = async (e) => {
    e.preventDefault();
    if (!newMonitorName.trim() || !newMonitorUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const payload = {
      name: newMonitorName.trim(),
      url: newMonitorUrl.trim(),
      check_type: newMonitorType,
      check_interval: parseInt(newMonitorInterval),
      keyword: newMonitorType === 'KEYWORD' ? newMonitorKeyword.trim() : null,
      port: newMonitorType === 'PORT' ? parseInt(newMonitorPort) : null,
      slack_webhook_url: newSlackWebhook.trim() || null,
      telegram_bot_token: newTelegramBot.trim() || null,
      telegram_chat_id: newTelegramChat.trim() || null,
      email_alert: newEmailAlert.trim() || null
    };

    try {
      const res = await fetch(`${API_URL}/api/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create monitor');
      }

      setSuccess(`Successfully added monitor for "${newMonitorName}"`);
      setIsCreateModalOpen(false);
      resetCreateForm();
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetCreateForm = () => {
    setNewMonitorName('');
    setNewMonitorUrl('');
    setNewMonitorType('HTTP');
    setNewMonitorInterval('10');
    setNewMonitorKeyword('');
    setNewMonitorPort('80');
    setNewSlackWebhook('');
    setNewTelegramBot('');
    setNewTelegramChat('');
    setNewEmailAlert('');
  };

  const handleDeleteLink = async (id, monitorName) => {
    if (!window.confirm(`Are you sure you want to delete the monitor "${monitorName}"?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_URL}/api/links/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete monitor');
      }

      setSuccess(`Stopped monitoring "${monitorName}"`);
      if (selectedMonitor && selectedMonitor.id === id) {
        setSelectedMonitor(null);
      }
      fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (link) => {
    try {
      const res = await fetch(`${API_URL}/api/links/${link.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: !link.is_active })
      });

      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update monitor state');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerCheck = async () => {
    setIsRefreshing(true);
    setError(null);
    setSuccess(null);
    try {
      const secret = prompt('Enter Cron Secret passphrase to verify webhook execution:', 'super_secret_cron_passphrase') || '';
      const res = await fetch(`${API_URL}/api/cron/check?secret=${encodeURIComponent(secret)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Cron check failed');
      }
      
      const summary = data.summary;
      setSuccess(`Manual check complete! Checked: ${summary.checked}, Outages: ${summary.failed}, Skipped: ${summary.skipped}`);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Billing subscriptions checkout integration
  const triggerBillingCheckout = async (planName) => {
    if (planName === 'FREE') {
      setBillingPlanName(planName);
      setIsBillingModalOpen(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/billing/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tier: planName })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize subscription');
      }

      if (data.url) {
        // Real Stripe billing checkout url returned
        window.location.href = data.url;
      } else {
        // Fallback to Stripe payment simulator
        setBillingPlanName(planName);
        setIsBillingModalOpen(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulatePayment = async (e) => {
    e.preventDefault();
    setIsPaying(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/billing/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tier: billingPlanName })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Billing checkout failed');
      }

      setSuccess(`Payment Successful! Welcome to ${billingPlanName} subscription tier.`);
      setIsBillingModalOpen(false);
      setCardNumber('');
      setCardExpiry('');
      setCardCvc('');
      
      // Refresh user details to unlock plans
      if (token) fetchUser(token);
      fetchData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsPaying(false);
    }
  };

  // Latency metrics formatting
  const totalLinks = links.length;
  const activeLinks = links.filter((l) => l.is_active).length;
  const upLinks = links.filter((l) => l.is_active && l.status === 'UP').length;
  const downLinks = links.filter((l) => l.is_active && l.status === 'DOWN').length;
  const pausedLinks = links.filter((l) => !l.is_active).length;
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

  // SVG Line Chart Renderer for Latency
  const renderLatencyChart = (history) => {
    if (!history || history.length === 0) return <div className="text-zinc-600 text-xs py-10 text-center">No latency points recorded yet</div>;
    
    let historyPoints = [];
    try {
      historyPoints = Array.isArray(history) ? history : JSON.parse(history);
    } catch (e) {
      historyPoints = [];
    }

    if (historyPoints.length === 0) return <div className="text-zinc-600 text-xs py-10 text-center">No latency points recorded yet</div>;

    const latencies = historyPoints.map(p => p.latency || 0);
    const maxLat = Math.max(...latencies, 100);
    const minLat = Math.min(...latencies, 0);
    const chartHeight = 120;
    const chartWidth = 500;
    const pointsCount = historyPoints.length;

    // Build SVG coordinates
    const coords = historyPoints.map((point, index) => {
      const x = pointsCount > 1 ? (index / (pointsCount - 1)) * chartWidth : 0;
      const range = maxLat - minLat;
      const y = range > 0 
        ? chartHeight - ((point.latency - minLat) / range) * chartHeight
        : chartHeight / 2;
      return { x, y, latency: point.latency, time: new Date(point.time).toLocaleTimeString(), status: point.status };
    });

    const polylinePoints = coords.map(c => `${c.x},${c.y}`).join(' ');

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
          <span>Max Latency: {maxLat}ms</span>
          <span>Min Latency: {minLat}ms</span>
        </div>
        <div className="relative bg-zinc-950/80 border border-zinc-800 rounded-xl p-2 overflow-x-auto">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-28 overflow-visible">
            {/* Grid Lines */}
            <line x1="0" y1={chartHeight / 4} x2={chartWidth} y2={chartHeight / 4} stroke="#27272a" strokeDasharray="4" strokeWidth="0.5" />
            <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="#27272a" strokeDasharray="4" strokeWidth="0.5" />
            <line x1="0" y1={(chartHeight * 3) / 4} x2={chartWidth} y2={(chartHeight * 3) / 4} stroke="#27272a" strokeDasharray="4" strokeWidth="0.5" />

            {/* Gradient Fill under the line */}
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M 0,${chartHeight} ${coords.map(c => `L ${c.x},${c.y}`).join(' ')} L ${chartWidth},${chartHeight} Z`}
              fill="url(#chartGradient)"
            />

            {/* Main Latency Line */}
            <polyline
              fill="none"
              stroke="#6366f1"
              strokeWidth="2.5"
              points={polylinePoints}
              className="transition-all duration-300"
            />

            {/* Interactive Points */}
            {coords.map((c, i) => (
              <g key={i} className="group cursor-pointer">
                <circle
                  cx={c.x}
                  cy={c.y}
                  r="4.5"
                  fill={c.status === 'UP' ? '#10b981' : '#ef4444'}
                  stroke="#18181b"
                  strokeWidth="1.5"
                  className="hover:scale-150 transition-transform"
                />
                {/* Tooltip */}
                <title>{`${c.status} | Latency: ${c.latency}ms at ${c.time}`}</title>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  // Uptime Percentage Calculator
  const calculateUptimePercent = (history, durationKey) => {
    if (!history || history.length === 0) return '100.0%';
    let pts = [];
    try {
      pts = Array.isArray(history) ? history : JSON.parse(history);
    } catch (e) {
      pts = [];
    }
    
    if (pts.length === 0) return '100.0%';

    // Limit history based on duration key (e.g. recent 20 checks)
    const activeChecks = durationKey === '24h' ? pts.slice(-10) : pts;
    const upCount = activeChecks.filter(c => c.status === 'UP').length;
    return `${((upCount / activeChecks.length) * 100).toFixed(1)}%`;
  };

  // ==========================================
  // VIEW: PUBLIC STATUS PAGE RENDERER
  // ==========================================
  if (statusPageUserId) {
    if (publicStatusLoading) {
      return (
        <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex items-center justify-center font-sans">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-2 border-zinc-800 border-t-emerald-500 rounded-full animate-spin"></div>
            <span className="text-sm text-zinc-500 font-medium">Loading status page...</span>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex items-center justify-center font-sans">
          <div className="max-w-md p-6 bg-zinc-900 border border-zinc-800 rounded-2xl text-center space-y-4 shadow-xl">
            <div className="h-12 w-12 rounded-full bg-red-950/20 border border-red-900/30 text-red-500 flex items-center justify-center mx-auto text-xl font-bold">!</div>
            <h1 className="text-lg font-bold text-white">Status Page Error</h1>
            <p className="text-sm text-zinc-400">{error}</p>
          </div>
        </div>
      );
    }

    if (!publicStatusData) return null;

    const publicMonitors = publicStatusData.monitors;
    const isOverallUp = publicMonitors.length === 0 || publicMonitors.every(m => m.status === 'UP');
    const hasAnyDown = publicMonitors.some(m => m.status === 'DOWN');

    return (
      <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] font-sans antialiased p-8 flex flex-col justify-between">
        <div className="max-w-3xl mx-auto w-full space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-black" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-bold text-lg text-white">LinkSentinel Status</span>
            </div>
            <div className="text-xs text-zinc-500">
              Owned by <span className="text-zinc-400 font-semibold">{publicStatusData.user.email}</span>
            </div>
          </div>

          {/* Banner */}
          <div className={`p-5 rounded-2xl flex items-center gap-4 border transition-all ${
            isOverallUp 
              ? 'bg-emerald-950/10 border-emerald-900/30 text-emerald-400' 
              : hasAnyDown 
                ? 'bg-red-950/10 border-red-900/30 text-red-400'
                : 'bg-zinc-900/40 border-zinc-800 text-zinc-400'
          }`}>
            <span className="relative flex h-3 w-3 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOverallUp ? 'bg-emerald-400' : hasAnyDown ? 'bg-red-400' : 'bg-zinc-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isOverallUp ? 'bg-emerald-500' : hasAnyDown ? 'bg-red-500' : 'bg-zinc-500'}`}></span>
            </span>
            <span className="font-semibold text-sm">
              {isOverallUp ? 'All Systems Operational' : hasAnyDown ? 'Partial System Disruption Detected' : 'All Monitors Paused'}
            </span>
          </div>

          {/* Monitors Grid */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-zinc-400 tracking-wide uppercase">Monitored Services</h2>
            {publicMonitors.length === 0 ? (
              <div className="p-8 text-center bg-zinc-900/20 border border-zinc-800 rounded-2xl text-zinc-500 text-sm">
                No active services are set to public monitoring.
              </div>
            ) : (
              <div className="space-y-3">
                {publicMonitors.map((m) => {
                  let historyArray = [];
                  try {
                    historyArray = Array.isArray(m.history) ? m.history : JSON.parse(m.history || '[]');
                  } catch (e) {
                    historyArray = [];
                  }
                  const displayHistory = [...Array(Math.max(0, 20 - historyArray.length)).fill({ status: 'NONE' }), ...historyArray].slice(-20);

                  return (
                    <div key={m.id} className="p-4 bg-zinc-900/20 border border-zinc-800 rounded-xl flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-sm text-zinc-200">{m.name}</div>
                        <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-emerald-400 block max-w-sm truncate">{m.url}</a>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {/* Status Pills */}
                        <div className="flex items-center gap-0.5">
                          {displayHistory.map((h, i) => (
                            <div 
                              key={i} 
                              title={h.status !== 'NONE' ? `${h.status} at ${new Date(h.time).toLocaleTimeString()}` : 'No data'}
                              className={`h-3.5 w-1.5 rounded-[1px] ${
                                h.status === 'UP' ? 'bg-emerald-500/80' : h.status === 'DOWN' ? 'bg-red-500/80' : 'bg-zinc-800/80'
                              }`}
                            />
                          ))}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono border ${
                          m.status === 'UP' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' : 'bg-red-500/10 text-red-400 border-red-500/15'
                        }`}>
                          {m.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-zinc-600 mt-12 pt-6 border-t border-zinc-900">
          Powered by <a href="/" className="hover:underline font-semibold text-zinc-500">LinkSentinel SaaS</a>. All checks are fully automated.
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: AUTHENTICATION FORMS (LOGIN / SIGNUP)
  // ==========================================
  if (!token) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex items-center justify-center font-sans antialiased p-6">
        <div className="w-full max-w-md bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-md rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-emerald-500/5 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 rounded-full bg-indigo-500/5 blur-3xl"></div>

          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              {isLoginView ? 'Welcome Back to LinkSentinel' : 'Create Your LinkSentinel Account'}
            </h1>
            <p className="text-xs text-zinc-500 text-center">
              {isLoginView ? 'Sign in to access your dashboard and active link checks.' : 'Get premium status page monitoring, alerting, and SSL checks.'}
            </p>
          </div>

          {authError && (
            <div className="mb-5 p-3.5 bg-red-950/20 border border-red-900/30 rounded-xl text-red-300 text-xs flex gap-2.5 items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Email Address</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="e.g. user@company.com"
                className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-zinc-700 transition-all placeholder:text-zinc-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Password</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-zinc-700 transition-all placeholder:text-zinc-700"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? 'Processing...' : isLoginView ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-zinc-500">
            {isLoginView ? "Don't have an account?" : "Already have an account?"}{' '}
            <button
              onClick={() => {
                setIsLoginView(!isLoginView);
                setAuthError('');
              }}
              className="text-emerald-400 hover:underline font-semibold cursor-pointer"
            >
              {isLoginView ? 'Register here' : 'Sign in here'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: MAIN SaaS DASHBOARD
  // ==========================================
  const isOverallOperational = activeLinks === 0 || upLinks === activeLinks;
  const hasOutages = downLinks > 0;

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex font-sans antialiased overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#09090b] border-r border-[#27272a]/60 flex flex-col shrink-0 z-30">
        <div className="h-16 flex items-center px-6 border-b border-[#27272a]/60 gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-black" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="font-bold text-sm tracking-wide bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            LinkSentinel
          </span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
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
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
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
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
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
            onClick={() => setActiveTab('billing')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'billing'
                ? 'bg-zinc-800/60 text-white border border-zinc-700/50 shadow-inner'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/30 border border-transparent'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Billing Plans
          </button>

          <button
            onClick={() => setActiveTab('statuspage')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'statuspage'
                ? 'bg-zinc-800/60 text-white border border-zinc-700/50 shadow-inner'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/30 border border-transparent'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            Public Status Page
          </button>

          <button
            onClick={() => setActiveTab('developer')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === 'developer'
                ? 'bg-zinc-800/60 text-white border border-zinc-700/50 shadow-inner'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/30 border border-transparent'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Developer API
          </button>
        </nav>

        {/* User Account Controls */}
        <div className="p-4 border-t border-[#27272a]/60">
          <div className="flex flex-col gap-2 bg-zinc-900/40 rounded-2xl p-3 border border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 font-bold text-xs uppercase">
                {user ? user.email.slice(0, 2) : 'LS'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-300 truncate max-w-[130px]">{user ? user.email : 'Loading...'}</div>
                <div className="text-[10px] text-indigo-400 font-bold flex items-center gap-1">
                  <span>{user ? user.subscription_tier : 'FREE'}</span>
                  <span>•</span>
                  <span>Tier</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-center py-1.5 hover:bg-red-950/20 text-[10px] text-zinc-500 hover:text-red-400 font-bold rounded-lg border border-transparent hover:border-red-950/40 transition-all cursor-pointer mt-1"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#09090b]">
        
        {/* Header */}
        <header className="h-16 border-b border-[#27272a]/60 bg-[#09090b]/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-20">
          <div className="text-sm font-semibold tracking-wide text-zinc-300 capitalize">
            {activeTab === 'statuspage' ? 'Public Status Page' : activeTab === 'dashboard' ? 'Overview' : activeTab === 'developer' ? 'Developer API' : activeTab}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800/80 text-zinc-400 px-3 py-1.5 rounded-xl">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span>Cron pings in {countdown}s</span>
            </div>

            <button 
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="px-3.5 py-1.5 text-xs font-bold bg-zinc-900 hover:bg-zinc-800/80 text-zinc-300 rounded-xl transition-colors border border-zinc-800 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.306 7M7 9h8V1v8z" />
              </svg>
              Refresh
            </button>

            <button
              onClick={handleTriggerCheck}
              className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 cursor-pointer"
            >
              Run Engine Check
            </button>
          </div>
        </header>

        {/* Outer scrolling area */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Main content body */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            
            {/* Success and Error Banners */}
            {error && (
              <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-2xl text-red-300 text-xs flex gap-3 items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-2xl text-emerald-300 text-xs flex gap-3 items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            {/* TAB: OVERVIEW */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                
                {/* System Status Alert Banner */}
                <div className={`p-6 rounded-2xl border flex items-center gap-4 ${
                  isOverallOperational 
                    ? 'bg-emerald-950/10 border-emerald-900/20 text-emerald-400' 
                    : hasOutages 
                      ? 'bg-red-950/10 border-red-900/20 text-red-400'
                      : 'bg-zinc-900/40 border-zinc-800 text-zinc-400'
                }`}>
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isOverallOperational ? 'bg-emerald-400' : hasOutages ? 'bg-red-400' : 'bg-zinc-400'
                    }`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${
                      isOverallOperational ? 'bg-emerald-500' : hasOutages ? 'bg-red-500' : 'bg-zinc-500'
                    }`}></span>
                  </span>
                  <div>
                    <h3 className="font-bold text-sm">
                      {isOverallOperational ? 'All Services Operational' : hasOutages ? 'Partial System Disruption Detected' : 'All Monitors Paused'}
                    </h3>
                    <p className="text-xs opacity-75 mt-0.5">
                      {isOverallOperational ? 'All of your registered services are active and responding successfully.' : 'Some of your systems are returning HTTP connection errors or TCP failures.'}
                    </p>
                  </div>
                </div>

                {/* Stats Panel */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="p-5 rounded-2xl bg-zinc-900/20 border border-zinc-800/80 hover:border-zinc-800 transition-all flex flex-col justify-between">
                    <span className="text-zinc-500 font-bold text-[10px] tracking-wider uppercase">Monitored Services</span>
                    <span className="text-3xl font-bold mt-3 text-white font-mono">{totalLinks}</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-zinc-900/20 border border-zinc-800/80 hover:border-zinc-800 transition-all flex flex-col justify-between">
                    <span className="text-emerald-500 font-bold text-[10px] tracking-wider uppercase">Active & UP</span>
                    <span className="text-3xl font-bold mt-3 text-emerald-400 font-mono">{upLinks}</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-zinc-900/20 border border-zinc-800/80 hover:border-zinc-800 transition-all flex flex-col justify-between">
                    <span className="text-red-500 font-bold text-[10px] tracking-wider uppercase">Outages (DOWN)</span>
                    <span className="text-3xl font-bold mt-3 text-red-400 font-mono">{downLinks}</span>
                  </div>
                  <div className="p-5 rounded-2xl bg-zinc-900/20 border border-zinc-800/80 hover:border-zinc-800 transition-all flex flex-col justify-between">
                    <span className="text-indigo-500 font-bold text-[10px] tracking-wider uppercase">Average Response</span>
                    <span className="text-3xl font-bold mt-3 text-indigo-400 font-mono">{avgLatency ? `${avgLatency}ms` : 'N/A'}</span>
                  </div>
                </div>

                {/* Split layout: quick overview & recent incidents */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left panel: Quick status */}
                  <div className="lg:col-span-2 p-6 bg-zinc-900/20 border border-zinc-800/80 rounded-2xl flex flex-col justify-between">
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Monitoring Distribution</h3>
                      <div className="flex items-center gap-2 h-3 rounded-full overflow-hidden bg-zinc-950 border border-zinc-800/50">
                        <div style={{ width: `${totalLinks > 0 ? (upLinks / totalLinks) * 100 : 0}%` }} className="bg-emerald-500 h-full transition-all" title="UP"></div>
                        <div style={{ width: `${totalLinks > 0 ? (downLinks / totalLinks) * 100 : 0}%` }} className="bg-red-500 h-full transition-all" title="DOWN"></div>
                        <div style={{ width: `${totalLinks > 0 ? (pausedLinks / totalLinks) * 100 : 0}%` }} className="bg-zinc-700 h-full transition-all" title="PAUSED"></div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                          <span>Healthy ({upLinks})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <span className="h-2 w-2 rounded-full bg-red-500"></span>
                          <span>Outages ({downLinks})</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <span className="h-2 w-2 rounded-full bg-zinc-700"></span>
                          <span>Paused ({pausedLinks})</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-zinc-800/60 pt-5 mt-6 flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Account status: {user ? user.subscription_status : 'ACTIVE'}</span>
                      <button 
                        onClick={() => setActiveTab('billing')} 
                        className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline cursor-pointer"
                      >
                        Manage Subscription &rarr;
                      </button>
                    </div>
                  </div>

                  {/* Right panel: Recent logs */}
                  <div className="p-6 bg-zinc-900/20 border border-zinc-800/80 rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Recent Outages</h3>
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                      {logs.length === 0 ? (
                        <div className="text-center py-12 text-zinc-600 text-xs">
                          🎉 All checks passing cleanly. No outage logs found.
                        </div>
                      ) : (
                        logs.slice(0, 3).map((log) => (
                          <div key={log.id} className="p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-zinc-300">{log.link_name}</span>
                              <span className="text-[10px] text-zinc-500">{new Date(log.detected_at).toLocaleTimeString()}</span>
                            </div>
                            <div className="text-red-400 font-mono text-[10px] truncate">{log.error_message}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB: MONITORS */}
            {activeTab === 'monitors' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-white">Active Monitors</h2>
                    <p className="text-xs text-zinc-500">Configure target URLs, protocols, alert channels, and review metrics.</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-56 sm:w-64">
                      <input
                        type="text"
                        placeholder="Search monitor label or url..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-zinc-700 transition-all placeholder:text-zinc-700"
                      />
                    </div>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="px-4 py-2 text-xs font-bold bg-zinc-100 hover:bg-white text-zinc-950 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Add Monitor
                    </button>
                  </div>
                </div>

                {/* Monitors Grid */}
                {filteredLinks.length === 0 ? (
                  <div className="p-16 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
                    <p className="text-sm">No monitors found. Click "Add Monitor" to register a check.</p>
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

                      // Pads the history display to show a rolling bar chart of max 20 checks
                      const displayHistory = [...Array(Math.max(0, 20 - historyArray.length)).fill({ status: 'NONE' }), ...historyArray].slice(-20);

                      return (
                        <div 
                          key={link.id} 
                          className={`p-4 bg-zinc-900/20 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-zinc-900/30 cursor-pointer ${
                            selectedMonitor && selectedMonitor.id === link.id ? 'border-zinc-700 bg-zinc-900/30' : 'border-zinc-800/80'
                          }`}
                          onClick={() => setSelectedMonitor(link)}
                        >
                          <div className="space-y-1 min-w-0 md:max-w-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs text-slate-100 truncate">{link.name}</span>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wider ${
                                !link.is_active ? 'bg-zinc-800 text-zinc-400' :
                                link.status === 'UP' ? 'bg-emerald-500/10 text-emerald-400' :
                                link.status === 'DOWN' ? 'bg-red-500/10 text-red-400' :
                                'bg-zinc-800 text-zinc-400'
                              }`}>
                                {!link.is_active ? 'PAUSED' : link.status}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-650 block truncate">{link.url}</span>
                          </div>

                          {/* Uptime Bar Chart */}
                          <div className="space-y-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[9px] font-bold text-zinc-650 uppercase tracking-wider block">Uptime History (Last 20 checks)</span>
                            <div className="flex items-center gap-1">
                              {displayHistory.map((h, i) => (
                                <div 
                                  key={i} 
                                  title={h.status !== 'NONE' ? `${h.status} (Latency: ${h.latency}ms) at ${new Date(h.time).toLocaleTimeString()}` : 'No data'}
                                  className={`h-4.5 w-2 rounded-sm transition-all ${
                                    !link.is_active ? 'bg-zinc-800/40' :
                                    h.status === 'UP' ? 'bg-emerald-500/80 hover:bg-emerald-400' :
                                    h.status === 'DOWN' ? 'bg-red-500/80 hover:bg-red-400' :
                                    'bg-zinc-800/80'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Latency & Actions */}
                          <div className="flex items-center gap-5 justify-between md:justify-end shrink-0" onClick={(e) => e.stopPropagation()}>
                            <div className="text-right">
                              <span className="text-[9px] font-bold text-zinc-650 uppercase tracking-wider block">Response</span>
                              <span className="font-mono text-xs font-semibold text-zinc-300">
                                {link.is_active && link.response_time ? `${link.response_time}ms` : 'N/A'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Toggle active / paused */}
                              <button
                                onClick={() => handleToggleActive(link)}
                                className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                  link.is_active 
                                    ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400' 
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                }`}
                                title={link.is_active ? 'Pause Monitor' : 'Resume Monitor'}
                              >
                                {link.is_active ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </button>

                              <button
                                onClick={() => handleDeleteLink(link.id, link.name)}
                                className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-red-950/10 border border-zinc-800 hover:border-red-950/20 transition-all cursor-pointer"
                                title="Delete Monitor"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: INCIDENT LOGS */}
            {activeTab === 'logs' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-white">Outage Events Feed</h2>
                    <p className="text-xs text-zinc-500">Historical records of connection failures, latency spikes, and timeouts.</p>
                  </div>

                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Search incident logs..."
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-zinc-700 transition-all placeholder:text-zinc-700"
                    />
                  </div>
                </div>

                {filteredLogs.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
                    <p className="text-sm">No incident logs found.</p>
                  </div>
                ) : (
                  <div className="border border-zinc-800/80 rounded-2xl overflow-hidden bg-zinc-950/20">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-855 text-[10px] font-bold uppercase text-zinc-500 tracking-wider bg-zinc-900/20">
                            <th className="p-4">Link Name</th>
                            <th className="p-4">Target URL</th>
                            <th className="p-4 text-center">Status Code</th>
                            <th className="p-4">Diagnostic Message</th>
                            <th className="p-4 text-right">Time Detected</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900 text-xs">
                          {filteredLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-zinc-900/10 transition-colors">
                              <td className="p-4 font-semibold text-slate-200">{log.link_name}</td>
                              <td className="p-4 text-zinc-500 max-w-[200px] truncate">{log.link_url}</td>
                              <td className="p-4 text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-900/30 text-[10px] font-bold font-mono">
                                  HTTP {log.status_code || 'N/A'}
                                </span>
                              </td>
                              <td className="p-4 text-red-400/80 text-[11px] font-mono">{log.error_message || 'Connection Timeout / Service Down'}</td>
                              <td className="p-4 text-right text-zinc-500">{new Date(log.detected_at).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: BILLING */}
            {activeTab === 'billing' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-white">Choose Your Monitor Plan</h2>
                  <p className="text-xs text-zinc-500">Unlock faster pings, SSL expiration monitoring, and instant Slack/Telegram notification triggers.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* FREE PLAN */}
                  <div className={`p-6 bg-zinc-900/20 border rounded-2xl flex flex-col justify-between relative ${
                    user && user.subscription_tier === 'FREE' ? 'border-indigo-500/40 bg-zinc-900/30' : 'border-zinc-800'
                  }`}>
                    {user && user.subscription_tier === 'FREE' && (
                      <span className="absolute -top-3 left-4 bg-indigo-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">Active Plan</span>
                    )}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm text-zinc-300">Free Tier</h3>
                        <p className="text-[10px] text-zinc-500">Basic site monitoring</p>
                      </div>
                      <div className="flex items-baseline gap-1 text-white">
                        <span className="text-3xl font-extrabold">$0</span>
                        <span className="text-xs text-zinc-500">/ month</span>
                      </div>
                      <ul className="space-y-2 text-xs text-zinc-400 pt-2 border-t border-zinc-800/60">
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">&#10003;</span> Up to 3 Monitors
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">&#10003;</span> 10 Minute Check Interval
                        </li>
                        <li className="flex items-center gap-2 text-zinc-600">
                          <span className="text-zinc-700">&#10007;</span> No SSL / TCP Port Monitoring
                        </li>
                        <li className="flex items-center gap-2 text-zinc-600">
                          <span className="text-zinc-700">&#10007;</span> No Telegram / Slack webhooks
                        </li>
                      </ul>
                    </div>
                    <button 
                      onClick={() => triggerBillingCheckout('FREE')}
                      disabled={user && user.subscription_tier === 'FREE'}
                      className="w-full mt-6 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {user && user.subscription_tier === 'FREE' ? 'Current Tier' : 'Downgrade to Free'}
                    </button>
                  </div>

                  {/* PRO PLAN */}
                  <div className={`p-6 bg-zinc-900/20 border rounded-2xl flex flex-col justify-between relative ${
                    user && user.subscription_tier === 'PRO' ? 'border-indigo-500/40 bg-zinc-900/30' : 'border-zinc-800'
                  }`}>
                    {user && user.subscription_tier === 'PRO' && (
                      <span className="absolute -top-3 left-4 bg-indigo-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">Active Plan</span>
                    )}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm text-zinc-300">Professional Tier</h3>
                        <p className="text-[10px] text-zinc-500">Perfect for business websites</p>
                      </div>
                      <div className="flex items-baseline gap-1 text-white">
                        <span className="text-3xl font-extrabold">$9</span>
                        <span className="text-xs text-zinc-500">/ month</span>
                      </div>
                      <ul className="space-y-2 text-xs text-zinc-400 pt-2 border-t border-zinc-800/60">
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">&#10003;</span> Up to 20 Monitors
                        </li>
                        <li className="flex items-center gap-2 text-indigo-400 font-semibold">
                          <span className="text-emerald-500 font-bold">&#10003;</span> 1 Minute Check Interval
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">&#10003;</span> SSL, Keyword & TCP Port Checks
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">&#10003;</span> Email Alerts configured per monitor
                        </li>
                        <li className="flex items-center gap-2 text-zinc-600">
                          <span className="text-zinc-700">&#10007;</span> No Slack / Telegram integrations
                        </li>
                      </ul>
                    </div>
                    <button 
                      onClick={() => triggerBillingCheckout('PRO')}
                      disabled={user && user.subscription_tier === 'PRO'}
                      className="w-full mt-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {user && user.subscription_tier === 'PRO' ? 'Current Tier' : 'Upgrade to Pro'}
                    </button>
                  </div>

                  {/* ENTERPRISE PLAN */}
                  <div className={`p-6 bg-zinc-900/20 border rounded-2xl flex flex-col justify-between relative ${
                    user && user.subscription_tier === 'ENTERPRISE' ? 'border-indigo-500/40 bg-zinc-900/30' : 'border-zinc-800'
                  }`}>
                    {user && user.subscription_tier === 'ENTERPRISE' && (
                      <span className="absolute -top-3 left-4 bg-indigo-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">Active Plan</span>
                    )}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm text-zinc-300">Enterprise SaaS</h3>
                        <p className="text-[10px] text-zinc-500">For multi-project agencies</p>
                      </div>
                      <div className="flex items-baseline gap-1 text-white">
                        <span className="text-3xl font-extrabold">$29</span>
                        <span className="text-xs text-zinc-500">/ month</span>
                      </div>
                      <ul className="space-y-2 text-xs text-zinc-400 pt-2 border-t border-zinc-800/60">
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">&#10003;</span> Unlimited Monitors
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">&#10003;</span> 1 Minute Check Interval
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">&#10003;</span> All Advanced Check Protocol Types
                        </li>
                        <li className="flex items-center gap-2 text-indigo-400 font-semibold">
                          <span className="text-emerald-500 font-bold">&#10003;</span> Slack / Telegram Alerts integration
                        </li>
                        <li className="flex items-center gap-2 text-indigo-400 font-semibold">
                          <span className="text-emerald-500 font-bold">&#10003;</span> Public Status Page Access
                        </li>
                      </ul>
                    </div>
                    <button 
                      onClick={() => triggerBillingCheckout('ENTERPRISE')}
                      disabled={user && user.subscription_tier === 'ENTERPRISE'}
                      className="w-full mt-6 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white font-bold rounded-xl text-xs transition-all border border-zinc-700/60 cursor-pointer disabled:opacity-50"
                    >
                      {user && user.subscription_tier === 'ENTERPRISE' ? 'Current Tier' : 'Upgrade to Enterprise'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PUBLIC STATUS PAGE */}
            {activeTab === 'statuspage' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-white">Public Status Page URL</h2>
                  <p className="text-xs text-zinc-500">Publish a live uptime status page that customers and team members can check publicly without logging in.</p>
                </div>

                {user && user.subscription_tier !== 'ENTERPRISE' ? (
                  <div className="p-8 border border-zinc-800 bg-zinc-900/10 rounded-2xl text-center space-y-4">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 mb-2 mx-auto">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-sm text-zinc-200">Locked Feature</h3>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                      Status pages are restricted to Enterprise subscription tier. Upgrade your subscription plan in the Billing tab to unlock a public status page.
                    </p>
                    <button 
                      onClick={() => setActiveTab('billing')}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      Upgrade Plan
                    </button>
                  </div>
                ) : (
                  <div className="p-6 bg-zinc-900/20 border border-zinc-800 rounded-2xl space-y-5">
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-zinc-305">Your Public Status Link</h3>
                      <div className="flex gap-2.5">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/?status_page=${user ? user.id : ''}`}
                          className="flex-1 bg-zinc-955 border border-zinc-850 rounded-xl px-4 py-2.5 text-xs text-zinc-400 select-all"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/?status_page=${user ? user.id : ''}`);
                            setSuccess('Public status link copied to clipboard!');
                            setTimeout(() => setSuccess(null), 3000);
                          }}
                          className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-750 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-zinc-700/60"
                        >
                          Copy Link
                        </button>
                      </div>
                    </div>
                    
                    <div className="border-t border-zinc-850 pt-5">
                      <h4 className="text-xs font-bold text-zinc-300 mb-2">Status Page Preview</h4>
                      <p className="text-[11px] text-zinc-500 leading-relaxed mb-4">
                        All monitors that are active (`is_active = true`) will render publicly. Inactive or paused checks will be hidden. Users can access this link globally to audit system statuses.
                      </p>
                      <a 
                        href={`/?status_page=${user ? user.id : ''}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-350 hover:underline font-bold"
                      >
                        Open Status Page in New Tab &rarr;
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: DEVELOPER API & INTEGRATIONS */}
            {activeTab === 'developer' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-white">Developer API & Integrations</h2>
                  <p className="text-xs text-zinc-500">Generate API keys to manage your monitors programmatically via REST API. Authenticate using <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-indigo-400">X-API-Key</code> or <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-indigo-400">Authorization: Bearer</code> headers.</p>
                </div>

                {/* API Key Generation */}
                <div className="p-6 bg-zinc-900/20 border border-zinc-800/80 rounded-2xl space-y-5">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Generate New API Key</h3>
                  <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[10px] font-semibold text-zinc-500 block">Key Label (optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. CI/CD Pipeline, Monitoring Script"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        className="w-full bg-[#0c0c0e] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 transition-all placeholder:text-zinc-700"
                      />
                    </div>
                    <button
                      onClick={handleGenerateApiKey}
                      disabled={isGeneratingKey}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/10 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      {isGeneratingKey ? 'Generating...' : '+ Generate Key'}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-600">Maximum 5 keys per account. Keys are hashed securely — the plain key is shown only once upon generation.</p>
                </div>

                {/* Active API Keys Table */}
                <div className="p-6 bg-zinc-900/20 border border-zinc-800/80 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Active API Keys</h3>
                  {apiKeys.length === 0 ? (
                    <div className="p-10 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-600 text-xs">
                      No API keys generated yet. Create one above to get started.
                    </div>
                  ) : (
                    <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-950/20">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-800 text-[10px] font-bold uppercase text-zinc-500 tracking-wider bg-zinc-900/20">
                            <th className="p-3.5">Label</th>
                            <th className="p-3.5">Key Hint</th>
                            <th className="p-3.5">Created</th>
                            <th className="p-3.5">Last Used</th>
                            <th className="p-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900 text-xs">
                          {apiKeys.map((key) => (
                            <tr key={key.id} className="hover:bg-zinc-900/10 transition-colors">
                              <td className="p-3.5 font-semibold text-zinc-200">{key.name}</td>
                              <td className="p-3.5 font-mono text-indigo-400 text-[11px]">{key.key_hint}</td>
                              <td className="p-3.5 text-zinc-500">{new Date(key.created_at).toLocaleDateString()}</td>
                              <td className="p-3.5 text-zinc-500">{key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Never'}</td>
                              <td className="p-3.5 text-right">
                                <button
                                  onClick={() => handleRevokeApiKey(key.id)}
                                  className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 font-bold border border-red-950/30 rounded-lg text-[10px] transition-all cursor-pointer"
                                >
                                  Revoke
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Code Integration Snippets */}
                <div className="p-6 bg-zinc-900/20 border border-zinc-800/80 rounded-2xl space-y-5">
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Code Integration Templates</h3>
                    <p className="text-[10px] text-zinc-600">Copy-paste these snippets into your scripts to interact with the LinkSentinel API. Replace <code className="bg-zinc-800 px-1 py-0.5 rounded text-amber-400">YOUR_API_KEY</code> with your generated key.</p>
                  </div>

                  {/* Language Tabs */}
                  <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                    {['python', 'nodejs', 'curl'].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setActiveCodeTab(lang)}
                        className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          activeCodeTab === lang
                            ? 'bg-zinc-800 text-white shadow-inner'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {lang === 'python' ? 'Python' : lang === 'nodejs' ? 'Node.js' : 'cURL'}
                      </button>
                    ))}
                  </div>

                  {/* Snippet Display */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        const snippetEl = document.getElementById('code-snippet');
                        if (snippetEl) {
                          navigator.clipboard.writeText(snippetEl.innerText);
                          setSuccess('Code snippet copied to clipboard!');
                          setTimeout(() => setSuccess(null), 2500);
                        }
                      }}
                      className="absolute top-3 right-3 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[9px] font-bold border border-zinc-700/50 transition-all cursor-pointer z-10"
                    >
                      Copy
                    </button>

                    <pre id="code-snippet" className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 text-[11px] leading-relaxed text-zinc-300 overflow-x-auto font-mono">
                      {activeCodeTab === 'python' && `import requests

API_KEY = "${revealedKey || 'YOUR_API_KEY'}"
BASE_URL = "${API_URL}/api/v1"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

# List all monitors
response = requests.get(f"{BASE_URL}/monitors", headers=headers)
print(response.json())

# Create a new monitor
new_monitor = {
    "name": "My Website",
    "url": "https://example.com",
    "check_type": "HTTP",
    "check_interval": 5
}
response = requests.post(f"{BASE_URL}/monitors", json=new_monitor, headers=headers)
print(response.json())

# Delete a monitor
monitor_id = 1
response = requests.delete(f"{BASE_URL}/monitors/{monitor_id}", headers=headers)
print(response.json())`}
                      {activeCodeTab === 'nodejs' && `const API_KEY = "${revealedKey || 'YOUR_API_KEY'}";
const BASE_URL = "${API_URL}/api/v1";

const headers = {
  "X-API-Key": API_KEY,
  "Content-Type": "application/json"
};

// List all monitors
const listMonitors = async () => {
  const res = await fetch(BASE_URL + "/monitors", { headers });
  const data = await res.json();
  console.log(data);
};

// Create a new monitor
const createMonitor = async () => {
  const res = await fetch(BASE_URL + "/monitors", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "My Website",
      url: "https://example.com",
      check_type: "HTTP",
      check_interval: 5
    })
  });
  const data = await res.json();
  console.log(data);
};

listMonitors();
createMonitor();`}
                      {activeCodeTab === 'curl' && `# List all monitors
curl -X GET "${API_URL}/api/v1/monitors" \\
  -H "X-API-Key: ${revealedKey || 'YOUR_API_KEY'}"

# Create a new monitor
curl -X POST "${API_URL}/api/v1/monitors" \\
  -H "X-API-Key: ${revealedKey || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Website", "url": "https://example.com", "check_type": "HTTP", "check_interval": 5}'

# Delete a monitor (replace 1 with actual ID)
curl -X DELETE "${API_URL}/api/v1/monitors/1" \\
  -H "X-API-Key: ${revealedKey || 'YOUR_API_KEY'}"`}
                    </pre>
                  </div>
                </div>

                {/* API Reference Quick Card */}
                <div className="p-6 bg-zinc-900/20 border border-zinc-800/80 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">API Reference</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { method: 'GET', path: '/api/v1/monitors', desc: 'List all monitors' },
                      { method: 'POST', path: '/api/v1/monitors', desc: 'Create a new monitor' },
                      { method: 'GET', path: '/api/v1/monitors/:id', desc: 'Get monitor details + logs' },
                      { method: 'PATCH', path: '/api/v1/monitors/:id', desc: 'Update a monitor' },
                      { method: 'DELETE', path: '/api/v1/monitors/:id', desc: 'Delete a monitor' },
                    ].map((ep, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono border ${
                          ep.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' :
                          ep.method === 'POST' ? 'bg-blue-500/10 text-blue-400 border-blue-500/15' :
                          ep.method === 'PATCH' ? 'bg-amber-500/10 text-amber-400 border-amber-500/15' :
                          'bg-red-500/10 text-red-400 border-red-500/15'
                        }`}>
                          {ep.method}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 flex-1">{ep.path}</span>
                        <span className="text-[9px] text-zinc-600">{ep.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right sidebar monitor details drawer */}
          {selectedMonitor && (
            <aside className="w-80 border-l border-[#27272a]/60 bg-[#09090b]/90 backdrop-blur-md flex flex-col shrink-0 z-10 animate-in slide-in-from-right duration-300 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                <span className="font-bold text-xs text-zinc-400 uppercase tracking-wide">Monitor Details</span>
                <button
                  onClick={() => setSelectedMonitor(null)}
                  className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 rounded-lg cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2500/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-sm text-white truncate">{selectedMonitor.name}</h3>
                <span className="text-[10px] text-zinc-500 block truncate font-mono">{selectedMonitor.url}</span>
              </div>

              {/* Status statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl">
                  <span className="text-[9px] font-bold text-zinc-650 uppercase">24h Uptime</span>
                  <span className="text-sm font-bold block text-zinc-200 mt-1">{calculateUptimePercent(selectedMonitor.history, '24h')}</span>
                </div>
                <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl">
                  <span className="text-[9px] font-bold text-zinc-650 uppercase">7d Uptime</span>
                  <span className="text-sm font-bold block text-zinc-200 mt-1">{calculateUptimePercent(selectedMonitor.history, '7d')}</span>
                </div>
              </div>

              {/* Latency graph */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Latency History</span>
                {renderLatencyChart(selectedMonitor.history)}
              </div>

              {/* SSL Info */}
              {selectedMonitor.url.startsWith('https://') && (
                <div className="p-4 bg-zinc-950/60 border border-zinc-900 rounded-xl space-y-2">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase block">SSL Certificate Validity</span>
                  {selectedMonitor.ssl_expires_at ? (
                    <div>
                      <div className="text-xs font-semibold text-zinc-300">
                        {new Date(selectedMonitor.ssl_expires_at).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-medium mt-1">
                        Expires in {Math.max(0, Math.ceil((new Date(selectedMonitor.ssl_expires_at) - new Date()) / (1000 * 60 * 60 * 24)))} days
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-zinc-600">Pending next automated check...</div>
                  )}
                </div>
              )}

              {/* Integrations config summary */}
              <div className="space-y-3">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Alert Destinations</span>
                <div className="space-y-2 text-[10px] text-zinc-400">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                    <span>Slack Alert</span>
                    <span className={selectedMonitor.slack_webhook_url ? 'text-emerald-400' : 'text-zinc-650'}>
                      {selectedMonitor.slack_webhook_url ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-1.5">
                    <span>Telegram Alert</span>
                    <span className={selectedMonitor.telegram_bot_token && selectedMonitor.telegram_chat_id ? 'text-emerald-400' : 'text-zinc-650'}>
                      {selectedMonitor.telegram_bot_token ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-1.5">
                    <span>Email Alert</span>
                    <span className={selectedMonitor.email_alert ? 'text-emerald-400' : 'text-zinc-650'}>
                      {selectedMonitor.email_alert ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-zinc-900">
                <button
                  onClick={() => handleDeleteLink(selectedMonitor.id, selectedMonitor.name)}
                  className="w-full py-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 font-bold border border-red-950/30 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Delete Monitor
                </button>
              </div>
            </aside>
          )}

        </div>
      </div>

      {/* CREATE MONITOR MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">Create Uptime Monitor</h3>
              <button 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  resetCreateForm();
                }}
                className="text-zinc-500 hover:text-zinc-355 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateMonitor} className="p-8 space-y-6 max-h-[85vh] overflow-y-auto">
              
              {/* Monitor Type */}
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 block">Check Type</label>
                  <select
                    value={newMonitorType}
                    onChange={(e) => {
                      setNewMonitorType(e.target.value);
                      if (e.target.value === 'PORT' && newMonitorPort === '80') setNewMonitorPort('80');
                    }}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                  >
                    <option value="HTTP">HTTP / HTTPS</option>
                    <option value="SSL_ONLY" disabled={user && user.subscription_tier === 'FREE'}>SSL Expiry</option>
                    <option value="PORT" disabled={user && user.subscription_tier === 'FREE'}>TCP Port</option>
                    <option value="KEYWORD" disabled={user && user.subscription_tier === 'FREE'}>Keyword Presence</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 block">Check Frequency</label>
                  <select
                    value={newMonitorInterval}
                    onChange={(e) => setNewMonitorInterval(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                  >
                    <option value="1" disabled={user && user.subscription_tier === 'FREE'}>Every 1 min</option>
                    <option value="5" disabled={user && user.subscription_tier === 'FREE'}>Every 5 min</option>
                    <option value="10">Every 10 min</option>
                    <option value="30">Every 30 min</option>
                    <option value="60">Every 1 hour</option>
                  </select>
                </div>
              </div>

              {user && user.subscription_tier === 'FREE' && (
                <div className="p-3 bg-indigo-950/15 border border-indigo-900/20 rounded-xl text-[11px] text-indigo-400">
                  ⚡ PRO plans unlock 1-minute intervals, SSL Expiry, TCP Port, and Keyword checking.
                </div>
              )}

              {/* Monitor Label */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 block">Friendly Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Corporate Website"
                  value={newMonitorName}
                  onChange={(e) => setNewMonitorName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 placeholder:text-zinc-700"
                />
              </div>

              {/* URL/Target */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 block">
                  {newMonitorType === 'PORT' ? 'Host IP or Domain' : 'Check URL'}
                </label>
                <input
                  type={newMonitorType === 'PORT' ? 'text' : 'url'}
                  required
                  placeholder={newMonitorType === 'PORT' ? 'e.g. google.com or 192.168.1.1' : 'https://example.com'}
                  value={newMonitorUrl}
                  onChange={(e) => setNewMonitorUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 placeholder:text-zinc-700"
                />
              </div>

              {/* Port Input (Conditional) */}
              {newMonitorType === 'PORT' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 block">TCP Port</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 80, 443, 22"
                    value={newMonitorPort}
                    onChange={(e) => setNewMonitorPort(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              )}

              {/* Keyword Input (Conditional) */}
              {newMonitorType === 'KEYWORD' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 block">Target Keyword</label>
                  <input
                    type="text"
                    required
                    placeholder="Alert if page html DOES NOT contain this word"
                    value={newMonitorKeyword}
                    onChange={(e) => setNewMonitorKeyword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 placeholder:text-zinc-700"
                  />
                </div>
              )}

              {/* Alert destination configurations */}
              <div className="border-t border-zinc-800/80 pt-5 space-y-4">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">Outage Alert Channels</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-zinc-450 block">Email Alerts Address</label>
                    <input
                      type="email"
                      placeholder="alerts@company.com"
                      value={newEmailAlert}
                      disabled={user && user.subscription_tier === 'FREE'}
                      onChange={(e) => setNewEmailAlert(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 placeholder:text-zinc-700 disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-zinc-450 block">Slack Webhook URL</label>
                    <input
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={newSlackWebhook}
                      disabled={user && user.subscription_tier !== 'ENTERPRISE'}
                      onChange={(e) => setNewSlackWebhook(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 placeholder:text-zinc-700 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-zinc-450 block">Telegram Bot Token</label>
                    <input
                      type="text"
                      placeholder="123456:ABCdef..."
                      value={newTelegramBot}
                      disabled={user && user.subscription_tier !== 'ENTERPRISE'}
                      onChange={(e) => setNewTelegramBot(e.target.value)}
                      className="w-full bg-zinc-955 border border-zinc-850 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 placeholder:text-zinc-700 disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-zinc-450 block">Telegram Chat ID</label>
                    <input
                      type="text"
                      placeholder="-100123456789"
                      value={newTelegramChat}
                      disabled={user && user.subscription_tier !== 'ENTERPRISE'}
                      onChange={(e) => setNewTelegramChat(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-700 placeholder:text-zinc-700 disabled:opacity-50"
                    />
                  </div>
                </div>

                {user && user.subscription_tier !== 'ENTERPRISE' && (
                  <p className="text-[10px] text-zinc-500">
                    * Slack/Telegram notifications are restricted to Enterprise tier.
                  </p>
                )}
              </div>

              <div className="pt-5 border-t border-zinc-800 flex justify-end gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetCreateForm();
                  }}
                  className="px-5 py-2.5 border border-zinc-800 hover:border-zinc-750 text-zinc-300 hover:text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl text-sm transition-all cursor-pointer"
                >
                  {isLoading ? 'Creating...' : 'Register Monitor'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* BILLING PLANS PAYMENT CHECKOUT MODAL */}
      {isBillingModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">Stripe Payment Simulator</h3>
              <button 
                onClick={() => setIsBillingModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-350 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSimulatePayment} className="p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Target Tier Subscription</span>
                <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-white font-bold">{billingPlanName} Plan</span>
                  <span className="text-xs text-zinc-400 font-mono">
                    {billingPlanName === 'PRO' ? '$9.00 / month' : billingPlanName === 'ENTERPRISE' ? '$29.00 / month' : '$0.00'}
                  </span>
                </div>
              </div>

              {billingPlanName === 'FREE' ? (
                <div className="space-y-2 py-2">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Downgrading your account to the Free Plan will limit your monitor capacity to 3 active links and lock advanced checks. Are you sure you want to downgrade?
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Credit Card Number</label>
                    <input
                      type="text"
                      required
                      placeholder="4242  4242  4242  4242"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                      maxLength="19"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-750 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Expiration</label>
                      <input
                        type="text"
                        required
                        placeholder="MM / YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        maxLength="7"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-750 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">CVC</label>
                      <input
                        type="password"
                        required
                        placeholder="•••"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                        maxLength="3"
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-750 font-mono"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-650 leading-relaxed text-center pt-1">
                    🔒 Payment simulated securely. Feel free to use standard Stripe test card credentials to upgrade.
                  </p>
                </>
              )}

              <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBillingModalOpen(false)}
                  className="px-4 py-2 border border-zinc-800 hover:border-zinc-750 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPaying}
                  className="px-5 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  {isPaying ? 'Processing...' : billingPlanName === 'FREE' ? 'Downgrade Account' : 'Simulate Stripe Pay'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* API KEY REVEAL MODAL */}
      {revealedKey && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                API Key Generated Successfully
              </h3>
              <button
                onClick={() => setRevealedKey(null)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="p-4 bg-amber-950/15 border border-amber-900/25 rounded-xl text-amber-300 text-xs flex gap-3 items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <span className="font-bold block mb-0.5">Important: Save this key now!</span>
                  This is the only time your full API key will be displayed. It cannot be retrieved later. Store it securely.
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Your API Key</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={revealedKey}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-emerald-400 font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(revealedKey);
                      setSuccess('API key copied to clipboard!');
                      setTimeout(() => setSuccess(null), 2500);
                    }}
                    className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-zinc-700/60"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end">
                <button
                  onClick={() => setRevealedKey(null)}
                  className="px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl text-sm transition-all cursor-pointer"
                >
                  I've Saved My Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
