# Run from the safe-safar folder:  powershell -ExecutionPolicy Bypass -File .\CHECK_FILES.ps1
$files = @(
 "apps\mobile\app.json","apps\mobile\package.json","apps\mobile\package-lock.json","apps\mobile\app\_layout.tsx",
 "apps\mobile\modules\safesafar-telephony\android\build.gradle",
 "apps\mobile\plugins\withLockScreenActivity.js","apps\mobile\plugins\withVoiceForegroundService.js",
 "apps\mobile\src\features\emergency\services\fakeCall.ts","apps\mobile\src\features\emergency\services\voiceTrigger.ts",
 "apps\mobile\src\features\emergency\screens\FakeCallScreen.tsx","apps\mobile\src\features\emergency\channels\backend.ts",
 "apps\mobile\assets\model-en-en\am"
)
foreach ($f in $files) { "{0,-82} {1}" -f $f, (Test-Path $f) }
if (Test-Path "apps\mobile\apps") { "WARNING: stray folder apps\mobile\apps (zip was extracted one level too deep)" }
if (Test-Path "apps\apps")        { "WARNING: stray folder apps\apps (zip was extracted one level too deep)" }
