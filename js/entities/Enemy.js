class Enemy {
    constructor(scene, x, y) {
        this.scene = scene;
        this.hp = 150;
        this.maxHp = 150;
        this.damage = 15;
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.attackCooldownTime = 2200;

        // Create sprite
        this.sprite = scene.physics.add.sprite(x, y, 'bagger_idle');
        this.sprite.setScale(1.5); // Bigger excavator (as per GDD)
        this.sprite.setFlipX(true); // Default: face left toward player
        this.sprite.setOrigin(0.5, 1); // feet on ground
        this.sprite.y = y; // bottom anchored
        this.sprite.setCollideWorldBounds(true);

        this.createAnimations();
        this.playIdle();

        // AI settings
        this.attackRange = 520;
        this.moveSpeed = 2.5; // slow
        this.canAttack = false;
        scene.time.delayedCall(800, () => (this.canAttack = true));
    }

    createAnimations() {
        const scene = this.scene;

        if (!scene.anims.exists('bagger_attack_anim')) {
            scene.anims.create({
                key: 'bagger_attack_anim',
                frames: Array.from({ length: 12 }, (_, idx) => ({ key: `bagger_attack_${idx + 1}` })),
                frameRate: 10,
                repeat: 0
            });
        }
    }

    playIdle() {
        // Single-frame idle
        this.sprite.setTexture('bagger_idle');
    }

    update(player) {
        if (this.hp <= 0 || !this.canAttack) return;

        // cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= this.scene.game.loop.delta;
        }

        // face player
        const faceLeft = this.sprite.x > player.sprite.x;
        this.sprite.setFlipX(!faceLeft); // if player on left, face left; our asset likely faces right

        const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.sprite.x, player.sprite.y);

        if (this.isAttacking) return;

        if (distance > this.attackRange) {
            // move slowly toward player
            if (this.sprite.x > player.sprite.x) this.sprite.x -= this.moveSpeed;
            else this.sprite.x += this.moveSpeed;
        } else if (this.attackCooldown <= 0) {
            this.attack(player);
        }
    }

    attack(player) {
        if (this.isAttacking || this.hp <= 0) return;

        this.isAttacking = true;
        this.attackCooldown = this.attackCooldownTime;

        // Keep a constant display size so frames don't "pop" if cropped differently
        const targetW = this.sprite.displayWidth;
        const targetH = this.sprite.displayHeight;

        this.sprite.play('bagger_attack_anim');
        this.sprite.setDisplaySize(targetW, targetH);

        // Damage roughly mid-swing
        this.scene.time.delayedCall(600, () => {
            const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.sprite.x, player.sprite.y);
            if (distance <= this.attackRange) player.takeDamage(this.damage);
        });

        this.sprite.once('animationcomplete', () => {
            this.isAttacking = false;
            this.playIdle();
        });
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

