# TESDA Portal (Static) — File Manager & QR Generator

This is a static client-side site that provides:
- Browser-based file management (IndexedDB): upload, search, preview, download, delete.
- QR code generator for text/URL (client-side).

## How it works
- Files uploaded are stored in the browser's IndexedDB. They are private to that browser profile and device.
- To share files publicly, you must upload the file to a public host (e.g., GitHub repo raw link, file server) and then paste the public URL into the QR generator.

## Deploy to GitHub Pages (quick)
1. Create a new GitHub repository (e.g., `tesda-portal`).
2. Add files:
   - `index.html`
   - `css/style.css`
   - `js/script.js`
   - (optional) `assets/tesda-logo.png`
   - `README.md`
3. Commit and push to GitHub.
4. In your repo: Settings → Pages → Source → choose the branch (`main`) and root folder `/` → Save.
5. GitHub Pages will provide a URL like `https://<your-username>.github.io/tesda-portal/`. Open it.

## Making files publicly available (optional)
If you want users to be able to download files via a URL (so QR links work across devices), upload the file to a public host:
- **GitHub (small files)**: Add the file into your repo (e.g., `public_files/yourfile.pdf`) and push. The raw URL is:

https://raw.githubusercontent.com/<username>/<repo>/<branch>/public_files/yourfile.pdf

pgsql
Copy code
Paste that raw URL into the QR generator.
- **Other hosts**: Google Drive (shared raw?), file hosting services, or your own server that serves direct file links.

## Limitations
- No server-side code (because GitHub Pages is static). For multi-user file sharing and server storage you need a backend (PHP/Node/Python) + real storage.
- IndexedDB data is local to the browser and will not sync between devices.

## Security & privacy
- Files are stored locally on user's browser by design.
- If you want central storage and user accounts, you'll need a backend server and authentication (not in this static demo).

## Customize
- Update `assets/tesda-logo.png` to your logo.
- Modify UI or features in `css/style.css` and `js/script.js`.

Enjoy — publish on GitHub Pages and share the site link with trainees!
