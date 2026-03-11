$file = "d:\College project 2\admin.html"
$lines = Get-Content $file -Encoding UTF8
$closeTag = '</html>'
$idx = -1
for ($i = $lines.Length - 1; $i -ge 0; $i--) {
    if ($lines[$i].Trim() -eq $closeTag) { $idx = $i; break }
}
Write-Host "Last closing html tag at 0-index: $idx (line $($idx+1))"
if ($idx -gt 0) {
    $lines[0..$idx] | Set-Content $file -Encoding UTF8
    Write-Host "File truncated to $($idx+1) lines."
}
else {
    Write-Host "Tag not found!"
}
