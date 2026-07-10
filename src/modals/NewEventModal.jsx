import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import { api } from '../api/client.js';

// Ported from #modalNewEvent + newEventBtn/neCreateBtn handlers in admin.js.
// Replicates the original's "load years/programs/depts on open, default all
// checked" behavior and the noYearFilter/noProgramFilter/noDeptFilter ->
// filterJson-or-null logic exactly.
//
// EDIT: restructured into clearly separated sections (basic info / logout
// station / attendance scope) instead of one undifferentiated wall of
// fields, and the year/program/department lists became compact toggle
// pills with All/None shortcuts instead of long columns of checkbox rows.

function SectionCard({ title, subtitle, children }) {
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 10, marginBottom: 14, overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-base)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
          {title}
        </div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{subtitle}</div>}
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function PillGroup({ label, status, items, getKey, getLabel, selected, onToggle, onAll, onNone, emptyHint }) {
  const allOn = items.length > 0 && selected.length === items.length;
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
          {label}
          {status === 'loading' && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> — loading…</span>}
          {status === 'error' && <span style={{ color: 'var(--accent-red, #b91c1c)', fontWeight: 400 }}> — failed to load</span>}
        </div>
        {items.length > 0 && (
          <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
            <button type="button" onClick={onAll} disabled={allOn}
              style={{ background: 'none', border: 'none', padding: 0, color: allOn ? 'var(--text-muted)' : 'var(--primary, #3b82f6)', cursor: allOn ? 'default' : 'pointer', fontWeight: 700 }}>
              ALL
            </button>
            <span style={{ color: 'var(--border)' }}>·</span>
            <button type="button" onClick={onNone} disabled={selected.length === 0}
              style={{ background: 'none', border: 'none', padding: 0, color: selected.length === 0 ? 'var(--text-muted)' : 'var(--primary, #3b82f6)', cursor: selected.length === 0 ? 'default' : 'pointer', fontWeight: 700 }}>
              NONE
            </button>
          </div>
        )}
      </div>

      {items.length === 0 && status !== 'loading' && (
        <div className="hint">{emptyHint}</div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((item) => {
          const key = getKey(item);
          const on = selected.includes(key);
          return (
            <button
              type="button" key={key} onClick={() => onToggle(key)}
              style={{
                padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                border: '1px solid ' + (on ? 'var(--primary, #3b82f6)' : 'var(--border)'),
                background: on ? 'var(--primary, #3b82f6)' : 'var(--bg-base)',
                color: on ? '#fff' : 'var(--text-secondary)',
                transition: 'all .12s',
              }}
            >
              {getLabel(item)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NewEventModal({ show, onClose, isV2, onCreate, toast }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [timeLimit, setTimeLimit] = useState('');
  const [hasLogout, setHasLogout] = useState(true);

  const [years, setYears] = useState(null);       // null = loading, 'error' = failed, [] = loaded
  const [programs, setPrograms] = useState(null);
  const [depts, setDepts] = useState(null);

  const [selectedYears, setSelectedYears] = useState([]);
  const [selectedPrograms, setSelectedPrograms] = useState([]);
  const [selectedDepts, setSelectedDepts] = useState([]);

  useEffect(() => {
    if (!show) return;
    setName('');
    setDate(new Date().toISOString().slice(0, 10));
    setTimeLimit('');
    setHasLogout(true);
    setYears(null);
    setPrograms(null);
    setDepts(null);

    (async () => {
      try {
        const y = await api('GET', '/api/events/meta/years');
        setYears(y);
        setSelectedYears(y);
      } catch (_) {
        setYears('error');
      }
    })();

    (async () => {
      try {
        const p = await api('GET', '/api/events/meta/programs');
        setPrograms(p);
        setSelectedPrograms(p.map((x) => x.code));
      } catch (_) {
        setPrograms('error');
      }
    })();

    if (isV2) {
      (async () => {
        try {
          const d = await api('GET', '/api/events/meta/departments');
          setDepts(d);
          setSelectedDepts(d);
        } catch (_) {
          setDepts([]);
        }
      })();
    } else {
      setDepts([]);
    }
  }, [show, isV2]);

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  // Mirrors the backend guard in EventService.createEvent — an event with
  // nobody on the roster would reject every scan as unrecognized, so block
  // it here too instead of only finding out after a failed submit.
  const rosterLoaded = Array.isArray(years) && Array.isArray(programs);
  const noRoster = rosterLoaded && years.length === 0 && programs.length === 0;

  async function handleCreate() {
    const trimmedName = name.trim();
    if (!trimmedName || !date) return toast('Name and date are required.', 'err');
    if (noRoster) return toast('Import a student roster before creating an event.', 'err');

    const allYears = Array.isArray(years) ? years : [];
    const allPrograms = Array.isArray(programs) ? programs.map((p) => p.code) : [];
    const allDepts = Array.isArray(depts) ? depts : [];

    const noYearFilter = selectedYears.length === allYears.length;
    const noProgramFilter = selectedPrograms.length === allPrograms.length;
    const noDeptFilter = allDepts.length === 0 || selectedDepts.length === allDepts.length;

    const filterJson = (noYearFilter && noProgramFilter && noDeptFilter) ? null : JSON.stringify({
      years: noYearFilter ? [] : selectedYears,
      programs: noProgramFilter ? [] : selectedPrograms,
      departments: noDeptFilter ? [] : selectedDepts,
    });

    await onCreate({ name: trimmedName, eventDate: date, loginTimeLimit: timeLimit || null, filterJson, hasLogout });
  }

  const yearStatus = years === null ? 'loading' : years === 'error' ? 'error' : 'ready';
  const programStatus = programs === null ? 'loading' : programs === 'error' ? 'error' : 'ready';
  const yearItems = Array.isArray(years) ? years : [];
  const programItems = Array.isArray(programs) ? programs : [];
  const deptItems = Array.isArray(depts) ? depts : [];

  return (
    <Modal show={show} onClose={onClose} title="New event" footer={(
      <>
        <button className="btn" onClick={onClose}>CANCEL</button>
        <button className="btn primary" disabled={noRoster} onClick={handleCreate}>CREATE EVENT</button>
      </>
    )}>
      {noRoster && (
        <div style={{
          marginBottom: 16, padding: '10px 12px', borderRadius: 8,
          background: 'var(--accent-red-tint, #fdecea)', color: 'var(--accent-red, #b91c1c)', fontSize: 13,
        }}>
          No students in this profile's roster yet — import a roster first. An event can't be created until there's someone to check in.
        </div>
      )}

      <SectionCard title="Basic Info">
        <div className="field" style={{ marginBottom: 12 }}>
          <label>Event name</label>
          <input type="text" placeholder="e.g. Day 1" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field-row">
          <div className="field"><label>Event date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="field"><label>Login cutoff (optional)</label><input type="time" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} /></div>
        </div>
      </SectionCard>

      <SectionCard title="Logout Station">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          <input type="checkbox" checked={hasLogout} onChange={(e) => setHasLogout(e.target.checked)} />
          Enable logout station
        </label>
        <div className="hint" style={{ marginTop: 8 }}>
          {hasLogout
            ? 'Students can scan out — attendance requires both login and logout to count as complete.'
            : 'No logout for this event — a single scan-in is the full attendance record. The Logout option will be greyed out on the scanner, and reports will count everyone who logged in as attended.'}
        </div>
      </SectionCard>

      <SectionCard title="Attendance Scope" subtitle="Everything is included by default — tap to exclude specific groups.">
        <PillGroup
          label="YEAR LEVELS" status={yearStatus} items={yearItems}
          getKey={(y) => y} getLabel={(y) => y}
          selected={selectedYears}
          onToggle={(y) => toggle(selectedYears, setSelectedYears, y)}
          onAll={() => setSelectedYears(yearItems)}
          onNone={() => setSelectedYears([])}
          emptyHint="No year data yet — import a roster first."
        />
        <div style={{ height: 14 }} />
        <PillGroup
          label="PROGRAMS" status={programStatus} items={programItems}
          getKey={(p) => p.code} getLabel={(p) => p.code}
          selected={selectedPrograms}
          onToggle={(code) => toggle(selectedPrograms, setSelectedPrograms, code)}
          onAll={() => setSelectedPrograms(programItems.map((p) => p.code))}
          onNone={() => setSelectedPrograms([])}
          emptyHint="No programs yet — import a roster first."
        />
        {isV2 && deptItems.length > 0 && (
          <>
            <div style={{ height: 14 }} />
            <PillGroup
              label="DEPARTMENTS" status="ready" items={deptItems}
              getKey={(code) => code} getLabel={(code) => code}
              selected={selectedDepts}
              onToggle={(code) => toggle(selectedDepts, setSelectedDepts, code)}
              onAll={() => setSelectedDepts(deptItems)}
              onNone={() => setSelectedDepts([])}
              emptyHint=""
            />
          </>
        )}
      </SectionCard>
    </Modal>
  );
}
