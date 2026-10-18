<#
.SYNOPSIS
Copies the real farm's save out of the farm-data volume into OneDrive, keeping the newest 14.

.DESCRIPTION
Runs a throwaway container from the farm's image with the farm-data volume mounted read-only.
It takes a consistent snapshot of the save database (safe while the farm is running and saving),
checks that every world in it loads, and the script copies it to
<BackupDir>\cozy-farm-<date>_<time>.sqlite. Then all but the newest -Keep backups in that folder
are deleted. If anything fails, no backup is added and none are deleted. Each run adds a line to
backup-log.txt in the same folder.

Run it with `npm run farm:backup`. Extra options go after `--`, e.g. `npm run farm:backup -- -Keep 30`.

.NOTES
Nightly backups need a Windows scheduled task. This creates one that runs at 4am (or as soon as
the PC is on, if it was off), from a normal PowerShell window:

  $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\Users\mason\Projects\cozy-farm\scripts\backup-farm.ps1"'
  $trigger = New-ScheduledTaskTrigger -Daily -At 4am
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable
  Register-ScheduledTask -TaskName 'Cozy Farm backup' -Action $action -Trigger $trigger -Settings $settings

To restore a backup, run `npm run farm:restore` (scripts/restore-farm.ps1). It lists the newest
backups and asks which one, checks it loads, then swaps it in and restarts the farm. The save it
replaces is kept in the volume as saves.before-restore-<date>_<time>.sqlite.
#>
[CmdletBinding()]
param(
  # Folder the backups go in.
  [string]$BackupDir = $(if ($env:OneDrive) { Join-Path $env:OneDrive 'CozyFarm\backups' } else { '' }),
  # How many backups to keep. Older ones are deleted.
  [ValidateRange(1, 1000)]
  [int]$Keep = 14,
  # The farm's volume and image. Docker Compose names them after the cozy-farm folder.
  [string]$Volume = 'cozy-farm_farm-data',
  [string]$Image = 'cozy-farm-farm'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$BackupPattern = '^cozy-farm-\d{4}-\d{2}-\d{2}_\d{6}\.sqlite$'

# Runs docker and returns its output lines, or throws with that output if it fails.
function Invoke-Docker {
  # Windows PowerShell turns anything a native command writes to stderr into an error, and 'Stop'
  # would end the script on docker's first warning. Judge by the exit code instead.
  $ErrorActionPreference = 'Continue'
  $output = @(& docker @args 2>&1 | ForEach-Object {
      # Blank stderr lines come through as this placeholder.
      "$_" -replace '^System\.Management\.Automation\.RemoteException$', ''
    })
  if ($LASTEXITCODE -ne 0) { throw ($output -join "`n").Trim() }
  $output
}

function Write-Log([string]$Line) {
  if ($BackupDir -and (Test-Path -LiteralPath $BackupDir)) {
    Add-Content -LiteralPath (Join-Path $BackupDir 'backup-log.txt') -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $Line"
  }
}

try {
  if (-not $BackupDir) { throw 'OneDrive is not set up on this PC (%OneDrive% is empty). Pass -BackupDir <folder>.' }
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'docker was not found. Is Docker Desktop installed?' }
  try { Invoke-Docker info --format '{{.ServerVersion}}' | Out-Null } catch { throw 'Docker is not running. Start Docker Desktop, then try again.' }
  try { Invoke-Docker volume inspect $Volume | Out-Null } catch { throw "The farm's volume '$Volume' was not found, so there's nothing to back up." }
  try { Invoke-Docker image inspect $Image | Out-Null } catch { throw "The farm's image '$Image' was not found. Build it with npm run farm:up." }

  New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
  $name = "cozy-farm-$(Get-Date -Format 'yyyy-MM-dd_HHmmss').sqlite"
  $dest = Join-Path $BackupDir $name
  # Copy to local temp first, so OneDrive never syncs a half-copied file.
  $temp = Join-Path ([IO.Path]::GetTempPath()) "$name.partial"

  $container = Invoke-Docker create --network none --label cozy-farm.backup=1 `
    -e DATA_DIR=/app/data -v "${Volume}:/app/data:ro" $Image `
    node --import tsx server/src/persistence/snapshotCli.ts /tmp/saves.sqlite | Select-Object -Last 1
  try {
    try {
      $report = Invoke-Docker start --attach $container
    } catch {
      if ("$_" -match 'Cannot find module.*snapshotCli') {
        throw "The farm's image is older than the save layer. Rebuild it with npm run farm:up once saving is wired in."
      }
      throw
    }
    try { Invoke-Docker cp "${container}:/tmp/saves.sqlite" $temp | Out-Null } catch { throw "Copying the snapshot out of Docker failed: $_" }
  } finally {
    & docker rm --force $container 2>&1 | Out-Null
  }
  Move-Item -LiteralPath $temp -Destination $dest

  $report | ForEach-Object { Write-Host $_ }
  Write-Host "Saved backup to $dest"

  $old = @(Get-ChildItem -LiteralPath $BackupDir -File |
      Where-Object { $_.Name -match $BackupPattern } |
      Sort-Object Name -Descending |
      Select-Object -Skip $Keep)
  foreach ($file in $old) {
    Remove-Item -LiteralPath $file.FullName
    Write-Host "Deleted old backup $($file.Name)"
  }

  Write-Log "OK      $name ($(@($report) -join ' '))"
} catch {
  if ((Get-Variable temp -ErrorAction SilentlyContinue) -and (Test-Path -LiteralPath $temp)) {
    Remove-Item -LiteralPath $temp
  }
  Write-Host "Backup failed: $($_.Exception.Message)" -ForegroundColor Red
  Write-Log "FAILED  $($_.Exception.Message -replace '\s+', ' ')"
  exit 1
}
