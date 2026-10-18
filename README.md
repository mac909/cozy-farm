# Cozy Farm

A cozy seaside farming game for two, played together in the browser.

## Play

1. Make sure Docker Desktop is running on the PC. If the farm isn't up, run `npm run farm:up`.
2. On each laptop or phone, switch on the **Tailscale** app.
3. Open **https://msi.tailbddd5f.ts.net**.

The old address, **http://100.82.139.111:8080**, still works too. With that one, type the `http://` part, or the browser tries HTTPS and fails.

### Put it on your phone's home screen

The game then opens full screen like an app, with no browser bars. With Tailscale on, open **https://msi.tailbddd5f.ts.net**, then:

- **iPhone (Safari):** tap **Share** (the square with an arrow; on newer iPhones it's inside the **···** menu), scroll down, tap **Add to Home Screen**, leave **Open as Web App** on if you see it, and tap **Add**.
- **Android (Chrome):** tap **⋮** (top right), then **Add to Home screen** or **Install app**, and confirm with **Install**.

The first time you open it from the home screen, it asks for your name and shirt again, because the home-screen app keeps its own settings. Tailscale still has to be on whenever you play.

## Develop

1. Run `npm install` once.
2. Run `npm run dev`, then open http://localhost:5173.

See [CLAUDE.md](CLAUDE.md) for how the project is organized, and [docs/](docs/) for the design and roadmap.
