Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[System.Threading.Thread]::CurrentThread.CurrentUICulture = 'zh-CN'
[System.Threading.Thread]::CurrentThread.CurrentCulture = 'zh-CN'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeScript = Join-Path $scriptDir "01-export-myhkw-songs.mjs"
$defaultOutput = Join-Path $scriptDir "songs.json"

function Run-Export($key, $outPath) {
    if (-not (Test-Path $nodeScript)) {
        throw "Node export script not found: $nodeScript"
    }

    $args = @($nodeScript)
    if ($key) {
        $args += "--key"
        $args += $key
    }
    if ($outPath) {
        $args += "--out"
        $args += $outPath
    }

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = "node"
    $psi.WorkingDirectory = $scriptDir
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    foreach ($arg in $args) {
        [void]$psi.ArgumentList.Add($arg)
    }

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $psi
    [void]$process.Start()
    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    return @{
        ExitCode = $process.ExitCode
        StdOut = $stdout.Trim()
        StdErr = $stderr.Trim()
    }
}

function U([int[]]$codes) {
    return -join ($codes | ForEach-Object { [char]$_ })
}

$txtTitle = U @(84,117,110,101,70,108,111,119,32,45,32,23548,20986,22909,27468,32,115,111,110,103,115,46,106,115,111,110)
$txtIntro = U @(35835,21462,21462,109,121,104,107,119,32,25773,25918,22120,27468,25152,26377,26377,22269,24182,20986,20026,32,115,111,110,103,115,46,106,115,111,110)
$txtMyhkwKey = U @(109,121,104,107,119,32,75,101,121)
$txtClearKey = U @(28165,31354,32,75,101,121)
$txtOutputFile = U @(36755,20986,25991,20214)
$txtBrowse = U @(36873,25321)
$txtExportNow = U @(24320,22987,23548,20986)
$txtOpenFolder = U @(25171,24320,36755,20986,30446,24405)
$txtReady = U @(31561,24453,25805,20316)
$txtOutputPathRequired = U @(35831,20808,36873,25321,36755,20986,25991,20214,36335,24452,12290)
$txtKeyRequired = U @(35831,20808,36755,20837,20320,33258,24049,30340,32,109,121,104,107,119,32,75,101,121,12290)
$txtNotice = U @(25552,31034)
$txtExporting = U @(23548,20986,20013,46,46,46)
$txtExportSucceeded = U @(23548,20986,25104,21151)
$txtDone = U @(23436,25104)
$txtExportSuccessMessage = U @(115,111,110,103,115,46,106,115,111,110,32,23548,20986,25104,21151,12290)
$txtExportFailed = U @(23548,20986,22833,36133)
$txtError = U @(38169,35823)
$txtExportFailedMessage = U @(23548,20986,22833,36133,65292,35831,26597,30475,19979,26041,26085,24535,12290)

$form = New-Object System.Windows.Forms.Form
$form.Text = $txtTitle
$form.Size = New-Object System.Drawing.Size(620, 420)
$form.StartPosition = "CenterScreen"
$form.TopMost = $true

$font = New-Object System.Drawing.Font("Microsoft YaHei UI", 9)
$form.Font = $font

$labelIntro = New-Object System.Windows.Forms.Label
$labelIntro.Location = New-Object System.Drawing.Point(18, 18)
$labelIntro.Size = New-Object System.Drawing.Size(560, 24)
$labelIntro.Text = $txtIntro
$form.Controls.Add($labelIntro)

$labelKey = New-Object System.Windows.Forms.Label
$labelKey.Location = New-Object System.Drawing.Point(18, 56)
$labelKey.Size = New-Object System.Drawing.Size(120, 24)
$labelKey.Text = $txtMyhkwKey
$form.Controls.Add($labelKey)

$textKey = New-Object System.Windows.Forms.TextBox
$textKey.Location = New-Object System.Drawing.Point(140, 54)
$textKey.Size = New-Object System.Drawing.Size(280, 26)
$form.Controls.Add($textKey)

$btnClearKey = New-Object System.Windows.Forms.Button
$btnClearKey.Location = New-Object System.Drawing.Point(438, 52)
$btnClearKey.Size = New-Object System.Drawing.Size(120, 30)
$btnClearKey.Text = $txtClearKey
$btnClearKey.Add_Click({
    $textKey.Text = ""
})
$form.Controls.Add($btnClearKey)

$labelOut = New-Object System.Windows.Forms.Label
$labelOut.Location = New-Object System.Drawing.Point(18, 98)
$labelOut.Size = New-Object System.Drawing.Size(120, 24)
$labelOut.Text = $txtOutputFile
$form.Controls.Add($labelOut)

$textOut = New-Object System.Windows.Forms.TextBox
$textOut.Location = New-Object System.Drawing.Point(140, 96)
$textOut.Size = New-Object System.Drawing.Size(280, 26)
$textOut.Text = $defaultOutput
$form.Controls.Add($textOut)

$btnBrowse = New-Object System.Windows.Forms.Button
$btnBrowse.Location = New-Object System.Drawing.Point(438, 94)
$btnBrowse.Size = New-Object System.Drawing.Size(120, 30)
$btnBrowse.Text = $txtBrowse
$btnBrowse.Add_Click({
    $dialog = New-Object System.Windows.Forms.SaveFileDialog
    $dialog.Filter = "JSON files (*.json)|*.json|All files (*.*)|*.*"
    $dialog.FileName = [System.IO.Path]::GetFileName($textOut.Text)
    $dialog.InitialDirectory = [System.IO.Path]::GetDirectoryName($textOut.Text)
    if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $textOut.Text = $dialog.FileName
    }
})
$form.Controls.Add($btnBrowse)

$btnExport = New-Object System.Windows.Forms.Button
$btnExport.Location = New-Object System.Drawing.Point(22, 142)
$btnExport.Size = New-Object System.Drawing.Size(130, 36)
$btnExport.Text = $txtExportNow
$form.Controls.Add($btnExport)

$btnOpenFolder = New-Object System.Windows.Forms.Button
$btnOpenFolder.Location = New-Object System.Drawing.Point(164, 142)
$btnOpenFolder.Size = New-Object System.Drawing.Size(130, 36)
$btnOpenFolder.Text = $txtOpenFolder
$btnOpenFolder.Add_Click({
    $targetPath = $textOut.Text
    if (-not $targetPath) { return }
    $folder = Split-Path -Parent $targetPath
    if (Test-Path $folder) {
        Start-Process explorer.exe $folder
    }
})
$form.Controls.Add($btnOpenFolder)

$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Location = New-Object System.Drawing.Point(318, 149)
$statusLabel.Size = New-Object System.Drawing.Size(260, 24)
$statusLabel.Text = $txtReady
$form.Controls.Add($statusLabel)

$outputBox = New-Object System.Windows.Forms.TextBox
$outputBox.Location = New-Object System.Drawing.Point(22, 194)
$outputBox.Size = New-Object System.Drawing.Size(556, 164)
$outputBox.Multiline = $true
$outputBox.ScrollBars = "Vertical"
$outputBox.ReadOnly = $true
$outputBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$form.Controls.Add($outputBox)

$btnExport.Add_Click({
    $key = $textKey.Text.Trim()
    $outPath = $textOut.Text.Trim()

    if (-not $key) {
        [System.Windows.Forms.MessageBox]::Show($txtKeyRequired, $txtNotice)
        return
    }

    if (-not $outPath) {
        [System.Windows.Forms.MessageBox]::Show($txtOutputPathRequired, $txtNotice)
        return
    }

    $btnExport.Enabled = $false
    $statusLabel.Text = $txtExporting
    $outputBox.Text = ""
    $form.Refresh()

    try {
        $result = Run-Export $key $outPath
        $log = @()
        if ($result.StdOut) { $log += $result.StdOut }
        if ($result.StdErr) { $log += $result.StdErr }
        $outputBox.Text = ($log -join [Environment]::NewLine + [Environment]::NewLine)

        if ($result.ExitCode -eq 0) {
            $statusLabel.Text = $txtExportSucceeded
            [System.Windows.Forms.MessageBox]::Show($txtExportSuccessMessage, $txtDone)
        } else {
            $statusLabel.Text = $txtExportFailed
            [System.Windows.Forms.MessageBox]::Show($txtExportFailedMessage, $txtError)
        }
    } catch {
        $statusLabel.Text = $txtExportFailed
        $outputBox.Text = $_.Exception.Message
        [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, $txtError)
    } finally {
        $btnExport.Enabled = $true
    }
})

[void]$form.ShowDialog()
