class Enemy {
    constructor(scene, x, y) {
        this.scene = scene;
        this.hp = 300;
        this.maxHp = 300;
        this.damage = 15;
        this.isAttacking = false;
        this.isDead = false;
        this.deathX = null;
        this.deathY = null;
        this._postUpdateHandler = null;
        this.attackCooldown = 0;
        this.attackCooldownTime = 2200;

        // Create sprite
        this.sprite = scene.physics.add.sprite(x, y, 'bagger_idle');
        // Make excavator 2x bigger than before (was 1.5)
        this.sprite.setScale(3.0);
        this.sprite.setFlipX(true); // Default: face left toward player
        this.sprite.setOrigin(0.5, 1); // feet on ground
        this.sprite.y = y; // bottom anchored
        this.sprite.setCollideWorldBounds(true);

        // Lock a constant display size so frames never "grow/shrink" due to different cropping
        this.baseDisplayWidth = this.sprite.displayWidth;
        this.baseDisplayHeight = this.sprite.displayHeight;
        this.sprite.setDisplaySize(this.baseDisplayWidth, this.baseDisplayHeight);
        // Keep size locked even while animations play (including after death when Enemy.update() isn't called)
        this.sprite.on('animationupdate', () => {
            this.sprite.setDisplaySize(this.baseDisplayWidth, this.baseDisplayHeight);
            // Also lock position during dying/dead frames (prevents drift from differing frame crops)
            if (this.isDead && this.deathX !== null && this.deathY !== null) {
                this.sprite.x = this.deathX;
                this.sprite.y = this.deathY;
            }
        });

        // Hard-lock position/size every frame while dead (continues after the dying animation ends)
        this._postUpdateHandler = () => {
            if (!this.isDead) return;
            if (this.deathX !== null && this.deathY !== null) {
                this.sprite.x = this.deathX;
                this.sprite.y = this.deathY;
            }
            this.sprite.setDisplaySize(this.baseDisplayWidth, this.baseDisplayHeight);
        };
        scene.events.on('postupdate', this._postUpdateHandler);
        scene.events.once('shutdown', () => {
            if (this._postUpdateHandler) scene.events.off('postupdate', this._postUpdateHandler);
            this._postUpdateHandler = null;
        });

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

        if (!scene.anims.exists('bagger_dying_anim')) {
            scene.anims.create({
                key: 'bagger_dying_anim',
                frames: Array.from({ length: 8 }, (_, idx) => ({ key: `bagger_dying_${idx + 1}` })),
                frameRate: 10,
                repeat: 0
            });
        }

        // 3-frame looping defeat (burning wreck)
        if (!scene.anims.exists('bagger_defeat_loop_anim')) {
            scene.anims.create({
                key: 'bagger_defeat_loop_anim',
                frames: Array.from({ length: 3 }, (_, idx) => ({ key: `bagger_defeat_loop_${idx + 1}` })),
                frameRate: 6,
                repeat: -1
            });
        }
    }

    playIdle() {
        // Single-frame idle
        this.sprite.setTexture('bagger_idle');
        this.sprite.setDisplaySize(this.baseDisplayWidth, this.baseDisplayHeight);
    }

    update(player) {
        if (this.hp <= 0 || !this.canAttack || this.isDead) return;

        // Enforce constant size (prevents any per-frame drift)
        this.sprite.setDisplaySize(this.baseDisplayWidth, this.baseDisplayHeight);

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

        this.sprite.play('bagger_attack_anim');
        this.sprite.setDisplaySize(this.baseDisplayWidth, this.baseDisplayHeight);

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

        // Hit feedback: use tint instead of alpha so visibility never "sticks" to transparent
        // (alpha tweens can overlap and leave the sprite nearly invisible).
        this.sprite.setAlpha(1);
        this.scene.tweens.killTweensOf(this.sprite);
        this.sprite.setTintFill(0xffffff);
        this.scene.time.delayedCall(120, () => {
            // Only clear if sprite still exists in this scene
            if (this.sprite && this.sprite.active) this.sprite.clearTint();
        });

        // Shake effect when hit
        this.scene.cameras.main.shake(100, 0.005);

        // Check if dead
        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.isAttacking = true;
        this.canAttack = false;
        this.sprite.setAlpha(1);
        this.scene.tweens.killTweensOf(this.sprite);

        // Freeze at the exact death position
        this.deathX = this.sprite.x;
        this.deathY = this.sprite.y;
        if (this.sprite.body) {
            this.sprite.body.setVelocity?.(0, 0);
            this.sprite.body.moves = false;
            // Disable physics so nothing can ever nudge it after death
            this.sprite.body.enable = false;
        }
        this.sprite.setVelocity?.(0, 0);

        // Play 8-frame dying animation, then stay on dead pose permanently
        this.sprite.play('bagger_dying_anim');
        this.sprite.once('animationcomplete', () => {
            // After dying, loop the 3-frame defeat fire animation forever
            this.sprite.play('bagger_defeat_loop_anim');
            this.sprite.setDisplaySize(this.baseDisplayWidth, this.baseDisplayHeight);
            if (this.deathX !== null && this.deathY !== null) {
                this.sprite.x = this.deathX;
                this.sprite.y = this.deathY;
            }
        });
    }
}

