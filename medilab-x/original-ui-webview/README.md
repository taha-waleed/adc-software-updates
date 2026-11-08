# MediLab X — Original Interface Windows Desktop (0.3.0 Preview)

## Why this build exists
The previous all-WPF native rewrite did not resemble the approved MediLab X software. This project deliberately preserves the **actual MediLab X 10.0.11 standalone HTML dashboard and modules**, hosting them in a native WPF window with Microsoft's WebView2 control. This is **not a fresh, empty imitation**.

- **UI**: Exact existing MediLab X standalone HTML, obtained at Windows build time from `medilab-x/MediLab_X_10_0_11.html`, pinned SHA-256 `636a37b1b824fbfd6a09279445def94d441db7d288eb0c1f5490aedc581e6405`.
- **Desktop shell**: C#/.NET 8 WPF + official Microsoft.Web.WebView2 package.
- **Windows bridge**: custom title-bar minimize/maximize/close, print preview, WhatsApp Desktop via `whatsapp://`, and verified HTML-only updates from `medilab-x/update.json`.
- **Data**: Patient/receipt app data is stored by WebView2 localStorage in `%APPDATA%\MediLab\Standard\OriginalUIHost\profile`, **separate** from your existing Electron app and old WPF alpha. No automatic access to previous patient data.
- **Updates**: Subsequent front-end changes can be delivered with the existing HTML and `update.json` without new Windows EXEs, as long as native bridge methods don't change. Updates are SHA-256 checked before applying.

## Run (Windows 10/11 x64)

1. Download `MediLabX-OriginalUI-Windows-0.3.0-Preview-x64.zip` from the independent GitHub prerelease.
2. Right-click → Extract All. Do not execute from inside the ZIP.
3. Open `MediLabX.Desktop.exe` within extracted folder.
4. If the WebView2 Runtime is missing, install the official **Microsoft Edge WebView2 Runtime** from Microsoft. On most current Windows systems it is already installed.

## Limits and patient privacy

This is a **test preview, not an approved live diagnostic-centre replacement**. Browser storage is independent. Do not enter real patient records for clinical operations until receipt printers, report templates, migration and staff permissions have been tested against actual deployment.

For security, the bridge allows only the pinned local virtual origin `https://medilabx.app`. It opens external HTTP(S) links in the default browser. It does not send patient data to any AI provider. WhatsApp Desktop opens a prepared message, but never sends it automatically. Pressing Print opens the Windows print UI; printing still requires user confirmation.

To recover errors, examine `%APPDATA%\MediLab\Standard\OriginalUIHost\logs\startup.log`.

The original installed MediLab X and its `update.json` are not altered by this build.