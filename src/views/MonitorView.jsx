import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';

// Ported from #view-monitor markup + renderMonitor/renderFeed/scheduleCutoffBanner
// logic in admin.js. Behavior preserved exactly, including the late-cutoff
// timer and scan-rate progress bar coloring thresholds.

function parseCutoffInstant(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function MonitorView({
  events,
  selectedEventId,
  onSelectEvent,
  onRefresh,
  records,
  enrolledCount,
  feed,
  wsConnected,
  onSendManualScan,
  onPause,
  onResume,
  onStopClick,
  toast,
}) {
  const [manualId, setManualId] = useState('');
  const [manualStation, setManualStation] = useState('LOGIN');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const debounceRef = useRef(null);

  const ev = events.find((e) => e.id === selectedEventId) || null;
  const hasEvent = !!selectedEventId;
  const isPaused = ev?.status === 'PAUSED';
  const noLogout = ev?.hasLogout === false;

  useEffect(() => {
    if (noLogout && manualStation === 'LOGOUT') setManualStation('LOGIN');
  }, [noLogout, manualStation]);

  const inside = records.filter((r) => r.status === 'LOGGED_IN');
  const out = records.filter((r) => r.status === 'COMPLETE');
  const late = records.filter((r) => r.isLate);
  const total = records.length;

  // Late cutoff banner — recomputed on a 1s tick so it appears live,
  // mirroring the original's scheduleCutoffBanner() setTimeout behavior.
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const cutoff = ev && ev.loginTimeLimit ? parseCutoffInstant(ev.loginTimeLimit) : null;
  const showCutoffBanner = !!(ev && ev.loginTimeLimit && ev.status === 'RUNNING' && cutoff && now > cutoff);

  // Fire the one-shot "late cutoff reached" toast exactly once per event selection.
  const firedRef = useRef(null);
  useEffect(() => {
    if (showCutoffBanner && firedRef.current !== selectedEventId) {
      firedRef.current = selectedEventId;
 toast('Late cutoff reached - new logins are now marked LATE', 'warn');
    }
    if (!showCutoffBanner && ev && ev.status !== 'RUNNING') {
      firedRef.current = null;
    }
  }, [showCutoffBanner, selectedEventId]);

  // Scan rate bar
 let ratePct = 0, rateLabel = total + ' scanned', rateHint = 'Enrolled count unavailable - check event filter or roster.', rateColor = 'var(--status-live)';
  if (enrolledCount != null && enrolledCount > 0) {
    ratePct = Math.min(100, Math.round((total / enrolledCount) * 100));
    rateLabel = total + ' / ' + enrolledCount;
    rateHint = ratePct + '% of enrolled students have scanned in.';
    rateColor = ratePct >= 80 ? 'var(--status-live)' : ratePct >= 50 ? 'var(--board-amber)' : 'var(--status-live)';
  }

  function runSearch(q) {
    setSearchQuery(q);
    clearTimeout(debounceRef.current);
    if (q.trim().length < 2) { setSearchResults(null); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        // Scoped to the current event's own filter — searching "John" during
        // a CCS-only event shouldn't surface students outside that filter.
        const qs = 'query=' + encodeURIComponent(q.trim())
          + (selectedEventId ? '&eventId=' + selectedEventId : '');
        const results = await api('GET', '/api/roster/search?' + qs);
        setSearchResults(results);
      } catch (_) {
        setSearchResults('error');
      }
    }, 250);
  }

  function sendManual() {
    const id = manualId.trim();
    if (!selectedEventId) return toast('Select an event first.', 'err');
 if (ev?.status === 'PAUSED') return toast('Event is paused - resume it first.', 'err');
 if (noLogout && manualStation === 'LOGOUT') return toast('This event has no logout station - login only.', 'err');
    if (!id) return toast('Enter a student ID.', 'err');
    if (!wsConnected) return toast('Scanner link is not connected.', 'err');
    onSendManualScan({ eventId: selectedEventId, studentId: id, station: manualStation });
    setManualId('');
  }

  return (
    <div className="view active" id="view-monitor">
      <div className="view-header">
        <div>
          <div className="view-title">Live Monitor</div>
          <div className="view-desc">Real-time scan feed from the phone scanner, plus who's currently checked in.</div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="field mono"
            style={{ width: 'auto', padding: '10px 14px', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13, margin: 0 }}
            value={selectedEventId || ''}
            onChange={(e) => onSelectEvent(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Select an event...</option>
            {events
              .filter((e) => e.status === 'RUNNING' || e.status === 'PAUSED')
              .map((e) => (
 <option key={e.id} value={e.id}>{e.name} - {e.eventDate} ({e.status})</option>
              ))}
          </select>
          <button className="btn" onClick={onRefresh}>Refresh</button>
        </div>
      </div>

      {!hasEvent && (
        <div className="empty-state" style={{ marginBottom: 24 }}>
          <div className="et">No event selected</div>
          <div className="ed">Pick an event above, or create one from the Events tab, to see live scans here.</div>
        </div>
      )}

      {hasEvent && (
        <div id="monitorContent">
          <div className="card manual-scan-box">
            <div className="side-label" style={{ marginBottom: 12 }}>Manual scan</div>
            {isPaused && (
              <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--board-amber)' }}>
 Event is paused - resume it to accept scans again. Existing records below are still visible.
              </div>
            )}
            <div className="manual-scan-row">
              <input
                type="text" className="mono" placeholder="Student ID"
                value={manualId}
                disabled={isPaused}
                onChange={(e) => setManualId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !isPaused) sendManual(); }}
              />
              <select value={manualStation} disabled={isPaused} onChange={(e) => setManualStation(e.target.value)}>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT" disabled={noLogout}>{noLogout ? 'Logout (disabled for this event)' : 'Logout'}</option>
              </select>
              <button className="btn primary" disabled={isPaused} onClick={sendManual}>Send</button>
              <button className="btn" disabled={isPaused} onClick={() => { setSearchOpen((s) => !s); setSearchQuery(''); setSearchResults(null); }}>Find by name</button>
            </div>
            {searchOpen && (
              <div style={{ marginTop: 16 }}>
                <input
                  type="text" placeholder="Type a name..." autoFocus
                  className="search-dropdown-input"
                  value={searchQuery}
                  onChange={(e) => runSearch(e.target.value)}
                />
                <div className="search-dropdown-list">
                  {searchResults === 'error' && <div style={{ padding: 12, color: 'var(--text-primary)' }}>Search failed.</div>}
                  {Array.isArray(searchResults) && searchResults.length === 0 && (
                    <div style={{ padding: 12, color: 'var(--text-muted)' }}>No matches.</div>
                  )}
                  {Array.isArray(searchResults) && searchResults.map((s) => (
                    <div
                      key={s.studentId}
                      className="search-result-row"
                      style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}
                      onClick={() => { setManualId(s.studentId); setSearchOpen(false); }}
                    >
                      <span>{s.lastname}, {s.firstname}</span>
                      <span className="mono" style={{ color: 'var(--text-secondary)' }}>{s.studentId}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {showCutoffBanner && (
            <div style={{ display: 'block', background: 'var(--board-amber)', color: '#fff', padding: '10px 18px', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', marginBottom: 16 }}>
 ⏰ LATE CUTOFF PASSED - New logins are now marked LATE
            </div>
          )}

          <div className="stat-grid">
            <div className="card stat-card">
              <div className="stat-label">Currently inside</div>
              <div className="stat-value">{inside.length}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Logged out</div>
              <div className="stat-value">{out.length}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Late arrivals</div>
              <div className="stat-value">{late.length}</div>
            </div>
            <div className="card stat-card">
              <div className="stat-label">Total scanned</div>
              <div className="stat-value">{total}</div>
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: 'var(--text-secondary)' }}>Scan rate</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{rateLabel}</span>
            </div>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 0, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: ratePct + '%', background: rateColor, transition: 'width .4s ease' }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>{rateHint}</div>
          </div>

          <div className="monitor-grid">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="panel-head">
                <strong>Live feed</strong>
                <span className={'badge ' + (ev?.status === 'RUNNING' ? 'b-green' : ev?.status === 'PAUSED' ? 'b-amber' : 'b-grey')}>
 {ev ? ev.status : '-'}
                </span>
              </div>
              <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                {feed.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Waiting for scans</div>
                    <div>Use the connected mobile scanner to begin.</div>
                  </div>
                ) : (
                  feed.map((f, i) => {
                    let badge, label;
                    if (f.outcome === 'ACCEPTED') {
                      badge = f.station === 'LOGIN' ? 'b-green' : 'b-grey';
                      label = (f.firstname || f.lastname) ? `${f.firstname || ''} ${f.lastname || ''}`.trim() : f.studentId;
                    } else if (f.outcome === 'NEEDS_MANUAL_ENTRY') {
 badge = 'b-amber'; label = 'Unknown ID - ' + f.studentId;
                    } else {
 badge = 'b-red'; label = (f.reason || 'Rejected') + ' - ' + f.studentId;
                    }
                    return (
                      <div className="feed-row" key={i}>
                        <div>
                          <div className="frow-name">{label}</div>
                          <div className="frow-time mono">{f.time}</div>
                        </div>
                        <span className={'badge ' + badge}>{f.station === 'LOGIN' ? 'LOGIN' : 'LOGOUT'}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="panel-head">
                <strong>Checked in right now</strong>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{inside.length} inside</span>
              </div>
              <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                {inside.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nobody checked in yet.</div>
                ) : (
                  inside.map((r) => (
                    <div className="inside-row" key={r.studentId}>
                      <div>
                        <div className="irow-name">{r.lastname || ''}, {r.firstname || ''}</div>
                        <div className="irow-id mono">{r.studentId}</div>
                      </div>
                      {r.isLate ? <span className="badge b-amber">Late</span> : <span className="badge b-green">In</span>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {ev && ev.status === 'RUNNING' && <button className="btn" onClick={onPause}>Pause event</button>}
            {ev && ev.status === 'PAUSED' && <button className="btn" onClick={onResume}>Resume event</button>}
            {ev && ev.status !== 'STOPPED' && <button className="btn danger" onClick={onStopClick}>Stop & generate report</button>}
          </div>
        </div>
      )}
    </div>
  );
}
