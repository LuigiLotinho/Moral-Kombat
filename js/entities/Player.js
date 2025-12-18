class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        this.hp = 100;
        this.maxHp = 100;
        this.damage = 10;
        this.isAttacking = false;
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

        // Create animations
        this.createAnimations();

        // Play idle animation
        this.sprite.play('monk_idle_anim');
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
        if (this.hp <= 0) return;
        
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
        this.isAttacking = true; // Prevent further actions
        // No death animation yet in new set: just fade out
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0,
            duration: 800,
            ease: 'Power2'
        });
    }

    update() {
        // Movement
        if (this.isMoving && !this.isAttacking && this.hp > 0) {
            this.sprite.x += this.moveDirection * this.movementSpeed;
            
            // Keep in bounds
            const { width } = this.scene.cameras.main;
            this.sprite.x = Phaser.Math.Clamp(this.sprite.x, 100, width - 100);
        }

        // Play idle if not attacking and not dead
        if (!this.isAttacking && !this.isMoving && this.hp > 0) {
            if (this.sprite.anims.currentAnim?.key !== 'monk_idle_anim') {
                this.sprite.play('monk_idle_anim');
            }
        }
    }
}

