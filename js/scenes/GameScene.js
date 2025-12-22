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
        const { width, height } = this.cameras.main;

        // Ensure defeat/dying PNGs with black background become transparent
        this.makeDefeatTexturesTransparent();

        // Combo/book-attack state
        this.bookAttackInProgress = false;

        // Add background (level depends on opponent)
        const bgKey = this.opponentKey === 'madame' ? 'background2' : 'background';
        const bg = this.add.image(width / 2, height / 2, bgKey);
        const bgScale = Math.max(width / bg.width, height / bg.height);
        bg.setScale(bgScale);

        // Ground line (invisible, for positioning)
        this.groundY = height - 200;

        // Create Player
        this.player = new Player(this, 400, this.groundY);

        // Create Enemy
        if (this.opponentKey === 'madame') {
            this.enemy = new MadameEnemy(this, width - 500, this.groundY);
        } else {
            this.enemy = new Enemy(this, width - 500, this.groundY);
        }

        // Ensure render order: player in front of enemy
        // (higher depth renders on top)
        this.enemy.sprite.setDepth(10);
        this.player.sprite.setDepth(20);

        // Health Bars
        this.createHealthBars();

        // Touch Controls
        this.createTouchControls();

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
        const { width } = this.cameras.main;
        const barWidth = 400;
        const barHeight = 40;
        const barY = 50;

        // Player HP (left side)
        this.add.text(50, barY - 30, 'SRI AUROBINDO', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });

        this.playerHpBg = this.add.rectangle(50, barY, barWidth, barHeight, 0x333333).setOrigin(0, 0);
        this.playerHpBar = this.add.rectangle(50, barY, barWidth, barHeight, 0x00ff00).setOrigin(0, 0);

        // Enemy HP (right side)
        const enemyLabel = this.opponentKey === 'madame' ? 'THE MADAME' : 'JCB';
        this.add.text(width - 450, barY - 30, enemyLabel, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });

        this.enemyHpBg = this.add.rectangle(width - 450, barY, barWidth, barHeight, 0x333333).setOrigin(0, 0);
        this.enemyHpBar = this.add.rectangle(width - 450, barY, barWidth, barHeight, 0xff0000).setOrigin(0, 0);
    }

    createTouchControls() {
        const { width, height } = this.cameras.main;
        const buttonSize = 200;
        const padding = 40;
        // Keep buttons reachable on phones (browser bar / safe-area)
        const safeBottom = 80;

        // Track touch movement so keyboard logic doesn't cancel it each frame
        this.touchMoveDirection = 0; // -1 left, +1 right, 0 none

        // Movement Controls (Left side)
        const leftBtn = this.createButton(padding + buttonSize, height - safeBottom - padding - buttonSize, '◄', 0x444444, buttonSize / 2);
        const rightBtn = this.createButton(padding + buttonSize * 2.5, height - safeBottom - padding - buttonSize, '►', 0x444444, buttonSize / 2);

        // Attack Controls (Right side)
        const punchBtn = this.createButton(width - padding - buttonSize * 2.5, height - safeBottom - padding - buttonSize, 'P', 0xff4444, buttonSize / 2);
        const kickBtn = this.createButton(width - padding - buttonSize, height - safeBottom - padding - buttonSize, 'K', 0xff8844, buttonSize / 2);
        // No special button in the new move set

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
        this.input.on('pointerup', () => {
            this.touchMoveDirection = 0;
            this.player.stopMove();
        });

        punchBtn.on('pointerdown', () => this.player.punch());
        kickBtn.on('pointerdown', () => this.player.kick());

        // Keyboard controls (for desktop testing)
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = {
            punch: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            kick: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S)
        };
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
        const { width, height } = this.cameras.main;

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

