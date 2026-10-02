// A small syntax highlighter: comments, strings, numbers, JSX tags, function
// calls and keywords. Good enough for an editor that only shows its own code.

const KEYWORDS = new Set([
  'import', 'export', 'default', 'from', 'const', 'let', 'function', 'return',
  'if', 'else', 'for', 'of', 'new', 'async', 'await', 'switch', 'case',
  'true', 'false', 'null', 'undefined', 'try', 'catch',
]);

const PATTERN =
  /(\/\/[^\n]*)|('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|(<\/?)([A-Za-z][\w.]*)|([A-Za-z_$][\w$]*)(?=\()|([A-Za-z_$][\w$]*)/g;

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const wrap = (kind, text) => `<span class="${kind}">${escape(text)}</span>`;

export function highlight(source) {
  let html = '';
  let last = 0;
  for (const match of source.matchAll(PATTERN)) {
    const [text, comment, string, number, bracket, tag, call, word] = match;
    html += escape(source.slice(last, match.index));
    if (comment) html += wrap('c', text);
    else if (string) html += wrap('s', text);
    else if (number) html += wrap('n', text);
    else if (tag) html += escape(bracket) + wrap(/^[A-Z]/.test(tag) ? 'x' : 't', tag);
    else if (call) html += wrap('f', call);
    else if (KEYWORDS.has(word)) html += wrap('k', word);
    else if (/^[A-Z]/.test(word)) html += wrap('x', word);
    else html += escape(text);
    last = match.index + text.length;
  }
  return html + escape(source.slice(last));
}
