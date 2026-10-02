function duration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours} h ${minutes} min` : `${minutes} min`;
}

// The coloured bar along the bottom: branch, problems, progress, and where
// the caret is.
export default function StatusBar({ typist, text }) {
  const lines = text.split('\n');
  const done = typist.typed >= typist.goal;
  const state = typist.running ? 'compiling' : done ? 'done' : 'idle';

  return (
    <footer className={typist.running ? 'statusbar live' : 'statusbar'}>
      <span className="branch">main*</span>
      <span>0 errors, 0 warnings</span>
      <span>{state}</span>
      <span className="spacer" />
      <span>{`${typist.typed} / ${typist.goal} words`}</span>
      <span>{done ? 'done' : `${duration(typist.secondsLeft)} left`}</span>
      <span>{`Ln ${lines.length}, Col ${lines[lines.length - 1].length + 1}`}</span>
      <span>Spaces: 2</span>
      <span>UTF-8</span>
      <span>JavaScript JSX</span>
    </footer>
  );
}
