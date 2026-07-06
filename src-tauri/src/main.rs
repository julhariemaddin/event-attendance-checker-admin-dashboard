// ASEADO desktop shell.
//
// Folder layout this expects next to the .exe (Tauri's "resources" bundling
// copies these in automatically — see tauri.conf.json):
//
//   ASEADO.exe
//   jre/bin/java.exe                <- bundled JRE, you provide this
//   backend/ASEADO.jar              <- your Spring Boot jar
//   backend/keystore/aseado.p12     <- HTTPS keystore, you provide this
//
// The window itself shows the React admin UI, which is embedded directly
// into the .exe at build time (Tauri's distDir, see tauri.conf.json) — it
// no longer depends on the backend serving any HTML. The backend
// (ASEADO.jar) is purely a local API + WebSocket server the embedded React
// app talks to at https://localhost:8443 (see src/api/client.js's API_BASE),
// and is also what phones reach over LAN at https://<this-pc-ip>:8443/scanner.html.
//
// On startup: spawn `jre/bin/java.exe -Dapp.keystore-path=... -jar backend/ASEADO.jar`,
// go fullscreen and reveal the window immediately. The embedded React app
// (IntroLoading.jsx) polls https://localhost:8443/api/bootstrap/status itself
// and only proceeds past the splash once the backend responds — Rust no
// longer needs to gate the window on backend readiness.
// On window close: kill the java child process so it never lingers in the
// background after the app is closed.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

struct BackendProcess(Mutex<Option<Child>>);

fn resource_path(app: &tauri::AppHandle, relative: &str) -> std::path::PathBuf {
    // resolve_resource looks inside the bundled "resources" next to the exe
    // in production, and inside src-tauri/resources during `tauri dev`.
    app.path_resolver()
        .resolve_resource(relative)
        .unwrap_or_else(|| {
            panic!(
                "Could not resolve bundled resource '{relative}'. \
                 Check tauri.conf.json -> bundle.resources and that the file \
                 actually exists in src-tauri/resources/."
            )
        })
}

fn spawn_backend(app: &tauri::AppHandle) -> Child {
    let java_path = resource_path(app, "resources/jre/bin/java.exe");
    let jar_path = resource_path(app, "resources/backend/ASEADO.jar");

    if !java_path.exists() {
        panic!(
            "Bundled JRE not found at {:?}. \
             Place a Windows x64 JRE under src-tauri/resources/jre/ before building \
             (see README-BUILD.md).",
            java_path
        );
    }
    if !jar_path.exists() {
        panic!(
            "Backend jar not found at {:?}. \
             Place ASEADO.jar under src-tauri/resources/backend/ \
             before building (see README-BUILD.md).",
            jar_path
        );
    }

    let backend_dir = jar_path.parent().unwrap_or_else(|| std::path::Path::new("."));

    // HTTPS keystore lives next to the jar so it always resolves relative to
    // the backend's own working directory — no environment variables, no
    // registry, no dependence on who/how the exe gets launched.
    let keystore_path = backend_dir.join("keystore").join("aseado.p12");
    if !keystore_path.exists() {
        panic!(
            "HTTPS keystore not found at {:?}. \
             Generate one with keytool (alias must be 'event-attendance' to \
             match application.yml) and place it under \
             src-tauri/resources/backend/keystore/aseado.p12 before building.",
            keystore_path
        );
    }

    let log_path = backend_dir.join("aseado-backend.log");
    let log_file_out = std::fs::File::create(&log_path)
        .unwrap_or_else(|e| panic!("Could not create log file at {:?}: {}", log_path, e));
    let log_file_err = log_file_out.try_clone().expect("clone log file handle");

    let mut cmd = Command::new(java_path);
    cmd.arg(format!("-Dapp.keystore-path={}", keystore_path.display()))
        .arg("-jar")
        .arg("ASEADO.jar") //  Pass just the filename as a relative string!
        .current_dir(backend_dir)
        .stdout(Stdio::from(log_file_out))
        .stderr(Stdio::from(log_file_err));

    // Stop a console window from flashing up alongside the GUI app on Windows.
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    cmd.spawn().expect(
        "Failed to start the bundled backend (java.exe -jar ASEADO.jar). \
         See README-BUILD.md for troubleshooting.",
    )
}

// Extra safety net: even with the RunEvent-based cleanup in main(), a
// crash, a forced kill (Task Manager "End Task" on the parent only), or a
// power loss can still orphan the java.exe child, exactly like the one
// that silently kept serving a stale cert through many rounds of testing
// during development. Belt-and-suspenders: before spawning our own
// backend, clear out anything already listening on 8443 so we never stack
// a new backend on top of a zombie one.
#[cfg(target_os = "windows")]
fn kill_stale_backend_on_port_8443() {
    let mut cmd = Command::new("powershell.exe");
    cmd.args([
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "Get-NetTCPConnection -LocalPort 8443 -State Listen -ErrorAction SilentlyContinue \
         | Select-Object -ExpandProperty OwningProcess -Unique \
         | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }",
    ]);
    cmd.creation_flags(CREATE_NO_WINDOW);
    match cmd.status() {
        Ok(status) if status.success() => {
            eprintln!("[ASEADO DEBUG] cleared any stale process on port 8443")
        }
        Ok(status) => eprintln!(
            "[ASEADO DEBUG] port 8443 cleanup exited with {:?} (non-fatal, continuing)",
            status.code()
        ),
        Err(e) => eprintln!(
            "[ASEADO DEBUG] could not run port 8443 cleanup: {e} (non-fatal, continuing)"
        ),
    }
}

fn main() {
    // Skip the entire Windows-trust-store fight: tell WebView2 to ignore
    // certificate errors for its own navigations, the same effective
    // result as manually clicking "proceed anyway" in a browser tab, but
    // automatic and permanent. This has to be set via env var BEFORE the
    // WebView2 environment is created (i.e. before .build() runs below).
    // Tradeoff: this disables cert validation for every navigation this
    // webview makes, not just calls to our own backend — acceptable here
    // since this is a locked-down kiosk app that only ever talks to its
    // own bundled localhost backend, never arbitrary external sites.
    #[cfg(target_os = "windows")]
    std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--ignore-certificate-errors");

    let app = tauri::Builder::default()
        .manage(BackendProcess(Mutex::new(None)))
        .setup(|app| {
            eprintln!("[ASEADO DEBUG] setup() reached");
            let app_handle = app.handle();

            #[cfg(target_os = "windows")]
            kill_stale_backend_on_port_8443();

            eprintln!("[ASEADO DEBUG] about to call spawn_backend");
            let child = spawn_backend(&app_handle);
            eprintln!("[ASEADO DEBUG] spawn_backend returned, pid = {:?}", child.id());
            app_handle.state::<BackendProcess>().0.lock().unwrap().replace(child);

            // Window is created visible (see tauri.conf.json — visible: true)
            // to avoid the visible:false + maximized:true init bug. We go
            // fullscreen here in Rust instead of declaring it at config time —
            // real fullscreen (not maximize) is what hides the title bar and
            // taskbar entirely; maximize keeps window chrome by OS design.
            // IntroLoading.jsx plays its animation and polls
            // /api/bootstrap/status on its own, then hands off to the
            // licence/login flow once the backend is up.
            if let Some(win) = app.get_window("main") {
                win.set_fullscreen(true).ok();
                win.show().ok();
                win.set_focus().ok();
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building ASEADO");

    // Kill the backend on every exit path. The previous approach
    // (on_window_event + WindowEvent::Destroyed) was unreliable on Windows
    // — it can fire late, or get skipped depending on exactly how the
    // window closes — and that's exactly how a java.exe process ended up
    // orphaned and running indefinitely in the background even with the
    // app fully closed, silently serving a stale backend on port 8443
    // through many rounds of testing. RunEvent::ExitRequested/Exit fire at
    // the process level on every exit path (window close, Alt+F4, taskbar,
    // in-app quit), so this is the reliable place to guarantee cleanup
    // actually runs.
    app.run(|app_handle, event| {
        if matches!(event, tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit) {
            if let Some(mut child) = app_handle.state::<BackendProcess>().0.lock().unwrap().take() {
                eprintln!("[ASEADO DEBUG] app exiting, killing backend pid {:?}", child.id());
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    });
}