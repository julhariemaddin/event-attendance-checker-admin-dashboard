import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import { api } from '../api/client.js';

// Ported from #modalManualEntry + openManualEntry()/meCreateBtn handler in admin.js.
// EDIT: Department/Year/Program dropdowns are scoped to THIS EVENT's own
// filterJson via /api/events/{eventId}/manual-entry-options — not the
// entire profile roster — and cascade further as staff pick a department
// or program, per improvement #1.
export function ManualEntryModal({ show, onClose, eventId, scannedId, isV2, onComplete, toast }) {
  const [lastname, setLastname] = useState('');
  const [firstname, setFirstname] = useState('');
  const [middlename, setMiddlename] = useState('');
  const [year, setYear] = useState('');
  const [program, setProgram] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [years, setYears] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    if (show) {
      setLastname(''); setFirstname(''); setMiddlename('');
      setYear(''); setProgram(''); setDepartmentId('');
    }
  }, [show]);

  // Re-fetch options whenever the modal opens, or the department/program
  // selection changes — this is the cascade: pick a department, the
  // program list narrows; pick a program, the year list narrows.
  useEffect(() => {
    if (!show || !eventId) return;
    setLoadingOptions(true);
    const params = new URLSearchParams();
    if (departmentId) params.set('departmentId', departmentId);
    if (program) params.set('program', program);
    const qs = params.toString() ? '?' + params.toString() : '';
    api('GET', `/api/events/${eventId}/manual-entry-options${qs}`)
      .then((opts) => {
        setDepartments(opts.departments || []);
        setPrograms(opts.programs || []);
        setYears(opts.years || []);
      })
      .catch(() => {
        setDepartments([]); setPrograms([]); setYears([]);
        toast('Could not load filter options for this event.', 'err');
      })
      .finally(() => setLoadingOptions(false));
  }, [show, eventId, departmentId, program]);

  function handleDepartmentChange(id) {
    setDepartmentId(id);
    // Changing department invalidates any program/year picked under the old one.
    setProgram('');
    setYear('');
  }

  function handleProgramChange(code) {
    setProgram(code);
    setYear('');
  }

  async function handleComplete() {
    const body = {
      studentId: scannedId,
      lastname: lastname.trim(),
      firstname: firstname.trim(),
      middlename: middlename.trim() || null,
      year, program,
      departmentId: isV2 ? (Number(departmentId) || null) : null,
    };
    if (!body.lastname || !body.firstname || !body.year || !body.program) {
      return toast('Last name, first name, year, and program are required.', 'err');
    }
    if (isV2 && !body.departmentId) {
      return toast('Department is required for V2 profiles.', 'err');
    }
    await onComplete(body);
  }

  return (
    <Modal show={show} onClose={onClose} title="Complete unknown entry" footer={(
      <>
        <button className="btn" onClick={onClose}>DISMISS</button>
        <button className="btn primary" onClick={handleComplete}>COMPLETE LOGIN</button>
      </>
    )}>
      <p style={{ margin: '0 0 16px', fontSize: 13, lineHeight: 1.6 }}>
        ID <strong className="mono">{scannedId}</strong> isn't registered. Fill in details to complete login.
      </p>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-muted)' }}>
        Only programs/years/departments allowed by this event's filter are shown below.
      </p>
      <div className="field-row">
        <div className="field"><label>Last name</label><input type="text" value={lastname} onChange={(e) => setLastname(e.target.value)} /></div>
        <div className="field"><label>First name</label><input type="text" value={firstname} onChange={(e) => setFirstname(e.target.value)} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Middle name (optional)</label><input type="text" value={middlename} onChange={(e) => setMiddlename(e.target.value)} /></div>
        {isV2 && (
          <div className="field">
            <label>Department</label>
            <select value={departmentId} onChange={(e) => handleDepartmentChange(e.target.value)} disabled={loadingOptions}>
              <option value="">{departments.length === 0 ? 'No departments in this event\'s filter' : 'Select...'}</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.code}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="field-row">
        <div className="field">
          <label>Program</label>
          <select value={program} onChange={(e) => handleProgramChange(e.target.value)} disabled={loadingOptions}>
            <option value="">{programs.length === 0 ? 'No programs available' : 'Select...'}</option>
            {programs.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Year</label>
          <select value={year} onChange={(e) => setYear(e.target.value)} disabled={loadingOptions}>
            <option value="">{years.length === 0 ? 'No years available' : 'Select...'}</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}
