import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';

// Ported from #modalNewProfile + newProfileBtn/npCreateBtn handlers in admin.js.
// EDIT: when mode is V1 and no department templates exist yet, the create
// button relabels to "CREATE DEPARTMENT" and redirects to the Departments
// tab (opening NewDeptTemplateModal directly) instead of failing on submit.
export function NewProfileModal({ show, onClose, departmentTemplates, onCreate, onGoCreateDepartment, toast }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState('V1');
  const [deptId, setDeptId] = useState('');

  // Reset fields and default the department select whenever the modal opens,
  // mirroring the original's newProfileBtn click handler.
  useEffect(() => {
    if (show) {
      setName('');
      setMode('V1');
      setDeptId(departmentTemplates[0] ? String(departmentTemplates[0].id) : '');
    }
  }, [show, departmentTemplates]);

  const v1Blocked = mode === 'V1' && departmentTemplates.length === 0;

  async function handleCreate() {
    if (v1Blocked) {
      // No department templates exist — redirect instead of failing on submit.
      onClose();
      onGoCreateDepartment();
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) return toast('Give the profile a name first.', 'err');
    const deptTemplateId = mode === 'V1' ? (Number(deptId) || null) : null;
    if (mode === 'V1' && !deptTemplateId) return toast('Pick a department for a V1 profile.', 'err');
    await onCreate({ name: trimmed, mode, departmentTemplateId: deptTemplateId });
  }

  return (
    <Modal show={show} onClose={onClose} title="New profile" footer={(
      <>
        <button className="btn" onClick={onClose}>CANCEL</button>
        <button className="btn primary" onClick={handleCreate}>
          {v1Blocked ? 'CREATE DEPARTMENT' : 'CREATE PROFILE'}
        </button>
      </>
    )}>
      <div className="field">
        <label>Profile name</label>
        <input type="text" placeholder="e.g. 1st Sem 2026" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Mode</label>
        <div className="seg-control">
          <button className={mode === 'V1' ? 'on' : ''} onClick={() => setMode('V1')}>V1 (Single)</button>
          <button className={mode === 'V2' ? 'on' : ''} onClick={() => setMode('V2')}>V2 (Multi-Dept)</button>
        </div>
        <div className="hint">V1 locks to one department. V2 discovers departments from files.</div>
      </div>
      {mode === 'V1' && (
        <div className="field">
          <label>Department</label>
          {departmentTemplates.length === 0 ? (
            <div className="hint" style={{ padding: '10px 0' }}>
              No department templates yet — clicking "CREATE DEPARTMENT" will take you to the Departments tab.
            </div>
          ) : (
            <select value={deptId} onChange={(e) => setDeptId(e.target.value)}>
              {departmentTemplates.map((d) => (
                <option key={d.id} value={d.id}>{d.code} — {d.name || ''}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </Modal>
  );
}
