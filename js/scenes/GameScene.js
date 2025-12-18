class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Background
        this.load.image('background', 'assets/backgrounds/matrimandir background.png');

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

        // Bagger (Enemy) - NEW idle + 12-frame attack
        this.load.image('bagger_idle', 'assets/fighters/bagger/idle/baggeridle.png');
        for (let i = 1; i <= 12; i++) {
            this.load.image(`bagger_attack_${i}`, `assets/fighters/bagger/attack/baggerhit${i}.png`);
        }
    }

    create() {
        const { width, height } = this.cameras.main;

        // Add background
        const bg = this.add.image(width / 2, height / 2, 'background');
        const bgScale = Math.max(width / bg.width, height / bg.height);
        bg.setScale(bgScale);

        // Ground line (invisible, for positioning)
        this.groundY = height - 200;

        // Create Player
        this.player = new Player(this, 400, this.groundY);

        // Create Enemy
        this.enemy = new Enemy(this, width - 500, this.groundY);

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
        this.add.text(width - 450, barY - 30, 'BAGGER', {
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
            this.showGameOverScreen('DEFEAT');
        } else if (this.enemy.hp <= 0) {
            this.gameOver = true;
            this.showGameOverScreen('VICTORY!');
        }
    }

    showGameOverScreen(result) {
        const { width, height } = this.cameras.main;

        // Dark overlay
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0);

        // Result text
        const resultText = this.add.text(width / 2, height / 2 - 100, result, {
            fontSize: '128px',
            fontFamily: 'Arial',
            color: result === 'VICTORY!' ? '#00ff00' : '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Restart text
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
            this.scene.restart();
            this.gameOver = false;
        });
    }
}

