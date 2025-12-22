class OpponentSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'OpponentSelectScene' });
    }

    preload() {
        // Reuse the same background so it feels like a "level select" screen
        this.load.image('background', 'assets/backgrounds/matrimandir background.png');

        // Opponent preview (Bagger)
        this.load.image('bagger_idle', 'assets/fighters/bagger/idle/baggeridle.png');

        // Opponent preview (Madame)
        this.load.image('madame_portrait', 'assets/fighters/madame/madame_portrait.png');
    }

    create() {
        const { width, height } = this.cameras.main;

        // Background
        const bg = this.add.image(width / 2, height / 2, 'background');
        const bgScale = Math.max(width / bg.width, height / bg.height);
        bg.setScale(bgScale);

        // Title
        this.add.text(width / 2, 110, 'CHOOSE YOUR OPPONENT', {
            fontSize: '72px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Helper
        this.add.text(width / 2, 190, 'Tap an opponent to start', {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#dddddd'
        }).setOrigin(0.5);

        const cardW = 520;
        const cardH = 520;
        const gap = 120;
        const y = height / 2 + 40;

        // Bagger card
        this.createOpponentCard({
            x: width / 2 - (cardW / 2 + gap / 2),
            y,
            w: cardW,
            h: cardH,
            name: 'JCB',
            previewKey: 'bagger_idle',
            onPick: () => this.startFight('bagger')
        });

        // Madame card (placeholder visual until assets exist)
        this.createOpponentCard({
            x: width / 2 + (cardW / 2 + gap / 2),
            y,
            w: cardW,
            h: cardH,
            name: 'THE MADAME',
            previewKey: 'madame_portrait',
            onPick: () => this.startFight('madame')
        });

        // Back hint
        const back = this.add.text(70, height - 60, 'Back: ESC', {
            fontSize: '26px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0, 0.5);

        const esc = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        if (esc) {
            esc.on('down', () => this.scene.start('IntroScene'));
        }
    }

    createOpponentCard({ x, y, w, h, name, previewKey, onPick }) {
        const container = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, w, h, 0x000000, 0.6).setOrigin(0.5);
        bg.setStrokeStyle(6, 0xffffff, 0.6);
        bg.setInteractive({ useHandCursor: true });

        const title = this.add.text(0, h / 2 - 70, name, {
            fontSize: '40px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5);

        let previewObj = null;
        if (previewKey) {
            previewObj = this.add.image(0, -30, previewKey).setOrigin(0.5, 0.5);
            // Fit inside card
            const maxW = w * 0.75;
            const maxH = h * 0.55;
            const s = Math.min(maxW / previewObj.width, maxH / previewObj.height);
            previewObj.setScale(s);
        } else {
            previewObj = this.add.text(0, -20, '?', {
                fontSize: '220px',
                fontFamily: 'Arial',
                color: '#ffffff'
            }).setOrigin(0.5);
        }

        const cta = this.add.text(0, h / 2 - 20, 'TAP TO FIGHT', {
            fontSize: '26px',
            fontFamily: 'Arial',
            color: '#dddddd'
        }).setOrigin(0.5);

        container.add([bg, previewObj, title, cta]);

        const hoverOn = () => bg.setStrokeStyle(8, 0x00ffff, 0.9);
        const hoverOff = () => bg.setStrokeStyle(6, 0xffffff, 0.6);

        bg.on('pointerover', hoverOn);
        bg.on('pointerout', hoverOff);
        bg.on('pointerdown', () => {
            this.cameras.main.flash(150, 0, 255, 255);
            onPick();
        });

        return container;
    }

    startFight(opponentKey) {
        this.cameras.main.fadeOut(250, 0, 0, 0);
        this.time.delayedCall(250, () => {
            this.scene.start('GameScene', { opponentKey });
        });
    }
}


