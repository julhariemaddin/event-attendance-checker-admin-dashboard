import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';

// Ported from #modalManualEntry + openManualEntry()/meCreateBtn handler in admin.js.
export function ManualEntryModal({ show, onClose, scannedId, isV2, discoveredDepartments, onComplete, toast }) {
  const [lastname, setLastname] = useState('');
  const [firstname, setFirstname] = useState('');
  const [middlename, setMiddlename] = useState('');
  const [year, setYear] = useState('');
  const [program, setProgram] = useState('');
  const [dept, setDept] = useState('');

  useEffect(() => {
    if (show) {
      setLastname(''); setFirstname(''); setMiddlename(''); setYear(''); setProgram(''); setDept('');
    }
  }, [show]);

  async function handleComplete() {
    const body = {
      studentId: scannedId,
      lastname: lastname.trim(),
      firstname: firstname.trim(),
      middlename: middlename.trim() || null,
      year: year.trim(),
      program: program.trim(),
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
        <div className="field"><label>Year</label><input type="text" placeholder="e.g. 1st Year" value={year} onChange={(e) => setYear(e.target.value)} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Program</label><input type="text" placeholder="e.g. BSCS" value={program} onChange={(e) => setProgram(e.target.value)} /></div>
        {isV2 && (
          <div className="field"><label>Department code</label><input type="text" placeholder="e.g. CCS" value={dept} onChange={(e) => setDept(e.target.value)} /></div>
        )}
      </div>
    </Modal>
  );
}
