import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useWorkerClock } from './useWorkerClock.js';

const SECONDS_PER_WORD = 5;
const STORAGE_KEY = 'react-compiler-state';
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

const random = (min, max) => min + Math.random() * (max - min);

// Turns one word into keystrokes with human timing: a pause after each line
// break, quick indentation, and now and then a wrong letter that gets fixed.
function keystrokesFor({ sep, word }) {
  const keys = [];
  for (const char of sep) {
    keys.push({ key: char, wait: char === '\n' ? random(120, 320) : random(5, 30) });
  }
  const pace = Math.min(1, 25 / word.length);
  const slip = word.length > 3 && Math.random() < 0.04 ? 1 + Math.floor(Math.random() * (word.length - 1)) : -1;
  [...word].forEach((char, index) => {
    if (index === slip) {
      keys.push({ key: LETTERS[Math.floor(Math.random() * 26)], wait: random(200, 450) });
      keys.push({ key: '\b', wait: random(90, 200) });
    }
    keys.push({ key: char, wait: random(60, 210) * pace });
  });
  return keys;
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

const initial = { running: false, startedAt: 0, typed: 0, texts: {} };

function reducer(state, action) {
  switch (action.type) {
    case 'start':
      return { ...state, running: true, startedAt: action.now - state.typed * SECONDS_PER_WORD * 1000 };
    case 'stop':
      return { ...state, running: false };
    case 'key': {
      const before = state.texts[action.file] ?? '';
      const after = action.key === '\b' ? before.slice(0, -1) : before + action.key;
      return { ...state, texts: { ...state.texts, [action.file]: after } };
    }
    case 'word': {
      const typed = state.typed + 1;
      return { ...state, typed, running: state.running && typed < action.goal };
    }
    case 'reset':
      return { ...initial };
    default:
      return state;
  }
}

export function useTypewriter(words) {
  const [state, dispatch] = useReducer(reducer, initial, () => ({ ...initial, ...load() }));
  const queue = useRef([]);
  const nextKeyAt = useRef(0);
  const goal = words.length;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
    } catch {
      // private windows can refuse storage; the typing carries on regardless
    }
  }, [state]);

  // Words are due by the wall clock, not by counting ticks, so a page that
  // the browser paused for a while catches up to the right word on return.
  const tick = useCallback(() => {
    if (!state.running || !goal) return;
    const now = Date.now();
    const word = words[state.typed];

    if (queue.current.length) {
      const flush = document.hidden;
      while (queue.current.length && (flush || now >= nextKeyAt.current)) {
        const stroke = queue.current.shift();
        dispatch({ type: 'key', file: word.file, key: stroke.key });
        nextKeyAt.current = now + stroke.wait;
        if (!flush) break;
      }
      if (!queue.current.length) dispatch({ type: 'word', goal });
      return;
    }

    const due = Math.min(goal, Math.floor((now - state.startedAt) / (SECONDS_PER_WORD * 1000)) + 1);
    if (state.typed < due) {
      queue.current = keystrokesFor(word);
      nextKeyAt.current = now;
    }
  }, [state, words, goal]);

  useWorkerClock(tick);

  const start = useCallback(() => dispatch({ type: 'start', now: Date.now() }), []);

  const stop = useCallback(() => {
    queue.current = [];
    dispatch({ type: 'stop' });
  }, []);

  const reset = useCallback(() => {
    queue.current = [];
    dispatch({ type: 'reset' });
  }, []);

  const current = words[Math.min(state.typed, goal - 1)];
  return {
    ...state,
    goal,
    currentFile: current?.file ?? 0,
    currentWord: queue.current.length ? current?.word : null,
    secondsLeft: Math.max(0, goal - state.typed) * SECONDS_PER_WORD,
    start,
    stop,
    reset,
  };
}
