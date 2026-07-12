import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

// New view — searchable list of STOPPED events, each expandable into a
// lazy-loaded summary card (total scans, late arrivals, total logged out).
// Paused events are intentionally excluded — they still belong in Live
// Monitor since they're resumable, not finished.
export function HistoryView({ expandEventId, onExpandHandled }) {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [summaries, setSummaries] = useState({}); // eventId -> summary | 'loading' | 'error'

  async function load(q) {
    setLoading(true);
    try {
      const data = await api('GET', '/api/events/history' + (q ? '?search=' + encodeURIComponent(q) : ''));
      setEvents(data);
    } catch (_) {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(''); }, []);

  // Debounced search, same 250ms pattern used in MonitorView's FIND BY NAME.
  useEffect(() => {
    const id = setTimeout(() => load(search), 250);
    return () => clearTimeout(id);
  }, [search]);

  // Arriving here via EventsView's HISTORY button (stopped events no longer
  // show MONITOR) — jump straight to that event's expanded summary once the
  // list has loaded, instead of leaving the person to find it themselves.
  useEffect(() => {
    if (!expandEventId || loading) return;
    if (events.some((e) => e.id === expandEventId)) {
      toggleExpand(expandEventId);
    }
    onExpandHandled?.();
  }, [expandEventId, loading, events]);

  async function toggleExpand(eventId) {
    if (expandedId === eventId) { setExpandedId(null); return; }
    setExpandedId(eventId);
    if (!summaries[eventId]) {
      setSummaries((prev) => ({ ...prev, [eventId]: 'loading' }));
      try {
        const summary = await api('GET', `/api/events/${eventId}/history-summary`);
        setSummaries((prev) => ({ ...prev, [eventId]: summary }));
      } catch (_) {
        setSummaries((prev) => ({ ...prev, [eventId]: 'error' }));
      }
    }
  }

  return (
    <div className="view active" id="view-history">
      <div className="view-header">
        <div>
          <div className="view-title">Event History</div>
          <div className="view-desc">Every stopped event, with its final attendance summary. Paused events stay in Live Monitor.</div>
        </div>
        <input
          type="text"
          className="mono"
          placeholder="Search by event name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260, padding: '10px 14px', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
        />
      </div>

      {loading && (
        <div className="empty-state">
          <div className="et">Loading...</div>
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="empty-state">
          <div className="et">No stopped events{search ? ' match that search' : ' yet'}</div>
          <div className="ed">Events show up here once they've been stopped from the Events tab.</div>
        </div>
      )}

      {!loading && events.map((e) => {
        const isOpen = expandedId === e.id;
        const summary = summaries[e.id];
        return (
          <div key={e.id} className="card" style={{ padding: 0, marginBottom: 12, overflow: 'hidden' }}>
            <button
              onClick={() => toggleExpand(e.id)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div>
                <strong>{e.name}</strong>{' '}
                <span className="mono" style={{ color: 'var(--text-muted)' }}>#{e.id}</span>
 <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{e.eventDate || '-'}</div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{isOpen ? '▲ HIDE' : '▼ DETAILS'}</span>
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
                {summary === 'loading' && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading summary...</div>}
                {summary === 'error' && <div style={{ fontSize: 13, color: 'var(--accent-red, #b91c1c)' }}>Could not load summary for this event.</div>}
                {summary && summary !== 'loading' && summary !== 'error' && (
                  <div className="stat-grid">
                    <div className="card stat-card">
                      <div className="stat-label">Total scans</div>
                      <div className="stat-value">{summary.totalScans}</div>
                    </div>
                    <div className="card stat-card">
                      <div className="stat-label">Late arrivals</div>
                      <div className="stat-value">{summary.lateArrivals}</div>
                    </div>
                    <div className="card stat-card">
                      <div className="stat-label">Total logged out</div>
                      <div className="stat-value">{summary.totalLoggedOut}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
