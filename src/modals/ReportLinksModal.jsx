import { Modal } from '../components/Modal.jsx';

// Ported from #modalReportLinks + showReportLinks() in admin.js.
export function ReportLinksModal({ show, onClose, files, onDownload }) {
  return (
    <Modal show={show} onClose={onClose} title="Generated reports" footer={(
      <button className="btn" onClick={onClose}>CLOSE</button>
    )} bodyStyle={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {files.map((f, i) => {
        const label = (f.departmentLabel ? f.departmentLabel + ' — ' : '') + f.fileType.toUpperCase();
        return (
          <button
            key={i}
            className="btn small"
            style={{ justifyContent: 'flex-start' }}
            onClick={() => onDownload(f.filePath)}
          >
            DOWNLOAD: {label}
          </button>
        );
      })}
    </Modal>
  );
}