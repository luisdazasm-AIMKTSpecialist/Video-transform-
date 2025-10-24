/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import {
  Editor,
  TldrawUiButton,
  TldrawUiButtonIcon,
  useEditor,
  useToasts,
} from 'tldraw';
import {useEffect, useState} from 'react';

interface Snapshot {
  id: string;
  timestamp: number;
  // FIX: `getSnapshot` is a method on `Editor`, not `Editor.store`.
  data: ReturnType<Editor['getSnapshot']>;
  preview: string;
}

const LOCAL_STORAGE_KEY = 'genai-canvas-snapshots';

export function SnapshotToolbar() {
  const editor = useEditor();
  const {addToast} = useToasts();
  const [showHistory, setShowHistory] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setSnapshots(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load snapshots from localStorage', e);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, []);

  const saveSnapshots = (newSnapshots: Snapshot[]) => {
    setSnapshots(newSnapshots);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSnapshots));
  };

  const handleSaveSnapshot = async () => {
    try {
      // FIX: `getSnapshot` is a method on `Editor`, not `Editor.store`, and requires an argument.
      const snapshotData = editor.getSnapshot('all');

      // FIX: `getShapesInPageBounds` is deprecated. Use `getShapesInViewport` instead.
      const viewportShapeIds = editor
        .getShapesInViewport()
        .map((s) => s.id);

      if (viewportShapeIds.length === 0) {
        addToast({
          title: 'Canvas is empty.',
          severity: 'warning',
        });
        return;
      }

      // Create a preview SVG of the current viewport
      // FIX: `getSvg` is deprecated. Use `getSvgElement` to get an SVGElement.
      const svg = await editor.getSvgElement(viewportShapeIds, {
        scale: 1,
        background: true,
      });

      if (!svg) {
        addToast({
          title: 'Failed to create snapshot preview.',
          severity: 'error',
        });
        return;
      }

      const svgString = new XMLSerializer().serializeToString(svg);
      const preview = `data:image/svg+xml;base64,${btoa(svgString)}`;

      const newSnapshot: Snapshot = {
        id: `snapshot_${Date.now()}`,
        timestamp: Date.now(),
        data: snapshotData,
        preview,
      };

      saveSnapshots([newSnapshot, ...snapshots]);

      addToast({
        title: 'Snapshot saved!',
        severity: 'success',
        icon: 'check-circle',
      });
    } catch (e) {
      addToast({
        title: 'Failed to save snapshot',
        description: e.message,
        severity: 'error',
      });
    }
  };

  const handleLoadSnapshot = (snapshot: Snapshot) => {
    // FIX: `loadSnapshot` is a method on `Editor`, not `Editor.store`.
    editor.loadSnapshot(snapshot.data);
    setShowHistory(false);
    addToast({
      title: 'Snapshot loaded!',
      severity: 'success',
      icon: 'check-circle',
    });
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
    const newSnapshots = snapshots.filter((s) => s.id !== snapshotId);
    saveSnapshots(newSnapshots);
  };

  return (
    <>
      <div className="snapshot-toolbar">
        <TldrawUiButton
          title="Save Snapshot"
          type="icon"
          onClick={handleSaveSnapshot}>
          <TldrawUiButtonIcon small icon="save" />
        </TldrawUiButton>
        <TldrawUiButton
          title="View History"
          type="icon"
          onClick={() => setShowHistory(true)}>
          <TldrawUiButtonIcon small icon="history" />
        </TldrawUiButton>
      </div>

      {showHistory && (
        <div className="history-panel-overlay">
          <div className="history-panel">
            <div className="history-panel-header">
              <h2>Creation History</h2>
              <button
                className="history-panel-close"
                onClick={() => setShowHistory(false)}>
                &times;
              </button>
            </div>
            <div className="history-panel-body">
              {snapshots.length === 0 ? (
                <p className="history-panel-empty">No saved snapshots yet.</p>
              ) : (
                <div className="snapshots-grid">
                  {snapshots.map((snapshot) => (
                    <div key={snapshot.id} className="snapshot-card">
                      <img
                        src={snapshot.preview}
                        alt="Canvas preview"
                        className="snapshot-preview"
                      />
                      <div className="snapshot-info">
                        <p>{new Date(snapshot.timestamp).toLocaleString()}</p>
                        <div className="snapshot-actions">
                          <button onClick={() => handleLoadSnapshot(snapshot)}>
                            Load
                          </button>
                          <button
                            className="delete"
                            onClick={() => handleDeleteSnapshot(snapshot.id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
