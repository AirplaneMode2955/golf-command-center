'use client';

import { useEffect, useState } from 'react';
import { parseArchive } from '@/lib/parse';
import { clearSaved, loadSaved, save } from '@/lib/storage';
import type { GolfData } from '@/lib/types';
import { Dashboard } from './components/Dashboard';
import { Upload } from './components/Upload';

export default function Page() {
  const [data, setData] = useState<GolfData | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(loadSaved());
    setReady(true);
  }, []);

  async function onFile(file: File) {
    setError(null);
    try {
      const parsed = parseArchive(JSON.parse(await file.text()));
      save(parsed);
      setData(parsed);
    } catch (e) {
      setError(e instanceof SyntaxError ? "That file isn't valid JSON. Use the .json file from 18Birdies." : (e as Error).message);
    }
  }

  if (!ready) return null;
  if (!data) return <Upload onFile={onFile} error={error} />;
  return (
    <Dashboard
      data={data}
      onReplace={onFile}
      onClear={() => {
        clearSaved();
        setData(null);
      }}
      error={error}
    />
  );
}
