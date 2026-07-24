import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

/**
 * Cloud Dashboard — Professional Operations Console.
 * Clean, consistent layout for managing cloud connectivity and reviewing scans.
 */

function StatusBadge({ status }) {
  const isLive = status === 'RECEIVING';
  return (
    <span className={`badge ${isLive ? 'b-green' : 'b-grey'}`}>
      {status === 'RECEIVING' ? 'ACTIVE' : (status === 'NOT_PUBLISHED' ? 'OFFLINE' : 'STANDBY')}
    </span>
  );
}

export function CloudSyncView({ toast }) {
  const [bucket, setBucket] = useState(null); // null = loading
  const [pending, setPending] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [uploadingRoster, setUploadingRoster] = useState(false);
  const [actingBatchId, setActingBatchId] = useState(null);
  const [showKey, setShowKey] = useState(false);

  async function loadBucket() {
    try {
      const data = await api('GET', '/api/cloud/bucket');
      setBucket(data);
    } catch (err) {
      toast('Failed to load cloud status: ' + err.message, 'err');
      setBucket(null);
    }
  }

  async function loadPending() {
    try {
      setPending(await api('GET', '/api/cloud/pending'));
    } catch (err) {
      toast('Failed to load pending batches: ' + err.message, 'err');
    }
  }

  useEffect(() => {
    loadBucket();
    loadPending();
  }, []);

  async function handlePublish() {
    setPublishing(true);
    try {
      await api('POST', '/api/cloud/publish');
      toast('Profile published to the cloud.', 'ok');
      await loadBucket();
    } catch (err) {
      toast('Publish failed: ' + err.message, 'err');
    } finally {
      setPublishing(false);
    }
  }

  async function handleOpen() {
    setOpening(true);
    try {
      await api('POST', '/api/cloud/open');
      setShowKey(true);
      toast('Bucket is now receiving.', 'ok');
      await loadBucket();
    } catch (err) {
      toast('Failed to open for receiving: ' + err.message, 'err');
    } finally {
      setOpening(false);
    }
  }

  async function handleClose() {
    setClosing(true);
    try {
      await api('POST', '/api/cloud/close');
      setShowKey(false);
      toast('Bucket closed — its key no longer works.', 'ok');
      await loadBucket();
    } catch (err) {
      toast('Failed to close: ' + err.message, 'err');
    } finally {
      setClosing(false);
    }
  }

  async function handleUploadRoster() {
    setUploadingRoster(true);
    try {
      const res = await api('POST', '/api/cloud/roster/upload');
      toast(`Roster synced — ${res.studentCount} students available to Android.`, 'ok');
      await loadBucket();
    } catch (err) {
      toast('Roster upload failed: ' + err.message, 'err');
    } finally {
      setUploadingRoster(false);
    }
  }

  async function handleAccept(batchId) {
    setActingBatchId(batchId);
    try {
      await api('POST', `/api/cloud/batches/${batchId}/accept`);
      toast(`Batch accepted and integrated.`, 'ok');
      await loadPending();
    } catch (err) {
      toast('Accept failed: ' + err.message, 'err');
    } finally {
      setActingBatchId(null);
    }
  }

  async function handleRefuse(batchId) {
    setActingBatchId(batchId);
    try {
      await api('POST', `/api/cloud/batches/${batchId}/refuse`);
      toast('Batch discarded.', 'ok');
      await loadPending();
    } catch (err) {
      toast('Discard failed: ' + err.message, 'err');
    } finally {
      setActingBatchId(null);
    }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(bucket.activeKey);
      toast('Key copied.', 'ok');
    } catch {
      toast('Copy failed.', 'err');
    }
  }

  if (bucket === null) {
    return (
      <div id="cloudSyncView" className="view active">
        <div className="view-header">
          <div className="view-title">Cloud Sync</div>
          <div className="view-desc">Loading...</div>
        </div>
      </div>
    );
  }

  const isPublished = bucket.status !== 'NOT_PUBLISHED';
  const isReceiving = bucket.status === 'RECEIVING';

  return (
    <div id="cloudSyncView" className="view active">
      <div className="view-header">
        <div>
          <div className="view-title">Cloud Dashboard</div>
          <div className="view-desc">
            Bridge your offline scanners with your local database via the relay server.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        <div className="column">
          {/* Identity & Status */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div className="panel-head">
              <strong>Bucket Identity</strong>
              <StatusBadge status={bucket.status} />
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{bucket.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {isPublished
                      ? `${bucket.mode} · ${bucket.departmentLabel || 'Global'}`
                      : 'This profile is currently local-only.'}
                  </div>
                </div>
                {isPublished && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: bucket.rosterUploaded ? 'var(--status-live)' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end'
                    }}>
                      {bucket.rosterUploaded ? '● Roster Synced' : '○ Roster Missing'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {bucket.rosterCount} students in cloud
                    </div>
                  </div>
                )}
              </div>

              {!isPublished && (
                <div style={{ marginTop: 20 }}>
                  <button className="btn primary" disabled={publishing} onClick={handlePublish} style={{ width: '100%' }}>
                    {publishing ? 'PUBLISHING...' : 'Publish to Cloud'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Profile Access Controls */}
          {isPublished && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="panel-head">
                <strong>Profile Access</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>
                    {isReceiving ? 'LIVE' : 'OFF'}
                  </span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={isReceiving}
                      disabled={opening || closing}
                      onChange={() => (isReceiving ? handleClose() : handleOpen())}
                    />
                  </label>
                </div>
              </div>
              <div style={{ padding: 20 }}>
                {bucket.activeKey ? (
                  <div style={{
                    background: 'var(--bg-base)', padding: 20, borderRadius: 12,
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.05em' }}>
                      OPERATOR ACCESS KEY
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div className="mono" style={{
                        fontSize: 28, letterSpacing: 4, color: showKey ? 'var(--board-amber)' : 'var(--text-muted)',
                        fontWeight: 900, flex: 1, filter: showKey ? 'none' : 'blur(4px)',
                        transition: 'filter 0.2s ease'
                      }}>
                        {bucket.activeKey}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn small" onClick={() => setShowKey(!showKey)}>
                          {showKey ? 'Hide' : 'Show'}
                        </button>
                        <button className="btn primary small" onClick={copyKey}>Copy</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '12px 0', border: '1px dashed var(--border)', borderRadius: 12 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      Receiving is currently disabled.
                    </div>
                    <div className="hint">Open access to generate a key for scanners.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sync Controls */}
          {isPublished && (
            <div className="card">
              <div className="panel-head">
                <strong>Roster Sync</strong>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                  Push your current student list to the cloud so scanners can verify identities offline.
                </div>
                <button className="btn" disabled={uploadingRoster} onClick={handleUploadRoster} style={{ width: '100%' }}>
                  {uploadingRoster ? 'SYNCING...' : 'Push Roster to Cloud'}
                </button>
                {bucket.rosterUploaded && (
                  <div style={{
                    marginTop: 12, padding: '8px 12px', background: 'rgba(34,197,94,0.05)',
                    borderRadius: 8, fontSize: 11, color: 'var(--status-live)',
                    display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600
                  }}>
                    <span>✓</span> Cloud roster matches local version
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Review Queue */}
        <div className="column">
          {isPublished && (
            <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="panel-head">
                <strong>Review Queue</strong>
                {pending && pending.length > 0 && <span className="badge b-amber">{pending.length} PENDING</span>}
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {pending === null ? (
                  <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading...
                  </div>
                ) : pending.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 12, opacity: 0.2 }}>✓</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Queue is empty</div>
                    <div className="hint" style={{ marginTop: 8 }}>
                      Uploaded batches from Android devices will appear here for review.
                    </div>
                  </div>
                ) : (
                  <div className="board-list">
                    {pending.map((b) => (
                      <div key={b.batchId} className="board-row" style={{ gridTemplateColumns: '1fr auto', padding: 20 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>
                            BATCH #{b.batchId} · {b.records.length} SCANS
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{b.eventMeta?.eventName || 'Manual Batch'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                            {b.eventMeta?.eventDate || 'No Date'} · {b.uploadedAt}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            className="btn small"
                            disabled={actingBatchId !== null}
                            onClick={() => handleRefuse(b.batchId)}
                          >
                            Discard
                          </button>
                          <button
                            className="btn primary small"
                            disabled={actingBatchId !== null}
                            onClick={() => handleAccept(b.batchId)}
                          >
                            {actingBatchId === b.batchId ? 'Syncing...' : 'Accept'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ padding: 16, borderTop: '1px solid var(--border)', background: 'var(--bg-base)', fontSize: 11, color: 'var(--text-muted)' }}>
                Accepting a batch will integrate the scans into your local database.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
