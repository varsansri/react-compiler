import { useMemo } from 'react';
import { highlight } from '../lib/highlight.js';

// A tiny copy of the whole file down the right-hand side, the way VS Code
// draws it, with a box marking the part that is on screen.
export default function Minimap({ text }) {
  const html = useMemo(() => highlight(text), [text]);
  return (
    <div className="minimap" aria-hidden="true">
      <pre dangerouslySetInnerHTML={{ __html: html }} />
      <div className="minimap-view" />
    </div>
  );
}
