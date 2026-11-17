$targetUrl = "https://chronica.onrender.com"

# Avvia Microsoft Edge o Chrome in modalità App (finestra nativa pulita, senza barra URL)
$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"

if (Test-Path $edgePath) {
    Start-Process $edgePath -ArgumentList "--app=$targetUrl"
} elseif (Test-Path $chromePath) {
    Start-Process $chromePath -ArgumentList "--app=$targetUrl"
} else {
    Start-Process $targetUrl
}
