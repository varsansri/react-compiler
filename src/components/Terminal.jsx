import { useEffect, useRef, useState } from 'react';

const NOISE = [
  (file) => `[vite] hmr update /${file}`,
  (file) => `[vite] css update /${file.replace(/\.jsx?$/, '.css')}`,
  () => `[react-compiler] memoized ${2 + Math.floor(Math.random() * 9)} components`,
  () => `[eslint] 0 problems`,
  () => `[tsc] watching for file changes...`,
];

const BOOT = ['$ npm run dev', '', '  VITE v5.4.2  ready in 412 ms', '', '  > Local:   http://localhost:5173/', ''];

// The build output at the bottom: a line for every file that finishes,
// and some dev server chatter every few words.
export default function Terminal({ typed, file, running }) {
  const [lines, setLines] = useState(BOOT);
  const end = useRef(null);
  const lastFile = useRef(file);

  useEffect(() => {
    if (!running) return;
    const added = [];
    if (file !== lastFile.current) {
      added.push(`  ok ${lastFile.current} compiled in ${80 + Math.floor(Math.random() * 400)} ms`);
      lastFile.current = file;
    }
    if (typed % 7 === 0) added.push(NOISE[Math.floor(Math.random() * NOISE.length)](file));
    if (added.length) setLines((old) => [...old, ...added].slice(-200));
  }, [typed, file, running]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [lines]);

  return (
    <section className="terminal">
      <div className="terminal-tabs">
        <span>Problems</span>
        <span>Output</span>
        <span className="active">Terminal</span>
        <span>Ports</span>
      </div>
      <pre>
        {lines.map((line, index) => (
          <div key={index}>{line}</div>
        ))}
        <span ref={end} className="prompt" />
      </pre>
    </section>
  );
}
