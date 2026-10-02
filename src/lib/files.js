// The files this editor types out, in order. Each one is fetched as plain text
// and split into words, keeping the spaces and line breaks in front of each word,
// so the code comes out with exactly the same layout as the original.

export const FILES = [
  'src/main.jsx',
  'src/App.jsx',
  'src/lib/files.js',
  'src/lib/highlight.js',
  'src/hooks/useWorkerClock.js',
  'src/hooks/useWakeLock.js',
  'src/hooks/useTypewriter.js',
  'src/components/TitleBar.jsx',
  'src/components/Explorer.jsx',
  'src/components/Tabs.jsx',
  'src/components/Editor.jsx',
  'src/components/Autocomplete.jsx',
  'src/components/Minimap.jsx',
  'src/components/Terminal.jsx',
  'src/components/StatusBar.jsx',
];

export async function loadWords(files = FILES) {
  const sources = await Promise.all(files.map((path) => fetch(path).then((response) => response.text())));
  return sources.flatMap((source, file) =>
    [...source.matchAll(/(\s*)(\S+)/g)].map((match, index) => ({
      file,
      sep: index === 0 ? '' : match[1],
      word: match[2],
    }))
  );
}

// Turns the flat list of paths into folders and files for the explorer.
export function buildTree(files = FILES) {
  const root = { name: 'react-compiler', children: {}, file: null };
  files.forEach((path, index) => {
    let node = root;
    const parts = path.split('/');
    parts.forEach((part, depth) => {
      const isFile = depth === parts.length - 1;
      node.children[part] ??= { name: part, children: {}, file: isFile ? index : null };
      node = node.children[part];
    });
  });
  return root;
}
