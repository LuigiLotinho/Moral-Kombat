class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        // opponentKey comes from OpponentSelectScene
        this.opponentKey = data?.opponentKey || this.opponentKey || 'bagger';
    }

    /**
     * Removes pure/near-black backgrounds by keying out black pixels (sets alpha to 0).
     * Useful when PNGs were exported without transparency and have a black background.
     */
    makeBlackTransparent(textureKey, threshold = 12) {
        if (!this.textures.exists(textureKey)) return;

        const tex = this.textures.get(textureKey);
        const src = tex?.getSourceImage?.();
        if (!src) return;

        // If it's already a canvas texture, we likely processed it before (scene restart)
        if (typeof HTMLCanvasElement !== 'undefined' && src instanceof HTMLCanvasElement) return;

        const w = src.width;
        const h = src.height;
        if (!w || !h) return;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(src, 0, 0);

        const img = ctx.getImageData(0, 0, w, h);
        const data = img.data;
        const t = threshold;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // If pixel is near-black, make it transparent
            if (r <= t && g <= t && b <= t) {
                data[i + 3] = 0;
            }
        }

        ctx.putImageData(img, 0, 0);

        // Replace the original texture with the processed (transparent) canvas texture
        this.textures.remove(textureKey);
        this.textures.addCanvas(textureKey, canvas);
    }

    /**
     * Pads a list of textures to a shared maximum width/height.
     * Default: center horizontally, align to bottom vertically (good for characters on the ground).
     */
    padTexturesToMax(textureKeys, { alignBottom = true } = {}) {
        const keys = textureKeys.filter((k) => this.textures.exists(k));
        if (keys.length === 0) return;

        // Find max dimensions
        let maxW = 0;
        let maxH = 0;
        const sources = new Map();
        for (const key of keys) {
            const tex = this.textures.get(key);
            const src = tex?.getSourceImage?.();
            if (!src) continue;
            sources.set(key, src);
            maxW = Math.max(maxW, src.width || 0);
            maxH = Math.max(maxH, src.height || 0);
        }
        if (!maxW || !maxH) return;

        for (const key of keys) {
            const src = sources.get(key);
            if (!src) continue;

            // Skip if already padded to max size (avoids re-padding on scene restart)
            if (
                typeof HTMLCanvasElement !== 'undefined' &&
                src instanceof HTMLCanvasElement &&
                src.width === maxW &&
                src.height === maxH
            ) {
                continue;
            }

            const w = src.width;
            const h = src.height;
            const canvas = document.createElement('canvas');
            canvas.width = maxW;
            canvas.height = maxH;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) continue;
            ctx.clearRect(0, 0, maxW, maxH);

            const dx = Math.floor((maxW - w) / 2);
            const dy = alignBottom ? maxH - h : Math.floor((maxH - h) / 2);
            ctx.drawImage(src, dx, dy);

            this.textures.remove(key);
            this.textures.addCanvas(key, canvas);
        }
    }

    /**
     * Like padding, but aligns each frame by the bottom-most opaque pixel (alpha threshold),
     * so inconsistent transparent "floor padding" doesn't make the character jump/scale.
     */
    padTexturesByOpaqueBottom(textureKeys, { alphaThreshold = 10 } = {}) {
        const keys = textureKeys.filter((k) => this.textures.exists(k));
        if (keys.length === 0) return;

        let maxW = 0;
        let maxH = 0;
        const sources = new Map();
        for (const key of keys) {
            const tex = this.textures.get(key);
            const src = tex?.getSourceImage?.();
            if (!src) continue;
            sources.set(key, src);
            maxW = Math.max(maxW, src.width || 0);
            maxH = Math.max(maxH, src.height || 0);
        }
        if (!maxW || !maxH) return;

        for (const key of keys) {
            const src = sources.get(key);
            if (!src) continue;

            // If already padded to the correct size, skip (common on scene restart)
            if (
                typeof HTMLCanvasElement !== 'undefined' &&
                src instanceof HTMLCanvasElement &&
                src.width === maxW &&
                src.height === maxH
            ) {
                continue;
            }

            const w = src.width;
            const h = src.height;

            // Read pixels to find bottom-most opaque pixel
            const tmp = document.createElement('canvas');
            tmp.width = w;
            tmp.height = h;
            const tctx = tmp.getContext('2d', { willReadFrequently: true });
            if (!tctx) continue;
            tctx.clearRect(0, 0, w, h);
            tctx.drawImage(src, 0, 0);
            const img = tctx.getImageData(0, 0, w, h);
            const data = img.data;

            let maxY = -1;
            for (let y = h - 1; y >= 0; y--) {
                let rowHasOpaque = false;
                const rowStart = y * w * 4;
                for (let x = 0; x < w; x++) {
                    const a = data[rowStart + x * 4 + 3];
                    if (a > alphaThreshold) {
                        rowHasOpaque = true;
                        break;
                    }
                }
                if (rowHasOpaque) {
                    maxY = y;
                    break;
                }
            }
            if (maxY < 0) maxY = h - 1;

            const canvas = document.createElement('canvas');
            canvas.width = maxW;
            canvas.height = maxH;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) continue;
            ctx.clearRect(0, 0, maxW, maxH);

            const dx = Math.floor((maxW - w) / 2);
            const dy = (maxH - 1) - maxY;
            ctx.drawImage(src, dx, dy);

            this.textures.remove(key);
            this.textures.addCanvas(key, canvas);
        }
    }

    makeDefeatTexturesTransparent() {
        // Monk
        for (let i = 1; i <= 4; i++) this.makeBlackTransparent(`monk_dying_${i}`);
        this.makeBlackTransparent('monk_defeat');
        this.makeBlackTransparent('monk_end');
        // Monk victory / celebration frames (new set: 1..36; some exports have black bg)
        for (let i = 1; i <= 36; i++) this.makeBlackTransparent(`monk_victory_${i}`);
        // Normalize victory frame sizes so all *used* frames are consistent.
        // We align by opaque-bottom to avoid "wobble" from inconsistent transparent padding.
        this.padTexturesByOpaqueBottom(Array.from({ length: 27 }, (_, idx) => `monk_victory_${idx + 10}`));

        // Monk book-cast animation (book attack) - current set 1..5
        for (let i = 1; i <= 5; i++) this.makeBlackTransparent(`monk_book_${i}`);
        // Align by opaque-bottom (fixes visible "size/position wobble" caused by inconsistent transparent padding)
        this.padTexturesByOpaqueBottom(Array.from({ length: 5 }, (_, idx) => `monk_book_${idx + 1}`));

        // Bagger
        for (let i = 1; i <= 8; i++) this.makeBlackTransparent(`bagger_dying_${i}`);
        this.makeBlackTransparent('bagger_defeat');
        for (let i = 1; i <= 3; i++) this.makeBlackTransparent(`bagger_defeat_loop_${i}`);

        // Book sprite (key out black bg)
        this.makeBlackTransparent('book', 10);

        // Madame (idle/hit/defeat/end)
        for (let i = 1; i <= 4; i++) this.makeBlackTransparent(`madame_idle_${i}`);
        for (let i = 1; i <= 9; i++) this.makeBlackTransparent(`madame_hit_${i}`);
        for (let i = 1; i <= 5; i++) this.makeBlackTransparent(`madame_defeat_${i}`);
        this.makeBlackTransparent('madame_end');

        // Stabilize Madame frames (prevents wobble from transparent padding)
        this.padTexturesByOpaqueBottom(Array.from({ length: 4 }, (_, idx) => `madame_idle_${idx + 1}`));
        this.padTexturesByOpaqueBottom(Array.from({ length: 9 }, (_, idx) => `madame_hit_${idx + 1}`));
        this.padTexturesByOpaqueBottom(Array.from({ length: 5 }, (_, idx) => `madame_defeat_${idx + 1}`));
    }

    preload() {
        // Background
        this.load.image('background', 'assets/backgrounds/matrimandir background.png');
        this.load.image('background2', 'assets/backgrounds/background 2.png');

        // Monk (Player) - NEW individual frames from gimp1
        for (let i = 1; i <= 4; i++) {
            this.load.image(`monk_idle_${i}`, `assets/fighters/monk/idle/idel${i}.png`);
        }
        for (let i = 1; i <= 6; i++) {
            this.load.image(`monk_punch_${i}`, `assets/fighters/monk/punch/punch${i}.png`);
        }
        for (let i = 1; i <= 5; i++) {
            this.load.image(`monk_kick_${i}`, `assets/fighters/monk/kick/kick${i}.png`);
        }
        for (let i = 1; i <= 2; i++) {
            this.load.image(`monk_hit_${i}`, `assets/fighters/monk/hit/hit${i}.png`);
        }
        
        // Monk defeat (4-frame dying + final dead pose)
        for (let i = 1; i <= 4; i++) {
            this.load.image(`monk_dying_${i}`, `assets/fighters/monk/defeat/monkdying${i}.png`);
        }
        this.load.image('monk_defeat', 'assets/fighters/monk/defeat/monkdefeat.png');
        // Cache-bust so edits to monkend.png are always picked up on reload during development
        this.load.image('monk_end', `assets/fighters/monk/end/monkend.png?v=${Date.now()}`);

        // Monk victory / celebration (new set: 1..36)
        for (let i = 1; i <= 36; i++) {
            this.load.image(`monk_victory_${i}`, `assets/fighters/monk/victory/monkwin${i}.png`);
        }

        // Book attack assets
        this.load.image('book', 'assets/attacks/book/book.png');
        // Monk book-cast frames: current set is 1..5
        for (let i = 1; i <= 5; i++) {
            this.load.image(`monk_book_${i}`, `assets/fighters/monk/book/monkbook${i}.png`);
        }

        // Bagger (Enemy) - NEW idle + 12-frame attack
        this.load.image('bagger_idle', 'assets/fighters/bagger/idle/baggeridle.png');
        for (let i = 1; i <= 12; i++) {
            this.load.image(`bagger_attack_${i}`, `assets/fighters/bagger/attack/baggerhit${i}.png`);
        }

        // Bagger defeat (8-frame dying + final dead pose)
        for (let i = 1; i <= 8; i++) {
            this.load.image(`bagger_dying_${i}`, `assets/fighters/bagger/defeat/baggerdying${i}.png`);
        }
        this.load.image('bagger_defeat', 'assets/fighters/bagger/defeat/baggerdefeat.png');

        // Bagger defeat loop (3-frame)
        for (let i = 1; i <= 3; i++) {
            this.load.image(`bagger_defeat_loop_${i}`, `assets/fighters/bagger/defeat/baggerdefeat${i}.png`);
        }

        // Madame
        for (let i = 1; i <= 4; i++) {
            this.load.image(`madame_idle_${i}`, `assets/fighters/madame/idle/idle${i}.png`);
        }
        for (let i = 1; i <= 9; i++) {
            this.load.image(`madame_hit_${i}`, `assets/fighters/madame/hit/hit${i}.png`);
        }
        for (let i = 1; i <= 5; i++) {
            this.load.image(`madame_defeat_${i}`, `assets/fighters/madame/defeat/defeat${i}.png`);
        }
        this.load.image('madame_end', 'assets/fighters/madame/end/end.png');
    }

    create() {
        // Fixed arena world (base resolution 1920x1080, 16:9)
        this.worldW = 1920;
        this.worldH = 1080;
        this.worldAspect = this.worldW / this.worldH;

        const gameW = this.scale.width;
        const gameH = this.scale.height;

        // Physics world is the fixed arena world
        this.physics.world.setBounds(0, 0, this.worldW, this.worldH);

        // Two cameras:
        // - gameCam renders ONLY the arena world into a centered 16:9 viewport
        // - uiCam renders ONLY UI (sidebars + touch controls) in full screen space
        this.gameCam = this.cameras.main;
        this.uiCam = this.cameras.add(0, 0, gameW, gameH);
        this.uiCam.setScroll(0, 0);

        this.gameObjects = [];
        this.uiObjects = [];

        // Compute + apply initial layout
        this.layout = this.computeLayout(gameW, gameH);
        this.applyLayout(this.layout);

        // Ensure defeat/dying PNGs with black background become transparent
        this.makeDefeatTexturesTransparent();

        // Combo/book-attack state
        this.bookAttackInProgress = false;

        // Add background (level depends on opponent) inside fixed arena world
        const bgKey = this.opponentKey === 'madame' ? 'background2' : 'background';
        const bg = this.add.image(this.worldW / 2, this.worldH / 2, bgKey);
        const bgScale = Math.max(this.worldW / bg.width, this.worldH / bg.height);
        bg.setScale(bgScale);
        this.gameObjects.push(bg);

        // Ground line (invisible, for positioning)
        this.groundY = this.worldH - 200;

        // Gameplay bounds (used by Madame teleport/jump clamps)
        this.playArea = { xMin: 0, xMax: this.worldW, yMin: 0, yMax: this.worldH };

        // Create Player
        this.player = new Player(this, 400, this.groundY);
        this.gameObjects.push(this.player.sprite);

        // Create Enemy
        if (this.opponentKey === 'madame') {
            this.enemy = new MadameEnemy(this, this.worldW - 500, this.groundY);
        } else {
            this.enemy = new Enemy(this, this.worldW - 500, this.groundY);
        }
        this.gameObjects.push(this.enemy.sprite);

        // Ensure render order: player in front of enemy
        // (higher depth renders on top)
        this.enemy.sprite.setDepth(10);
        this.player.sprite.setDepth(20);

        // Health Bars
        this.createHealthBars();

        // Touch Controls (UI camera / sidebars)
        this.buildSidebarsAndControls(this.layout);

        // Collision detection
        this.physics.add.overlap(
            this.player.sprite,
            this.enemy.sprite,
            this.handleCombat,
            null,
            this
        );

        // Fade in
        this.cameras.main.fadeIn(500, 0, 0, 0);

        // Ensure each camera only renders its own layer (prevents double-render bugs)
        this.gameCam.ignore(this.uiObjects);
        this.uiCam.ignore(this.gameObjects);

        // Handle dynamic resizes (mobile browser bars/orientation changes)
        this.scale.on('resize', (gameSize) => {
            const newLayout = this.computeLayout(gameSize.width, gameSize.height);
            this.layout = newLayout;
            this.applyLayout(newLayout);
        });
    }

    computeLayout(gameW, gameH) {
        const aspect = this.worldAspect || (1920 / 1080);

        // Biggest 16:9 arena that fits the screen
        let arenaW, arenaH;
        if (gameW / gameH >= aspect) {
            arenaH = gameH;
            arenaW = Math.round(gameH * aspect);
        } else {
            arenaW = gameW;
            arenaH = Math.round(gameW / aspect);
        }

        // Only show sidebars when the device is wider than the arena (per spec).
        // If the screen is exactly 16:9, we keep the arena full-size (no artificial shrink).

        const arenaX = Math.floor((gameW - arenaW) / 2);
        const arenaY = Math.floor((gameH - arenaH) / 2);

        return {
            gameW,
            gameH,
            arenaX,
            arenaY,
            arenaW,
            arenaH,
            leftW: arenaX,
            rightW: gameW - (arenaX + arenaW)
        };
    }

    applyLayout(layout) {
        // Camera viewport + zoom for the arena world
        const zoom = layout.arenaW / this.worldW;
        this.gameCam.setViewport(layout.arenaX, layout.arenaY, layout.arenaW, layout.arenaH);
        this.gameCam.setZoom(zoom);
        this.gameCam.setScroll(0, 0);
        this.gameCam.setBounds(0, 0, this.worldW, this.worldH);

        this.uiCam.setViewport(0, 0, layout.gameW, layout.gameH);
        this.uiCam.setScroll(0, 0);
        this.uiCam.setZoom(1);

        // Rebuild UI to match new layout
        this.buildSidebarsAndControls(layout);

        // Re-apply ignore lists after UI rebuild
        this.gameCam.ignore(this.uiObjects);
        this.uiCam.ignore(this.gameObjects);
    }

    buildSidebarsAndControls(layout) {
        // Destroy old UI (sidebars + buttons)
        if (Array.isArray(this.uiObjects) && this.uiObjects.length) {
            for (const obj of this.uiObjects) obj?.destroy?.();
        }
        this.uiObjects = [];

        // Black sidebars when screen is wider than the arena
        if (layout.leftW > 0) {
            const leftPanel = this.add.rectangle(0, 0, layout.leftW, layout.gameH, 0x000000, 1).setOrigin(0);
            leftPanel.setDepth(1000);
            this.uiObjects.push(leftPanel);
        }
        if (layout.rightW > 0) {
            const rightPanel = this.add
                .rectangle(layout.arenaX + layout.arenaW, 0, layout.rightW, layout.gameH, 0x000000, 1)
                .setOrigin(0);
            rightPanel.setDepth(1000);
            this.uiObjects.push(rightPanel);
        }

        // Thin separators at arena edges (optional, helps visually)
        const sepL = this.add.rectangle(layout.arenaX - 2, 0, 4, layout.gameH, 0xffffff, 0.12).setOrigin(0);
        const sepR = this.add.rectangle(layout.arenaX + layout.arenaW - 2, 0, 4, layout.gameH, 0xffffff, 0.12).setOrigin(0);
        sepL.setDepth(1001);
        sepR.setDepth(1001);
        this.uiObjects.push(sepL, sepR);

        // Touch controls placed inside sidebars (never overlap arena)
        this.createTouchControls(layout);
    }

    spawnBookAttack(damage) {
        if (this.bookAttackInProgress) return;
        if (!this.enemy || this.enemy.hp <= 0) return;

        this.bookAttackInProgress = true;

        const targetX = this.enemy.sprite.x;
        const targetY = this.enemy.sprite.y - 250;

        const book = this.add.image(targetX, -200, 'book');
        book.setOrigin(0.5, 0.5);
        book.setDepth(50);
        book.setScale(0.9);
        // Ensure UI camera never renders gameplay objects (prevents double-render artifacts)
        this.gameObjects?.push?.(book);
        this.uiCam?.ignore?.([book]);

        // Drop + small spin for impact feel
        this.tweens.add({
            targets: book,
            y: targetY,
            angle: 12,
            duration: 520,
            ease: 'Quad.in',
            onComplete: () => {
                // Impact: damage equals kick damage (passed in)
                if (this.enemy && this.enemy.hp > 0) {
                    this.enemy.takeDamage(damage);
                }

                this.cameras.main.shake(140, 0.01);

                // Let the book "stay" for two short poses (2 frames/steps) before fading out
                book.setAngle(-6);
                book.setScale(0.95);
                this.time.delayedCall(120, () => {
                    book.setAngle(0);
                    book.setScale(0.9);
                });

                // Keep it on the ground briefly, then fade
                this.time.delayedCall(700, () => {
                    this.tweens.add({
                        targets: book,
                        alpha: 0,
                        duration: 160,
                        onComplete: () => {
                            book.destroy();
                            this.bookAttackInProgress = false;
                        }
                    });
                });
            }
        });
    }

    createHealthBars() {
        const width = this.worldW || 1920;
        const barWidth = 400;
        const barHeight = 40;
        const barY = 50;

        // Player HP (left side)
        const pLabel = this.add.text(50, barY - 30, 'SRI AUROBINDO', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });

        this.playerHpBg = this.add.rectangle(50, barY, barWidth, barHeight, 0x333333).setOrigin(0, 0);
        this.playerHpBar = this.add.rectangle(50, barY, barWidth, barHeight, 0x00ff00).setOrigin(0, 0);

        // Enemy HP (right side)
        const enemyLabel = this.opponentKey === 'madame' ? 'THE MADAME' : 'JCB';
        const eLabel = this.add.text(width - 450, barY - 30, enemyLabel, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });

        this.enemyHpBg = this.add.rectangle(width - 450, barY, barWidth, barHeight, 0x333333).setOrigin(0, 0);
        this.enemyHpBar = this.add.rectangle(width - 450, barY, barWidth, barHeight, 0xff0000).setOrigin(0, 0);

        // Health UI belongs to the arena (game camera)
        this.gameObjects?.push?.(pLabel, eLabel, this.playerHpBg, this.playerHpBar, this.enemyHpBg, this.enemyHpBar);
    }

    createTouchControls(layout) {
        // Controls are UI objects placed in sidebars (screen space)
        const gameW = layout?.gameW ?? this.scale.width;
        const gameH = layout?.gameH ?? this.scale.height;
        const leftW = layout?.leftW ?? 0;
        const rightW = layout?.rightW ?? 0;
        const arenaX = layout?.arenaX ?? 0;
        const arenaW = layout?.arenaW ?? gameW;

        const padding = 24;
        const safeBottom = 64;

        // If there is no room in the sidebars, don't place touch controls (keyboard still works on desktop).
        if (leftW < 140 || rightW < 140) {
            if (!this._mkNoSidebarHint) {
                const hint = this.add
                    .text(gameW / 2, gameH - 40, 'Hinweis: Touch-Buttons erscheinen nur, wenn links/rechts Platz ist (breiteres Querformat).', {
                        fontSize: '18px',
                        fontFamily: 'Arial',
                        color: '#ffffff'
                    })
                    .setOrigin(0.5)
                    .setDepth(1100);
                this._mkNoSidebarHint = hint;
                this.uiObjects.push(hint);
                this.gameCam?.ignore?.([hint]);
            }

            // Still bind keyboard once
            if (!this.cursors) {
                this.cursors = this.input.keyboard.createCursorKeys();
                this.keys = {
                    punch: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
                    kick: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
                    jump: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
                };
            }
            return;
        }

        // Use the available sidebar width to size controls
        const usableSidebar = Math.max(0, Math.min(leftW || 0, rightW || 0)) || Math.max(leftW, rightW) || 320;
        const radius = Math.max(60, Math.min(110, Math.floor(usableSidebar * 0.22)));
        const gap = Math.max(18, Math.floor(radius * 0.35));

        // Track touch movement so keyboard logic doesn't cancel it each frame
        this.touchMoveDirection = 0; // -1 left, +1 right, 0 none

        // If there are no sidebars, we still keep controls within the screen edges.
        const leftX0 = 0;
        const rightX0 = arenaX + arenaW;

        const baseY = gameH - safeBottom - padding - radius;

        // Movement Controls (Left sidebar)
        const leftBtnX = leftX0 + Math.min(leftW - padding - radius, padding + radius);
        const rightBtnX = leftX0 + Math.min(leftW - padding - radius, padding + radius + radius * 2 + gap);
        const jumpBtnX = leftX0 + Math.min(leftW - padding - radius, padding + radius + radius + Math.floor(gap / 2));
        const jumpBtnY = baseY - (radius * 2 + gap);

        const leftBtn = this.createButton(leftBtnX, baseY, '◄', 0x444444, radius);
        const rightBtn = this.createButton(rightBtnX, baseY, '►', 0x444444, radius);
        const jumpBtn = this.createButton(jumpBtnX, jumpBtnY, '↑', 0x44aaff, radius);

        // Attack Controls (Right sidebar)
        const punchBtnX = rightX0 + Math.max(padding + radius, Math.floor(rightW * 0.35));
        const kickBtnX = rightX0 + Math.max(padding + radius, Math.floor(rightW * 0.70));
        const punchBtn = this.createButton(punchBtnX, baseY, 'P', 0xff4444, radius);
        const kickBtn = this.createButton(kickBtnX, baseY, 'K', 0xff8844, radius);
        // No special button in the new move set

        // These are UI objects (must not be rendered by the game camera)
        const labelObjs = [
            leftBtn._mkLabel,
            rightBtn._mkLabel,
            jumpBtn._mkLabel,
            punchBtn._mkLabel,
            kickBtn._mkLabel
        ].filter(Boolean);
        this.uiObjects.push(leftBtn, rightBtn, jumpBtn, punchBtn, kickBtn, ...labelObjs);

        // Button Events (mobile-safe: stop on up/out + global up)
        leftBtn.on('pointerdown', () => {
            this.touchMoveDirection = -1;
            this.player.moveLeft();
        });
        leftBtn.on('pointerup', () => {
            this.touchMoveDirection = 0;
            this.player.stopMove();
        });
        leftBtn.on('pointerout', () => {
            this.touchMoveDirection = 0;
            this.player.stopMove();
        });
        
        rightBtn.on('pointerdown', () => {
            this.touchMoveDirection = 1;
            this.player.moveRight();
        });
        rightBtn.on('pointerup', () => {
            this.touchMoveDirection = 0;
            this.player.stopMove();
        });
        rightBtn.on('pointerout', () => {
            this.touchMoveDirection = 0;
            this.player.stopMove();
        });

        // If finger releases anywhere, stop movement (prevents "stuck" or missed pointerup)
        if (!this._mkGlobalPointerUpBound) {
            this._mkGlobalPointerUpBound = true;
            this.input.on('pointerup', () => {
                this.touchMoveDirection = 0;
                this.player.stopMove();
            });
        }

        punchBtn.on('pointerdown', () => this.player.punch());
        kickBtn.on('pointerdown', () => this.player.kick());
        jumpBtn.on('pointerdown', () => this.player.jump?.());

        // Keyboard controls (for desktop testing) - bind once
        if (!this.cursors) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.keys = {
                punch: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
                kick: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
                jump: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
            };
        }
    }

    createButton(x, y, text, color, radius = 60) {
        const button = this.add.circle(x, y, radius, color, 0.6);
        button.setInteractive();
        button.setStrokeStyle(4, 0xffffff, 0.8);

        const label = this.add.text(x, y, text, {
            fontSize: radius >= 80 ? '56px' : '48px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Keep reference so callers can add the label to UI camera ignore-lists / cleanup
        button._mkLabel = label;

        button.on('pointerdown', () => {
            button.setScale(0.9);
            button.setAlpha(1);
        });

        button.on('pointerup', () => {
            button.setScale(1);
            button.setAlpha(0.6);
        });

        return button;
    }

    update() {
        // Update player
        if (this.player.hp > 0) {
            this.player.update();

            // Movement: Touch has priority. Keyboard only overrides when pressed.
            if (this.touchMoveDirection !== 0) {
                if (this.touchMoveDirection < 0) this.player.moveLeft();
                else this.player.moveRight();
            } else {
                // Keyboard controls (desktop)
                if (this.cursors.left.isDown) {
                    this.player.moveLeft();
                } else if (this.cursors.right.isDown) {
                    this.player.moveRight();
                } else {
                    this.player.stopMove();
                }
            }

            if (Phaser.Input.Keyboard.JustDown(this.keys.punch)) {
                this.player.punch();
            }
            if (Phaser.Input.Keyboard.JustDown(this.keys.kick)) {
                this.player.kick();
            }
            if (this.keys.jump && Phaser.Input.Keyboard.JustDown(this.keys.jump)) {
                this.player.jump?.();
            }
        }

        // Update enemy
        if (this.enemy.hp > 0) {
            this.enemy.update(this.player);
        }

        // Update health bars
        this.updateHealthBars();

        // Check win/lose conditions
        this.checkGameOver();
    }

    handleCombat(playerSprite, enemySprite) {
        // Combat handled in entity classes
    }

    updateHealthBars() {
        const barWidth = 400;
        this.playerHpBar.width = (this.player.hp / this.player.maxHp) * barWidth;
        this.enemyHpBar.width = (this.enemy.hp / this.enemy.maxHp) * barWidth;
    }

    checkGameOver() {
        if (this.gameOver) return;

        if (this.player.hp <= 0) {
            this.gameOver = true;
            // Let the defeat animation play before we overlay the screen
            this.time.delayedCall(650, () => {
                this.showGameOverScreen('DEFEAT');
            });
        } else if (this.enemy.hp <= 0) {
            this.gameOver = true;
            // Let the enemy dying animation play before we overlay the screen
            this.time.delayedCall(950, () => {
                // Trigger player celebration before showing text
                if (this.player?.celebrateVictory) this.player.celebrateVictory();
                // Show victory overlay + "touch to restart"
                this.showGameOverScreen('VICTORY!');
            });
        }
    }

    showGameOverScreen(result) {
        // Game over UI should cover the whole screen (including sidebars), so use canvas size
        const width = this.scale.width;
        const height = this.scale.height;

        // Dark overlay (disable for DEFEAT so the scene stays visible)
        const overlayAlpha = result === 'DEFEAT' ? 0 : 0.8;
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, overlayAlpha).setOrigin(0);

        // Result text
        const resultText = this.add.text(width / 2, height / 2 - 100, result, {
            fontSize: '128px',
            fontFamily: 'Arial',
            color: result === 'VICTORY!' ? '#00ff00' : '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Ensure this overlay is UI-only (not scaled by arena camera)
        overlay.setDepth(3000);
        resultText.setDepth(3001);
        this.uiObjects?.push?.(overlay, resultText);
        this.gameCam?.ignore?.([overlay, resultText]);

        if (result === 'VICTORY!') {
            // Two options after victory
            const playAgain = this.add.text(width / 2, height / 2 + 80, 'PLAY AGAIN', {
                fontSize: '56px',
                fontFamily: 'Arial',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            playAgain.setInteractive({ useHandCursor: true });

            const chooseOther = this.add.text(width / 2, height / 2 + 160, 'PLAY OTHER LEVEL', {
                fontSize: '40px',
                fontFamily: 'Arial',
                color: '#dddddd'
            }).setOrigin(0.5);
            chooseOther.setInteractive({ useHandCursor: true });

            playAgain.setDepth(3001);
            chooseOther.setDepth(3001);
            this.uiObjects?.push?.(playAgain, chooseOther);
            this.gameCam?.ignore?.([playAgain, chooseOther]);

            // Blink the primary option
            this.tweens.add({
                targets: playAgain,
                alpha: 0.3,
                duration: 800,
                yoyo: true,
                repeat: -1
            });

            playAgain.on('pointerdown', () => {
                this.scene.restart({ opponentKey: this.opponentKey });
                this.gameOver = false;
            });
            chooseOther.on('pointerdown', () => {
                this.scene.start('OpponentSelectScene');
                this.gameOver = false;
            });
        } else {
            // Restart text (defeat)
            const restartText = this.add.text(width / 2, height / 2 + 100, 'TOUCH TO RESTART', {
                fontSize: '48px',
                fontFamily: 'Arial',
                color: '#ffffff'
            }).setOrigin(0.5);
            restartText.setDepth(3001);
            this.uiObjects?.push?.(restartText);
            this.gameCam?.ignore?.([restartText]);

            // Blinking animation
            this.tweens.add({
                targets: restartText,
                alpha: 0.3,
                duration: 800,
                yoyo: true,
                repeat: -1
            });

            // Restart on touch
            this.input.once('pointerdown', () => {
                this.scene.restart({ opponentKey: this.opponentKey });
                this.gameOver = false;
            });
        }
    }
}

