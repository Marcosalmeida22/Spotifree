# Helper for the isolated XAMPP instance created during local development.
# Normal MySQL/Docker installations are started by their own service manager.
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $projectPath '.mysql-data\my.ini'
$binaryPath = 'C:\xampp\mysql\bin\mysqld.exe'
if (!(Test-Path -LiteralPath $configPath) -or !(Test-Path -LiteralPath $binaryPath)) { exit 0 }
$envPath = Join-Path $projectPath '.env'
if (!(Test-Path -LiteralPath $envPath)) { exit 0 }
$configText = Get-Content -LiteralPath $envPath -Raw
if ($configText -notmatch '(?m)^MYSQL_PORT=3307\s*$') { exit 0 }
$connection = New-Object System.Net.Sockets.TcpClient
try { $connection.Connect('127.0.0.1',3307); exit 0 } catch { } finally { $connection.Dispose() }
Start-Process -FilePath $binaryPath -ArgumentList "--defaults-file=`"$configPath`"",'--bind-address=127.0.0.1' -WindowStyle Hidden -WorkingDirectory $projectPath
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 500
    $connection = New-Object System.Net.Sockets.TcpClient
    try { $connection.Connect('127.0.0.1',3307); Write-Output 'Base local preparada.'; exit 0 } catch { } finally { $connection.Dispose() }
}
throw 'No se pudo iniciar la instancia SQL local. Revisa .mysql-data.'
