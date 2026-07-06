// Ported from #view-departments markup + renderDepartments in admin.js.
export function DepartmentsView({ departmentTemplates, discoveredDepartments, isV2, onNewTemplate, onDeleteTemplateClick }) {
  return (
    <div className="view active" id="view-departments">
      <div className="view-header">
        <div>
          <div className="view-title">Departments</div>
          <div className="view-desc">Registry-wide department templates power the V1 picker. V2 profiles discover automatically.</div>
        </div>
        <button className="btn primary" onClick={onNewTemplate}>NEW TEMPLATE</button>
      </div>

      <div className="side-label" style={{ margin: '24px 0 12px' }}>Registry templates (V1 profiles)</div>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Code</th><th>Name</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
          <tbody>
            {departmentTemplates.map((d) => (
              <tr key={d.id}>
                <td className="mono" style={{ fontWeight: 700 }}>{d.code}</td>
                <td>{d.name || '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn small danger" onClick={() => onDeleteTemplateClick(d.id, d.code)}>DELETE</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {departmentTemplates.length === 0 && (
          <div className="empty-state" style={{ border: 'none' }}>
            <div className="et">No templates yet</div>
            <div className="ed">Add at least one before creating a V1 profile.</div>
          </div>
        )}
      </div>

      <div className="side-label" style={{ margin: '32px 0 12px' }}>Discovered departments (V2 profile)</div>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Code</th></tr></thead>
          <tbody>
            {discoveredDepartments.map((d) => (
              <tr key={d.id}><td className="mono" style={{ fontWeight: 700 }}>{d.code}</td></tr>
            ))}
          </tbody>
        </table>
        {discoveredDepartments.length === 0 && (
          <div className="empty-state" style={{ border: 'none' }}>
            <div className="et">{isV2 ? 'No departments discovered yet' : 'Not applicable — active profile is V1'}</div>
            <div className="ed">These appear automatically the first time an import file mentions a new department code.</div>
          </div>
        )}
      </div>
    </div>
  );
}
