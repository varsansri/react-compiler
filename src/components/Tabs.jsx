import { FILES } from '../lib/files.js';

// One tab per file opened so far. The tab being typed in shows a dot
// instead of a close button, just like an unsaved file.
export default function Tabs({ files, open, current, onOpen }) {
  return (
    <div className="tabs">
      {files.map((index) => (
        <button key={index} className={index === open ? 'tab active' : 'tab'} onClick={() => onOpen(index)}>
          {FILES[index].split('/').pop()}
          {index === current ? <span className="dot" /> : <span className="close">x</span>}
        </button>
      ))}
    </div>
  );
}
