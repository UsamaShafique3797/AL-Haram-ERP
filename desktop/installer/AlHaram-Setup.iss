; Inno Setup script for Al-Haram POS desktop
; Build with: desktop\build-installer.ps1  (or open in Inno Setup and press F9)
;
; Produces a single AlHaram-POS-Setup.exe that installs the bundled
; desktop app (UI + API) which runs against a local SQL database.

#define AppName "Al-Haram Steel"
#define AppPublisher "Al-Haram Steel"
#define AppVersion "1.1.1"
#define AppExe "AlHaram.Desktop.exe"

; Folders are resolved relative to this .iss file.
#define SrcDir "..\..\publish\desktop"
#define IconFile "..\AlHaram.Desktop\Assets\app.ico"

[Setup]
AppId={{8F2A1C44-3E6B-4D2A-9C1E-7A5B0C9D2E11}}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\Al-Haram Steel
DefaultGroupName=Al-Haram Steel
DisableProgramGroupPage=yes
OutputDir=..\..\publish\installer
OutputBaseFilename=AlHaram-POS-Setup
SetupIconFile={#IconFile}
UninstallDisplayIcon={app}\{#AppExe}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
; On upgrade, automatically close the running app/API so locked files
; can be replaced, then no reboot is needed.
CloseApplications=yes
RestartApplications=no
AppMutex=Global\AlHaram.Desktop.SingleInstance

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Dirs]
; Shared backup folder. 'everyone-full' lets the SQL Server service account
; write .bak files here and lets the app read/copy them out.
Name: "{commonappdata}\AlHaramPos\backups"; Permissions: everyone-full

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional icons:"

[Files]
Source: "{#SrcDir}\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "{#IconFile}"; DestDir: "{app}"; DestName: "app.ico"; Flags: ignoreversion

[Icons]
Name: "{group}\Al-Haram Steel"; Filename: "{app}\{#AppExe}"; IconFilename: "{app}\app.ico"
Name: "{group}\Uninstall Al-Haram Steel"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Al-Haram Steel"; Filename: "{app}\{#AppExe}"; IconFilename: "{app}\app.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExe}"; Description: "Launch Al-Haram Steel"; Flags: nowait postinstall skipifsilent
