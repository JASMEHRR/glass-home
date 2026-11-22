<#
  Builds Glass Home without Gradle: self-test -> JS checks -> aapt2 -> javac -> d8 -> zipalign -> apksigner.
  Usage:  powershell -ExecutionPolicy Bypass -File build.ps1 [-Online] [-Install] [-Device 192.168.100.156:5555]
  -Online also runs the self-test against the live weather, F1, AniList and Stremio APIs.
  Output: dist\GlassHome.apk
#>
param(
    [switch]$Install,
    [switch]$Online,
    [string]$Device = '192.168.100.156:5555',
    [string]$Jdk = 'C:\Users\jasme\dev-tools\jdk17',
    [string]$Sdk = 'C:\Users\jasme\dev-tools\android-sdk',
    [string]$Adb = "$env:USERPROFILE\platform-tools\adb.exe",
    [int]$VersionCode = [int](((Get-Date).ToUniversalTime() - [datetime]'2026-01-01').TotalMinutes),
    [string]$VersionName = '0.1'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

$Root = $PSScriptRoot
$Build = Join-Path $Root 'build'
$Dist = Join-Path $Root 'dist'
$Java = Join-Path $Jdk 'bin\java.exe'
$Javac = Join-Path $Jdk 'bin\javac.exe'
$Keytool = Join-Path $Jdk 'bin\keytool.exe'
$Bt = Join-Path $Sdk 'build-tools\34.0.0'
$AndroidJar = Join-Path $Sdk 'platforms\android-28\android.jar'
$env:JAVA_HOME = $Jdk

function Step([string]$name) { Write-Host "`n== $name" -ForegroundColor Cyan }
function Run([string]$exe, [string[]]$argList) {
    & $exe @argList
    if ($LASTEXITCODE -ne 0) { throw "$([IO.Path]::GetFileName($exe)) failed with exit code $LASTEXITCODE" }
}

foreach ($p in @($Java, $Javac, $Keytool, $AndroidJar, (Join-Path $Bt 'aapt2.exe'))) {
    if (-not (Test-Path -LiteralPath $p)) { throw "Missing tool: $p" }
}

Step 'clean'
if (Test-Path -LiteralPath $Build) { Remove-Item -LiteralPath $Build -Recurse -Force -ErrorAction Stop }
foreach ($d in 'test', 'gen', 'classes', 'dex') {
    New-Item -ItemType Directory -Force -Path (Join-Path $Build $d) -ErrorAction Stop | Out-Null
}
New-Item -ItemType Directory -Force -Path $Dist -ErrorAction Stop | Out-Null

$AllSources = @(Get-ChildItem -Path (Join-Path $Root 'src') -Recurse -Filter '*.java' -ErrorAction Stop | ForEach-Object FullName)

Step 'self-test (Java, on this PC)'
Run $Javac (@('--release', '8', '-encoding', 'UTF-8', '-Xlint:all,-options', '-Werror', '-cp', $AndroidJar,
    '-d', (Join-Path $Build 'test')) + $AllSources +
    @(Get-ChildItem -Path (Join-Path $Root 'test\local\glasshome') -Filter '*.java' -ErrorAction Stop | ForEach-Object FullName))
$testArgs = @('-cp', ((Join-Path $Build 'test') + ';' + $AndroidJar), 'local.glasshome.SelfTest')
if ($Online) { $testArgs += 'online' }
Run $Java $testArgs

Step 'UI checks (node)'
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    foreach ($js in Get-ChildItem -Path (Join-Path $Root 'assets\ui') -Filter '*.js' -ErrorAction Stop) {
        Run $node.Source @('--check', $js.FullName)
    }
    $uiTest = Join-Path $Root 'test\ui.test.js'
    if (Test-Path -LiteralPath $uiTest) { Run $node.Source @($uiTest) }
} else {
    Write-Host 'node not found: skipping JS checks' -ForegroundColor Yellow
}

Step 'resources (aapt2)'
$ResZip = Join-Path $Build 'res.zip'
$BaseApk = Join-Path $Build 'base.apk'
Run (Join-Path $Bt 'aapt2.exe') @('compile', '--dir', (Join-Path $Root 'res'), '-o', $ResZip)
Run (Join-Path $Bt 'aapt2.exe') @('link', '-o', $BaseApk, '-I', $AndroidJar,
    '--manifest', (Join-Path $Root 'AndroidManifest.xml'), '-A', (Join-Path $Root 'assets'),
    '--java', (Join-Path $Build 'gen'), '--min-sdk-version', '28', '--target-sdk-version', '28',
    '--version-code', "$VersionCode", '--version-name', $VersionName, '-0', 'jpg', '-0', 'webp', $ResZip)

Step 'compile (javac)'
$Sources = $AllSources + @(Get-ChildItem -Path (Join-Path $Build 'gen') -Recurse -Filter '*.java' -ErrorAction Stop | ForEach-Object FullName)
Run $Javac (@('--release', '8', '-encoding', 'UTF-8', '-Xlint:all,-options', '-Werror', '-cp', $AndroidJar,
    '-d', (Join-Path $Build 'classes')) + $Sources)

Step 'dex (d8)'
$Classes = @(Get-ChildItem -Path (Join-Path $Build 'classes') -Recurse -Filter '*.class' -ErrorAction Stop | ForEach-Object FullName)
Run (Join-Path $Bt 'd8.bat') (@('--release', '--min-api', '28', '--lib', $AndroidJar, '--output', (Join-Path $Build 'dex')) + $Classes)

Step 'package'
$Unsigned = Join-Path $Build 'unsigned.apk'
$Aligned = Join-Path $Build 'aligned.apk'
Copy-Item -LiteralPath $BaseApk -Destination $Unsigned -ErrorAction Stop
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($Unsigned, [System.IO.Compression.ZipArchiveMode]::Update)
try {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $Build 'dex\classes.dex'), 'classes.dex') | Out-Null
} finally {
    $zip.Dispose()
}
Run (Join-Path $Bt 'zipalign.exe') @('-p', '-f', '4', $Unsigned, $Aligned)

Step 'sign'
$KeyDir = Join-Path $Root 'keystore'
$KeyStore = Join-Path $KeyDir 'glasshome.p12'
$KeyPass = Join-Path $KeyDir 'password.txt'
if (-not (Test-Path -LiteralPath $KeyStore)) {
    New-Item -ItemType Directory -Force -Path $KeyDir -ErrorAction Stop | Out-Null
    $bytes = New-Object byte[] 24
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    [IO.File]::WriteAllText($KeyPass, [Convert]::ToBase64String($bytes))
    Run $Keytool @('-genkeypair', '-keystore', $KeyStore, '-storetype', 'PKCS12', '-alias', 'glasshome',
        '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000', '-dname', 'CN=Glass Home',
        "-storepass:file", $KeyPass)
    Write-Host 'Created a signing key in keystore\ (keep it: updates must be signed with the same key).'
}
$Apk = Join-Path $Dist 'GlassHome.apk'
Run (Join-Path $Bt 'apksigner.bat') @('sign', '--ks', $KeyStore, '--ks-pass', "file:$KeyPass", '--out', $Apk, $Aligned)
Run (Join-Path $Bt 'apksigner.bat') @('verify', $Apk)
Write-Host ("Built {0} ({1:N0} KB)" -f $Apk, ((Get-Item -LiteralPath $Apk).Length / 1KB)) -ForegroundColor Green

if ($Install) {
    Step "install on $Device"
    Run $Adb @('connect', $Device)
    Run $Adb @('-s', $Device, 'install', '-r', $Apk)
}
