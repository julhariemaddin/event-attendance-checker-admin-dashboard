import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import { api } from '../api/client.js';

// Ported from #modalManualEntry + openManualEntry()/meCreateBtn handler in admin.js.
// EDIT: Year and Program are now real dropdowns sourced from
// /api/events/meta/years and /api/events/meta/programs (already existing
// endpoints), instead of free-text fields, per improvement #1.
export function ManualEntryModal({ show, onClose, scannedId, isV2, discoveredDepartments, onComplete, toast }) {
  const [lastname, setLastname] = useState('');
  const [firstname, setFirstname] = useState('');
  const [middlename, setMiddlename] = useState('');
  const [year, setYear] = useState('');
  const [program, setProgram] = useState('');
  const [dept, setDept] = useState('');
  const [years, setYears] = useState([]);
  const [programs, setPrograms] = useState([]);

  useEffect(() => {
    if (show) {
      setLastname(''); setFirstname(''); setMiddlename(''); setYear(''); setProgram(''); setDept('');
      // Pull real, currently-known values instead of leaving these as free text.
      api('GET', '/api/events/meta/years').then(setYears).catch(() => setYears([]));
      api('GET', '/api/events/meta/programs').then(setPrograms).catch(() => setPrograms([]));
    }
  }, [show]);

  async function handleComplete() {
    const body = {
      studentId: scannedId,
      lastname: lastname.trim(),
      firstname: firstname.trim(),
      middlename: middlename.trim() || null,
      year, program,
      departmentId: null,
    };
    if (!body.lastname || !body.firstname || !body.year || !body.program) {
      return toast('Last name, first name, year, and program are required.', 'err');
    }
    if (isV2) {
      const deptCode = dept.trim();
      if (!deptCode) return toast('Department code is required for V2 profiles.', 'err');
      const match = discoveredDepartments.find((d) => d.code === deptCode);
      body.departmentId = match ? match.id : null;
      if (!match) {
        toast('New department code "' + deptCode + '" — not yet known to this profile. Import a file with this department first.', 'err');
      }
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
      <div className="field-row">
        <div className="field"><label>Last name</label><input type="text" value={lastname} onChange={(e) => setLastname(e.target.value)} /></div>
        <div className="field"><label>First name</label><input type="text" value={firstname} onChange={(e) => setFirstname(e.target.value)} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Middle name (optional)</label><input type="text" value={middlename} onChange={(e) => setMiddlename(e.target.value)} /></div>
        <div className="field">
          <label>Year</label>
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">Select...</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Program</label>
          <select value={program} onChange={(e) => setProgram(e.target.value)}>
            <option value="">Select...</option>
            {programs.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
          </select>
        </div>
        {isV2 && (
          <div className="field"><label>Department code</label><input type="text" placeholder="e.g. CCS" value={dept} onChange={(e) => setDept(e.target.value)} /></div>
        )}
      </div>
    </Modal>
  );
}
