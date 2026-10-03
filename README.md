# React Compiler

An editor in the browser, styled like VS Code, that types out its own React and
JavaScript source (the files in `src/`, 2,336 words) one word every 5 seconds,
letter by letter, with a small Windows helper that keeps the PC awake meanwhile.

Page: https://varsansri.github.io/react-compiler/

## How it works
- Press **Start**. The code appears file by file: explorer, tabs, highlighting,
  minimap, suggestion pop-ups, and a terminal printing build output.
- It keeps going while you use other tabs or apps, or with the window minimised.
  Words are timed by the clock, so the count is always right when you come back.
- Start also opens the keep-awake helper. It presses a real key every 5 seconds
  (F15, which no app uses, so it never types into anything), glides the mouse
  slowly from corner to corner of the main screen along curves, like a hand, and
  tells Windows not to sleep or turn the screen off. It stops on Stop, or by
  itself when the run ends.
- If you move the mouse yourself, the glide pauses and leaves it to you; it
  carries on once the mouse has sat still for 20 seconds. It never clicks.

## First time on a PC
1. Download this repo (Code > Download ZIP), unzip it somewhere it can stay.
2. Double-click `setup.bat` once.
3. Open the page and press Start. The browser asks to open the helper:
   tick "Always allow" and press Open.

Without the setup the page still types, but nothing keeps the PC awake.

## Notes
- The page has to stay open in a tab. Closing it stops the typing.
- `app.js` is the code that runs the page; `src/` is the React code it types.
- The helper logs to `%LOCALAPPDATA%\ReactCompiler\helper.log`.
