# MORAL KOMBAT - MVP

Ein arcade-artiges 2D-Fighting-Game im Mortal-Kombat-Stil, optimiert für Smartphones (Querformat).

## 🎮 Features

- **Spieler**: Sri Aurobindo (Monk) mit Punch, Kick und Special-Attack (Buchschlag)
- **Gegner**: Bagger (Excavator) mit KI und schweren Arm-Schlägen
- **Arena**: Matrimandir (Auroville)
- **Touch-Controls**: Optimiert für Mobile-Geräte
- **Kampfsystem**: HP-Leisten, Kollisionserkennung, Combos

## 🚀 Spiel starten

### Option 1: Live Server (empfohlen)

1. **Installiere Live Server** (falls noch nicht installiert):
   - In VS Code: Erweiterung "Live Server" installieren
   - ODER via npm: `npm install -g live-server`

2. **Starte den Server**:
   - In VS Code: Rechtsklick auf `index.html` → "Open with Live Server"
   - ODER im Terminal: `live-server`

3. **Öffne im Browser**: `http://localhost:5500` (oder die angezeigte URL)

### Option 2: Python Server

```bash
# Python 3
python -m http.server 8000

# Dann öffne: http://localhost:8000
```

### Option 3: Node.js Server

```bash
npx http-server -p 8000

# Dann öffne: http://localhost:8000
```

## 📱 Auf dem Smartphone testen

1. **Starte den Server** auf deinem PC (siehe oben)
2. **Finde deine lokale IP**:
   - Windows: `ipconfig` → suche "IPv4-Adresse"
   - z.B. `192.168.1.100`
3. **Öffne im Smartphone-Browser**: `http://192.168.1.100:8000`
4. **Drehe das Smartphone ins Querformat**

**Wichtig**: PC und Smartphone müssen im gleichen WLAN sein!

## 🎯 Steuerung

### Mobile (Touch):
- **◄ / ►**: Bewegung
- **P**: Punch (Schlag)
- **K**: Kick (Tritt)
- **S**: Special Attack (Buchschlag)

### Desktop (Tastatur):
- **Pfeiltasten**: Bewegung
- **A**: Punch
- **S**: Kick
- **D**: Special Attack

## 📁 Projektstruktur

```
Moral Kombat/
├── index.html              # Haupt-HTML-Datei
├── js/
│   ├── main.js            # Game-Konfiguration
│   ├── scenes/
│   │   ├── IntroScene.js  # Intro-Screen mit Logo
│   │   └── GameScene.js   # Hauptspiel
│   └── entities/
│       ├── Player.js      # Spieler-Logik (Monk)
│       └── Enemy.js       # Gegner-KI (Bagger)
└── assets/
    ├── fighters/
    │   ├── monk/          # Alle Monk-Animationen
    │   └── bagger/        # Alle Bagger-Animationen
    ├── backgrounds/       # Matrimandir Hintergrund
    └── ui/                # Intro-Logo
```

## 🛠️ Technologie

- **Engine**: Phaser 3.70.0 (HTML5 Game Framework)
- **Physik**: Arcade Physics
- **Plattform**: Web (läuft im Browser, keine Installation nötig)

## 🎨 Assets

Alle Sprites müssen im PNG-Format mit transparentem Hintergrund vorliegen:
- Monk: 5 Animationen (Idle, Punch, Kick, Special, Dead)
- Bagger: 2 Animationen (Idle, Attack)

## ⚙️ Anpassungen

### Frame-Größen ändern
Falls die Sprites nicht richtig angezeigt werden, passe die `frameWidth` und `frameHeight` in `GameScene.js` an:

```javascript
this.load.spritesheet('monk_idle', 'assets/fighters/monk/monk idle spritesheet.png', {
    frameWidth: 300,  // ← Hier anpassen
    frameHeight: 400  // ← Hier anpassen
});
```

### Schwierigkeitsgrad anpassen
In `Enemy.js`:
- `this.damage = 15;` → Schaden des Baggers
- `this.attackCooldownTime = 2000;` → Zeit zwischen Angriffen (ms)
- `this.moveSpeed = 2;` → Bewegungsgeschwindigkeit

In `Player.js`:
- `this.damage = 10;` → Basis-Schaden des Spielers
- `this.movementSpeed = 5;` → Bewegungsgeschwindigkeit

## 🐛 Troubleshooting

### Sprites werden nicht angezeigt?
1. Prüfe die Browser-Konsole (F12) auf Fehler
2. Überprüfe die Dateinamen (Groß-/Kleinschreibung!)
3. Stelle sicher, dass alle Assets im richtigen Ordner sind

### Spiel läuft nicht?
1. Muss über einen Server laufen (nicht als `file://`)
2. Prüfe die Browser-Konsole auf Fehler
3. Teste mit Chrome/Edge (beste Kompatibilität)

### Touch-Controls funktionieren nicht?
1. Stelle sicher, dass das Gerät im Querformat ist
2. Aktualisiere die Seite
3. Teste in verschiedenen Browsern

## 📝 Lizenz

Moral Kombat MVP - 2025


