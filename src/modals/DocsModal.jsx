import { Modal } from '../components/Modal.jsx';
import { API_BASE } from '../api/client.js';

// documentation.pdf is a Spring Boot static resource (src/main/resources/static/),
// served from the BACKEND origin — not a frontend asset. Using a relative path
// here resolves against the Tauri asset root instead of the backend; since no
// matching file exists there, Tauri's SPA fallback serves index.html, which
// re-mounts the whole React app inside the iframe (looks like a duplicate app
// window landing back on the licence screen). Must be absolute, same as every
// other backend call in this app (see API_BASE in api/client.js).
const DOCS_PATH = `${API_BASE}/documentation.pdf`;

export function DocsModal({ show, onClose }) {
  return (
    <Modal
      show={show}
      onClose={onClose}
      title="Scanner Documentation"
      maxWidth={800}
      height="90vh"
      bodyStyle={{ padding: 0, height: 'calc(100% - 61px)' }}
    >
      <iframe src={DOCS_PATH} style={{ width: '100%', height: '100%', border: 'none' }} title="Scanner Documentation" />
    </Modal>
  );
}
