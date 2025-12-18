class Enemy {
    constructor(scene, x, y) {
        this.scene = scene;
        this.hp = 150;
        this.maxHp = 150;

        // Create sprite
        this.sprite = scene.physics.add.sprite(x, y, 'bagger_idle');
        this.sprite.setScale(1.5); // Bigger excavator (as per GDD)
        this.sprite.setFlipX(false); // Face left towards player (changed to false)
        this.sprite.setCollideWorldBounds(true);

        // No attack animations for now (only idle asset kept)
    }

    update(player) {
        // No AI/attacks yet
        return;
    }

    takeDamage(amount) {
        if (this.hp <= 0) return;

        this.hp = Math.max(0, this.hp - amount);

        // Flash effect
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: 2
        });

        // Shake effect when hit
        this.scene.cameras.main.shake(100, 0.005);

        // Check if dead
        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        // Death animation (fade out and fall)
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            angle: 90,
            y: this.sprite.y + 100,
            duration: 1000,
            ease: 'Power2'
        });
    }
}

