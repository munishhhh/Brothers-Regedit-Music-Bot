# 🎧 Lavalink Server Setup Guide

## Prerequisites

- **Java 17+** (Java 21 recommended)
  - Download: https://adoptium.net/temurin/releases/
  - Verify: `java -version`

---

## Step 1: Download Lavalink

Download the latest Lavalink v4 jar file from:
- **Releases**: https://github.com/lavalink-devs/Lavalink/releases

Save it to this `lavalink/` directory as `Lavalink.jar`.

```
lavalink/
├── application.yml    (already configured!)
├── Lavalink.jar       (download this)
└── README.md          (you are here)
```

---

## Step 2: Configure

The `application.yml` is pre-configured with:
- ✅ YouTube plugin (search + playback)
- ✅ LavaSrc plugin (Spotify support)
- ✅ All audio filters (bassboost, nightcore, 8D, etc.)
- ✅ Optimized buffer settings

### Spotify Setup (Optional)
1. Go to https://developer.spotify.com/dashboard
2. Create a new application
3. Copy `Client ID` and `Client Secret`
4. Update `application.yml` → `plugins.lavasrc.spotify.clientId` and `clientSecret`
5. Also update your bot's `.env` file

### YouTube OAuth (Optional but Recommended)
To avoid rate limiting and access age-restricted content:
1. Set `plugins.youtube.oauth.enabled: true` in `application.yml`
2. Start Lavalink — check the console for a Google auth URL
3. Open the URL in your browser and authorize with a **burner Google account**
4. The token will be cached automatically for future starts

---

## Step 3: Start Lavalink

Open a terminal in the `lavalink/` directory and run:

```bash
java -jar Lavalink.jar
```

You should see:
```
  _                   _ _       _
 | |   __ ___   ____ | (_)_ __ | | __
 | |  / _` \ \ / / _` | | | '_ \| |/ /
 | |_| (_| |\ V / (_| | | | | | |   <
 |_____\__,_| \_/ \__,_|_|_|_| |_|_|\_\
```

Wait for: `Lavalink is ready to accept connections.`

### Run in Background (Optional)
```bash
# Linux/Mac
nohup java -jar Lavalink.jar &

# Windows (PowerShell)
Start-Process java -ArgumentList "-jar", "Lavalink.jar" -NoNewWindow

# With more memory
java -Xmx512M -jar Lavalink.jar
```

---

## Step 4: Start the Bot

In the root project directory:

```bash
# 1. Install dependencies
npm install

# 2. Configure .env file
#    Edit .env with your Discord bot token, client ID, etc.

# 3. Deploy slash commands (run once, or when commands change)
npm run deploy

# 4. Start the bot
npm start

# Or for development (auto-restart on changes):
npm run dev
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Connection refused` | Make sure Lavalink is running first |
| `401 Unauthorized` | Check password matches in `application.yml` and `.env` |
| `No search results` | Enable YouTube OAuth, or try different client types |
| YouTube rate limited | Enable OAuth and use a burner Google account |
| Spotify not working | Check `clientId`/`clientSecret` in `application.yml` |
| `Java not found` | Install Java 17+ and add to PATH |
| High memory usage | Limit with `java -Xmx256M -jar Lavalink.jar` |

---

## Architecture

```
┌──────────────────┐     WebSocket      ┌──────────────────────────┐
│   Discord Bot    │◄──────────────────►│   Lavalink Server        │
│  (Node.js)       │    Port 2333       │   (Java)                 │
│                  │                    │                          │
│  ┌─────────────┐ │                    │  ┌────────────────────┐  │
│  │  Kazagumo   │ │                    │  │  YouTube Plugin    │  │
│  │  (Manager)  │ │                    │  │  (Search/Play)     │  │
│  └──────┬──────┘ │                    │  └────────────────────┘  │
│         │        │                    │  ┌────────────────────┐  │
│  ┌──────┴──────┐ │                    │  │  LavaSrc Plugin    │  │
│  │  Shoukaku   │ │                    │  │  (Spotify→YouTube) │  │
│  │  (Client)   │ │                    │  └────────────────────┘  │
│  └─────────────┘ │                    │  ┌────────────────────┐  │
└──────────────────┘                    │  │  Audio Filters     │  │
         │                              │  │  (EQ, Effects)     │  │
         │ Voice                        │  └────────────────────┘  │
         ▼                              └──────────────────────────┘
┌──────────────────┐                              │
│  Discord Voice   │◄─────── Audio Stream ────────┘
│  Gateway         │
└──────────────────┘
```
