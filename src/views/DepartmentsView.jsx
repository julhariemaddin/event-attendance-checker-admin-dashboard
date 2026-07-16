// Ported from #view-departments markup + renderDepartments in admin.js.
// Rebuilt around what the data actually is: registry templates are a small
// set of named records (a tile grid, not a two-column table stretched
// across the page), and discovered departments are just a flat set of
// codes with no order to them at all (a chip cloud, not a one-column
// table with a huge empty gutter beside it).
export function DepartmentsView({ departmentTemplates, discoveredDepartments, isV2, onNewTemplate, onDeleteTemplateClick }) {
  return (
    <div className="view active" id="view-departments">
      <div className="view-header">
        <div>
          <div className="view-title">Departments</div>
          <div className="view-desc">Registry-wide department templates power the V1 picker. V2 profiles discover automatically.</div>
        </div>
        <button className="btn primary" onClick={onNewTemplate}>New template</button>
      </div>

      <div className="side-label" style={{ margin: '24px 0 12px' }}>Registry templates (V1 profiles)</div>
      {departmentTemplates.length === 0 ? (
        <div className="card empty-state">
          <div className="et">No templates yet</div>
          <div className="ed">Add at least one before creating a V1 profile.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {departmentTemplates.map((d) => (
            <div className="dept-tile" key={d.id}>
              <span className="dept-tile-code">{d.code}</span>
              <span className="dept-tile-name">{d.name || '—'}</span>
              <button
                className="btn small danger"
                style={{ flexShrink: 0 }}
                onClick={() => onDeleteTemplateClick(d.id, d.code)}
              >Delete</button>
            </div>
          ))}
        </div>
      )}

      <div className="side-label" style={{ margin: '32px 0 12px' }}>Discovered departments (V2 profile)</div>
      {discoveredDepartments.length === 0 ? (
        <div className="card empty-state">
          <div className="et">{isV2 ? 'No departments discovered yet' : 'Not applicable — active profile is V1'}</div>
          <div className="ed">These appear automatically the first time an import file mentions a new department code.</div>
        </div>
      ) : (
        <div className="card chip-cloud">
          {discoveredDepartments.map((d) => (
            <span className="dept-chip" key={d.id}>{d.code}</span>
          ))}
        </div>
      )}
    </div>
  );
}
