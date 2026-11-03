param([string]$Vault = 'C:\ObsidianBrain')
$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$plugin = Join-Path $Vault '.obsidian\plugins\scripture-scribe'
foreach ($file in @('main.js','semantic-runtime.js','styles.css')) {
  $source = Join-Path $project $file
  if (!(Test-Path -LiteralPath $source)) { throw "Missing build output: $source" }
}
foreach ($folder in @('greek-books','hebrew-books','lxx-books','definitions','search-data')) {
  $source = Join-Path $project "runtime-data\$folder"
  if (!(Test-Path -LiteralPath $source)) { throw "Missing study assets: $source" }
  $target = Join-Path $plugin $folder
  New-Item -ItemType Directory -Path $target -Force | Out-Null
  Get-ChildItem -LiteralPath $source -File | Copy-Item -Destination $target -Force
}
foreach ($file in @('main.js','semantic-runtime.js','styles.css')) {
  Copy-Item -LiteralPath (Join-Path $project $file) -Destination $plugin -Force
}
foreach ($file in @('kjv-formatted.json','enoch-charles.json')) {
  Copy-Item -LiteralPath (Join-Path $project "runtime-data\$file") -Destination $plugin -Force
}
Write-Output "Deployed Scripture Scribe to $plugin. Reload the plugin or restart Obsidian."
