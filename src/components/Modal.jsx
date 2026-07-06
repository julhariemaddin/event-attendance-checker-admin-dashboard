// Generic modal shell, ported from .modal-backdrop / .modal markup in admin.html.
// Closing behavior preserved: click backdrop (not modal) closes, click .modal-close closes.
export function Modal({ show, onClose, title, children, footer, maxWidth, height, bodyStyle }) {
  // Preserve original behavior: clicking outside the modal closes it.
  if (!show) return null;
  const modalStyle = {};
  if (maxWidth) modalStyle.maxWidth = maxWidth;
  if (height) modalStyle.height = height;
  return (
    <div
      className="modal-backdrop show"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" style={Object.keys(modalStyle).length ? modalStyle : undefined}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={bodyStyle}>
          {children}
        </div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
