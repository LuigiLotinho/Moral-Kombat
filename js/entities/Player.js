class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        this.hp = 100;
        this.maxHp = 100;
        this.damage = 10;
        this.isAttacking = false;
        this.isDead = false;
        this.isCelebrating = false;
        this.celebrationScaleFactor = 1.3;
        this.victoryX = null;
        this.victoryY = null;
        this.movementSpeed = 5;
        this.isMoving = false;
        this.moveDirection = 0; // -1 = left, 1 = right, 0 = stop

        // Create sprite (use first idle frame)
        this.sprite = scene.physics.add.sprite(x, y, 'monk_idle_1');
        this.sprite.setScale(2.0);
        // Anchor to feet and lift slightly so he stands higher in the frame
        this.sprite.setOrigin(0.5, 1);
        this.sprite.y = y - 30;
        this.sprite.setCollideWorldBounds(true);

        // Lock a constant display size so frames never "grow/shrink" due to different cropping
        this.baseDisplayWidth = this.sprite.displayWidth;
        this.baseDisplayHeight = this.sprite.displayHeight;
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
        const factor = this.isCelebrating ? this.celebrationScaleFactor : 1;
        this.sprite.setDisplaySize(this.baseDisplayWidth * factor, this.baseDisplayHeight * factor);
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

    moveLeft() {
        if (!this.isAttacking && this.hp > 0) {
            this.moveDirection = -1;
            this.isMoving = true;
            this.sprite.setFlipX(true);
        }
    }

    moveRight() {
        if (!this.isAttacking && this.hp > 0) {
            this.moveDirection = 1;
            this.isMoving = true;
            this.sprite.setFlipX(false);
        }
    }

    stopMove() {
        this.moveDirection = 0;
        this.isMoving = false;
    }

    punch() {
        if (this.isAttacking || this.hp <= 0) return;
        
        this.isAttacking = true;
        this.sprite.play('monk_punch_anim');
        
        this.sprite.once('animationcomplete', () => {
            this.isAttacking = false;
            if (this.hp > 0) {
                this.sprite.play('monk_idle_anim');
            }
        });

        // Check for hit
        this.checkAttackHit(this.damage);
    }

    kick() {
        if (this.isAttacking || this.hp <= 0) return;
        
        this.isAttacking = true;
        this.sprite.play('monk_kick_anim');
        
        this.sprite.once('animationcomplete', () => {
            this.isAttacking = false;
            if (this.hp > 0) {
                this.sprite.play('monk_idle_anim');
            }
        });

        // Check for hit (kicks do more damage)
        this.checkAttackHit(this.damage * 1.5);
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
            this.sprite.setTexture('monk_victory_36'); // meditation/end pose (new set)
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
            this.sprite.x = Phaser.Math.Clamp(this.sprite.x, 100, width - 100);
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

