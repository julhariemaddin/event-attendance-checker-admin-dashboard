import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';

// Ported from #modalNewDept + newDeptTemplateBtn/ndCreateBtn handlers in admin.js.
export function NewDeptTemplateModal({ show, onClose, onCreate, toast }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  useEffect(() => { if (show) { setCode(''); setName(''); } }, [show]);

  async function handleCreate() {
    const trimmedCode = code.trim();
    if (!trimmedCode) return toast('Department code is required.', 'err');
    await onCreate({ code: trimmedCode, name: name.trim() });
  }

  return (
    <Modal show={show} onClose={onClose} title="New template" footer={(
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={handleCreate}>Add template</button>
      </>
    )}>
      <div className="field"><label>Code</label><input type="text" placeholder="e.g. CCS" value={code} onChange={(e) => setCode(e.target.value)} /></div>
      <div className="field"><label>Full name</label><input type="text" placeholder="e.g. College of Computing Studies" value={name} onChange={(e) => setName(e.target.value)} /></div>
    </Modal>
  );
}
