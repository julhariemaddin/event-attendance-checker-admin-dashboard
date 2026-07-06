import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import { api } from '../api/client.js';

// Ported from #modalNewStudent + newStudentBtn/nsCreateBtn handlers in admin.js.
// `editing`: null = create mode. A student object = edit mode (fields pre-filled,
// PUT sent with oldStudentId so the backend can find the row even if the ID itself changed).
export function NewStudentModal({ show, onClose, isV2, editing, onCreate, toast }) {
  const isEdit = !!editing;

  const [studentId, setStudentId] = useState('');
  const [lastname, setLastname] = useState('');
  const [firstname, setFirstname] = useState('');
  const [middlename, setMiddlename] = useState('');
  const [year, setYear] = useState('');
  const [program, setProgram] = useState('');
  const [deptId, setDeptId] = useState('');

  const [programOptions, setProgramOptions] = useState(null);
  const [deptOptions, setDeptOptions] = useState(null);

  useEffect(() => {
    if (!show) return;

    if (isEdit) {
      setStudentId(editing.studentId || '');
      setLastname(editing.lastname || '');
      setFirstname(editing.firstname || '');
      setMiddlename(editing.middlename || '');
      setYear(editing.year || '');
      setProgram(editing.program || '');
      setDeptId(editing.departmentId != null ? String(editing.departmentId) : '');
    } else {
      setStudentId(''); setLastname(''); setFirstname(''); setMiddlename(''); setYear(''); setProgram(''); setDeptId('');
    }
    setProgramOptions(null);
    setDeptOptions(null);

    (async () => {
      try {
        const p = await api('GET', '/api/roster/program-options');
        setProgramOptions(p);
      } catch (_) {
        setProgramOptions('error');
      }
    })();

    if (isV2) {
      (async () => {
        try {
          const d = await api('GET', '/api/roster/department-options');
          setDeptOptions(d);
        } catch (_) {
          setDeptOptions('error');
        }
      })();
    }
  }, [show, isV2, isEdit, editing]);

  async function handleSubmit() {
    const body = {
      studentId: studentId.trim(),
      lastname: lastname.trim(),
      firstname: firstname.trim(),
      middlename: middlename.trim() || null,
      year: year.trim(),
      program,
      departmentId: null,
    };
    if (!body.studentId || !body.lastname || !body.firstname || !body.year || !body.program) {
      return toast('ID, last name, first name, year, and program are required.', 'err');
    }
    if (isV2) {
      if (!deptId) return toast('Select a department.', 'err');
      body.departmentId = Number(deptId);
    }
    await onCreate(body);
  }

  return (
    <Modal show={show} onClose={onClose} title={isEdit ? 'Edit person' : 'Add person'} footer={(
      <>
        <button className="btn" onClick={onClose}>CANCEL</button>
        <button className="btn primary" onClick={handleSubmit}>{isEdit ? 'SAVE CHANGES' : 'ADD TO ROSTER'}</button>
      </>
    )}>
      <div className="field">
        <label>Student / ID number</label>
        <input type="text" placeholder="e.g. SC-25-A-00063" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
      </div>
      <div className="field-row">
        <div className="field"><label>Last name</label><input type="text" value={lastname} onChange={(e) => setLastname(e.target.value)} /></div>
        <div className="field"><label>First name</label><input type="text" value={firstname} onChange={(e) => setFirstname(e.target.value)} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Middle name (optional)</label><input type="text" value={middlename} onChange={(e) => setMiddlename(e.target.value)} /></div>
        <div className="field"><label>Year</label><input type="text" placeholder="e.g. 1st Year" value={year} onChange={(e) => setYear(e.target.value)} /></div>
      </div>
      <div className="field">
        <label>Program</label>
        <select value={program} onChange={(e) => setProgram(e.target.value)}>
          <option value="">
            {programOptions === null ? 'Select a program...' : programOptions === 'error' ? 'No programs yet — import a file first' : 'Select a program...'}
          </option>
          {Array.isArray(programOptions) && programOptions.map((p) => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>
      {isV2 && (
        <div className="field">
          <label>Department</label>
          <select value={deptId} onChange={(e) => setDeptId(e.target.value)}>
            <option value="">
              {deptOptions === null ? 'Select a department...' : (Array.isArray(deptOptions) && deptOptions.length === 0) ? 'No departments yet' : 'Select a department...'}
            </option>
            {Array.isArray(deptOptions) && deptOptions.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>
      )}
    </Modal>
  );
}