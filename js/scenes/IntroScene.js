class IntroScene extends Phaser.Scene {
    constructor() {
        super({ key: 'IntroScene' });
    }

    preload() {
        // Load intro logo
        this.load.image('intro', 'assets/ui/Moral Kombat intro.png');
    }

    create() {
        const { width, height } = this.cameras.main;

        // Add intro logo centered
        const logo = this.add.image(width / 2, height / 2, 'intro');
        
        // Scale logo to fit screen
        const scaleX = width * 0.8 / logo.width;
        const scaleY = height * 0.8 / logo.height;
        const scale = Math.min(scaleX, scaleY);
        logo.setScale(scale);

        // Fade in effect
        logo.setAlpha(0);
        this.tweens.add({
            targets: logo,
            alpha: 1,
            duration: 1000,
            ease: 'Power2'
        });

        // Touch/Click to start
        const startText = this.add.text(width / 2, height - 100, 'TOUCH TO START', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Blinking text animation
        this.tweens.add({
            targets: startText,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        // Start game on touch/click
        this.input.on('pointerdown', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.time.delayedCall(500, () => {
                this.scene.start('OpponentSelectScene');
            });
        });
    }
}


