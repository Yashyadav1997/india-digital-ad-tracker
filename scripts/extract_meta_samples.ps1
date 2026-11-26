# Reads saved Meta ad-library lookup results and writes one summary row per brand page.
# Counts how many sampled ads list each placement, and which button (cta_type) each ad uses.
# Read-only on the input folder.
param(
    [Parameter(Mandatory = $true)][string]$InputFolder,
    [Parameter(Mandatory = $true)][string]$OutputFile
)

$pages = @{}
$files = Get-ChildItem -LiteralPath $InputFolder -Filter '*alexandria_library_read*.txt' | Sort-Object Name

foreach ($file in $files) {
    try { $json = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json } catch { continue }
    foreach ($call in $json.data.alexandria) {
        if ($call.capability -ne 'meta-ads/library/advertiser' -or -not $call.data.results) { continue }
        $ads = @(foreach ($group in $call.data.results) { foreach ($ad in $group) { $ad } })
        if ($ads.Count -eq 0) { continue }
        $ig = @($ads | Where-Object { $_.publisher_platform -contains 'INSTAGRAM' }).Count
        $fb = @($ads | Where-Object { $_.publisher_platform -contains 'FACEBOOK' }).Count
        $buttons = @{}
        foreach ($ad in $ads) {
            $key = [string]$ad.snapshot.cta_type
            if (-not $key) { $key = 'NONE' }
            $buttons[$key] = 1 + $buttons[$key]
        }
        $list = ($buttons.GetEnumerator() | Sort-Object Name | ForEach-Object { "$($_.Name):$($_.Value)" }) -join ';'
        # Later files overwrite earlier ones, so a retried page is counted once.
        $pages[[string]$call.data.page_id] = "$($call.data.page_id),$($call.data.number_of_ads),$($ads.Count),$ig,$fb,$list"
    }
}

$header = 'page_id,active_ads,sampled,on_instagram,on_facebook,buttons'
@($header) + @($pages.Keys | Sort-Object | ForEach-Object { $pages[$_] }) | Set-Content -LiteralPath $OutputFile -Encoding UTF8
"files read: $($files.Count); pages written: $($pages.Count)"
