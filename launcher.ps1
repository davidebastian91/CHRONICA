$lanUrl = "http://192.168.1.200:5173"
$cloudUrl = "https://ottawa-distributors-hampshire-away.trycloudflare.com"

$targetUrl = $cloudUrl
try {
    $req = [System.Net.WebRequest]::Create("$lanUrl/api/server-info")
    $req.Timeout = 700
    $resp = $req.GetResponse()
    $status = [int]$resp.StatusCode
    $resp.Close()
    if ($status -eq 200) {
        $targetUrl = $lanUrl
    }
} catch {
    $targetUrl = $cloudUrl
}

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

