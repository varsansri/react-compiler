import { useLayoutEffect, useState } from 'react';

const KINDS = ['abc', 'fn', 'var'];

// A suggestion box that follows the caret, like a real editor's IntelliSense.
export default function Autocomplete({ word, typed, anchor }) {
  const [position, setPosition] = useState(null);

  useLayoutEffect(() => {
    const box = anchor.current?.getBoundingClientRect();
    if (box) setPosition({ left: box.left, top: box.bottom + 4 });
  }, [typed, anchor]);

  const name = word.match(/[A-Za-z_$][\w$]*/g)?.find((part) => part.startsWith(typed) && part.length > 3);
  if (!position || typed.length < 2 || !name) return null;

  const options = [name, `${name}Ref`, `use${name[0].toUpperCase()}${name.slice(1)}`];
  return (
    <ul className="autocomplete" style={position}>
      {options.map((option, index) => (
        <li key={option} className={index === 0 ? 'picked' : undefined}>
          <span className="kind">{KINDS[index]}</span>
          <b>{option.slice(0, typed.length)}</b>
          {option.slice(typed.length)}
        </li>
      ))}
    </ul>
  );
}
