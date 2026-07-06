; ASEADO installer hooks
;
; The bundled backend (ASEADO.jar) serves HTTPS on https://localhost:8443
; using a self-signed certificate (resources/backend/keystore/aseado.cer).
; The embedded React UI lives at the secure origin https://tauri.localhost
; and calls that backend directly via fetch(). WebView2 does NOT reliably
; trust self-signed certs on localhost — on many machines/WebView2 versions
; the fetch is silently rejected (net::ERR_CERT_AUTHORITY_INVALID), which
; the app then reports as "Could not reach server. Is the backend running?"
; even though the backend is perfectly healthy. That's a webview trust
; problem, not a backend problem.
;
; This hook installs the certificate into the current user's Trusted Root
; store at install time (so no admin elevation is needed — matches
; nsis.installMode "currentUser" in tauri.conf.json) and removes it again
; on uninstall.
;
; certutil.exe ships with Windows since Vista, so no extra dependency.

!macro NSIS_HOOK_POSTINSTALL
  DetailPrint "Trusting ASEADO's local HTTPS certificate..."
  nsExec::ExecToLog 'certutil.exe -user -addstore Root "$INSTDIR\resources\backend\keystore\aseado.cer"'
  Pop $0
  ${If} $0 != 0
    DetailPrint "Warning: could not register the local HTTPS certificate (code $0). The app may show a 'cannot reach server' error until it's trusted manually (see README-BUILD.md)."
  ${EndIf}
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  DetailPrint "Removing ASEADO's local HTTPS certificate..."
  ; Target by SHA1 thumbprint (not subject name) so we only ever remove
  ; exactly this certificate and never touch an unrelated CN=localhost cert
  ; some other app might have installed.
  nsExec::ExecToLog 'certutil.exe -user -delstore Root "5E0BF143805F9BACF94FC6C547BD6B83323B0788"'
  Pop $0
!macroend
