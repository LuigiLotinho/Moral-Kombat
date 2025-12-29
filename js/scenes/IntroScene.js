class IntroScene extends Phaser.Scene {
    constructor() {
        super({ key: 'IntroScene' });
    }

    preload() {
        // Load intro logo
        this.load.image('intro', 'assets/ui/Moral Kombat intro.png');
        // Load intro audio (played during loading after user taps START)
        this.load.audio('intro_music', 'intro.mp3');
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
        const startText = this.add.text(width / 2, height - 110, 'START', {
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

        // Loading UI (hidden until START)
        const loadingText = this.add
            .text(width / 2, height - 110, 'LOADING…', {
                fontSize: '32px',
                fontFamily: 'Arial',
                color: '#ffffff'
            })
            .setOrigin(0.5)
            .setVisible(false);

        const barW = Math.min(900, Math.round(width * 0.7));
        const barH = 18;
        const barX = Math.round((width - barW) / 2);
        const barY = Math.round(height - 70);

        const barBg = this.add.rectangle(barX, barY, barW, barH, 0x222222).setOrigin(0, 0).setVisible(false);
        const barFill = this.add.rectangle(barX, barY, 0, barH, 0x00ffff).setOrigin(0, 0).setVisible(false);

        const percentText = this.add
            .text(width / 2, barY - 18, '0%', {
                fontSize: '20px',
                fontFamily: 'Arial',
                color: '#dddddd'
            })
            .setOrigin(0.5)
            .setVisible(false);

        const startLoading = () => {
            // Prevent double-start
            this.input.off('pointerdown', startLoading);
            startText.setVisible(false);
            loadingText.setVisible(true);
            barBg.setVisible(true);
            barFill.setVisible(true);
            percentText.setVisible(true);

            // Start intro music on user gesture (mobile-safe)
            if (!this.introMusic) {
                this.introMusic = this.sound.add('intro_music', { loop: true, volume: 0.7 });
            }
            if (!this.introMusic.isPlaying) this.introMusic.play();

            // Queue game assets here so the intro image stays visible while loading
            this.queueGameAssetsIfNeeded();

            this.load.on('progress', (p) => {
                barFill.width = Math.floor(barW * p);
                percentText.setText(`${Math.round(p * 100)}%`);
            });

            this.load.once('complete', () => {
                // Fade out music quickly, then move on
                if (this.introMusic) {
                    this.tweens.add({
                        targets: this.introMusic,
                        volume: 0,
                        duration: 300,
                        onComplete: () => {
                            this.introMusic.stop();
                            this.introMusic.setVolume(0.7);
                        }
                    });
                }

                this.cameras.main.fadeOut(250, 0, 0, 0);
                this.time.delayedCall(250, () => this.scene.start('OpponentSelectScene'));
            });

            // Start the loader (we are in create(), so we need to start manually)
            this.load.start();
        };

        // Start loading on touch/click (keep intro visible while loading)
        this.input.on('pointerdown', startLoading);
    }

    queueGameAssetsIfNeeded() {
        // Backgrounds
        if (!this.textures.exists('background')) this.load.image('background', 'assets/backgrounds/matrimandir background.png');
        if (!this.textures.exists('background2')) this.load.image('background2', 'assets/backgrounds/background 2.png');

        // Opponent select previews
        if (!this.textures.exists('bagger_idle')) this.load.image('bagger_idle', 'assets/fighters/bagger/idle/baggeridle.png');
        if (!this.textures.exists('madame_portrait')) this.load.image('madame_portrait', 'assets/fighters/madame/madame_portrait.png');

        // Monk frames
        for (let i = 1; i <= 4; i++) {
            const k = `monk_idle_${i}`;
            if (!this.textures.exists(k)) this.load.image(k, `assets/fighters/monk/idle/idel${i}.png`);
        }
        for (let i = 1; i <= 6; i++) {
            const k = `monk_punch_${i}`;
            if (!this.textures.exists(k)) this.load.image(k, `assets/fighters/monk/punch/punch${i}.png`);
        }
        for (let i = 1; i <= 5; i++) {
            const k = `monk_kick_${i}`;
            if (!this.textures.exists(k)) this.load.image(k, `assets/fighters/monk/kick/kick${i}.png`);
        }
        for (let i = 1; i <= 2; i++) {
            const k = `monk_hit_${i}`;
            if (!this.textures.exists(k)) this.load.image(k, `assets/fighters/monk/hit/hit${i}.png`);
        }
        for (let i = 1; i <= 4; i++) {
            const k = `monk_dying_${i}`;
            if (!this.textures.exists(k)) this.load.image(k, `assets/fighters/monk/defeat/monkdying${i}.png`);
        }
        if (!this.textures.exists('monk_defeat')) this.load.image('monk_defeat', 'assets/fighters/monk/defeat/monkdefeat.png');
        if (!this.textures.exists('monk_end')) this.load.image('monk_end', 'assets/fighters/monk/end/monkend.png');
        for (let i = 1; i <= 36; i++) {
            const k = `monk_victory_${i}`;
            if (!this.textures.exists(k)) this.load.image(k, `assets/fighters/monk/victory/monkwin${i}.png`);
        }

        // Book attack assets
        if (!this.textures.exists('book')) this.load.image('book', 'assets/attacks/book/book.png');
        for (let i = 1; i <= 5; i++) {
            const k = `monk_book_${i}`;
            if (!this.textures.exists(k)) this.load.image(k, `assets/fighters/monk/book/monkbook${i}.png`);
        }

        // Bagger frames
        for (let i = 1; i <= 12; i++) {
            const k = `bagger_attack_${i}`;
            if (!this.textures.exists(k)) this.load.image(k, `assets/fighters/bagger/attack/baggerhit${i}.png`);
        }
        for (let i = 1; i <= 8; i++) {
            const k = `bagger_dying_${i}`;
            if (!this.textures.exists(k)) this.load.image(k, `assets/fighters/bagger/defeat/baggerdying${i}.png`);
        }
        if (!this.textures.exists('bagger_defeat')) this.load.image('bagger_defeat', 'assets/fighters/bagger/defeat/baggerdefeat.png');
        for (let i = 1; i <= 3; i++) {
            const k = `bagger_defeat_loop_${i}`;
            if (!this.textures.exists(k)) this.load.image(k, `assets/fighters/bagger/defeat/baggerdefeat${i}.png`);
        }

        // Madame frames
        for (let i = 1; i <= 4; i++) {
            const k = `madame_idle_${i}`;
            if (!this.textures.exists(k)) this.load.image(k, `assets/fighters/madame/idle/idle${i}.png`);
        }
        for (let i = 1; i <= 9; i++) {
            const k = `madame_hit_${i}`;
            if (!this.textures.exists(k)) this.load.image(k, `assets/fighters/madame/hit/hit${i}.png`);
        }
        for (let i = 1; i <= 5; i++) {
            const k = `madame_defeat_${i}`;
            if (!this.textures.exists(k)) this.load.image(k, `assets/fighters/madame/defeat/defeat${i}.png`);
        }
        if (!this.textures.exists('madame_end')) this.load.image('madame_end', 'assets/fighters/madame/end/end.png');
    }
}



