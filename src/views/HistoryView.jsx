import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
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
          style={{ width: 260, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
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
            <button className="history-row" onClick={() => toggleExpand(e.id)}>
              <div className="history-row-main">
                <div className="history-row-top">
                  <span className="history-row-name">{e.name}</span>
                  <span className="history-row-code">#{e.id}</span>
                  <span className="badge b-grey">Stopped</span>
                </div>
                <div className="history-row-date">{e.eventDate || '—'}</div>
              </div>
              <span className={'history-row-chevron' + (isOpen ? ' open' : '')}>
                <ChevronDown size={14} strokeWidth={2.4} />
              </span>
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px' }}>
                {summary === 'loading' && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading summary...</div>}
                {summary === 'error' && <div style={{ fontSize: 13, color: '#ef4444' }}>Could not load summary for this event.</div>}
                {summary && summary !== 'loading' && summary !== 'error' && (() => {
                  const onTime = summary.totalScans - summary.lateArrivals;
                  const pct = summary.totalScans === 0 ? null : Math.round((onTime / summary.totalScans) * 100);
                  const r = 40;
                  const circumference = 2 * Math.PI * r;
                  const dash = pct === null ? 0 : (circumference * pct) / 100;
                  return (
                    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                        <svg width="104" height="104" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg-subtle)" strokeWidth="10" />
                          {pct !== null && (
                            <circle
                              cx="50" cy="50" r={r} fill="none"
                              stroke="var(--board-amber)" strokeWidth="10" strokeLinecap="round"
                              strokeDasharray={`${dash} ${circumference - dash}`}
                            />
                          )}
                        </svg>
                        <div style={{ marginTop: 10, textAlign: 'center' }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                            {pct === null ? '—' : `${pct}%`}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>On-time rate</div>
                        </div>
                      </div>

                      <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total scans</span>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{summary.totalScans}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Late arrivals</span>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{summary.lateArrivals}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Total logged out</span>
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{summary.totalLoggedOut}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
