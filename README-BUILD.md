# Building ASEADO.exe — step by step

This folder is a Tauri shell containing two things:

1. The React admin UI (src/, same app you already had) — built by Vite and
   embedded directly into the .exe at compile time. This is what renders
   when the app window opens; it talks to the backend purely as an API at
   https://localhost:8443 (no HTML pages are expected from the backend
   anymore — admin.html/menu.html were removed from the jar's static/
   folder, and that's fine, the React app replaces them entirely).
2. A Rust shell (src-tauri/) that launches your existing Spring Boot
   backend (ASEADO.jar) as a child process using a
   bundled JRE, then reveals the window immediately — it does NOT wait for
   the backend to come up. The embedded React app (IntroLoading.jsx) polls
   https://localhost:8443/api/bootstrap/status itself and shows its own
   loading/"server unreachable" state until the backend responds. On
   window close, Rust kills the java process so nothing lingers.

The jar still serves scanner.html + documentation.pdf from its static/
folder for phones on the LAN, over plain HTTP on port 8080 (added as a
second Tomcat connector — see HttpConnectorConfig.java). The admin UI
itself, however, talks to the backend exclusively over HTTPS on 8443 —
see "3c" below, this is not optional.

Run all of this on a Windows machine (Tauri builds a native .exe and can't
be cross-compiled from this Linux sandbox).

## 1. One-time tool install

Install, in order:
1. Rust: https://rustup.rs (just run rustup-init.exe, default options)
2. Node.js LTS: https://nodejs.org (needed for the Tauri CLI only — no
   frontend build runs here, but the CLI itself is an npm package)
3. Tauri's native build prereqs (WebView2 + MSVC Build Tools):
   `winget install Microsoft.VisualStudio.2022.BuildTools`
   (WebView2 runtime is already preinstalled on Windows 10/11 — Tauri's CLI
   will warn you if anything is missing when you first run `tauri build`.)
4. Tauri CLI:
   ```
   npm install --global @tauri-apps/cli
   ```

## 2. Install frontend dependencies

From the `aseado-shell` folder (project root):
```
npm install
```
This installs both the React app's dependencies and the Tauri CLI
(@tauri-apps/cli, listed in devDependencies). You do not need to run
`npm run build` yourself — `cargo tauri build` does that automatically via
`beforeBuildCommand` in tauri.conf.json.

## 3. Drop in your two required files

a) **Your backend jar** — build it normally:
   ```
   cd event-attendance-checker
   ./mvnw clean package -DskipTests
   ```
   This produces `target/event-attendance-checker-<version>.jar`.
   Copy/rename it to exactly:
   ```
   aseado-shell/src-tauri/resources/backend/ASEADO.jar
   ```
   (The filename must match main.rs exactly — rename it, don't edit Rust,
   unless you prefer to update the path in main.rs instead.)

b) **A Windows x64 JRE** (so end users don't need Java installed):
   Download Eclipse Temurin 21 JRE (Windows x64, .zip, NOT the installer):
   https://adoptium.net/temurin/releases/?os=windows&arch=x64&package=jre
   Extract it, then copy the *contents* of the extracted folder (the one
   that directly contains `bin/`, `lib/`, `release`, etc.) into:
   ```
   aseado-shell/src-tauri/resources/jre/
   ```
   so that this path exists:
   ```
   aseado-shell/src-tauri/resources/jre/bin/java.exe
   ```
   Delete the two PUT_*_HERE.txt placeholder files once both are in place.

   JRE (not JDK) is enough since you're only running the jar, not compiling.
   Temurin 21 LTS matches a modern Spring Boot 3.x toolchain; if your jar was
   built targeting a different Java version, grab that version's JRE instead
   — check with `java -version` wherever you ran the maven build.

c) **HTTPS keystore** — the admin UI is loaded from a secure origin
   (`https://tauri.localhost`), so it can only call an `https://` backend
   (browsers block a secure page calling plain `http://` as "mixed
   content"). A ready-made keystore is already included at:
   ```
   aseado-shell/src-tauri/resources/backend/keystore/aseado.p12   (leaf/server cert Tomcat serves)
   aseado-shell/src-tauri/resources/backend/keystore/aseado.cer   (root CA cert — this is what gets trusted)
   aseado-shell/src-tauri/dev-ca/aseado-ca.p12                    (root CA + private key — NOT bundled into the app, keep for re-signing only)
   ```
   (password `changeit`, alias `event-attendance` for the leaf, valid 10
   years — matches `application.yaml`'s `server.ssl.*` settings and
   `SecurityConfig`'s `key-alias`). You don't need to regenerate any of
   this normally.

   **This is a two-tier chain (root CA -> signed leaf), not a single
   dual-purpose self-signed cert.** We went through several iterations to
   land on this, so if you ever regenerate, follow the same shape or the
   same failure mode will come back:
   - A single self-signed cert (even with `-ext "BC=ca:true"` set)
     technically satisfies "is a valid CA," but using that *same*
     certificate as both the trusted root **and** the certificate Tomcat
     presents on the wire is an unusual, unreliable pattern — in testing,
     Chromium (WebView2/Edge/Chrome) kept rejecting it with
     `net::ERR_CERT_AUTHORITY_INVALID` even after it was correctly
     installed into "Trusted Root Certification Authorities" with a
     verified matching thumbprint, in a fresh reboot, in a fresh
     InPrivate window — genuinely never worked, not a caching artifact.
   - The fix: generate a **root CA** (self-signed, `CA:true`) and a
     separate **leaf/server cert** (`CA:false`, `EKU=serverAuth`, the
     actual SAN), have the root CA sign the leaf, and trust the *root*
     while Tomcat serves the *leaf* (plus the root, as part of the
     chain). This is exactly what `mkcert` and every other local-dev-cert
     tool does, and it's the combination that actually works reliably.

   To regenerate from scratch:
   ```
   # 1. Root CA (self-signed, CA:true) — kept OUTSIDE resources/, never bundled
   keytool -genkeypair -alias aseado-root -keyalg RSA -keysize 2048 \
     -storetype PKCS12 -keystore aseado-ca.p12 -validity 3650 -storepass changeit \
     -dname "CN=ASEADO Local Dev CA, OU=ASEADO, O=NP, L=Manila, ST=NCR, C=PH" \
     -ext "BC=ca:true" \
     -ext "KU=keyCertSign,cRLSign,digitalSignature"

   # 2. Leaf/server keypair — alias MUST stay event-attendance
   keytool -genkeypair -alias event-attendance -keyalg RSA -keysize 2048 \
     -storetype PKCS12 -keystore aseado.p12 -validity 3650 -storepass changeit \
     -dname "CN=localhost, OU=ASEADO, O=NP, L=Manila, ST=NCR, C=PH"

   # 3. CSR for the leaf, signed by the root CA
   keytool -certreq -alias event-attendance -keystore aseado.p12 -storepass changeit -file leaf.csr
   keytool -gencert -alias aseado-root -keystore aseado-ca.p12 -storepass changeit \
     -infile leaf.csr -outfile leaf-signed.cer -validity 3650 -rfc \
     -ext "SAN=dns:localhost,ip:127.0.0.1" \
     -ext "KU=digitalSignature,keyEncipherment" \
     -ext "EKU=serverAuth" \
     -ext "BC=ca:false"

   # 4. Export the root cert — THIS is what the app trusts, not the leaf
   keytool -exportcert -alias aseado-root -keystore aseado-ca.p12 -storepass changeit -file aseado.cer -rfc

   # 5. Import root + signed leaf into the serving keystore, completing the chain
   keytool -importcert -alias aseado-root -keystore aseado.p12 -storepass changeit -file aseado.cer -noprompt
   keytool -importcert -alias event-attendance -keystore aseado.p12 -storepass changeit -file leaf-signed.cer -noprompt
   ```
   Verify with `keytool -list -v -keystore aseado.p12 -storetype PKCS12 -storepass changeit -alias event-attendance` —
   you should see `Certificate chain length: 2` (leaf, then root), the leaf
   showing `BasicConstraints:[ CA:false ]` and `ExtendedKeyUsages [ serverAuth ]`,
   and the root showing `BasicConstraints:[ CA:true ]`.

   **After regenerating, update `ASEADO_CERT_SHA1_THUMBPRINT` in `main.rs`
   to the ROOT cert's thumbprint** (get it from
   `keytool -list -v -keystore aseado-ca.p12 -storetype PKCS12 -storepass changeit`),
   not the leaf's — the trust-check has to match what actually gets
   installed into the Windows store.

   Separately: because it's not a publicly-trusted CA, Windows won't trust
   it by default even with the chain fixed. **Do not rely on WebView2
   being lenient about this** — behavior here varies by WebView2/Edge
   version, and when it isn't lenient the failure is silent: `fetch()`
   just throws a generic network error, which the app reports as "could
   not reach server" even though the backend is running fine. This is a
   frontend/webview trust problem, not a backend problem, and it's easy to
   misdiagnose as the backend being down or CORS being misconfigured.

   The fix runs automatically at app startup instead of at install time:
   this project is on Tauri v1, which (unlike Tauri v2) has no NSIS
   `installerHooks` support, so a post-install step isn't available. Instead,
   `src-tauri/src/main.rs`'s `ensure_cert_trusted()` handles it every time
   the app launches, targeting the **LocalMachine** Root store.

   **Why LocalMachine and not CurrentUser, and why elevation is required:**
   this isn't a preference, it's a hard Windows restriction. Both
   `certutil -addstore Root` and PowerShell's
   `Import-Certificate -CertStoreLocation Cert:\CurrentUser\Root` were tried
   first and both fail the same way: Windows pops an interactive "install
   this certificate?" confirmation dialog for *any* non-elevated attempt to
   add to a Root store, and there is no flag to suppress it — per
   Microsoft's own guidance, silently scripting a CurrentUser Root install
   is blocked entirely, by design. The only silent path (same one `mkcert
   -install` uses on Windows) is adding to **LocalMachine\Root** while
   already running with an elevated/admin token — that skips the per-cert
   dialog entirely. So `ensure_cert_trusted()`:
   1. First does a cheap, non-elevated check (`Test-Path
      Cert:\LocalMachine\Root\<thumbprint>`) — if the cert's already
      trusted, it returns immediately with no prompt at all.
   2. Otherwise, it triggers `Start-Process certutil.exe -Verb RunAs` to
      request elevation. This shows the **normal Windows UAC prompt**
      ("Do you want to allow this app to make changes to your device?")
      once — a standard, expected dialog, not the certificate-specific one.
      Once elevated, `certutil -f -addstore Root aseado.cer` runs silently.

   If you ever regenerate `aseado.p12` with a new key, re-export the public
   cert so `aseado.cer` matches it, and **update
   `ASEADO_CERT_SHA1_THUMBPRINT` in `main.rs`** to the new thumbprint (the
   trust-check in step 1 above will otherwise never match, and every launch
   will trigger a UAC prompt):
   ```
   keytool -exportcert -keystore aseado.p12 -storetype PKCS12 \
     -storepass changeit -alias event-attendance -file aseado.cer -rfc
   keytool -list -v -keystore aseado.p12 -storetype PKCS12 -storepass changeit
   ```

   If a machine still shows a "could not reach server" error, check
   `aseado-backend.log`'s sibling stderr output for the `[ASEADO]` cert-trust
   log line (run the exe from a terminal to see it — this will tell you
   whether the UAC prompt was declined/dismissed), or import `aseado.cer`
   manually into "Trusted Root Certification Authorities" via `certmgr.msc`
   as a fallback. You can confirm the actual failure mode any time via the
   app's devtools (right-click -> Inspect Element, enabled via the
   `devtools` Cargo feature) — look at the Console/Network tab for the
   specific `net::ERR_...` code rather than guessing from the symptom alone.

## 4. Add an app icon (optional but required by Tauri's bundler)

Tauri needs icon files referenced in tauri.conf.json under
`src-tauri/icons/`. Generate a full icon set from any single PNG:
```
cd src-tauri
npx @tauri-apps/cli icon path/to/your-logo.png
```
This auto-generates icon.ico, icon.icns, and the various PNG sizes Tauri
expects, replacing the icons/ folder.

## 5. Build

From the `aseado-shell` folder:
```
cd src-tauri
cargo tauri build
```
(or `npx @tauri-apps/cli build` if you installed the CLI locally instead of
globally)

This produces, under `src-tauri/target/release/`:
- `aseado.exe` — the standalone executable. Renaming this file to
  `ASEADO.exe` is fine; Windows doesn't care about exe filename vs the
  binary inside.
- `bundle/nsis/ASEADO_1.0.0_x64-setup.exe` — a Windows installer, if you'd
  rather distribute that instead of a raw exe folder.

## 6. Final folder shape (raw exe distribution, matches your example)

If you want the loose-folder style like "The Radio Tower - Windows" instead
of the NSIS installer, just zip up:
```
ASEADO - Windows/
├── ASEADO.exe                 <- from target/release/aseado.exe
├── jre/                       <- copied automatically next to the exe
│   └── bin/java.exe ...
└── backend/
    └── ASEADO.jar
```
`cargo tauri build` already places `jre/` and `backend/` next to the exe
inside `target/release/` because of the `resources` entries in
tauri.conf.json — you don't need to copy them manually, just zip the whole
`target/release/` output (minus the unrelated build artifacts like
`.d`/`deps/` folders) the same way Radio Tower ships its `_Data` folder
alongside its `.exe`.

## Troubleshooting

- **App opens but shows "SERVER UNREACHABLE"**: something else is already
  using port 8080, or the JRE/jar paths are wrong. Check
  `resources/jre/bin/java.exe` and `resources/backend/ASEADO.jar`
  both exist with those exact names before building, and check stderr (run
  the exe from a terminal, e.g. `.\ASEADO.exe`, to see the `[ASEADO] ...`
  log line printed on backend startup failure).
- **Antivirus flags the exe**: unsigned Tauri/Rust binaries are commonly
  flagged by Windows Defender SmartScreen on first run from unfamiliar
  publishers. Code-signing the exe (a separate, paid step) removes this;
  not required for local/internal use.
- **Backend takes longer than 60s to start** (e.g. very first launch doing
  schema setup): increase `BACKEND_STARTUP_TIMEOUT_SECS` in main.rs.
