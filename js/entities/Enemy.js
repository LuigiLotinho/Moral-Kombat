class Enemy {
    constructor(scene, x, y) {
        this.scene = scene;
        this.hp = 150;
        this.maxHp = 150;
        this.damage = 15;
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.attackCooldownTime = 2000; // 2 seconds between attacks

        // Create sprite
        this.sprite = scene.physics.add.sprite(x, y, 'bagger_idle');
        this.sprite.setScale(1.5); // Bigger excavator (as per GDD)
        this.sprite.setFlipX(false); // Face left towards player (changed to false)
        this.sprite.setCollideWorldBounds(true);

        // Create animations
        this.createAnimations();

        // Play idle animation
        this.sprite.play('bagger_idle_anim');

        // AI settings
        this.aiState = 'idle';
        this.attackRange = 500; // Increased attack range
        this.moveSpeed = 3; // Slow movement (as per GDD)
        
        // Start attacking after a short delay
        scene.time.delayedCall(1000, () => {
            this.canAttack = true;
        });
    }

    createAnimations() {
        const scene = this.scene;

        // Idle animation (single frame)
        if (!scene.anims.exists('bagger_idle_anim')) {
            scene.anims.create({
                key: 'bagger_idle_anim',
                frames: [{ key: 'bagger_idle', frame: 0 }],
                frameRate: 1,
                repeat: -1
            });
        }

        // Attack animation (12 frames in 4x3 grid)
        if (!scene.anims.exists('bagger_attack_anim')) {
            scene.anims.create({
                key: 'bagger_attack_anim',
                frames: scene.anims.generateFrameNumbers('bagger_attack', { start: 0, end: 11 }),
                frameRate: 8, // Slower = more visible (was 12)
                repeat: 0
            });
        }
    }

    update(player) {
        if (this.hp <= 0 || !this.canAttack) return;

        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= this.scene.game.loop.delta;
        }

        // Simple AI behavior
        const distance = Phaser.Math.Distance.Between(
            this.sprite.x,
            this.sprite.y,
            player.sprite.x,
            player.sprite.y
        );

        if (!this.isAttacking) {
            if (distance > this.attackRange) {
                // Move towards player
                this.aiState = 'moving';
                if (this.sprite.x > player.sprite.x) {
                    this.sprite.x -= this.moveSpeed;
                } else {
                    this.sprite.x += this.moveSpeed;
                }
            } else if (this.attackCooldown <= 0) {
                // Attack if in range and cooldown is ready
                this.attack(player);
            } else {
                // Idle
                this.aiState = 'idle';
            }
        }
    }

    attack(player) {
        if (this.isAttacking || this.hp <= 0) return;

        this.isAttacking = true;
        this.attackCooldown = this.attackCooldownTime;
        
        // Increase scale for attack animation (frames are 4x smaller than idle)
        this.sprite.setScale(6); // 1.5 * 4 = 6 to match idle size
        this.sprite.play('bagger_attack_anim');

        // Deal damage at the right frame (frame 6-8 of the swing)
        this.scene.time.delayedCall(750, () => {
            const distance = Phaser.Math.Distance.Between(
                this.sprite.x,
                this.sprite.y,
                player.sprite.x,
                player.sprite.y
            );

            if (distance < this.attackRange) {
                player.takeDamage(this.damage);
            }
        });

        this.sprite.once('animationcomplete', () => {
            this.isAttacking = false;
            if (this.hp > 0) {
                // Reset scale back to normal for idle
                this.sprite.setScale(1.5);
                this.sprite.play('bagger_idle_anim');
            }
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
        this.isAttacking = true; // Prevent further actions
        
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

