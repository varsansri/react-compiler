const MENU = ['File', 'Edit', 'Selection', 'View', 'Go', 'Run', 'Terminal', 'Help'];

export default function TitleBar({ file, running, onToggle }) {
  return (
    <header className="titlebar">
      <div className="lights">
        <span className="light red" />
        <span className="light amber" />
        <span className="light green" />
      </div>
      <nav className="menu">
        {MENU.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </nav>
      <div className="title">{`${file} - React Compiler`}</div>
      <button className={running ? 'run on' : 'run'} onClick={onToggle}>
        {running ? 'Stop' : 'Start'}
      </button>
    </header>
  );
}
