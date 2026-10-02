import { useLayoutEffect, useMemo, useRef } from 'react';
import { highlight } from '../lib/highlight.js';
import Autocomplete from './Autocomplete.jsx';

export default function Editor({ text, live, word }) {
  const pane = useRef(null);
  const caret = useRef(null);
  const html = useMemo(() => highlight(text), [text]);
  const lines = text.split('\n');
  const row = lines.length;
  const partial = lines[row - 1].match(/[A-Za-z_$][\w$]*$/)?.[0] ?? '';

  // Keep the newest line in view while typing.
  useLayoutEffect(() => {
    if (live && pane.current) pane.current.scrollTop = pane.current.scrollHeight;
  }, [html, live]);

  return (
    <div className="editor" ref={pane}>
      <pre className="gutter">
        {lines.map((_, index) => (
          <div key={index} className={index === row - 1 ? 'active' : undefined}>
            {index + 1}
          </div>
        ))}
      </pre>
      <pre className="code">
        <code dangerouslySetInnerHTML={{ __html: html }} />
        {live && <span className="caret" ref={caret} />}
      </pre>
      {live && word && <Autocomplete word={word} typed={partial} anchor={caret} />}
    </div>
  );
}
