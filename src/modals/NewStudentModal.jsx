import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import { api } from '../api/client.js';

// Ported from #modalNewStudent + newStudentBtn/nsCreateBtn handlers in admin.js.
// `editing`: null = create mode. A student object = edit mode (fields pre-filled,
// PUT sent with oldStudentId so the backend can find the row even if the ID itself changed).
// EDIT: Year is now a dropdown sourced from /api/roster/year-options, same
// treatment as Program — never free text, only real values already in the
// roster. Applies in both V1 and V2; Department dropdown (V2-only) unchanged.
// EDIT: added an optional Suffix field (Jr., Sr., III, etc.) as a preset
// dropdown rather than free text, so it stays consistent across the
// roster instead of "Jr" vs "Jr." vs "JR" showing up inconsistently in
// reports and exports.
const SUFFIX_OPTIONS = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];

export function NewStudentModal({ show, onClose, isV2, editing, onCreate, toast }) {
  const isEdit = !!editing;

  const [studentId, setStudentId] = useState('');
  const [lastname, setLastname] = useState('');
  const [firstname, setFirstname] = useState('');
  const [middlename, setMiddlename] = useState('');
  const [suffix, setSuffix] = useState('');
  const [year, setYear] = useState('');
  const [program, setProgram] = useState('');
  const [deptId, setDeptId] = useState('');

  const [yearOptions, setYearOptions] = useState(null);
  const [programOptions, setProgramOptions] = useState(null);
  const [deptOptions, setDeptOptions] = useState(null);

  useEffect(() => {
    if (!show) return;

    if (isEdit) {
      setStudentId(editing.studentId || '');
      setLastname(editing.lastname || '');
      setFirstname(editing.firstname || '');
      setMiddlename(editing.middlename || '');
      setSuffix(editing.suffix || '');
      setYear(editing.year || '');
      setProgram(editing.program || '');
      setDeptId(editing.departmentId != null ? String(editing.departmentId) : '');
    } else {
      setStudentId(''); setLastname(''); setFirstname(''); setMiddlename(''); setSuffix('');
      setYear(''); setProgram(''); setDeptId('');
    }
    setYearOptions(null);
    setProgramOptions(null);
    setDeptOptions(null);

    (async () => {
      try {
        const y = await api('GET', '/api/roster/year-options');
        setYearOptions(y);
      } catch (_) {
        setYearOptions('error');
      }
    })();

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
      suffix: suffix || null,
      year,
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
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={handleSubmit}>{isEdit ? 'Save changes' : 'Add to roster'}</button>
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
        <div className="field">
          <label>Suffix (optional)</label>
          <select value={suffix} onChange={(e) => setSuffix(e.target.value)}>
            <option value="">None</option>
            {SUFFIX_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Year</label>
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">
 {yearOptions === null ? 'Loading...' : yearOptions === 'error' || (Array.isArray(yearOptions) && yearOptions.length === 0) ? 'No years yet - import a file first' : 'Select a year...'}
            </option>
            {Array.isArray(yearOptions) && yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
            {/* Edit mode may have a year value that isn't in the discovered
 list yet (e.g. the roster was later trimmed) - keep it
                selectable so editing doesn't silently blank a valid field. */}
            {isEdit && year && Array.isArray(yearOptions) && !yearOptions.includes(year) && (
              <option value={year}>{year}</option>
            )}
          </select>
        </div>
      </div>
      <div className="field">
        <label>Program</label>
        <select value={program} onChange={(e) => setProgram(e.target.value)}>
          <option value="">
 {programOptions === null ? 'Select a program...' : programOptions === 'error' ? 'No programs yet - import a file first' : 'Select a program...'}
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
