// Ported from #view-events markup + renderEventsTable/statusBadge in admin.js.
function StatusBadge({ status }) {
  if (status === 'RUNNING') return <span className="badge b-green">RUNNING</span>;
  if (status === 'PAUSED') return <span className="badge b-amber">PAUSED</span>;
  if (status === 'STOPPED') return <span className="badge b-grey">STOPPED</span>;
  return <span className="badge b-grey">{status}</span>;
}

export function EventsView({ events, onNewEvent, onMonitor, onHistory, onReports, onDeleteClick }) {
  return (
    <div className="view active" id="view-events">
      <div className="view-header">
        <div>
          <div className="view-title">Events</div>
 <div className="view-desc">Each event is one login/logout session window - create one before scanning starts.</div>
        </div>
        <button className="btn primary" onClick={onNewEvent}>NEW EVENT</button>
      </div>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table>
          <thead>
            <tr><th>Event</th><th>Date</th><th>Login cutoff</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td><strong>{e.name}</strong> <span className="mono" style={{ color: 'var(--text-muted)' }}>#{e.id}</span></td>
 <td className="mono">{e.eventDate || '-'}</td>
 <td className="mono">{e.loginTimeLimit || '-'}</td>
                <td><StatusBadge status={e.status} /></td>
                <td>
                  <div className="row-actions">
                    {e.status === 'STOPPED'
                      ? <button className="btn small" onClick={() => onHistory(e.id)}>HISTORY</button>
                      : <button className="btn small" onClick={() => onMonitor(e.id)}>MONITOR</button>}
                    {e.status === 'STOPPED' && <button className="btn small" onClick={() => onReports(e.id)}>REPORTS</button>}
                    {e.status === 'STOPPED' && <button className="btn small danger" onClick={() => onDeleteClick(e.id, e.name)}>DELETE</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
