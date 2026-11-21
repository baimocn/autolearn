Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*unitfull*' } | ForEach-Object {
  Stop-Process -Id $_.ProcessId -Force
  Write-Output ("killed " + $_.ProcessId)
}
