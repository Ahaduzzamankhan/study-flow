; StudyFlow — Inno Setup installer script
; Compile with: ISCC.exe /DAppVersion=1.0.0 installer\studyflow.iss
; Expects the packaged Electron app in ..\release\win-unpacked

#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif

#define AppName "StudyFlow"
#define AppPublisher "StudyFlow"
#define AppExeName "StudyFlow.exe"
#define AppId "{{8F1C0B42-3B9E-4C2A-9E4D-5B6A7C8D9E01}"

[Setup]
AppId={#AppId}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL=https://github.com/Ahaduzzamankhan/study-flow
AppSupportURL=https://github.com/Ahaduzzamankhan/study-flow/issues
AppUpdatesURL=https://github.com/Ahaduzzamankhan/study-flow/releases
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=no
UninstallDisplayIcon={app}\{#AppExeName}
UninstallDisplayName={#AppName} {#AppVersion}
SetupIconFile=..\build\icon.ico
OutputDir=..\release
OutputBaseFilename=StudyFlow-Setup-{#AppVersion}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
AllowNoIcons=yes
LicenseFile=..\LICENSE
VersionInfoVersion={#AppVersion}
VersionInfoCompany={#AppPublisher}
VersionInfoDescription={#AppName} desktop installer
VersionInfoProductName={#AppName}
VersionInfoProductVersion={#AppVersion}
ChangesAssociations=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "startupicon"; Description: "Start {#AppName} when Windows starts"; GroupDescription: "Startup:"; Flags: unchecked

[Files]
Source: "..\release\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon
Name: "{autostartup}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: startupicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(AppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; User study data lives in %APPDATA%\StudyFlow and is intentionally preserved
; on uninstall so that reinstalling or upgrading never destroys a student's history.
Type: filesandordirs; Name: "{app}\resources\app.asar.unpacked"

[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
end;
