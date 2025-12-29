// Moral Kombat - Main Configuration
// Mobile-optimized Fighting Game

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 1920,
        height: 1080,
        orientation: Phaser.Scale.LANDSCAPE
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [IntroScene, OpponentSelectScene, GameScene],
    backgroundColor: '#000000'
};

const game = new Phaser.Game(config);

// Prevent context menu on long press (mobile)
document.addEventListener('contextmenu', e => e.preventDefault());

// Prevent zoom on double tap (mobile)
let lastTouchEnd = 0;
document.addEventListener('touchend', function (event) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);



