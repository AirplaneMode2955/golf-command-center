'use client';

import { useRef, useState } from 'react';

export function Upload({ onFile, error }: { onFile: (file: File) => void; error: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div className="shell">
      <div className="top">
        <div className="brand">
          Golf <span>Command Center</span>
        </div>
      </div>

      <div
        className={`drop${over ? ' over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
      >
        <h1>See your whole golf game</h1>
        <p>
          Drop in your 18Birdies account archive and get your scoring trend, handicap, courses, hole-by-hole numbers and misses. Your
          file is read in your browser. It is never uploaded anywhere.
        </p>
        <button className="btn primary" onClick={() => input.current?.click()}>
          Choose your archive file
        </button>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          className="sr"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
        {error ? (
          <div className="err" role="alert">
            {error}
          </div>
        ) : null}

        <ol className="steps">
          <li>
            Go to{' '}
            <a href="https://18birdies.com/download-account-data/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
              18birdies.com/download-account-data
            </a>{' '}
            and sign in.
          </li>
          <li>Request your data and save the file.</li>
          <li>Drop it here, or choose it above.</li>
        </ol>
      </div>
    </div>
  );
}
