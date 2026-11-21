foreach ($p in 62435, 7890, 7897, 10809, 1080, 8080, 2080, 20171) {
  $r = Test-NetConnection -ComputerName 127.0.0.1 -Port $p -WarningAction SilentlyContinue -InformationLevel Quiet
  if ($r) { Write-Output ("OPEN " + $p) }
}
