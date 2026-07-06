import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Ported from #view-roster markup + populateRosterDeptSelect/renderRoster in admin.js.
export function RosterView({ roster, onExportUrl, onNewStudent, onEditStudent, onDeleteStudent }) {
  const depts = roster.departments || [];
  const [deptIdx, setDeptIdx] = useState(0);
  const [programIdx, setProgramIdx] = useState(-1);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({}); // programName -> bool

  const safeDeptIdx = deptIdx < depts.length ? deptIdx : 0;
  const dept = depts[safeDeptIdx];
  const programs = dept ? dept.programs : [];
  const totalStudents = depts.reduce((sum, d) =>
    sum + d.programs.reduce((s2, p) => s2 + p.years.reduce((s3, y) => s3 + y.students.length, 0), 0), 0);

  const q = search.toLowerCase().trim();

  const renderedPrograms = useMemo(() => {
    if (!dept) return [];
    const programsToShow = programIdx === -1 ? dept.programs : [dept.programs[programIdx]].filter(Boolean);
    return programsToShow
      .map((program) => {
        const yearBlocks = program.years
          .map((yg) => {
            const rows = yg.students.filter((s) => {
              if (!q) return true;
              return (s.studentId || '').toLowerCase().includes(q)
                || (s.lastname || '').toLowerCase().includes(q)
                || (s.firstname || '').toLowerCase().includes(q);
            });
            if (!rows.length) return null;
            return { year: yg.year, rows };
          })
          .filter(Boolean);
        if (!yearBlocks.length) return null;
        const count = yearBlocks.reduce((n, yb) => n + yb.rows.length, 0);
        return { programName: program.programName, yearBlocks, count };
      })
      .filter(Boolean);
  }, [dept, programIdx, q]);

  const filteredCount = renderedPrograms.reduce((n, p) => n + p.count, 0);

  function handleDeptChange(e) {
    setDeptIdx(Number(e.target.value));
    setProgramIdx(-1);
  }

  function toggleProgram(name) {
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  function initials(s) {
    const a = (s.firstname || '').charAt(0);
    const b = (s.lastname || '').charAt(0);
    return (a + b).toUpperCase() || '?';
  }

  return (
    <div className="view active" id="view-roster">
      <div className="view-header">
        <div>
          <div className="view-title">Roster</div>
          <div className="view-desc">Everyone registered in the active profile, manually entered or imported from a file.</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="roster-search-wrap">
            <span className="roster-search-icon">⌕</span>
            <input
              type="text" className="mono roster-search-input" placeholder="Search name or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="roster-search-clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>
            )}
          </div>
          <a className="btn" href={onExportUrl} download>⇩ EXPORT CSV</a>
          <button className="btn primary" onClick={onNewStudent}>+ ADD PERSON</button>
        </div>
      </div>

      {/* Filters + summary */}
      <div className="card roster-filter-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 200 }}>
            <label>Department</label>
            <select value={safeDeptIdx} onChange={handleDeptChange}>
              {depts.length === 0
                ? <option value="">No departments yet</option>
                : depts.map((d, i) => <option key={i} value={i}>{d.departmentLabel}</option>)}
            </select>
          </div>
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 200 }}>
            <label>Program</label>
            <select value={programIdx} onChange={(e) => setProgramIdx(Number(e.target.value))}>
              <option value={-1}>All programs</option>
              {programs.map((p, i) => <option key={i} value={i}>{p.programName}</option>)}
            </select>
          </div>
          <div className="roster-summary-chip">
            <span className="roster-summary-num">{filteredCount}</span>
            <span className="roster-summary-label">{q ? `of ${totalStudents} match` : 'enrolled'}</span>
          </div>
        </div>
      </div>

      {totalStudents === 0 ? (
        <div className="empty-state">
          <div className="et">Roster is empty</div>
          <div className="ed">Add people manually, or import a roster file from the Import tab.</div>
        </div>
      ) : renderedPrograms.length === 0 ? (
        <div className="empty-state">
          <div className="et">No matches found</div>
          <div className="ed">Try a different name, ID, or clear the search.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {renderedPrograms.map((program, pi) => {
            const isCollapsed = !!collapsed[program.programName];
            return (
              <div className="card roster-program-card2" key={pi}>
                <button className="roster-program-head2" onClick={() => toggleProgram(program.programName)}>
                  <span className="roster-program-chevron" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▾</span>
                  <span className="roster-program-title">{program.programName}</span>
                  <span className="roster-program-count">{program.count}</span>
                </button>

                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '4px 6px 14px' }}>
                        {program.yearBlocks.map((yb, yi) => (
                          <div key={yi} style={{ marginBottom: 4 }}>
                            <div className="roster-year-chip">Year {yb.year}</div>
                            <div className="roster-row-list">
                              {yb.rows.map((s) => (
                                <div className="roster-row" key={s.studentId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span className="roster-avatar">{initials(s)}</span>
                                  <div className="roster-row-info">
                                    <span className="roster-row-name">{s.lastname}, {s.firstname} {s.middlename ? s.middlename[0] + '.' : ''}</span>
                                    <span className="roster-row-id mono">{s.studentId}</span>
                                  </div>
                                  <div className="roster-row-actions" style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                                    <button
                                      type="button"
                                      className="btn"
                                      title="Edit"
                                      onClick={() => onEditStudent(s)}
                                      style={{ width: 30, height: 30, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      ✎
                                    </button>
                                    <button
                                      type="button"
                                      className="btn"
                                      title="Delete"
                                      onClick={() => onDeleteStudent(s)}
                                      style={{ width: 30, height: 30, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e74c3c' }}
                                    >
                                      🗑
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}