class MadameEnemy {
    constructor(scene, x, y) {
        this.scene = scene;
        this.hp = 280;
        this.maxHp = 280;
        this.damage = 14;
        this.isDead = false;
        this.isAttacking = false;
        this.isTakingHit = false;
        // Idle + hit scale factor
        this.idleHitScaleFactor = 1.15;
        this.attackCooldown = 0;
        this.attackCooldownTime = 1800;
        this.deathX = null;
        this.deathY = null;

        // Create sprite (use first idle frame)
        const spr = scene.physics.add.sprite(x, y, 'madame_idle_1');
        spr.setOrigin(0.5, 1);
        spr.y = y;
        spr.setCollideWorldBounds(true);
        // Match Monk size by matching displayed height (PNG source sizes can differ)
        const targetHeight = scene.player?.sprite?.displayHeight;
        if (targetHeight) {
            const scale = targetHeight / spr.height;
            spr.setScale(scale);
        } else {
            // Fallback if player isn't available for some reason
            spr.setScale(2.0);
        }
        this.sprite = spr;

        // Lock uniform scale so frames don't "grow/shrink"
        this.baseScale = spr.scaleX;
        this.sprite.on('animationupdate', () => {
            this.applyScaleForCurrentAnim();
            if (this.isDead && this.deathX !== null && this.deathY !== null) {
                this.sprite.x = this.deathX;
                this.sprite.y = this.deathY;
            }
        });

        this.createAnimations();
        this.playIdle();
    }

    applyScaleForCurrentAnim() {
        const key = this.sprite?.anims?.currentAnim?.key;
        const isIdle = key === 'madame_idle_anim';
        const isHit = key === 'madame_hit_anim';
        const factor = (isIdle || isHit) ? this.idleHitScaleFactor : 1;
        this.sprite.setScale(this.baseScale * factor);
    }

    createAnimations() {
        const scene = this.scene;

        if (!scene.anims.exists('madame_idle_anim')) {
            scene.anims.create({
                key: 'madame_idle_anim',
                frames: Array.from({ length: 4 }, (_, idx) => ({ key: `madame_idle_${idx + 1}` })),
                frameRate: 8,
                repeat: -1
            });
        }

        if (!scene.anims.exists('madame_hit_anim')) {
            scene.anims.create({
                key: 'madame_hit_anim',
                frames: Array.from({ length: 9 }, (_, idx) => ({ key: `madame_hit_${idx + 1}` })),
                frameRate: 12,
                repeat: 0
            });
        }

        if (!scene.anims.exists('madame_defeat_anim')) {
            scene.anims.create({
                key: 'madame_defeat_anim',
                frames: Array.from({ length: 5 }, (_, idx) => ({ key: `madame_defeat_${idx + 1}` })),
                frameRate: 10,
                repeat: 0
            });
        }
    }

    playIdle() {
        if (this.isDead) return;
        this.sprite.play('madame_idle_anim');
        this.applyScaleForCurrentAnim();
    }

    playEndPose() {
        this.sprite.anims?.stop?.();
        this.sprite.setTexture('madame_end');
        this.sprite.setScale(this.baseScale);
    }

    lockDeathPosition() {
        if (this.deathX == null || this.deathY == null) return;
        this.sprite.x = this.deathX;
        this.sprite.y = this.deathY;
    }

    update(player) {
        if (this.isDead) return;
        if (!player || player.hp <= 0) return;

        // keep consistent scale depending on the current animation
        this.applyScaleForCurrentAnim();

        if (this.attackCooldown > 0) {
            this.attackCooldown -= this.scene.game.loop.delta;
        }

        if (this.isAttacking || this.isTakingHit) return;

        const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.sprite.x, player.sprite.y);
        if (distance > 420) {
            const dir = this.sprite.x > player.sprite.x ? -1 : 1;
            this.sprite.x += dir * 1.8;
            if (this.sprite.anims.currentAnim?.key !== 'madame_idle_anim') this.playIdle();
        } else if (this.attackCooldown <= 0) {
            this.attack(player);
        }
    }

    attack(player) {
        if (this.isDead || this.isAttacking) return;
        this.isAttacking = true;
        this.attackCooldown = this.attackCooldownTime;

        // Placeholder attack until punch animation arrives: small lunge
        const startX = this.sprite.x;
        const dir = this.sprite.x > player.sprite.x ? -1 : 1;
        this.scene.tweens.add({
            targets: this.sprite,
            x: startX + dir * 35,
            duration: 140,
            yoyo: true,
            onComplete: () => {
                this.isAttacking = false;
                this.playIdle();
            }
        });

        this.scene.time.delayedCall(180, () => {
            if (player && player.hp > 0) player.takeDamage(this.damage);
        });
    }

    takeDamage(amount) {
        if (this.isDead) return;
        this.hp = Math.max(0, this.hp - amount);

        // Play hit animation (interrupt idle/attack visuals but not movement)
        if (this.hp > 0) {
            this.isTakingHit = true;
            this.sprite.play('madame_hit_anim');
            this.applyScaleForCurrentAnim();
            this.sprite.once('animationcomplete', () => {
                this.isTakingHit = false;
                this.playIdle();
            });
        }

        // Shake camera slightly
        this.scene.cameras.main.shake(90, 0.004);

        if (this.hp <= 0) this.die();
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.isAttacking = true;
        this.isTakingHit = false;

        // Freeze at death position
        this.deathX = this.sprite.x;
        this.deathY = this.sprite.y;
        if (this.sprite.body) {
            this.sprite.body.setVelocity?.(0, 0);
            this.sprite.body.moves = false;
            this.sprite.body.enable = false;
        }

        this.sprite.play('madame_defeat_anim');
        this.applyScaleForCurrentAnim();
        this.sprite.once('animationcomplete', () => {
            this.playEndPose();
            this.lockDeathPosition();
        });
    }
}


