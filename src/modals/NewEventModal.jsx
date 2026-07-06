import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import { api } from '../api/client.js';

// Ported from #modalNewEvent + newEventBtn/neCreateBtn handlers in admin.js.
// Replicates the original's "load years/programs/depts on open, default all
// checked" behavior and the noYearFilter/noProgramFilter/noDeptFilter ->
// filterJson-or-null logic exactly.
export function NewEventModal({ show, onClose, isV2, onCreate, toast }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [timeLimit, setTimeLimit] = useState('');

  const [years, setYears] = useState(null);       // null = loading
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

  async function handleCreate() {
    const trimmedName = name.trim();
    if (!trimmedName || !date) return toast('Name and date are required.', 'err');

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

    await onCreate({ name: trimmedName, eventDate: date, loginTimeLimit: timeLimit || null, filterJson });
  }

  return (
    <Modal show={show} onClose={onClose} title="New event" footer={(
      <>
        <button className="btn" onClick={onClose}>CANCEL</button>
        <button className="btn primary" onClick={handleCreate}>CREATE EVENT</button>
      </>
    )}>
      <div className="field">
        <label>Event name</label>
        <input type="text" placeholder="e.g. Day 1" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field-row">
        <div className="field"><label>Event date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="field"><label>Login cutoff (optional)</label><input type="time" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} /></div>
      </div>
      <div className="field">
        <label>Attendance Scope</label>
        <div className="hint" style={{ marginBottom: 12 }}>Uncheck items to restrict attendance.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
              YEAR LEVELS {years === null && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(loading...)</span>}
              {years === 'error' && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(failed to load)</span>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Array.isArray(years) && years.length === 0 && <span className="hint">No year data yet — import a roster first.</span>}
              {Array.isArray(years) && years.map((y) => (
                <label key={y} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <input type="checkbox" checked={selectedYears.includes(y)} onChange={() => toggle(selectedYears, setSelectedYears, y)} /> {y}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
              PROGRAMS {programs === null && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(loading...)</span>}
              {programs === 'error' && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(failed to load)</span>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Array.isArray(programs) && programs.length === 0 && <span className="hint">No programs yet — import a roster first.</span>}
              {Array.isArray(programs) && programs.map((p) => (
                <label key={p.code} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <input type="checkbox" checked={selectedPrograms.includes(p.code)} onChange={() => toggle(selectedPrograms, setSelectedPrograms, p.code)} /> {p.code}
                </label>
              ))}
            </div>
          </div>
          {isV2 && Array.isArray(depts) && depts.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>DEPARTMENTS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {depts.map((code) => (
                  <label key={code} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <input type="checkbox" checked={selectedDepts.includes(code)} onChange={() => toggle(selectedDepts, setSelectedDepts, code)} /> {code}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
