import { useEffect, useMemo, useState } from 'react';
import { FILES, buildTree, loadWords } from './lib/files.js';
import { useTypewriter } from './hooks/useTypewriter.js';
import { useWakeLock } from './hooks/useWakeLock.js';
import TitleBar from './components/TitleBar.jsx';
import Explorer from './components/Explorer.jsx';
import Tabs from './components/Tabs.jsx';
import Editor from './components/Editor.jsx';
import Minimap from './components/Minimap.jsx';
import Terminal from './components/Terminal.jsx';
import StatusBar from './components/StatusBar.jsx';

// The small Windows helper (setup.bat) answers reactcompiler:// links and
// presses a real key every 5 seconds, so the PC never falls asleep.
function helper(command) {
  const link = document.createElement('a');
  link.href = `reactcompiler://${command}`;
  link.click();
}

export default function App() {
  const [words, setWords] = useState([]);
  const [viewing, setViewing] = useState(null);
  const tree = useMemo(() => buildTree(FILES), []);
  const typist = useTypewriter(words);

  useEffect(() => {
    loadWords().then(setWords);
  }, []);

  useWakeLock(typist.running);

  // Follow the typing into each new file, unless the reader picked a tab.
  useEffect(() => {
    setViewing(null);
  }, [typist.currentFile]);

  const open = viewing ?? typist.currentFile;
  const text = typist.texts[open] ?? '';
  const opened = FILES.map((_, index) => index).filter((index) => index <= typist.currentFile);
  const live = typist.running && open === typist.currentFile;

  const toggle = () => {
    if (typist.running) {
      typist.stop();
      helper('stop');
      return;
    }
    if (typist.typed >= typist.goal) typist.reset();
    typist.start();
    helper(`start/${typist.secondsLeft + 60}`);
  };

  return (
    <div className="ide">
      <TitleBar file={FILES[open]} running={typist.running} onToggle={toggle} />
      <div className="body">
        <Explorer tree={tree} current={typist.currentFile} open={open} onOpen={setViewing} />
        <main className="workspace">
          <Tabs files={opened} open={open} current={typist.currentFile} onOpen={setViewing} />
          <div className="editor-row">
            <Editor text={text} live={live} word={typist.currentWord} />
            <Minimap text={text} />
          </div>
          <Terminal typed={typist.typed} file={FILES[typist.currentFile]} running={typist.running} />
        </main>
      </div>
      <StatusBar typist={typist} text={text} />
    </div>
  );
}
