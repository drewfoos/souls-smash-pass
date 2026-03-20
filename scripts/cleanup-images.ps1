# Remove orphaned character images that are no longer in characters.ts
# Run from project root: powershell -File scripts/cleanup-images.ps1

$dir = "public/characters"
$data = Get-Content "src/data/characters.ts" -Raw
$removed = 0
$kept = 0

Get-ChildItem "$dir/*.jpg" | ForEach-Object {
    $id = $_.BaseName
    if ($data -notmatch "`"$id`"") {
        Remove-Item $_.FullName
        Write-Host "  Removed: $id"
        $removed++
    } else {
        $kept++
    }
}

Write-Host ""
Write-Host "Done! Removed $removed orphaned images, kept $kept."
