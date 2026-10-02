# All Project Notes

A notes page that writes 2,000 words by itself, one word every 5 seconds, with a
small Windows helper that keeps the PC awake the whole time.

Page: https://varsansri.github.io/all-project-notes/

## How it works
- Press **Start** on the page. The words appear letter by letter, like someone typing.
- It keeps going while you use other tabs or apps, or with the window minimised.
  The words are timed by the clock, so the count is always right when you come back.
- Start also opens the keep-awake helper. It presses a real key every 5 seconds
  (F15, which no app uses, so it never types into anything) and tells Windows not
  to sleep or turn the screen off. It stops when you press Stop, or by itself when
  the 2,000 words are done.

## First time on a PC
1. Download this repo (Code > Download ZIP), unzip it somewhere it can stay.
2. Double-click `setup.bat` once.
3. Open the page and press Start. The browser asks to open the helper:
   tick "Always allow" and press Open.

Without the setup the page still types, but nothing keeps the PC awake.

## Notes
- The page has to stay open in a tab. Closing the tab or the browser stops the typing.
- Edit `words.txt` to change the text.
- The helper writes a log to `%LOCALAPPDATA%\AllProjectNotes\helper.log`.
