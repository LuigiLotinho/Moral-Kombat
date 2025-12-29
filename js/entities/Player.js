class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        this.hp = 200;
        this.maxHp = 200;
        this.damage = 10;
        this.isAttacking = false;
        this.isDead = false;
        this.isCelebrating = false;
        // Victory + end should be 50% smaller
        this.celebrationScaleFactor = 0.5;
        this.isCastingBook = false;
        // Book-Animation: 50% smaller
        this.bookScaleFactor = 0.5;
        // Hard lock controls after victory so no moves/attacks are possible
        this.controlsLocked = false;
        this.victoryX = null;
        this.victoryY = null;
        // Combo: Punch -> Punch -> Kick triggers a Book attack
        this.comboWindowMs = 1400;
        this.comboInputs = []; // [{ type: 'P'|'K', t: number }]
        // Input buffering so super-fast Punch->Kick still triggers
        this.pendingKick = false;
        // Jump
        this.isJumping = false;
        this.jumpHeight = 220;
        this.jumpDuration = 260;
        this.movementSpeed = 5;
        this.isMoving = false;
        this.moveDirection = 0; // -1 = left, 1 = right, 0 = stop

        // Create sprite (use first idle frame)
        this.sprite = scene.physics.add.sprite(x, y, 'monk_idle_1');
        this.sprite.setScale(2.0);
        this.baseScale = this.sprite.scaleX;
        // Anchor to feet and lift slightly so he stands higher in the frame
        this.sprite.setOrigin(0.5, 1);
        this.sprite.y = y - 30;
        this.groundSpriteY = this.sprite.y;
        this.sprite.setCollideWorldBounds(true);

        // Keep a constant *uniform* scale so frames never "stretch" due to different aspect ratios
        this.lockDisplaySize();
        // Keep size locked even while animations play (including after death when Player.update() isn't called)
        this.sprite.on('animationupdate', () => {
            this.lockDisplaySize();
            this.lockVictoryPosition();
        });

        // Create animations
        this.createAnimations();

        // Play idle animation
        this.sprite.play('monk_idle_anim');
    }

    lockDisplaySize() {
        if (!this.sprite) return;
        const celebrateFactor = this.isCelebrating ? this.celebrationScaleFactor : 1;
        const bookFactor = this.isCastingBook ? this.bookScaleFactor : 1;
        const factor = celebrateFactor * bookFactor;
        this.sprite.setScale(this.baseScale * factor);
    }

    jump() {
        if (this.controlsLocked) return;
        if (this.hp <= 0 || this.isDead || this.isCelebrating) return;
        if (this.isJumping) return;

        this.isJumping = true;
        this.isMoving = false;
        this.moveDirection = 0;

        // Make sure we always return to the same baseline
        this.groundSpriteY = this.groundSpriteY ?? this.sprite.y;
        this.sprite.setVelocity?.(0, 0);

        this.scene.tweens.add({
            targets: this.sprite,
            y: this.groundSpriteY - this.jumpHeight,
            duration: this.jumpDuration,
            ease: 'Quad.out',
            yoyo: true,
            hold: 40,
            onYoyo: () => {
                // fall back down
            },
            onComplete: () => {
                this.sprite.y = this.groundSpriteY;
                this.isJumping = false;
            }
        });
    }

    lockVictoryPosition() {
        if (!this.isCelebrating) return;
        if (this.victoryX == null || this.victoryY == null) return;
        this.sprite.x = this.victoryX;
        this.sprite.y = this.victoryY;
    }

    createAnimations() {
        const scene = this.scene;

        // Idle animation (4 frames)
        if (!scene.anims.exists('monk_idle_anim')) {
            scene.anims.create({
                key: 'monk_idle_anim',
                frames: [
                    { key: 'monk_idle_1' },
                    { key: 'monk_idle_2' },
                    { key: 'monk_idle_3' },
                    { key: 'monk_idle_4' }
                ],
                frameRate: 10,
                repeat: -1
            });
        }

        // Punch animation (6 frames)
        if (!scene.anims.exists('monk_punch_anim')) {
            scene.anims.create({
                key: 'monk_punch_anim',
                frames: [
                    { key: 'monk_punch_1' },
                    { key: 'monk_punch_2' },
                    { key: 'monk_punch_3' },
                    { key: 'monk_punch_4' },
                    { key: 'monk_punch_5' },
                    { key: 'monk_punch_6' }
                ],
                frameRate: 15,
                repeat: 0
            });
        }

        // Kick animation (5 frames)
        if (!scene.anims.exists('monk_kick_anim')) {
            scene.anims.create({
                key: 'monk_kick_anim',
                frames: [
                    { key: 'monk_kick_1' },
                    { key: 'monk_kick_2' },
                    { key: 'monk_kick_3' },
                    { key: 'monk_kick_4' },
                    { key: 'monk_kick_5' }
                ],
                frameRate: 15,
                repeat: 0
            });
        }

        // Hit animation (2 frames)
        if (!scene.anims.exists('monk_hit_anim')) {
            scene.anims.create({
                key: 'monk_hit_anim',
                frames: [
                    { key: 'monk_hit_1' },
                    { key: 'monk_hit_2' }
                ],
                frameRate: 12,
                repeat: 0
            });
        }

        // Defeat animation (4 frames) -> then switch to a static dead pose
        if (!scene.anims.exists('monk_dying_anim')) {
            scene.anims.create({
                key: 'monk_dying_anim',
                frames: [
                    { key: 'monk_dying_1' },
                    { key: 'monk_dying_2' },
                    { key: 'monk_dying_3' },
                    { key: 'monk_dying_4' }
                ],
                frameRate: 8,
                repeat: 0
            });
        }

        // Book-cast animation (frames may be missing; only include existing textures)
        if (!scene.anims.exists('monk_book_anim')) {
            const rawFrames = [];
            for (let i = 1; i <= 5; i++) {
                const key = `monk_book_${i}`;
                if (scene.textures.exists(key)) rawFrames.push(key);
            }
            if (rawFrames.length === 0) rawFrames.push('monk_idle_1');

            scene.anims.create({
                key: 'monk_book_anim',
                frames: rawFrames.map((key) => ({ key })),
                frameRate: 12,
                repeat: 0
            });
        }

        // Victory / celebration animation (frames may be missing; only include existing textures)
        if (!scene.anims.exists('monk_victory_anim')) {
            const rawFrames = [];
            // Skip the first 9 frames (use 10..36 only)
            for (let i = 10; i <= 36; i++) {
                const key = `monk_victory_${i}`;
                if (scene.textures.exists(key)) rawFrames.push(key);
            }
            // Fallback: if nothing loaded, reuse idle
            if (rawFrames.length === 0) rawFrames.push('monk_idle_1');

            const frames = rawFrames.map((key) => ({ key }));

            scene.anims.create({
                key: 'monk_victory_anim',
                frames,
                frameRate: 10,
                repeat: 0
            });
        }
    }

    registerComboInput(type) {
        const now = Date.now();
        this.comboInputs.push({ type, t: now });
        if (this.comboInputs.length > 3) this.comboInputs.shift();
        this.comboInputs = this.comboInputs.filter((e) => now - e.t <= this.comboWindowMs);
    }

    isBookComboReady() {
        if (this.comboInputs.length < 2) return false;
        const [a, b] = this.comboInputs.slice(-2);
        if (a.type !== 'P' || b.type !== 'K') return false;
        return b.t - a.t <= this.comboWindowMs;
    }

    performBookAttackCombo() {
        // consume combo so it doesn't retrigger
        this.comboInputs = [];

        // Damage: double kick damage
        const kickDamage = this.damage * 1.5;
        const bookDamage = kickDamage * 2;
        if (this.scene?.spawnBookAttack) this.scene.spawnBookAttack(bookDamage);

        // Monk arm movement during the book drop
        this.isCastingBook = true;
        this.sprite.play('monk_book_anim');
        // Prevent a 1-frame "pop" on the first frame before animationupdate fires
        this.lockDisplaySize();
        this.sprite.once('animationcomplete', () => {
            this.isCastingBook = false;
            this.isAttacking = false;
            if (this.hp > 0) this.sprite.play('monk_idle_anim');
        });
    }

    executeKickFromBuffer() {
        if (this.hp <= 0 || this.isDead || this.isCelebrating) return;
        if (this.isAttacking) return;

        const triggerBookCombo = this.isBookComboReady();
        this.isAttacking = true;

        if (triggerBookCombo) {
            this.performBookAttackCombo();
            return;
        }

        this.sprite.play('monk_kick_anim');

        this.sprite.once('animationcomplete', () => {
            this.isAttacking = false;
            if (this.hp > 0) {
                this.sprite.play('monk_idle_anim');
            }
        });

        // Normal kick damage (kicks do more damage)
        const kickDamage = this.damage * 1.5;
        this.checkAttackHit(kickDamage);
    }

    moveLeft() {
        if (this.controlsLocked) return;
        if (!this.isAttacking && this.hp > 0) {
            this.moveDirection = -1;
            this.isMoving = true;
            this.sprite.setFlipX(true);
        }
    }

    moveRight() {
        if (this.controlsLocked) return;
        if (!this.isAttacking && this.hp > 0) {
            this.moveDirection = 1;
            this.isMoving = true;
            this.sprite.setFlipX(false);
        }
    }

    stopMove() {
        if (this.controlsLocked) return;
        this.moveDirection = 0;
        this.isMoving = false;
    }

    punch() {
        if (this.controlsLocked) return;
        if (this.isAttacking || this.hp <= 0) return;
        this.registerComboInput('P');
        
        this.isAttacking = true;
        this.sprite.play('monk_punch_anim');
        
        this.sprite.once('animationcomplete', () => {
            this.isAttacking = false;
            // If user pressed Kick during Punch, execute it now (buffered)
            if (this.pendingKick && this.hp > 0 && !this.isDead) {
                this.pendingKick = false;
                this.executeKickFromBuffer();
                return;
            }
            if (this.hp > 0) this.sprite.play('monk_idle_anim');
        });

        // Check for hit
        this.checkAttackHit(this.damage);
    }

    kick() {
        if (this.controlsLocked) return;
        if (this.hp <= 0) return;
        // Buffer Kick if pressed during another animation (so fast Punch->Kick still works)
        if (this.isAttacking) {
            this.registerComboInput('K');
            this.pendingKick = true;
            return;
        }
        this.registerComboInput('K');
        const triggerBookCombo = this.isBookComboReady();
        
        this.isAttacking = true;
        // If combo is ready (Punch -> Kick), do the Book attack instead of a normal kick hit
        if (triggerBookCombo) {
            this.performBookAttackCombo();
            return;
        }

        this.sprite.play('monk_kick_anim');
        
        this.sprite.once('animationcomplete', () => {
            this.isAttacking = false;
            if (this.hp > 0) {
                this.sprite.play('monk_idle_anim');
            }
        });

        // Check for hit (kicks do more damage)
        const kickDamage = this.damage * 1.5;
        this.checkAttackHit(kickDamage);
    }

    // No special move in the new frame set (yet)

    checkAttackHit(damage) {
        const enemy = this.scene.enemy;
        const distance = Phaser.Math.Distance.Between(
            this.sprite.x,
            this.sprite.y,
            enemy.sprite.x,
            enemy.sprite.y
        );

        // Hit range check
        if (distance < 300) {
            enemy.takeDamage(damage);
        }
    }

    takeDamage(amount) {
        if (this.hp <= 0 || this.isDead) return;
        
        this.hp = Math.max(0, this.hp - amount);

        // Play hit anim if not attacking
        if (!this.isAttacking && this.hp > 0) {
            this.isAttacking = true;
            this.sprite.play('monk_hit_anim');
            this.sprite.once('animationcomplete', () => {
                this.isAttacking = false;
                if (this.hp > 0) this.sprite.play('monk_idle_anim');
            });
        }

        // Check if dead
        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.isAttacking = true; // Prevent further actions
        this.isMoving = false;
        this.moveDirection = 0;
        this.sprite.setVelocity?.(0, 0);

        // Play 4-frame dying animation, then stay on dead pose permanently
        this.lockDisplaySize();
        this.sprite.play('monk_dying_anim');
        this.sprite.once('animationcomplete', () => {
            this.sprite.setTexture('monk_defeat');
            this.lockDisplaySize();
        });
    }

    celebrateVictory() {
        if (this.hp <= 0 || this.isDead || this.isCelebrating) return;
        this.isCelebrating = true;
        this.controlsLocked = true;
        this.pendingKick = false;
        this.comboInputs = [];
        this.isAttacking = true;
        this.isMoving = false;
        this.moveDirection = 0;
        this.sprite.setVelocity?.(0, 0);
        // Freeze at the exact win position
        this.victoryX = this.sprite.x;
        this.victoryY = this.sprite.y;
        if (this.sprite.body) {
            this.sprite.body.setVelocity?.(0, 0);
            this.sprite.body.moves = false;
        }
        this.lockDisplaySize();
        this.lockVictoryPosition();

        // Play once, then hold on the meditation frame until the next game starts
        this.sprite.play('monk_victory_anim');
        this.sprite.once('animationcomplete', () => {
            // After victory, show end pose only
            this.sprite.anims?.stop?.();
            this.sprite.setTexture('monk_end');
            this.isAttacking = false;
            this.lockDisplaySize();
            this.lockVictoryPosition();
        });
    }

    update() {
        // Movement
        if (this.isMoving && !this.isAttacking && this.hp > 0 && !this.isDead && !this.isCelebrating) {
            this.sprite.x += this.moveDirection * this.movementSpeed;
            
            // Keep in bounds
            const { width } = this.scene.cameras.main;
            const xMin = this.scene.playArea?.xMin ?? 0;
            const xMax = this.scene.playArea?.xMax ?? width;
            this.sprite.x = Phaser.Math.Clamp(this.sprite.x, xMin + 80, xMax - 80);
        }

        // Play idle if not attacking and not dead
        if (!this.isAttacking && !this.isMoving && this.hp > 0 && !this.isDead && !this.isCelebrating) {
            if (this.sprite.anims.currentAnim?.key !== 'monk_idle_anim') {
                this.sprite.play('monk_idle_anim');
            }
        }

        // Ensure victory stays locked even after animation completes
        this.lockVictoryPosition();
    }
}

