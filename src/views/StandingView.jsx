import { useEffect, useMemo, useState } from 'react';
import { api, API_BASE } from '../api/client.js';
import { StudentStandingModal } from '../modals/StudentStandingModal.jsx';

// Per-student attendance standing across every STOPPED event, honoring
// each event's own filter (an event's filter not matching a student
// excludes them from that event entirely; filter matching but no record
// at all counts as an absence, not a gap). Grouped Department (v2 only)
// -> Program -> Year -> Surname, matching a real clearance sheet.
//
// Deliberately monochrome, matching the rest of the app's design system —
// attendance rate is plain numbers/grayscale bars, no traffic-light color
// tiers. The only color anywhere in this view is the cleared/not-cleared
// state, same green-vs-neutral pattern as the server connection dot.
const SEARCH_DEBOUNCE_MS = 180;

async function downloadClearanceReport(toast) {
  const token = sessionStorage.getItem('aseado_jwt');
  try {
    const res = await fetch(API_BASE + '/api/analytics/clearance-report', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Server rejected the request (' + res.status + ')');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = 'Clearance_Report.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    toast('Export failed: ' + err.message, 'err');
  }
}

export function StandingView({ isV2, toast }) {
  const [rows, setRows] = useState(null); // null = loading
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => { load(search); }, [search]);

  async function load(q) {
    try {
      const qs = q ? '?search=' + encodeURIComponent(q) : '';
      const data = await api('GET', '/api/analytics/standing' + qs);
      setRows(data);
    } catch (_) {
      setRows([]);
    }
  }

  async function setClearance(studentId, cleared, reason) {
    await api('POST', '/api/analytics/clearance/' + encodeURIComponent(studentId), { cleared, reason });
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, cleared, reason } : r)));
  }

  async function handleExport() {
    setExporting(true);
    await downloadClearanceReport(toast);
    setExporting(false);
  }

  const summary = useMemo(() => {
    if (!rows) return null;
    const withEligibility = rows.filter((r) => r.eligibleEvents > 0);
    const avg = withEligibility.length
      ? withEligibility.reduce((n, r) => n + r.attendanceRate, 0) / withEligibility.length
      : 0;
    return {
      avg,
      cleared: rows.filter((r) => r.cleared).length,
      atRisk: withEligibility.filter((r) => r.attendanceRate < 50).length,
      total: rows.length,
    };
  }, [rows]);

  // Group: Department (v2 only) -> Program -> Year, sorted, rows within
  // each Year sorted by surname. A flat single-level group key keeps the
  // render simple — three nested loops read worse than one map keyed by
  // a composite string.
  const groups = useMemo(() => {
    if (!rows) return [];
    const byKey = new Map();
    for (const r of rows) {
      const dept = isV2 ? (r.departmentCode || 'Unassigned') : null;
      const key = [dept, r.program || 'Unassigned', r.year || 'Unassigned'].filter(Boolean).join(' · ');
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(r);
    }
    return [...byKey.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, students]) => ({
        key,
        students: [...students].sort((a, b) => a.lastname.localeCompare(b.lastname)),
      }));
  }, [rows, isV2]);

  function toggleGroup(key) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (rows === null) {
    return (
      <div className="view active">
        <div className="empty-state"><div className="et">Loading standing…</div></div>
      </div>
    );
  }

  return (
    <div className="view active" id="view-standing">
      <div className="view-header">
        <div>
          <div className="view-title">Student Attendance Standing</div>
          <div className="view-desc">
            Attendance rate across every stopped event, scoped to each event's own filter.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text" className="mono" placeholder="Search name or ID…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ width: 220, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: 13 }}
          />
          <button className="btn" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Generating…' : 'Export report'}
          </button>
        </div>
      </div>

      {summary && (
        <div className="stat-grid">
          <div className="card stat-card">
            <div className="stat-label">Average attendance</div>
            <div className="stat-value">{summary.avg.toFixed(0)}%</div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">Cleared</div>
            <div className="stat-value">{summary.cleared}</div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">Below 50% attendance</div>
            <div className="stat-value">{summary.atRisk}</div>
          </div>
          <div className="card stat-card">
            <div className="stat-label">Total students</div>
            <div className="stat-value">{summary.total}</div>
          </div>
        </div>
      )}

      {rows.length === 0 && (
        <div className="empty-state">
          <div className="et">No students{search ? ' match that search' : ' yet'}</div>
          <div className="ed">Standing is computed from stopped events — nothing to show until at least one event has concluded.</div>
        </div>
      )}

      {groups.length > 0 && (
        <div className="standing-list-head">
          <span>ID</span>
          <span>Name</span>
          <span>Attendance</span>
          <span>Status</span>
        </div>
      )}

      {groups.map((group) => {
        const isCollapsed = !!collapsed[group.key];
        const eligible = group.students.filter((s) => s.eligibleEvents > 0);
        const groupAvg = eligible.length
          ? Math.round(eligible.reduce((n, s) => n + s.attendanceRate, 0) / eligible.length)
          : null;

        return (
          <div key={group.key} className="card standing-group">
            <button className="standing-group-head" onClick={() => toggleGroup(group.key)}>
              <span className="standing-group-chevron">{isCollapsed ? '▶' : '▼'}</span>
              <span className="standing-group-title">{group.key}</span>
              {groupAvg !== null && <span className="standing-group-avg">avg {groupAvg}%</span>}
              <span className="standing-group-count">{group.students.length}</span>
            </button>

            {!isCollapsed && group.students.map((r) => (
              <div key={r.studentId} className="standing-row" style={{ cursor: 'pointer' }} onClick={() => setSelectedStudent(r)}>
                <span className="standing-row-id">{r.studentId}</span>
                <span className="standing-row-name">{r.lastname}, {r.firstname}</span>
                <div className="standing-row-progress">
                  <span className="standing-row-count">
                    {r.eligibleEvents === 0 ? 'no data' : `${r.presentCount}/${r.eligibleEvents}`}
                  </span>
                  <span className="standing-row-bar-track">
                    <span className="standing-row-bar-fill" style={{ width: `${r.attendanceRate}%` }} />
                  </span>
                  <span className="standing-row-pct">
                    {r.eligibleEvents === 0 ? '—' : `${Math.round(r.attendanceRate)}%`}
                  </span>
                </div>
                <span className={'standing-clear-badge' + (r.cleared ? ' cleared' : '')}>
                  {r.cleared ? 'Cleared' : 'Not cleared'}
                </span>
              </div>
            ))}
          </div>
        );
      })}
      <StudentStandingModal
        show={!!selectedStudent}
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onSubmit={setClearance}
      />
    </div>
  );
}
