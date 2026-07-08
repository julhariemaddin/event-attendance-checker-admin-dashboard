import { useEffect, useRef, useState, useCallback } from 'react';
import { api, onServerStatusChange, API_BASE } from './api/client.js';
import { useToasts, ToastWrap } from './hooks/useToasts.jsx';
import { useScannerSocket } from './hooks/useScannerSocket.js';

import { Topbar }   from './components/Topbar.jsx';
import { Sidebar }  from './components/Sidebar.jsx';

import { MonitorView }     from './views/MonitorView.jsx';
import { EventsView }      from './views/EventsView.jsx';
import { RosterView }      from './views/RosterView.jsx';
import { HistoryView }     from './views/HistoryView.jsx';
import { ImportView }      from './views/ImportView.jsx';
import { DepartmentsView } from './views/DepartmentsView.jsx';
import { ScannerView }     from './views/ScannerView.jsx';

import { NewProfileModal }          from './modals/NewProfileModal.jsx';
import { NewEventModal }            from './modals/NewEventModal.jsx';
import { NewStudentModal }          from './modals/NewStudentModal.jsx';
import { ReportLinksModal }         from './modals/ReportLinksModal.jsx';
import { NewDeptTemplateModal }     from './modals/NewDeptTemplateModal.jsx';
import { StopConfirmModal }         from './modals/StopConfirmModal.jsx';
import { ManualEntryModal }         from './modals/ManualEntryModal.jsx';
import { ResetProfileConfirmModal } from './modals/ResetProfileConfirmModal.jsx';
import { DeleteProfileConfirmModal }from './modals/DeleteProfileConfirmModal.jsx';
import { DeleteEventConfirmModal }  from './modals/DeleteEventConfirmModal.jsx';
import { DeleteDeptConfirmModal }   from './modals/DeleteDeptConfirmModal.jsx';
import { DeleteStudentConfirmModal }from './modals/DeleteStudentConfirmModal.jsx';
import { DocsModal }                from './modals/DocsModal.jsx';

// ─── Profile guard ────────────────────────────────────────────────────────────
const PROFILE_REQUIRED_VIEWS = new Set(['monitor', 'events', 'roster', 'import']);

// ─── File download helper (Tauri-safe) ─────────────────────────────────────────
// Never navigate the webview to a remote-origin URL via <a href> — Tauri v1
// blocks IPC on origins outside its configured scope, which throws
// "Scope not defined for window `main`" the moment the webview tries to
// actually load that URL as a page. Fetching as a blob and downloading via
// a same-origin object URL avoids any real navigation, so no scope config
// (dangerousRemoteDomainIpcAccess) is needed at all.
async function downloadFile(url, filename) {
  const token = sessionStorage.getItem('aseado_jwt');
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let msg = `Download failed (${res.status})`;
    try {
      const body = await res.json();
      msg = body.message || body.error || msg;
    } catch (_) { /* not JSON, ignore */ }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export default function App({ onBack, onLogout }) {
  const { toasts, toast } = useToasts();

  const [serverUp, setServerUp] = useState(null);

  const [profiles,        setProfiles]        = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);

  const [view,        setView]        = useState('monitor');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [events,         setEvents]         = useState([]);
  const [selectedEventId,setSelectedEventId]= useState(null);
  const [historyExpandId, setHistoryExpandId] = useState(null);
  const [records,        setRecords]        = useState([]);
  const [enrolledCount,  setEnrolledCount]  = useState(null);
  const [feed,           setFeed]           = useState([]);

  const [roster,                setRoster]               = useState({ departments: [] });
  const [departmentTemplates,   setDepartmentTemplates]  = useState([]);
  const [discoveredDepartments, setDiscoveredDepartments]= useState([]);
  const [importStatus,          setImportStatus]         = useState({ imported: false, count: 0 });

  const [modal,               setModal]               = useState(null);
  const [pendingDeleteProfile,setPendingDeleteProfile] = useState(null);
  const [pendingDeleteEvent,  setPendingDeleteEvent]   = useState(null);
  const [pendingDeleteDept,   setPendingDeleteDept]    = useState(null);
  const [pendingDeleteStudent,setPendingDeleteStudent] = useState(null);
  const [editingStudent,      setEditingStudent]       = useState(null); // null = create mode
  const [pendingManualScan,   setPendingManualScan]    = useState(null);
  const [reportFiles,         setReportFiles]          = useState([]);
  const [reportEventId,       setReportEventId]        = useState(null);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null;
  const isV2          = !!(activeProfile?.mode === 'V2');
  const hasProfile    = !!activeProfileId;

  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    onServerStatusChange((up) => setServerUp(up));
  }, []);

  const selectedEventIdRef = useRef(selectedEventId);
  selectedEventIdRef.current = selectedEventId;
  const quietTimerRef = useRef(null);

  function handleIncomingScan(data) {
    const entry = {
      outcome: data.outcome, studentId: data.studentId,
      station: data.station, reason: data.reason,
      firstname: data.firstname, lastname: data.lastname,
      time: new Date().toLocaleTimeString(),
    };
    setFeed((prev) => {
      const next = [entry, ...prev];
      if (next.length > 200) next.pop();
      return next;
    });

    if (data.outcome === 'NEEDS_MANUAL_ENTRY') {
      setPendingManualScan({ studentId: data.studentId });
      setModal('manualEntry');
    }

    if (selectedEventIdRef.current) {
      clearTimeout(quietTimerRef.current);
      quietTimerRef.current = setTimeout(async () => {
        try {
          const recs = await api('GET', `/api/events/${selectedEventIdRef.current}/records`);
          setRecords(recs);
        } catch (_) { /* next WebSocket push will retry */ }
      }, 250);
    }
  }

  const { wsConnected, sendScan } = useScannerSocket(handleIncomingScan);

  useEffect(() => {
    (async () => {
      await refreshProfiles();
      await refreshActiveProfile();
    })();
  }, []);

  // ============================================================
  // Profiles
  // ============================================================
  async function refreshProfiles() {
    try {
      const data = await api('GET', '/api/profiles');
      setProfiles(data);
      return data;
    } catch (err) {
      toast('Could not load profiles: ' + err.message, 'err');
      return [];
    }
  }

  async function refreshActiveProfile() {
    let id = null;
    try {
      const active = await api('GET', '/api/profiles/active');
      id = active.active ? active.profileId : null;
    } catch (_) { id = null; }

    setActiveProfileId(id);
    if (id) {
      await Promise.all([loadEvents(id), loadDepartments(id), loadImportStatus(id)]);
    } else {
      setEvents([]);
      setRoster({ departments: [] });
    }
  }

  async function selectProfile(profileId) {
    if (profileId === activeProfileId) return;
    try {
      await api('POST', '/api/profiles/select', { profileId });
      toast('Switched profile', 'ok');
      setActiveProfileId(profileId);
      setSelectedEventId(null);
      setRecords([]);
      setFeed([]);
      await Promise.all([loadEvents(profileId), loadDepartments(profileId), loadImportStatus(profileId)]);
      setView('monitor');
    } catch (err) {
      toast('Could not switch profile: ' + err.message, 'err');
    }
  }

  async function handleNewProfileCreate(body) {
    try {
      await api('POST', '/api/profiles', body);
      toast('Profile created and activated', 'ok');
      setModal(null);
      await refreshProfiles();
      await refreshActiveProfile();
      setView('monitor');
    } catch (err) {
      toast('Create failed: ' + err.message, 'err');
    }
  }

  async function handleResetProfileConfirm() {
    try {
      await api('POST', '/api/profiles/active/reset');
      toast('Profile reset', 'ok');
      setModal(null);
      setSelectedEventId(null);
      await Promise.all([loadEvents(), loadStudents(), loadDepartments()]);
      setRecords([]);
    } catch (err) {
      toast('Reset failed: ' + err.message, 'err');
    }
  }

  function openDeleteProfileConfirm(profileId) {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    setPendingDeleteProfile(profile);
    setModal('deleteProfileConfirm');
  }

  async function handleDeleteProfileConfirm() {
    if (!pendingDeleteProfile) return;
    try {
      const wasActive = pendingDeleteProfile.id === activeProfileId;
      await api('DELETE', '/api/profiles/' + pendingDeleteProfile.id);
      toast('Profile deleted', 'ok');
      setModal(null);
      setPendingDeleteProfile(null);
      await refreshProfiles();
      if (wasActive) {
        setActiveProfileId(null);
        setSelectedEventId(null);
        setEvents([]);
        setRecords([]);
      }
      await refreshActiveProfile();
    } catch (err) {
      toast('Delete failed: ' + err.message, 'err');
    }
  }

  // ============================================================
  // Events
  // ============================================================
  async function loadEvents(profileId = activeProfileId) {
    if (!profileId) { setEvents([]); return []; }
    try {
      const data = await api('GET', '/api/events');
      setEvents(data);
      return data;
    } catch (_) {
      setEvents([]);
      return [];
    }
  }

  async function loadMonitorForSelectedEvent(eventId = selectedEventId, currentEvents = events) {
    if (!eventId) { setRecords([]); return; }
    try {
      const recs = await api('GET', `/api/events/${eventId}/records`);
      setRecords(recs);
    } catch (err) {
      setRecords([]);
      toast('Could not load records: ' + err.message, 'err');
    }
    try {
      const ev = currentEvents.find((e) => e.id === eventId);
      const filterJson = ev?.filterJson ?? null;
      const rosterRes = await api('GET', '/api/roster/count' + (filterJson ? '?filterJson=' + encodeURIComponent(filterJson) : ''));
      setEnrolledCount(rosterRes?.count ?? null);
    } catch (_) {
      setEnrolledCount(null);
    }
  }

  function handleSelectMonitorEvent(eventId) {
    setSelectedEventId(eventId);
    setFeed([]);
    setEnrolledCount(null);
    loadMonitorForSelectedEvent(eventId);
  }

  async function handleNewEventCreate(body) {
    try {
      const res = await api('POST', '/api/events', body);
      toast('Event created', 'ok');
      setModal(null);
      const updated = await loadEvents();
      setSelectedEventId(res.eventId);
      setView('monitor');
      loadMonitorForSelectedEvent(res.eventId, updated);
    } catch (err) {
      toast('Could not create event: ' + err.message, 'err');
    }
  }

  async function handlePause() {
    try {
      await api('POST', `/api/events/${selectedEventId}/pause`);
      toast('Event paused', 'ok');
      const updated = await loadEvents();
      loadMonitorForSelectedEvent(selectedEventId, updated);
    } catch (err) {
      toast('Pause failed: ' + err.message, 'err');
    }
  }

  async function handleResume() {
    try {
      await api('POST', `/api/events/${selectedEventId}/resume`);
      toast('Event resumed', 'ok');
      const updated = await loadEvents();
      loadMonitorForSelectedEvent(selectedEventId, updated);
    } catch (err) {
      toast('Resume failed: ' + err.message, 'err');
    }
  }

async function handleStopConfirm() {
  setStopping(true);
  try {
    const res = await api('POST', `/api/events/${selectedEventId}/stop`);
    setModal(null);
    const count = res.reportPaths?.length ?? 0;
    toast(`Event stopped — ${count} report${count !== 1 ? 's' : ''} generated`, 'ok');
    const updated = await loadEvents();
    loadMonitorForSelectedEvent(selectedEventId, updated);
  } catch (err) {
    toast('Stop failed: ' + err.message, 'err');
  } finally {
    setStopping(false);
  }
}



  async function showReportLinks(eventId) {
    try {
      const files = await api('GET', `/api/events/${eventId}/reports`);
      if (!files.length) { toast('No report files found for this event.', 'err'); return; }
      setReportFiles(files);
      setReportEventId(eventId);
      setModal('reportLinks');
    } catch (err) {
      toast('Could not load reports: ' + err.message, 'err');
    }
  }

  // Replaces the old reportDownloadUrl(eventId, filePath) href-builder.
  // Now performs the actual download via blob fetch instead of returning
  // a URL for <a href> to navigate to (which broke inside Tauri's webview).
  async function downloadReport(filePath) {
    const token = sessionStorage.getItem('aseado_jwt');
    const url = API_BASE + `/api/events/${reportEventId}/reports/download?filePath=` +
      encodeURIComponent(filePath) + `&token=${token}`;
    const filename = filePath.split(/[\\/]/).pop() || 'report';
    try {
      await downloadFile(url, filename);
    } catch (err) {
      toast('Download failed: ' + err.message, 'err');
    }
  }

  function openDeleteEventConfirm(eventId, name) {
    setPendingDeleteEvent({ id: eventId, name });
    setModal('deleteEventConfirm');
  }

  async function handleDeleteEventConfirm() {
    if (!pendingDeleteEvent) return;
    try {
      await api('DELETE', '/api/events/' + pendingDeleteEvent.id);
      toast('Event deleted', 'ok');
      setModal(null);
      if (selectedEventId === pendingDeleteEvent.id) {
        setSelectedEventId(null);
        setRecords([]);
      }
      setPendingDeleteEvent(null);
      await loadEvents();
    } catch (err) {
      toast('Delete failed: ' + err.message, 'err');
    }
  }

  function sendManualScan(payload) {
    if (!sendScan(payload)) toast('Scanner link is not connected.', 'err');
  }

  // ============================================================
  // Roster
  // ============================================================
  async function loadStudents(profileId = activeProfileId) {
    if (!profileId) { setRoster({ departments: [] }); return; }
    try {
      const data = await api('GET', '/api/roster');
      setRoster(data);
    } catch (_) {
      setRoster({ departments: [] });
    }
  }

  function openNewStudent() {
    setEditingStudent(null);
    setModal('newStudent');
  }

  function openEditStudent(student) {
    setEditingStudent(student);
    setModal('newStudent');
  }

  async function handleStudentSave(body) {
    try {
      if (editingStudent) {
        await api('PUT', '/api/roster', { ...body, oldStudentId: editingStudent.studentId });
        toast('Student updated', 'ok');
      } else {
        await api('POST', '/api/roster', body);
        toast('Added to roster', 'ok');
      }
      setModal(null);
      setEditingStudent(null);
      loadStudents();
    } catch (err) {
      toast((editingStudent ? 'Update' : 'Could not add student') + ': ' + err.message, 'err');
    }
  }

  function openDeleteStudentConfirm(student) {
    setPendingDeleteStudent(student);
    setModal('deleteStudentConfirm');
  }

  async function handleDeleteStudentConfirm() {
    if (!pendingDeleteStudent) return;
    try {
      await api('DELETE', '/api/roster/' + encodeURIComponent(pendingDeleteStudent.studentId));
      toast('Student deleted', 'ok');
      setModal(null);
      setPendingDeleteStudent(null);
      loadStudents();
    } catch (err) {
      toast('Delete failed: ' + err.message, 'err');
    }
  }

  // Replaces the old raw export URL / <a href download> approach.
  async function downloadRosterExport() {
    const token = sessionStorage.getItem('aseado_jwt');
    const url = API_BASE + '/api/roster/export.csv?token=' + token;
    try {
      await downloadFile(url, 'roster-export.csv');
    } catch (err) {
      toast('Export failed: ' + err.message, 'err');
    }
  }

  // ============================================================
  // Import
  // ============================================================
  async function loadImportStatus(profileId = activeProfileId) {
    if (!profileId) return;
    try {
      const data = await api('GET', '/api/import/status');
      setImportStatus({ imported: data.imported, count: data.count });
    } catch (_) {
      setImportStatus({ imported: false, count: 0 });
    }
  }

  async function handleImportUpload(file) {
    const token = sessionStorage.getItem('aseado_jwt');
    const fd = new FormData();
    fd.append('file', file);

    const res = await fetch(API_BASE + '/api/import', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.rejectionReason || errorData.message || 'Server rejected the file.');
    }

    const data = await res.json();
    if (data.status === 'VALID') {
      await loadImportStatus();
      loadStudents();
      loadDepartments();
    }
    return data;
  }

  async function handleImportDelete() {
    try {
      await api('DELETE', '/api/import');
      toast('Roster deleted', 'ok');
      await loadImportStatus();
      loadStudents();
      loadDepartments();
    } catch (err) {
      toast('Delete failed: ' + err.message, 'err');
      throw err;
    }
  }

  // ============================================================
  // Departments
  // ============================================================
  async function loadDepartments(profileId = activeProfileId) {
    try { setDepartmentTemplates(await api('GET', '/api/department-templates')); }
    catch (_) { setDepartmentTemplates([]); }
    try { setDiscoveredDepartments(profileId ? await api('GET', '/api/departments') : []); }
    catch (_) { setDiscoveredDepartments([]); }
  }

  async function handleNewDeptTemplateCreate(body) {
    try {
      await api('POST', '/api/department-templates', body);
      toast('Department template added', 'ok');
      setModal(null);
      loadDepartments();
    } catch (err) {
      toast('Could not add template: ' + err.message, 'err');
    }
  }

  function openDeleteDeptConfirm(templateId, code) {
    const affected = profiles.filter((p) => p.departmentTemplateId === templateId).length;
    setPendingDeleteDept({ id: templateId, code, affected });
    setModal('deleteDeptConfirm');
  }

  async function handleDeleteDeptConfirm() {
    if (!pendingDeleteDept) return;
    try {
      await api('DELETE', '/api/department-templates/' + pendingDeleteDept.id);
      toast('Department template deleted', 'ok');
      setModal(null);
      setPendingDeleteDept(null);
      loadDepartments();
    } catch (err) {
      toast('Delete failed: ' + err.message, 'err');
    }
  }

  // ============================================================
  // Manual entry
  // ============================================================
  async function handleManualEntryComplete(body) {
    if (!selectedEventId) {
      toast('Select the event this scan belongs to first.', 'err');
      return;
    }
    try {
      await api('POST', '/api/scan/manual-entry', { ...body, eventId: selectedEventId });
      toast(`Login completed for ${body.firstname} ${body.lastname}`, 'ok');
      setModal(null);
      setPendingManualScan(null);
      loadMonitorForSelectedEvent();
      loadStudents();
    } catch (err) {
      toast('Manual entry failed: ' + err.message, 'err');
    }
  }

  // ============================================================
  // View switching — guards profile-required views
  // ============================================================
  function switchView(v) {
    if (PROFILE_REQUIRED_VIEWS.has(v) && !hasProfile) {
      toast('Select or create a profile first.', 'err');
      return;
    }
    setView(v);
    setSidebarOpen(false);
    if (v === 'roster')      loadStudents();
    if (v === 'events')      loadEvents();
    if (v === 'departments') loadDepartments();
    if (v === 'monitor')     loadEvents();
    if (v === 'import')      loadImportStatus();
  }

  function goToMonitorForEvent(eventId) {
    setSelectedEventId(eventId);
    switchView('monitor');
    loadMonitorForSelectedEvent(eventId);
  }

  // Stopped events no longer have anything to "monitor" — they're finished.
  // This takes the place of MONITOR for STOPPED rows in EventsView, and
  // pre-expands that event's card so the summary is immediately visible.
  function goToHistoryForEvent(eventId) {
    setHistoryExpandId(eventId);
    switchView('history');
  }

  const safeView = (PROFILE_REQUIRED_VIEWS.has(view) && !hasProfile) ? 'departments' : view;

  // ============================================================
  // Render
  // ============================================================
  return (
    <div id="app">
      <Topbar
        profileName={activeProfile?.name ?? null}
        serverUp={serverUp}
        wsConnected={wsConnected}
        onMobileMenuClick={() => setSidebarOpen((s) => !s)}
        onBack={onBack}
      />

      <div className="main-wrapper">
        <Sidebar
          open={sidebarOpen}
          profiles={profiles}
          activeProfileId={activeProfileId}
          activeProfile={activeProfile}
          view={safeView}
          onSwitchView={switchView}
          onNewProfile={() => setModal('newProfile')}
          onSelectProfile={selectProfile}
          onDeleteProfileClick={openDeleteProfileConfirm}
          onResetProfileClick={() => setModal('resetProfileConfirm')}
          onBack={onBack}
          onClose={() => setSidebarOpen(false)}
        />

        <div id="main" onClick={() => { if (window.innerWidth <= 768) setSidebarOpen(false); }}>

          {!hasProfile && PROFILE_REQUIRED_VIEWS.has(view) && (
            <NoProfilePlaceholder onNewProfile={() => setModal('newProfile')} />
          )}

          {safeView === 'monitor' && hasProfile && (
            <MonitorView
              events={events}
              selectedEventId={selectedEventId}
              onSelectEvent={handleSelectMonitorEvent}
              onRefresh={() => loadMonitorForSelectedEvent()}
              records={records}
              enrolledCount={enrolledCount}
              feed={feed}
              wsConnected={wsConnected}
              onSendManualScan={sendManualScan}
              onPause={handlePause}
              onResume={handleResume}
              onStopClick={() => setModal('stopConfirm')}
              toast={toast}
            />
          )}
          {safeView === 'events' && hasProfile && (
            <EventsView
              events={events}
              onNewEvent={() => setModal('newEvent')}
              onMonitor={goToMonitorForEvent}
              onHistory={goToHistoryForEvent}
              onReports={showReportLinks}
              onDeleteClick={openDeleteEventConfirm}
            />
          )}
          {safeView === 'history' && hasProfile && (
            <HistoryView expandEventId={historyExpandId} onExpandHandled={() => setHistoryExpandId(null)} />
          )}
          {safeView === 'roster' && hasProfile && (
            <RosterView
              roster={roster}
              onExport={downloadRosterExport}
              onNewStudent={openNewStudent}
              onEditStudent={openEditStudent}
              onDeleteStudent={openDeleteStudentConfirm}
            />
          )}
          {safeView === 'import' && hasProfile && (
            <ImportView
              importStatus={importStatus}
              onUpload={handleImportUpload}
              onDelete={handleImportDelete}
            />
          )}
          {safeView === 'departments' && (
            <DepartmentsView
              departmentTemplates={departmentTemplates}
              discoveredDepartments={discoveredDepartments}
              isV2={isV2}
              onNewTemplate={() => setModal('newDeptTemplate')}
              onDeleteTemplateClick={openDeleteDeptConfirm}
            />
          )}
          {safeView === 'scanner' && (
            <ScannerView onOpenDocs={() => setModal('docs')} />
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <NewProfileModal
        show={modal === 'newProfile'}
        onClose={() => setModal(null)}
        departmentTemplates={departmentTemplates}
        onCreate={handleNewProfileCreate}
        onGoCreateDepartment={() => {
          setView('departments');
          setModal('newDeptTemplate');
        }}
        toast={toast}
      />
      <NewEventModal
        show={modal === 'newEvent'}
        onClose={() => setModal(null)}
        isV2={isV2}
        onCreate={handleNewEventCreate}
        toast={toast}
      />
      <NewStudentModal
        show={modal === 'newStudent'}
        onClose={() => { setModal(null); setEditingStudent(null); }}
        isV2={isV2}
        editing={editingStudent}
        onCreate={handleStudentSave}
        toast={toast}
      />
      <ReportLinksModal
        show={modal === 'reportLinks'}
        onClose={() => setModal(null)}
        files={reportFiles}
        onDownload={downloadReport}
      />
      <NewDeptTemplateModal
        show={modal === 'newDeptTemplate'}
        onClose={() => setModal(null)}
        onCreate={handleNewDeptTemplateCreate}
        toast={toast}
      />
      <StopConfirmModal
  show={modal === 'stopConfirm'}
  onClose={() => setModal(null)}
  onConfirm={handleStopConfirm}
  loading={stopping}
/>
      <ManualEntryModal
        show={modal === 'manualEntry'}
        onClose={() => setModal(null)}
        eventId={selectedEventId}
        scannedId={pendingManualScan?.studentId ?? ''}
        isV2={isV2}
        onComplete={handleManualEntryComplete}
        toast={toast}
      />
      <ResetProfileConfirmModal
        show={modal === 'resetProfileConfirm'}
        onClose={() => setModal(null)}
        profileName={activeProfile?.name ?? ''}
        onConfirm={handleResetProfileConfirm}
      />
      <DeleteProfileConfirmModal
        show={modal === 'deleteProfileConfirm'}
        onClose={() => setModal(null)}
        profileName={pendingDeleteProfile?.name ?? ''}
        onConfirm={handleDeleteProfileConfirm}
      />
      <DeleteEventConfirmModal
        show={modal === 'deleteEventConfirm'}
        onClose={() => setModal(null)}
        eventName={pendingDeleteEvent?.name ?? ''}
        onConfirm={handleDeleteEventConfirm}
      />
      <DeleteDeptConfirmModal
        show={modal === 'deleteDeptConfirm'}
        onClose={() => setModal(null)}
        deptCode={pendingDeleteDept?.code ?? ''}
        affectedCount={pendingDeleteDept?.affected ?? 0}
        onConfirm={handleDeleteDeptConfirm}
      />
      <DeleteStudentConfirmModal
        show={modal === 'deleteStudentConfirm'}
        onClose={() => { setModal(null); setPendingDeleteStudent(null); }}
        studentName={pendingDeleteStudent ? `${pendingDeleteStudent.lastname}, ${pendingDeleteStudent.firstname}` : ''}
        onConfirm={handleDeleteStudentConfirm}
      />
      <DocsModal show={modal === 'docs'} onClose={() => setModal(null)} />

      <ToastWrap toasts={toasts} />
    </div>
  );
}

// ─── No-profile placeholder ───────────────────────────────────────────────────
function NoProfilePlaceholder({ onNewProfile }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 20, padding: 40,
      textAlign: 'center',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: '2px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, color: 'var(--text-muted)',
      }}>⊘</div>
      <div>
        <div style={{
          fontSize: 14, fontWeight: 800, letterSpacing: '.08em',
          color: 'var(--text-primary)', marginBottom: 8,
        }}>No Profile Selected</div>
        <div style={{
          fontSize: 12, color: 'var(--text-secondary)',
          lineHeight: 1.7, maxWidth: 320,
        }}>
          This view requires an active profile. Select one from the sidebar, or create a new profile to get started.
        </div>
      </div>
      <button onClick={onNewProfile} style={{
        padding: '11px 24px',
        background: 'var(--text-primary)', color: '#000',
        border: 'none', fontSize: 11, fontWeight: 800,
        letterSpacing: '.12em', cursor: 'pointer', fontFamily: 'inherit',
      }}>
        + NEW PROFILE
      </button>
    </div>
  );
}