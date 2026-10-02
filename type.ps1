# Types words.txt into the Typing Notes page with real keystrokes, one word every
# few seconds, so the PC never goes idle. Only types while that page is in front.
param(
    [int]$Words = 2000,
    [double]$SecondsPerWord = 5,
    [string]$Url = 'https://varsansri.github.io/typing-notes/',
    [switch]$Local,
    [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$pageTitle = 'Typing Notes'

# Build the word list, remembering where paragraphs start. Loops the text if it is short.
$raw = Get-Content (Join-Path $here 'words.txt') -Raw
$paragraphs = @($raw -split '\r?\n\s*\r?\n' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if (-not $paragraphs) { throw 'words.txt is empty.' }
$tokens = New-Object System.Collections.Generic.List[object]
while ($tokens.Count -lt $Words) {
    foreach ($p in $paragraphs) {
        $first = $true
        foreach ($w in ($p -split '\s+')) {
            if ($tokens.Count -ge $Words) { break }
            $tokens.Add([pscustomobject]@{ Word = $w; NewPara = ($first -and $tokens.Count -gt 0) })
            $first = $false
        }
        if ($tokens.Count -ge $Words) { break }
    }
}

if ($DryRun) {
    "Words to type: $($tokens.Count)  (words.txt has $(($raw -split '\s+' | Where-Object { $_ }).Count))"
    "Paragraph breaks: $(@($tokens | Where-Object NewPara).Count)"
    "Starts: $(($tokens | Select-Object -First 8).Word -join ' ') ..."
    "Ends:   ... $(($tokens | Select-Object -Last 8).Word -join ' ')"
    return
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class TypingWin {
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
    [DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint flags);
    public static string ForegroundTitle() {
        var sb = new StringBuilder(512);
        GetWindowText(GetForegroundWindow(), sb, 512);
        return sb.ToString();
    }
}
'@

function Send([string]$keys) { [System.Windows.Forms.SendKeys]::SendWait($keys) }

# SendKeys treats these characters as commands, so wrap them in braces.
function Key([char]$c) {
    if ('+^%~(){}[]'.IndexOf($c) -ge 0) { return '{' + $c + '}' }
    return [string]$c
}

function Wait-ForPage {
    $said = $false
    while ((([TypingWin]::ForegroundTitle())) -notlike "*$pageTitle*") {
        if (-not $said) { Write-Host "  Paused - click the Typing Notes page to carry on." -ForegroundColor Yellow; $said = $true }
        Start-Sleep -Milliseconds 500
    }
    if ($said) { Write-Host "  Back on the page, typing again." -ForegroundColor Green }
}

# Backup: also tell Windows not to sleep while this runs, even when paused.
$ES_CONTINUOUS = [uint32]'0x80000000'; $ES_SYSTEM = [uint32]1; $ES_DISPLAY = [uint32]2
[void][TypingWin]::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM -bor $ES_DISPLAY)

$letters = 'abcdefghijklmnopqrstuvwxyz'
try {
    if ($Local) { Start-Process (Join-Path $here 'index.html') } else { Start-Process $Url }
    Write-Host "Opened the notes page. Click inside the box; typing starts when the page is in front."
    Write-Host "$($tokens.Count) words, one every $SecondsPerWord s (about $([math]::Round($tokens.Count * $SecondsPerWord / 3600, 1)) hours). Press Ctrl+C here to stop.`n"

    for ($i = 0; $i -lt $tokens.Count; $i++) {
        $slot = [Diagnostics.Stopwatch]::StartNew()
        Wait-ForPage
        $t = $tokens[$i]

        if ($t.NewPara) { Send '{ENTER}'; Start-Sleep -Milliseconds (Get-Random -Min 150 -Max 400); Send '{ENTER}' }
        elseif ($i -gt 0) { Send ' ' }

        # Now and then, hit a wrong key and correct it, like a person would.
        $typoAt = if ($t.Word.Length -gt 3 -and (Get-Random -Max 100) -lt 4) { Get-Random -Min 1 -Max $t.Word.Length } else { -1 }
        for ($c = 0; $c -lt $t.Word.Length; $c++) {
            if ($c -eq $typoAt) {
                Send ([string]$letters[(Get-Random -Max 26)])
                Start-Sleep -Milliseconds (Get-Random -Min 200 -Max 450)
                Send '{BACKSPACE}'
                Start-Sleep -Milliseconds (Get-Random -Min 90 -Max 200)
            }
            Send (Key $t.Word[$c])
            Start-Sleep -Milliseconds (Get-Random -Min 60 -Max 210)
        }

        $done = $i + 1
        Write-Progress -Activity 'Typing notes' -Status "$done / $($tokens.Count) words" -PercentComplete ($done / $tokens.Count * 100)

        $rest = $SecondsPerWord * 1000 - $slot.ElapsedMilliseconds
        if ($rest -gt 0) { Start-Sleep -Milliseconds ([int]$rest) }
    }
    Write-Host "`nDone - $($tokens.Count) words typed." -ForegroundColor Green
}
finally {
    [void][TypingWin]::SetThreadExecutionState($ES_CONTINUOUS)
}
