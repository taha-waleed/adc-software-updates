# MediLab X — Native Windows Rebuild (0.2.0 Preview)

**C# / .NET 8 / WPF**, styled with WinUI/Fluent design principles and macOS-inspired glass/soft cards. WPF and WinUI 3 are different Windows UI frameworks: this implementation uses WPF as its single, consistent native renderer. It is **not** an HTML/Electron wrapper.

## Status

This is a **functional native alpha/source rebuild**, not a finished production replacement. It is intentionally installed separately from the live MediLab X app, does not modify the existing Electron installation, and must undergo Windows printer, deployment, data-migration and clinical workflow validation before use with real patients.

### Implemented native features

- 3-second branded splash, password-based native login, user roles and page permissions.
- Same familiar left-nav section names/order: Dashboard, Reception, Patients & Receipts, Radiology Reports, Daily Summary, Expenses, Total Earning, Radiology Rate List, Laboratory, Admin & Users, Settings, About.
- Uniform Light/Dark theme, soft panels, animated Prism-style Now Brief, animated 3D CT/X-Ray/Ultrasound performance bars, live analog/digital seconds clock and downward-opening calendar.
- Reception registration with imported radiology test catalog (117 real entries from prior local source), price/discount/received/balance and mandatory CT MR field; inline test selection.
- Patient search, CT/X-Ray/Ultrasound filters, edit, archive/restore, receipt PrintDialog, optional WhatsApp Desktop `whatsapp://` prepared message (not WhatsApp Web).
- Radiology report editor with findings, impression, approval name, A4 PrintDialog and With Heading / Without Heading.
- Daily Summary, Expenses CRUD, Earnings, rate-list editing.
- Laboratory reagent batches (kit, supplier, lot, received date, expiry, quantity), issue/restock/mark-finished and movement history.
- Admin: employees, experience certificates, leave approvals, salary slips and staff user creation; separate Referring Doctors / Performing Doctors directories.
- Local Now Brief (saved metrics + manually editable lines); read-only business alerts/notification history.
- SQLite database in `%APPDATA%\MediLab\Standard\NativeWpf\medilab-native.sqlite`. **Original Electron data stays separate.**
- Legacy JSON data import from the original app's **Export records (JSON)** function; SQLite backup generated before import; source JSON is only read.
- A4 letterhead safe defaults: top **6.5 cm**, bottom **5 cm**; Admin can unlock margins.

### Not complete or not validated yet

- This alpha is not a complete one-for-one port of all legacy reports, specialty templates, custom receipt styles, doctors' directory, every role permission/editor, advanced analytics, notifications scheduling, and on-device backup/restore. Existing legacy JSON may have fields not yet mapped; those should be handled by a migration dry-run before production.
- Native printing is a baseline WPF PrintDialog, not validated for 58mm/80mm thermal devices or A4 preprinted letterhead on your printer. Do not print clinically issued reports until calibrated.
- Native WhatsApp protocol opening is OS-dependent; user presses Send. Printing and WhatsApp cannot guarantee physical printer success.
- First-run Admin **must set a new 10+-character password**. Existing plaintext legacy passwords are deliberately not imported.
- SQLite data is stored locally without per-field encryption. Apply Windows disk encryption, Windows user permissions and backup controls.
- The screenshots from the legacy HTML are reference visuals, **not** evidence that all workflows match.
- **Native WPF code cannot be changed by uploading only HTML + update.json.** HTML-only updates can update web content, not C#/XAML executable logic. Native executable updates require a compiled .NET release. JSON-only content/theme and referral-directory updates can be designed separately.

## Build

Requires Windows 10/11, Visual Studio 2022 with **.NET desktop development** and .NET 8 SDK.

```powershell
cd src\MediLabX.Native
dotnet restore
dotnet build -c Release
dotnet run
```

To publish a Windows self-contained executable into `publish` (not a setup installer):

```powershell
dotnet publish src\MediLabX.Native\MediLabX.Native.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o publish
```

**The zip contains source, not a precompiled installer.** The CI workflow builds the app on GitHub Windows runner as a compiler validation check.

## Migration path for existing centres

1. Leave installed MediLab X running. Export its full JSON backup from **Settings / Export records (JSON)** and keep a secure copy.
2. Back up `%APPDATA%\MediLab\Standard` to an offline location.
3. Test the native app on a **separate PC or Windows user profile**, create a new Admin password, use **Settings → Data & Updates → Import MediLab legacy JSON**.
4. Verify patient counts, procedures, MR sequence, earnings, reports, doctor names and printed receipts with the old app side by side.
5. Only after data reconciliation and clinical signoff, plan a staged rollout. The old app is never automatically uninstalled or overwritten by this source package.

## Architecture

- `Models/Records.cs` — domain records
- `Services/Store.cs` — SQLite read/write and backups
- `Services/Security.cs` — PBKDF2-SHA256 password verification
- `Services/LegacyImporter.cs` — non-destructive import
- `Services/PrintService.cs` — native A4 printing
- `Services/NoticeEngine.cs` + `BriefEngine.cs` — local insights
- `MainWindow*.cs` — functional module pages
- `MainWindow.xaml` / `App.xaml` — WPF Shell, styles, animations

## Attribution

MediLab X. A project by Taha Waleed. This is an independent native rebuild workspace separate from the existing GitHub updater channel.

## 0.2.0 preview delivery

A separate GitHub prerelease workflow produces a **self-contained Windows x64 portable ZIP**, so no Visual Studio or .NET runtime installation is required to launch the preview. Extract all files before opening `MediLabX.Native.exe`. This is for testing with synthetic data only, not for clinical or billing production. The old Electron app's updater and the live database are not modified.

Windows CI runs smoke checks for isolated SQLite storage, receipt numbering, financial totals, backup, legacy JSON import, duplicate detection, password verification, notifications and the editable Now Brief. These automated checks **do not prove** that physical printing, runtime layout, every legacy field or all business modules work correctly.