import { useRef, useState } from 'react';

// Ported from #view-import markup + import drop/submit/result rendering in admin.js.
export function ImportView({ importStatus, onUpload, onDelete }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const imported = importStatus.imported;
  const count = importStatus.count || 0;

  function pickFile(f) {
    setFile(f);
  }

  async function submit() {
    if (!file) return;
    setUploading(true);
    try {
      const data = await onUpload(file);
      setResult(data);
      if (data.status === 'VALID') {
        setFile(null);
        if (inputRef.current) inputRef.current.value = '';
      }
    } catch (err) {
      setResult({ status: 'REJECTED', rejectionReason: err.message });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete();
      setResult(null);
      setFile(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="view active" id="view-import">
      <div className="view-header">
        <div>
          <div className="view-title">Import</div>
          <div className="view-desc">Upload a delimited roster file (CSV/TSV). V2 profiles need a department column; V1 profiles must not include one.</div>
        </div>
      </div>

      {imported ? (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div className="badge b-green">Imported</div>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              {count.toLocaleString()} student{count !== 1 ? 's' : ''} loaded
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
            A roster is already loaded for this profile. Delete it first if you need to replace it with a new file.
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn danger" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'DELETING...' : 'DELETE ROSTER'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div
            style={{ border: '1px dashed ' + (dragOver ? 'var(--board-amber)' : 'var(--text-muted)'), padding: 40, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', borderRadius: 8, background: dragOver ? 'var(--board-amber-wash)' : 'transparent' }}
            onClick={() => inputRef.current && inputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]); }}
          >
            <div style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', marginBottom: 8 }}>Click or drag file here</div>
            <div className="hint">Expecting a header row + delimited rows (CSV).</div>
            <input
              ref={inputRef} type="file" accept=".csv,.tsv,.txt" style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files[0]) pickFile(e.target.files[0]); }}
            />
          </div>
          {file && (
            <div style={{ marginTop: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Selected: {file.name} ({Math.round(file.size / 1024)} KB)
            </div>
          )}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn primary" disabled={!file || uploading} onClick={submit}>
              {uploading ? 'UPLOADING...' : 'UPLOAD & VALIDATE'}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="card" style={{ marginTop: 24 }}>
          {result.status === 'VALID' ? (
            <>
              <div className="badge b-green" style={{ marginBottom: 12 }}>Valid</div>
 <div style={{ fontSize: 14, fontWeight: 700 }}>Imported {result.insertedCount ?? '-'} rows successfully.</div>
            </>
          ) : (
            <>
              <div className="badge b-red" style={{ marginBottom: 12 }}>Rejected</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{result.rejectionReason || 'The file did not pass validation.'}</div>
              {result.rowErrors && result.rowErrors.length > 0 && (
                <table style={{ marginTop: 16 }}>
                  <thead><tr><th>Row</th><th>Problem</th></tr></thead>
                  <tbody>
                    {result.rowErrors.map((r, i) => (
                      <tr key={i}>
 <td className="mono">{r.row ?? r.rowNumber ?? '-'}</td>
                        <td>{r.message ?? JSON.stringify(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
