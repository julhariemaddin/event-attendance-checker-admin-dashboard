// Ported from #view-events markup + renderEventsTable/statusBadge in admin.js.
// Rebuilt as a literal departure board: an event is a scheduled window with
// a status, exactly like a flight — so it's rendered as board rows instead
// of a generic data table.
function StatusBadge({ status }) {
  if (status === 'RUNNING') return <span className="badge b-green">Running</span>;
  if (status === 'PAUSED') return <span className="badge b-amber">Paused</span>;
  if (status === 'STOPPED') return <span className="badge b-grey">Stopped</span>;
  return <span className="badge b-grey">{status}</span>;
}

export function EventsView({ events, onNewEvent, onMonitor, onHistory, onReports, onDeleteClick }) {
  return (
    <div className="view active" id="view-events">
      <div className="view-header">
        <div>
          <div className="view-title">Events</div>
          <div className="view-desc">Each event is one login/logout session window — create one before scanning starts.</div>
        </div>
        <button className="btn primary" onClick={onNewEvent}>New event</button>
      </div>

      <div className="card board-list" style={{ padding: 0 }}>
        <div className="board-list-head">
          <span>Event</span>
          <span style={{ textAlign: 'center' }}>Date</span>
          <span style={{ textAlign: 'center' }}>Cutoff</span>
          <span style={{ textAlign: 'center' }}>Status</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>
        {events.map((e) => (
          <div className="board-row" key={e.id}>
            <div>
              <span className="board-row-code">#{e.id}</span>
              <span className="board-row-name">{e.name}</span>
            </div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>{e.eventDate || '—'}</div>
            <div className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>{e.loginTimeLimit || '—'}</div>
            <div style={{ textAlign: 'center' }}><StatusBadge status={e.status} /></div>
            <div className="row-actions">
              {e.status === 'STOPPED'
                ? <button className="btn small" onClick={() => onHistory(e.id)}>History</button>
                : <button className="btn small" onClick={() => onMonitor(e.id)}>Monitor</button>}
              {e.status === 'STOPPED' && <button className="btn small" onClick={() => onReports(e.id)}>Reports</button>}
              {e.status === 'STOPPED' && <button className="btn small danger" onClick={() => onDeleteClick(e.id, e.name)}>Delete</button>}
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div className="empty-state" style={{ border: 'none' }}>
            <div className="et">No events yet</div>
            <div className="ed">Create your first event to start accepting scans.</div>
          </div>
        )}
      </div>
    </div>
  );
}
