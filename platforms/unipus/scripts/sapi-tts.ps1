param([string]$TextFile, [string]$OutWav, [int]$Rate = 0)
Add-Type -AssemblyName System.Speech
$text = Get-Content -Raw -Encoding UTF8 $TextFile
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture -like "en-*" } | Select-Object -First 1
if ($voice) { $synth.SelectVoice($voice.VoiceInfo.Name) }
$synth.Rate = $Rate
$synth.SetOutputToWaveFile($OutWav)
$synth.Speak($text)
$synth.Dispose()
Write-Output ("OK " + $OutWav + " voice=" + $(if ($voice) { $voice.VoiceInfo.Name } else { "default" }))
