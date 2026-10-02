# Keep-awake helper for All Project Notes. The page's Start button opens
# allnotes://start/<seconds>, Stop opens allnotes://stop (see setup.bat).
# While running it presses a real key (F15, which no app uses) every 5 seconds
# and tells Windows not to sleep or turn the screen off.
param([string]$Uri = 'allnotes://start/10800')

$dir = Join-Path $env:LOCALAPPDATA 'AllProjectNotes'
New-Item -ItemType Directory -Force $dir | Out-Null
$pidFile = Join-Path $dir 'helper.pid'
$log = Join-Path $dir 'helper.log'
function Log($msg) { Add-Content $log ("{0:yyyy-MM-dd HH:mm:ss}  {1}" -f (Get-Date), $msg) }

# Only one helper at a time: stop the previous one, if it is really ours.
if (Test-Path $pidFile) {
    $old = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1) -as [int]
    if ($old -and $old -ne $PID) {
        $p = Get-CimInstance Win32_Process -Filter "ProcessId=$old" -ErrorAction SilentlyContinue
        if ($p -and $p.CommandLine -like '*awake.ps1*') { Stop-Process -Id $old -Force -ErrorAction SilentlyContinue; Log "stopped helper $old" }
    }
    Remove-Item $pidFile -ErrorAction SilentlyContinue
}

if ($Uri -match 'stop') { Log 'stop'; return }

$seconds = if ($Uri -match 'start/(\d+)') { [math]::Min([int]$Matches[1], 12 * 3600) } else { 3 * 3600 }
$PID | Set-Content $pidFile

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class AllNotesAwake {
    [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
    [DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint flags);
    public static void TapF15() {
        keybd_event(0x7E, 0, 0, UIntPtr.Zero);        // F15 down
        keybd_event(0x7E, 0, 2, UIntPtr.Zero);        // F15 up
    }
}
'@

$ES_CONTINUOUS = [uint32]'0x80000000'; $ES_SYSTEM = [uint32]1; $ES_DISPLAY = [uint32]2
[void][AllNotesAwake]::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM -bor $ES_DISPLAY)
Log "start, for $seconds s (pid $PID)"

$until = (Get-Date).AddSeconds($seconds)
$beat = [Diagnostics.Stopwatch]::StartNew()
try {
    while ((Get-Date) -lt $until) {
        [AllNotesAwake]::TapF15()
        $next = 5000 - ($beat.ElapsedMilliseconds % 5000)
        Start-Sleep -Milliseconds ([int]$next)
    }
    Log 'finished'
}
finally {
    [void][AllNotesAwake]::SetThreadExecutionState($ES_CONTINUOUS)
    if ((Get-Content $pidFile -ErrorAction SilentlyContinue) -eq "$PID") { Remove-Item $pidFile -ErrorAction SilentlyContinue }
}
