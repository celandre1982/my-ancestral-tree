import { useRef, useState } from 'react';
import {
  clearAll,
  downloadExport,
  exportAll,
  ImportValidationError,
  importAll,
} from '../db/io';

export function DataMenu() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>('');

  const handleExport = async () => {
    const payload = await exportAll();
    downloadExport(payload);
    setStatus(
      `Exported ${payload.people.length} people, ${payload.relationships.length} relationships.`,
    );
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (
      !confirm(
        `Import ${file.name}? This will REPLACE all current people and relationships.`,
      )
    ) {
      return;
    }
    try {
      const text = await file.text();
      const result = await importAll(text);
      setStatus(
        `Imported ${result.people} people, ${result.relationships} relationships.`,
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
        'Delete ALL people and relationships? This cannot be undone (export first if you want a backup).',
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
      {status && <span className="data-menu-status">{status}</span>}
    </div>
  );
}
