# Run from the safe-safar folder:  powershell -ExecutionPolicy Bypass -File .\CHECK_FILES.ps1
$files = @(
 "apps\mobile\modules\safesafar-telephony\package.json",
 "apps\mobile\modules\safesafar-telephony\android\build.gradle",
 "apps\mobile\plugins\withLockScreenActivity.js",
 "apps\mobile\plugins\withVoiceForegroundService.js",
 "apps\mobile\src\features\emergency\index.ts",
 "apps\mobile\src\features\emergency\channels\backend.ts",
 "apps\mobile\src\features\emergency\channels\call.ts",
 "apps\mobile\src\features\emergency\services\callChain.ts",
 "apps\mobile\src\features\emergency\services\fakeCall.ts",
 "apps\mobile\src\features\emergency\services\voiceTrigger.ts",
 "apps\mobile\src\features\emergency\services\background.ts",
 "apps\mobile\src\features\emergency\security\lockout.ts",
 "apps\mobile\src\features\emergency\screens\SosDevScreen.tsx",
 "apps\mobile\src\features\emergency\screens\FakeCallScreen.tsx",
 "apps\backend\src\modules\sos\service.ts",
 "apps\mobile\assets\model-en-en\am"
)
foreach ($f in $files) { "{0,-80} {1}" -f $f, (Test-Path $f) }
if (Test-Path "apps\mobile\apps") { "WARNING: stray folder apps\mobile\apps exists (zip extracted in the wrong place)" }
