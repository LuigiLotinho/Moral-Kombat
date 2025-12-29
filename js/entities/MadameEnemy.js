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
        // Jump
        this.isJumping = false;
        this.jumpHeight = 180;
        this.jumpDuration = 240;
        this.groundSpriteY = null;
        // Teleport
        this.isTeleporting = false;
        // Teleport behavior: every 5s, vanish for 2s, reappear elsewhere
        this.teleportVanishMs = 2000;
        this.teleportFadeMs = 160;
        this.teleportIntervalMs = 5000;
        this.nextTeleportAt = scene.time.now + this.teleportIntervalMs;
        // Jump behavior: happens regularly so it’s visible
        this.nextJumpAt = scene.time.now + Phaser.Math.Between(1800, 3200);

        // Create sprite (use first idle frame)
        const spr = scene.physics.add.sprite(x, y, 'madame_idle_1');
        spr.setOrigin(0.5, 1);
        spr.y = y;
        spr.setCollideWorldBounds(true);
        this.groundSpriteY = spr.y;
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

    getPlayBounds() {
        const { width, height } = this.scene.cameras.main;
        const xMin = this.scene.playArea?.xMin ?? 0;
        const xMax = this.scene.playArea?.xMax ?? width;
        const yMin = this.scene.playArea?.yMin ?? 0;
        const yMax = this.scene.playArea?.yMax ?? height;
        return { xMin, xMax, yMin, yMax };
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

    jump() {
        if (this.isDead) return;
        if (this.isTeleporting || this.isTakingHit || this.isAttacking) return;
        if (this.isJumping) return;

        this.isJumping = true;
        this.groundSpriteY = this.groundSpriteY ?? this.sprite.y;
        this.sprite.setVelocity?.(0, 0);

        this.scene.tweens.add({
            targets: this.sprite,
            y: this.groundSpriteY - this.jumpHeight,
            duration: this.jumpDuration,
            ease: 'Quad.out',
            yoyo: true,
            hold: 30,
            onComplete: () => {
                this.sprite.y = this.groundSpriteY;
                this.isJumping = false;
                if (!this.isDead) this.playIdle();
            }
        });
    }

    teleport() {
        if (this.isDead) return;
        if (this.isTeleporting) return;
        // Teleport should be able to interrupt attacks/idle so it reliably happens.
        // We avoid teleporting while taking hit to keep feedback visible.
        if (this.isTakingHit) return;

        this.isTeleporting = true;
        this.isAttacking = false;
        this.isJumping = false;

        // Cancel any ongoing tweens on the sprite
        this.scene.tweens.killTweensOf(this.sprite);
        this.sprite.setVelocity?.(0, 0);

        // Disable physics while vanished
        if (this.sprite.body) this.sprite.body.enable = false;

        // Fade out quickly
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            duration: this.teleportFadeMs,
            ease: 'Quad.out',
            onComplete: () => {
                this.sprite.setVisible(false);

                // Show a small status text while she is vanished
                const { width, height } = this.scene.cameras.main;
                const xMin = this.scene.playArea?.xMin ?? 0;
                const xMax = this.scene.playArea?.xMax ?? width;
                const yMin = this.scene.playArea?.yMin ?? 0;
                const centerX = Math.round((xMin + xMax) / 2);
                const centerY = Math.round(yMin + (height - yMin) * 0.2);

                if (!this.teleportStatusText || !this.teleportStatusText.active) {
                    this.teleportStatusText = this.scene.add
                        .text(centerX, centerY, 'SHE DISAPEARED !', {
                            fontFamily: 'Arial',
                            fontSize: '40px',
                            color: '#ffffff',
                            fontStyle: 'bold',
                            stroke: '#000000',
                            strokeThickness: 4
                        })
                        .setOrigin(0.5)
                        .setDepth(2000);
                } else {
                    this.teleportStatusText.setText('SHE DISAPEARED !');
                    this.teleportStatusText.setPosition(centerX, centerY);
                    this.teleportStatusText.setDepth(2000);
                }
                this.teleportStatusText.setAlpha(1);
                this.teleportStatusText.setVisible(true);

                // Stay hidden for 2 seconds, then reappear somewhere else
                this.scene.time.delayedCall(this.teleportVanishMs, () => {
                    if (this.isDead) return;

                    const { xMin, xMax } = this.getPlayBounds();
                    const playerX = this.scene.player?.sprite?.x ?? (xMin + (xMax - xMin) / 2);

                    // Pick a new X inside play area, but not too close to player
                    let newX = Phaser.Math.Between(Math.floor(xMin + 120), Math.floor(xMax - 120));
                    let safety = 10;
                    while (Math.abs(newX - playerX) < 260 && safety-- > 0) {
                        newX = Phaser.Math.Between(Math.floor(xMin + 120), Math.floor(xMax - 120));
                    }

                    this.sprite.x = newX;
                    this.sprite.y = this.groundSpriteY ?? this.sprite.y;

                    // Re-enable & fade in
                    if (this.sprite.body) this.sprite.body.enable = true;
                    this.sprite.setVisible(true);
                    this.sprite.setAlpha(0);
                    this.applyScaleForCurrentAnim();

                    this.scene.tweens.add({
                        targets: this.sprite,
                        alpha: 1,
                        duration: this.teleportFadeMs,
                        ease: 'Quad.in',
                        onComplete: () => {
                            this.isTeleporting = false;
                            this.playIdle();
                            this.attackCooldown = Math.max(this.attackCooldown, 450); // small grace period
                            // Schedule next teleport strictly every 5 seconds
                            this.nextTeleportAt = this.scene.time.now + this.teleportIntervalMs;
                        }
                    });

                    // Hide the status text shortly after reappearing
                    if (this.teleportStatusText && this.teleportStatusText.active) {
                        this.scene.tweens.add({
                            targets: this.teleportStatusText,
                            alpha: 0,
                            duration: 200,
                            ease: 'Quad.out',
                            onComplete: () => {
                                if (this.teleportStatusText && this.teleportStatusText.active) {
                                    this.teleportStatusText.setVisible(false);
                                }
                            }
                        });
                    }
                });
            }
        });
    }

    update(player) {
        if (this.isDead) return;
        if (!player || player.hp <= 0) return;

        // keep consistent scale depending on the current animation
        this.applyScaleForCurrentAnim();

        // Teleport every 5 seconds, vanish for 2 seconds
        const now = this.scene.time.now;
        if (!this.isTeleporting && now >= this.nextTeleportAt) {
            this.teleport();
            return;
        }

        // Jump regularly (so it definitely happens)
        if (!this.isTeleporting && !this.isTakingHit && !this.isJumping && now >= this.nextJumpAt) {
            // Jump ~70% of the time when the timer triggers
            if (Math.random() < 0.7) this.jump();
            this.nextJumpAt = now + Phaser.Math.Between(1800, 3200);
        }

        if (this.attackCooldown > 0) {
            this.attackCooldown -= this.scene.game.loop.delta;
        }

        if (this.isAttacking || this.isTakingHit || this.isTeleporting || this.isJumping) return;

        const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, player.sprite.x, player.sprite.y);
        if (distance > 420) {
            const dir = this.sprite.x > player.sprite.x ? -1 : 1;
            this.sprite.x += dir * 1.8;
            if (this.sprite.anims.currentAnim?.key !== 'madame_idle_anim') this.playIdle();
        } else if (this.attackCooldown <= 0) {
            this.attack(player);
        }

        // Clamp to play area (background bounds) so she doesn't walk into UI sidebars
        const { xMin, xMax } = this.getPlayBounds();
        this.sprite.x = Phaser.Math.Clamp(this.sprite.x, xMin + 120, xMax - 120);
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

        // Flash effect (exactly like the excavator)
        // Use tint instead of alpha tween so visibility doesn't "stick" to transparent.
        this.sprite.setAlpha(1);
        this.scene.tweens.killTweensOf(this.sprite);
        this.sprite.setTintFill(0xffffff);
        this.scene.time.delayedCall(120, () => {
            if (this.sprite && this.sprite.active) this.sprite.clearTint();
        });

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


