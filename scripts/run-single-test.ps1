$reportFile = "reports\test-report.txt"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

if (-not (Test-Path "reports")) {
    New-Item -ItemType Directory -Path "reports" | Out-Null
}

$report = @()
$report += "============================================"
$report += "Test Report - $timestamp"
$report += "============================================"
$report += ""

$output = npm run test -- tests/ai-import-parser.test.ts 2>&1
$exitCode = $LASTEXITCODE

$report += $output
$report += ""
$report += "============================================"
if ($exitCode -eq 0) {
    $report += "RESULT: ALL TESTS PASSED"
} else {
    $report += "RESULT: TESTS FAILED (exit code $exitCode)"
}
$report += "============================================"

$report | Out-File -FilePath $reportFile -Encoding utf8

Get-Content $reportFile
