# Deploying Floorplan to Ubuntu

This guide sets up the floorplan editor with real-time collaboration on an Ubuntu server using Nginx + Node.js + pm2.

---

## Architecture

```
Browser → Nginx (port 80/443)
              ├── static files  → /var/www/floorplan/  (HTML/CSS/JS)
              └── /ws requests  → Node.js on localhost:3001  (WebSocket server)
```

---

## Prerequisites

Check these are installed:

```bash
node --version    # need 18+
npm --version
nginx -v
pm2 --version     # if missing: sudo npm install -g pm2
```

Install Node 18 if needed:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## Step 1 — Get the code

```bash
# If first deploy:
cd /var/www
sudo git clone https://github.com/Slaytex/floorplan.git
sudo chown -R $USER:$USER /var/www/floorplan

# If updating existing deploy:
cd /var/www/floorplan
git pull origin features
```

---

## Step 2 — Install Node dependencies

```bash
cd /var/www/floorplan
npm install
```

This installs the `ws` WebSocket library (the only dependency).

---

## Step 3 — Start the WebSocket server with pm2

```bash
cd /var/www/floorplan
pm2 start server.js --name floorplan
pm2 save                        # persist across reboots
pm2 startup                     # follow the printed command to enable on boot
```

Verify it's running:
```bash
pm2 status
pm2 logs floorplan --lines 20
```

The server listens on **port 3001** by default. To use a different port:
```bash
PORT=3002 pm2 start server.js --name floorplan
```

---

## Step 4 — Configure Nginx

Edit your site config (e.g. `/etc/nginx/sites-available/floorplan` or your existing default):

```nginx
server {
    listen 80;
    server_name yourdomain.com;   # ← replace with your domain or IP

    root /var/www/floorplan;
    index index.html;

    # Serve static files directly
    location / {
        try_files $uri $uri/ =404;
    }

    # Proxy WebSocket connections to Node.js
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host       $host;
        proxy_read_timeout 3600s;   # keep connection alive for long sessions
    }
}
```

Enable and reload:
```bash
sudo ln -sf /etc/nginx/sites-available/floorplan /etc/nginx/sites-enabled/
sudo nginx -t                   # test config — must say "ok"
sudo systemctl reload nginx
```

---

## Step 5 — HTTPS with Let's Encrypt (recommended)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Certbot auto-updates the Nginx config to handle SSL. WebSocket will automatically upgrade to `wss://`.

---

## Step 6 — Test

Open in a browser:
```
https://yourdomain.com/?room=test
```

Open a **second tab or a different browser** with the same URL. Make a change in one — it should appear instantly in the other.

The `?room=` parameter is the collaboration key. Anyone with the same URL joins the same shared canvas. Without `?room=`, the app works in normal offline mode.

---

## Updating the app

```bash
cd /var/www/floorplan
git pull origin features
pm2 restart floorplan
```

No Nginx reload needed for code-only changes (static files are served directly from disk).

---

## Troubleshooting

**WebSocket not connecting:**
- Check `pm2 status` — is the server running?
- Check `pm2 logs floorplan` for errors
- Verify Nginx has the `/ws` location block and was reloaded
- Make sure port 3001 is not blocked by a firewall: `sudo ufw allow 3001` (or just rely on Nginx proxy)

**Changes not syncing between tabs:**
- Open browser DevTools → Network → WS tab — look for the `/ws` connection
- If connection fails, the app silently falls back to offline mode

**Server crash / restarts:**
- `pm2 logs floorplan` will show the error
- `pm2 restart floorplan` to restart after fixing

**Room state is lost after server restart:**
- State is in-memory only — if the Node process restarts, the room resets
- Whoever is still connected will re-broadcast their current state to new joiners
- For persistent storage, see optional Redis section below

---

## Optional: Persist room state across server restarts

If you want rooms to survive a `pm2 restart`, add Redis storage to `server.js`. This requires `redis` npm package and a running Redis instance, but is not needed for a small team where someone is always connected.

---

## Port reference

| Port | Purpose |
|------|---------|
| 80   | Nginx HTTP (redirects to 443) |
| 443  | Nginx HTTPS (serves files + proxies /ws) |
| 3001 | Node.js WebSocket server (internal only) |
