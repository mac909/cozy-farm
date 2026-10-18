<#
.SYNOPSIS
Puts one of the backups made by backup-farm.ps1 back into the real farm, replacing its current save.

.DESCRIPTION
Without a backup path, it lists the newest backups in -BackupDir and asks which one to restore.

Before changing anything, it checks the backup in a throwaway container from the image the farm
runs: SQLite's integrity check, then every world in it must load. A backup that fails is refused.

Then it asks you to confirm, stops the farm (anyone playing is disconnected until it's back a few
seconds later), keeps the farm's current save in the farm-data volume as
saves.before-restore-<date>_<time>.sqlite, puts the backup in as saves.sqlite, and starts the farm
again. A farm that wasn't running is left stopped. Each restore adds a line to backup-log.txt in
-BackupDir. It never deletes the volume or the save it replaces.

Run it with `npm run farm:restore`, or `npm run farm:restore -- <path to backup>.sqlite`.

.NOTES
To undo a restore, copy the save it replaced out of the volume, then restore that:

  docker cp cozy-farm:/app/data/saves.before-restore-<date>_<time>.sqlite .
  npm run farm:restore -- saves.before-restore-<date>_<time>.sqlite

The before-restore copies stay in the volume until someone deletes them. They're small.
#>
[CmdletBinding()]
param(
  # The backup to restore. Leave it out to choose from the newest backups in -BackupDir.
  [Parameter(Position = 0)]
  [string]$Backup,
  # Folder backup-farm.ps1 puts the backups in.
  [string]$BackupDir = $(if ($env:OneDrive) { Join-Path $env:OneDrive 'CozyFarm\backups' } else { '' }),
  # The farm's container, volume and image. Docker Compose names them after the cozy-farm folder.
  # The image is only used when the container doesn't exist; otherwise it's the one the container runs.
  [string]$Container = 'cozy-farm',
  [string]$Volume = 'cozy-farm_farm-data',
  [string]$Image = 'cozy-farm-farm'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$BackupPattern = '^cozy-farm-\d{4}-\d{2}-\d{2}_\d{6}\.sqlite$'
$ListCount = 10

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

# When a backup was taken, from the date and time in its name, or else when the file last changed.
function Get-BackupTime([IO.FileInfo]$File) {
  if ($File.Name -match '(\d{4}-\d{2}-\d{2}_\d{6})') {
    return [datetime]::ParseExact($Matches[1], 'yyyy-MM-dd_HHmmss', [Globalization.CultureInfo]::InvariantCulture)
  }
  $File.LastWriteTime
}

function Format-Time([datetime]$Time) { $Time.ToString('ddd d MMM yyyy, HH:mm') }

# Lists the newest backups and asks which one to restore. Returns $null if you cancel.
function Select-Backup {
  if (-not $BackupDir) { throw 'OneDrive is not set up on this PC (%OneDrive% is empty). Pass the backup to restore, or -BackupDir <folder>.' }
  $backups = @(if (Test-Path -LiteralPath $BackupDir) {
      Get-ChildItem -LiteralPath $BackupDir -File |
        Where-Object { $_.Name -match $BackupPattern } |
        Sort-Object Name -Descending |
        Select-Object -First $ListCount
    })
  if ($backups.Count -eq 0) { throw "There are no backups in $BackupDir. Pass the one to restore: npm run farm:restore -- <path>" }

  Write-Host "Newest backups in ${BackupDir}:"
  for ($i = 0; $i -lt $backups.Count; $i++) {
    Write-Host ('  {0,2}  {1}   {2}' -f ($i + 1), (Format-Time (Get-BackupTime $backups[$i])), $backups[$i].Name)
  }
  while ($true) {
    $answer = "$(Read-Host "Restore which one? Type 1-$($backups.Count), or press Enter to cancel")".Trim()
    if (-not $answer) { return $null }
    $n = 0
    if ([int]::TryParse($answer, [ref]$n) -and $n -ge 1 -and $n -le $backups.Count) { return $backups[$n - 1] }
    Write-Host "That isn't a number from 1 to $($backups.Count)."
  }
}

$stopped = $false   # This script stopped the farm.
$swapped = $false   # The backup is in the volume as saves.sqlite.
$partway = $false   # The swap failed after it began changing files in the volume.

try {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'docker was not found. Is Docker Desktop installed?' }
  try { Invoke-Docker info --format '{{.ServerVersion}}' | Out-Null } catch { throw 'Docker is not running. Start Docker Desktop, then try again.' }
  try { Invoke-Docker volume inspect $Volume | Out-Null } catch {
    throw "The farm's volume '$Volume' was not found. Start the farm once with npm run farm:up to create it, then restore."
  }

  # Check the backup with the image the farm actually runs, which can be older than the newest build.
  $farm = $null
  try { $farm = (Invoke-Docker container inspect --format '{{json .}}' $Container) -join "`n" | ConvertFrom-Json } catch {
    if ("$_" -notmatch 'No such') { throw }
  }
  if ($farm) {
    $saveMount = @($farm.Mounts | Where-Object { $_.Destination -eq '/app/data' })
    if ($saveMount.Count -eq 0 -or $saveMount[0].Type -ne 'volume' -or $saveMount[0].Name -ne $Volume) {
      throw "The container '$Container' doesn't keep its saves in the volume '$Volume', so nothing was changed. Check -Container and -Volume."
    }
    $running = [bool]$farm.State.Running
    $farmImage = $farm.Image
  } else {
    # npm run farm:down removes the container but keeps the volume. Restore into the volume anyway.
    $running = $false
    try { Invoke-Docker image inspect $Image | Out-Null } catch { throw "The farm's image '$Image' was not found. Build it with npm run farm:up." }
    $farmImage = $Image
  }

  if ($Backup) {
    # npm runs this from the repo root, so a relative path is from wherever npm was run.
    if (-not [IO.Path]::IsPathRooted($Backup) -and $env:INIT_CWD) { $Backup = Join-Path $env:INIT_CWD $Backup }
    if (-not (Test-Path -LiteralPath $Backup -PathType Leaf)) { throw "There's no file at $Backup." }
    $file = Get-Item -LiteralPath $Backup
  } else {
    $file = Select-Backup
    if (-not $file) { Write-Host 'Nothing was changed.'; exit 0 }
  }
  $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()

  Write-Host "Checking $($file.Name)..."
  $inside = "/tmp/$($file.Name)"
  $checker = Invoke-Docker create --network none --label cozy-farm.restore=1 $farmImage `
    node --import tsx server/src/persistence/checkCli.ts $inside | Select-Object -Last 1
  try {
    Invoke-Docker cp $file.FullName "${checker}:$inside" | Out-Null
    try {
      $report = Invoke-Docker start --attach $checker
    } catch {
      if ("$_" -match 'Cannot find module.*checkCli') {
        throw "The farm runs an image from before farm:restore existed, so it can't check the backup. Rebuild it with npm run farm:up, then try again."
      }
      throw "$($file.Name) won't load, so it can't be restored. $_"
    }
  } finally {
    & docker rm --force $checker 2>&1 | Out-Null
  }
  $report | ForEach-Object { Write-Host "  $_" }

  Write-Host ''
  Write-Host "This replaces the save in the farm's volume ($Volume) with the backup from $(Format-Time (Get-BackupTime $file))."
  if ($running) { Write-Host "The farm stops while it does. Anyone playing is disconnected until it's back, a few seconds later." }
  $answer = "$(Read-Host 'Type yes to restore it')".Trim()
  if ($answer -notin 'yes', 'y') { Write-Host 'Nothing was changed.'; exit 0 }

  # The swap runs in a throwaway container with the volume mounted. Everything before the renames
  # only adds files, so if it fails the farm's save is as it was. The renames can't half-happen.
  # A leftover journal belongs to the save it replaces, so it moves with that save's copy; left next
  # to the restored save, SQLite would "roll it back" into it. No double quotes in here: Windows
  # PowerShell drops them from arguments it passes to docker.
  $kept = "saves.before-restore-$(Get-Date -Format 'yyyy-MM-dd_HHmmss').sqlite"
  $swap = @(
    'set -eu'
    'cd /app/data'
    'trap ''rm -f saves.sqlite.restoring'' EXIT'
    'cp /tmp/restore.sqlite saves.sqlite.restoring'
    'chmod 644 saves.sqlite.restoring'
    '[ $(sha256sum < saves.sqlite.restoring | cut -c1-64) = $HASH ] || { echo The copy in the volume does not match the backup.; exit 1; }'
    'if [ -e saves.sqlite ]; then cp -p saves.sqlite $KEPT; echo Kept the save it replaced in the volume as $KEPT.; else echo The farm had no save yet.; fi'
    'for s in -journal -wal -shm; do if [ -e saves.sqlite$s ]; then mv saves.sqlite$s $KEPT$s || exit 3; echo Moved a leftover saves.sqlite$s along with it.; fi; done'
    'mv saves.sqlite.restoring saves.sqlite || exit 3'
  ) -join '; '
  $swapper = Invoke-Docker create --network none --label cozy-farm.restore=1 -e "KEPT=$kept" -e "HASH=$hash" `
    -v "${Volume}:/app/data" $farmImage sh -c $swap | Select-Object -Last 1
  try {
    Invoke-Docker cp $file.FullName "${swapper}:/tmp/restore.sqlite" | Out-Null
    if ($running) {
      Write-Host 'Stopping the farm...'
      Invoke-Docker stop $Container | Out-Null
      $stopped = $true
    }
    try {
      $swapReport = @(Invoke-Docker start --attach $swapper)
    } catch {
      # Exit codes 1 and 2 come from a step before the renames (set -e). Anything else, or not
      # knowing, means the volume may have changed.
      $code = try { Invoke-Docker container inspect --format '{{.State.ExitCode}}' $swapper | Select-Object -Last 1 } catch { '?' }
      $partway = $code -notin '1', '2'
      throw "Putting the backup in the volume failed: $_"
    }
  } finally {
    & docker rm --force $swapper 2>&1 | Out-Null
  }
  $swapped = $true
  $swapReport | ForEach-Object { Write-Host $_ }
  Write-Log "RESTORED $($file.Name). $($swapReport -join ' ')"

  if ($stopped) {
    Invoke-Docker start $Container | Out-Null
    Write-Host "Restored $($file.Name). The farm is running again." -ForegroundColor Green
  } elseif ($farm) {
    Write-Host "Restored $($file.Name). The farm wasn't running, so it's still stopped. Start it with: docker start $Container" -ForegroundColor Green
  } else {
    Write-Host "Restored $($file.Name). There's no farm container, so start the farm with npm run farm:up." -ForegroundColor Green
  }
} catch {
  $message = $_.Exception.Message
  if ($partway) {
    $message += "`nIt may have stopped partway through, so the farm was left stopped. Look at the files in the volume before starting it again:" +
      "`n  docker run --rm -v ${Volume}:/app/data $Image ls -l /app/data"
  } elseif ($swapped) {
    $message = "The backup was restored, but starting the farm again failed: $message`nStart it with: docker start $Container"
  } elseif ($stopped) {
    try {
      Invoke-Docker start $Container | Out-Null
      $message += "`nThe farm's save wasn't changed, and the farm is running again."
    } catch {
      $message += "`nThe farm's save wasn't changed, but starting the farm again failed: $_"
    }
  }
  Write-Host "Restore failed: $message" -ForegroundColor Red
  Write-Log "RESTORE FAILED  $($message -replace '\s+', ' ')"
  exit 1
}
