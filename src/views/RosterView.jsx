import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Ported from #view-roster markup + populateRosterDeptSelect/renderRoster in admin.js.
//
// PERF: at 8,000-10,000 students, filtering/re-rendering the full matched list on
// every keystroke is what made typing feel laggy — not the search algorithm
// itself. Fixes:
//   1. The text field's value updates instantly (feels responsive), but the
//      value actually used for filtering is debounced ~180ms behind it, so
//      the expensive filter+render only runs once typing pauses.
//   2. Program sections default to COLLAPSED, and collapsed sections never
//      mount their row DOM at all (see the AnimatePresence block below) —
//      so switching to "All programs" with a large roster only ever costs
//      rendering the section headers/counts until something is opened.
//   3. Rows are capped PER PROGRAM (not globally — see BUGFIX note below)
//      so an individual very-large expanded program doesn't hang the tab.
const SEARCH_DEBOUNCE_MS = 180;

export function RosterView({ roster, downloadRosterExport, onNewStudent, onEditStudent, onDeleteStudent }) {
  const depts = roster.departments || [];
  const [deptIdx, setDeptIdx] = useState(0);
  const [programIdx, setProgramIdx] = useState(-1);
  const [yearFilter, setYearFilter] = useState('ALL');
  const [searchInput, setSearchInput] = useState(''); // what the text field shows, updates instantly
  const [search, setSearch] = useState('');            // debounced value actually used for filtering
  const [collapsed, setCollapsed] = useState({}); // programName -> bool
  const debounceRef = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const safeDeptIdx = deptIdx < depts.length ? deptIdx : 0;
  const dept = depts[safeDeptIdx];
  const programs = dept ? dept.programs : [];
  const totalStudents = depts.reduce((sum, d) =>
    sum + d.programs.reduce((s2, p) => s2 + p.years.reduce((s3, y) => s3 + y.students.length, 0), 0), 0);

  // Distinct years across the selected department's programs, sorted —
  // scoped the same way the Program dropdown already is (per-department),
  // so switching department also narrows which years are even offered.
  const availableYears = useMemo(() => {
    const set = new Set();
    programs.forEach((p) => p.years.forEach((y) => set.add(y.year)));
    return [...set].sort();
  }, [programs]);

  const q = search.toLowerCase().trim();

  const matchedPrograms = useMemo(() => {
    if (!dept) return [];
    const programsToShow = programIdx === -1 ? dept.programs : [dept.programs[programIdx]].filter(Boolean);
    return programsToShow
      .map((program) => {
        const yearBlocks = program.years
          .filter((yg) => yearFilter === 'ALL' || yg.year === yearFilter)
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
  }, [dept, programIdx, yearFilter, q]);

  const filteredCount = matchedPrograms.reduce((n, p) => n + p.count, 0);

  // BUGFIX: the previous version capped MAX_RENDERED_ROWS across ALL
  // programs combined using one shared counter — if the first program
  // alone had more matches than the cap, the loop broke before ever
  // reaching the second program, making "All programs" silently show
  // only one. Capping is now per-program instead, so every program
  // always gets its own header + count, regardless of how big any other
  // program is. Combined with defaulting sections to collapsed below,
  // rows for a program aren't actually rendered into the DOM at all
  // until that section is opened — which is the real fix for the
  // original lag, not the row cap.
  const PER_PROGRAM_ROW_CAP = 300;
  const renderedPrograms = useMemo(() => {
    return matchedPrograms.map((program) => {
      let remaining = PER_PROGRAM_ROW_CAP;
      const yearBlocks = [];
      for (const yb of program.yearBlocks) {
        if (remaining <= 0) break;
        const rows = yb.rows.slice(0, remaining);
        remaining -= rows.length;
        yearBlocks.push({ year: yb.year, rows });
      }
      const shown = yearBlocks.reduce((n, b) => n + b.rows.length, 0);
      return { programName: program.programName, yearBlocks, count: program.count, truncated: shown < program.count };
    });
  }, [matchedPrograms]);

  function handleDeptChange(e) {
    setDeptIdx(Number(e.target.value));
    setProgramIdx(-1);
    setYearFilter('ALL');
  }

  // Default to collapsed when browsing "All programs" with no active
  // search — this is what actually avoids rendering thousands of rows at
  // once, per the fix above. Picking one specific program from the
  // dropdown, or typing a search query, auto-expands since that's an
  // explicit narrowing action — the person clearly wants to see the result.
  function isProgramCollapsedByDefault() {
    return programIdx === -1 && !q && matchedPrograms.length > 1;
  }
  function isProgramCollapsed(name) {
    const explicit = collapsed[name];
    return explicit !== undefined ? explicit : isProgramCollapsedByDefault();
  }
  function toggleProgram(name) {
    setCollapsed((prev) => ({ ...prev, [name]: !isProgramCollapsed(name) }));
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button className="roster-search-clear" onClick={() => setSearchInput('')} aria-label="Clear search">✕</button>
            )}
          </div>
          <button className="btn" onClick={downloadRosterExport} download>⇩ EXPORT CSV</button>
          <button
            className="btn primary"
            disabled={totalStudents === 0}
            title={totalStudents === 0 ? 'Import a roster first' : undefined}
            style={totalStudents === 0 ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
            onClick={onNewStudent}
          >
            + ADD PERSON
          </button>
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
          <div className="field" style={{ margin: 0, flex: 1, minWidth: 160 }}>
            <label>Year</label>
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              <option value="ALL">All years</option>
              {availableYears.map((y) => <option key={y} value={y}>Year {y}</option>)}
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
          <div className="ed">Import a roster file first from the Import tab.</div>
        </div>
      ) : renderedPrograms.length === 0 ? (
        <div className="empty-state">
          <div className="et">No matches found</div>
          <div className="ed">Try a different name, ID, or clear the search.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {renderedPrograms.map((program, pi) => {
            const isCollapsed = isProgramCollapsed(program.programName);
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
                        {program.truncated && (
                          <div style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-muted)' }}>
 Showing the first {program.yearBlocks.reduce((n, b) => n + b.rows.length, 0)} of {program.count} in this program - narrow your search to see the rest.
                          </div>
                        )}
                        {program.yearBlocks.map((yb, yi) => (
                          <div key={yi} style={{ marginBottom: 4 }}>
                            <div className="roster-year-chip">Year {yb.year}</div>
                            <div className="roster-row-list">
                              {yb.rows.map((s) => (
                                <div className="roster-row" key={s.studentId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span className="roster-avatar">{initials(s)}</span>
                                  <div className="roster-row-info">
                                    <span className="roster-row-name">{s.lastname}, {s.firstname} {s.middlename ? s.middlename[0] + '.' : ''}{s.suffix ? ' ' + s.suffix : ''}</span>
                                    <span className="roster-row-id mono">{s.studentId}</span>
                                  </div>
                                  <div className="roster-row-actions" style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                                    <button
                                      type="button"
                                      className="btn"
                                      title="Edit"
                                      onClick={() => onEditStudent(s)}
                                      style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      ✎
                                    </button>
                                    <button
                                      type="button"
                                      className="btn danger"
                                      title="Delete"
                                      onClick={() => onDeleteStudent(s)}
                                      style={{ width: 32, height: 32, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
