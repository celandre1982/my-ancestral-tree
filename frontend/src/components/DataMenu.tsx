import { useRef, useState } from 'react';
import {
  clearAll,
  DEFAULT_EXPORT_OPTIONS,
  downloadExport,
  exportAll,
  type ExportOptions,
  ImportValidationError,
  importAll,
} from '../db/io';

export function DataMenu() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>('');
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);

  const setOpt = <K extends keyof ExportOptions>(
    key: K,
    value: ExportOptions[K],
  ) => setOptions((o) => ({ ...o, [key]: value }));

  const handleExport = async () => {
    const payload = await exportAll(options);
    downloadExport(payload);
    setStatus(
      `Exported ${payload.people.length} people, ${payload.relationships.length} relationships, ${payload.events.length} events.`,
    );
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (
      !confirm(
        `Import ${file.name}? This will REPLACE all current people, relationships, and events.`,
      )
    ) {
      return;
    }
    try {
      const text = await file.text();
      const result = await importAll(text);
      setStatus(
        `Imported ${result.people} people, ${result.relationships} relationships, ${result.events} events.`,
      );
    } catch (err) {
      if (err instanceof ImportValidationError) {
        setStatus(`Import failed: ${err.message}`);
      } else {
        setStatus('Import failed: unexpected error.');
        console.error(err);
      }
    }
  };

  const handleClear = async () => {
    if (
      !confirm(
        'Delete ALL people, relationships, and events? This cannot be undone (export first if you want a backup).',
      )
    ) {
      return;
    }
    await clearAll();
    setStatus('Cleared all data.');
  };

  return (
    <div className="data-menu">
      <button type="button" onClick={handleExport}>
        Export
      </button>
      <button
        type="button"
        onClick={() => setShowOptions((v) => !v)}
        title="Choose what to include in export"
      >
        {showOptions ? 'Hide options' : 'Options'}
      </button>
      <button type="button" onClick={handleImportClick}>
        Import
      </button>
      <button type="button" onClick={handleClear} className="danger">
        Clear all
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFile}
        hidden
      />
      {showOptions && (
        <div className="export-options">
          <span className="export-options-label">Include in export:</span>
          <label>
            <input
              type="checkbox"
              checked={options.includePhotos}
              onChange={(e) => setOpt('includePhotos', e.target.checked)}
            />
            Photos
          </label>
          <label>
            <input
              type="checkbox"
              checked={options.includeEvents}
              onChange={(e) => setOpt('includeEvents', e.target.checked)}
            />
            Timeline events
          </label>
          <label>
            <input
              type="checkbox"
              checked={options.includeDescriptions}
              onChange={(e) => setOpt('includeDescriptions', e.target.checked)}
            />
            Descriptions
          </label>
          <label>
            <input
              type="checkbox"
              checked={options.includeNotes}
              onChange={(e) => setOpt('includeNotes', e.target.checked)}
            />
            Notes
          </label>
        </div>
      )}
      {status && <span className="data-menu-status">{status}</span>}
    </div>
  );
}
