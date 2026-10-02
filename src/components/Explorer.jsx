// The file tree on the left. Finished files can be opened, the file being
// typed right now gets a dot, and files still to come are greyed out.
function Node({ node, depth, current, open, onOpen }) {
  const indent = { paddingLeft: 10 + depth * 12 };

  if (node.file !== null) {
    const status = node.file < current ? 'done' : node.file === current ? 'live' : 'todo';
    const extension = node.name.split('.').pop();
    return (
      <button
        className={`file ${status} ${node.file === open ? 'open' : ''}`}
        style={indent}
        disabled={status === 'todo'}
        onClick={() => onOpen(node.file)}
      >
        <span className={`icon ${extension}`}>{extension === 'jsx' ? 'R' : 'JS'}</span>
        {node.name}
        {status === 'live' && <span className="dot" />}
      </button>
    );
  }

  return (
    <div className="folder">
      <div className="folder-name" style={indent}>
        {node.name}
      </div>
      {Object.values(node.children).map((child) => (
        <Node key={child.name} node={child} depth={depth + 1} current={current} open={open} onOpen={onOpen} />
      ))}
    </div>
  );
}

export default function Explorer({ tree, current, open, onOpen }) {
  return (
    <aside className="explorer">
      <div className="explorer-head">Explorer</div>
      <Node node={tree} depth={0} current={current} open={open} onOpen={onOpen} />
    </aside>
  );
}
