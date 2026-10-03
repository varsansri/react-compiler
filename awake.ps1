# Keep-awake helper for React Compiler. The page's Start button opens
# reactcompiler://start/forever (or start/<seconds>), Finish opens reactcompiler://stop
# (see setup.bat). "forever" runs until Finish is pressed.
# While running, every 5 seconds it presses a real key (F15, which no app uses),
# and the whole time it glides the mouse slowly from corner to corner of the
# main screen, along curves, like a hand would. If you move the mouse yourself it
# pauses, and carries on once the mouse has sat still for 20 seconds.
# It also tells Windows not to sleep or turn the screen off.
param([string]$Uri = 'reactcompiler://start/10800')

$dir = Join-Path $env:LOCALAPPDATA 'ReactCompiler'
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

$forever = $Uri -match 'start/forever'
$seconds = if ($Uri -match 'start/(\d+)') { [math]::Min([int]$Matches[1], 12 * 3600) } else { 3 * 3600 }
$PID | Set-Content $pidFile

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class ReactCompilerAwake {
    [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
    [DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint flags);
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] static extern bool GetCursorPos(out POINT p);
    [DllImport("user32.dll")] static extern int GetSystemMetrics(int i);
    [DllImport("user32.dll")] static extern uint SendInput(uint n, INPUT[] inputs, int size);

    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
    [StructLayout(LayoutKind.Sequential)] struct MOUSEINPUT { public int dx, dy; public uint data, flags, time; public IntPtr extra; }
    [StructLayout(LayoutKind.Sequential)] struct INPUT { public uint type; public MOUSEINPUT mi; }

    public static void TapF15() {
        keybd_event(0x7E, 0, 0, UIntPtr.Zero);        // F15 down
        keybd_event(0x7E, 0, 2, UIntPtr.Zero);        // F15 up
    }

    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    [DllImport("user32.dll")] static extern bool SystemParametersInfo(uint a, uint b, ref RECT r, uint c);
    public static RECT WorkArea() { RECT r = new RECT(); SystemParametersInfo(0x30, 0, ref r, 0); return r; }  // main screen minus taskbar

    public static POINT Cursor() { POINT p; GetCursorPos(out p); return p; }

    // A real mouse-move event (not just placing the cursor), so anything that
    // watches for mouse activity sees it. Absolute, so it lands exactly.
    public static void MoveTo(int x, int y) {
        int left = GetSystemMetrics(76), top = GetSystemMetrics(77);      // virtual screen, all monitors
        int w = Math.Max(GetSystemMetrics(78) - 1, 1), h = Math.Max(GetSystemMetrics(79) - 1, 1);
        x = Math.Min(Math.Max(x, left), left + w); y = Math.Min(Math.Max(y, top), top + h);
        INPUT[] i = new INPUT[1];
        i[0].type = 0;                                                    // mouse
        i[0].mi.dx = (int)Math.Round((x - left) * 65535.0 / w);
        i[0].mi.dy = (int)Math.Round((y - top) * 65535.0 / h);
        i[0].mi.flags = 0x0001 | 0x8000 | 0x4000;                         // MOVE | ABSOLUTE | VIRTUALDESK
        SendInput(1, i, Marshal.SizeOf(typeof(INPUT)));
    }
}
'@
[void][ReactCompilerAwake]::SetProcessDPIAware()
$rng = [Random]::new()
$clock = [Diagnostics.Stopwatch]::StartNew()
$until = if ($forever) { [datetime]::MaxValue } else { (Get-Date).AddSeconds($seconds) }
$lastTap = -5000
$set = $null       # where the helper last put the mouse

function Beat {    # the F15 key, every 5 seconds whatever else is going on
    if ($clock.ElapsedMilliseconds - $script:lastTap -ge 5000) { [ReactCompilerAwake]::TapF15(); $script:lastTap = $clock.ElapsedMilliseconds }
}
function UserMoved {
    if ($null -eq $script:set) { return $false }
    $c = [ReactCompilerAwake]::Cursor()
    return ([math]::Abs($c.X - $script:set.X) -gt 3 -or [math]::Abs($c.Y - $script:set.Y) -gt 3)
}
function Rest($ms) {
    $end = $clock.ElapsedMilliseconds + $ms
    while ($clock.ElapsedMilliseconds -lt $end -and (Get-Date) -lt $until) { Beat; Start-Sleep -Milliseconds 50 }
}
# You took the mouse: leave it alone until it has sat still for 20 seconds.
function WaitForStill {
    Log 'paused: mouse in use'
    $p = [ReactCompilerAwake]::Cursor(); $still = [Diagnostics.Stopwatch]::StartNew()
    while ($still.ElapsedMilliseconds -lt 20000 -and (Get-Date) -lt $until) {
        Beat; Start-Sleep -Milliseconds 200
        $c = [ReactCompilerAwake]::Cursor()
        if ($c.X -ne $p.X -or $c.Y -ne $p.Y) { $p = $c; $still.Restart() }
    }
    $script:set = [ReactCompilerAwake]::Cursor()
}

# One slow glide along a gentle curve, easing off at both ends like a hand,
# with a pixel of tremble. Returns $false if you grabbed the mouse on the way.
function Glide($tx, $ty) {
    $f = [ReactCompilerAwake]::Cursor(); $fx = $f.X; $fy = $f.Y
    $len = [math]::Max([math]::Sqrt(($tx - $fx) * ($tx - $fx) + ($ty - $fy) * ($ty - $fy)), 1)
    $bend = $len * ($rng.NextDouble() * 0.3 - 0.15)
    $cx = ($fx + $tx) / 2 - ($ty - $fy) / $len * $bend; $cy = ($fy + $ty) / 2 + ($tx - $fx) / $len * $bend
    $ms = [math]::Max($len / $rng.Next(170, 261) * 1000, 1500)
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ((Get-Date) -lt $until) {
        if (UserMoved) { return $false }
        $t = [math]::Min($sw.ElapsedMilliseconds / $ms, 1); $e = $t * $t * (3 - 2 * $t)
        $x = (1 - $e) * (1 - $e) * $fx + 2 * (1 - $e) * $e * $cx + $e * $e * $tx
        $y = (1 - $e) * (1 - $e) * $fy + 2 * (1 - $e) * $e * $cy + $e * $e * $ty
        if ($t -lt 1) { $x += $rng.Next(-1, 2); $y += $rng.Next(-1, 2) }
        [ReactCompilerAwake]::MoveTo([int][math]::Round($x), [int][math]::Round($y))
        $script:set = [ReactCompilerAwake]::Cursor()
        Beat
        if ($t -ge 1) { break }
        Start-Sleep -Milliseconds 10
    }
    return $true
}

$ES_CONTINUOUS = [uint32]'0x80000000'; $ES_SYSTEM = [uint32]1; $ES_DISPLAY = [uint32]2
[void][ReactCompilerAwake]::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM -bor $ES_DISPLAY)
Log $(if ($forever) { "start, until Finish (pid $PID)" } else { "start, for $seconds s (pid $PID)" })

$set = [ReactCompilerAwake]::Cursor()
$corner = -1
try {
    while ((Get-Date) -lt $until) {
        # Corners of the main screen, kept clear of the taskbar and the very edges.
        $a = [ReactCompilerAwake]::WorkArea(); $m = 70
        $next = $rng.Next(0, 4); if ($next -eq $corner) { $next = ($next + $rng.Next(1, 4)) % 4 }
        $tx = if ($next % 2 -eq 0) { $a.Left + $m } else { $a.Right - $m }
        $ty = if ($next -lt 2) { $a.Top + $m } else { $a.Bottom - $m }
        $tx += $rng.Next(-25, 26); $ty += $rng.Next(-25, 26)
        if (Glide $tx $ty) { $corner = $next; Rest $rng.Next(400, 1800) }
        else { WaitForStill; $corner = -1 }
    }
    Log 'finished'
}
finally {
    [void][ReactCompilerAwake]::SetThreadExecutionState($ES_CONTINUOUS)
    if ((Get-Content $pidFile -ErrorAction SilentlyContinue) -eq "$PID") { Remove-Item $pidFile -ErrorAction SilentlyContinue }
}
