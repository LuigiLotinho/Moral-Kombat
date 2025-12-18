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

        // Create sprite
        this.sprite = scene.physics.add.sprite(x, y, 'monk_idle');
        this.sprite.setScale(1.2); // Increased scale for better visibility
        this.sprite.setCollideWorldBounds(true);

        // Create animations
        this.createAnimations();

        // Play idle animation
        this.sprite.play('monk_idle_anim');
    }

    createAnimations() {
        const scene = this.scene;

        // Idle animation
        if (!scene.anims.exists('monk_idle_anim')) {
            scene.anims.create({
                key: 'monk_idle_anim',
                frames: scene.anims.generateFrameNumbers('monk_idle', { start: 0, end: 7 }),
                frameRate: 10,
                repeat: -1
            });
        }

        // Punch animation
        if (!scene.anims.exists('monk_punch_anim')) {
            scene.anims.create({
                key: 'monk_punch_anim',
                frames: scene.anims.generateFrameNumbers('monk_punch', { start: 0, end: 6 }),
                frameRate: 15,
                repeat: 0
            });
        }

        // Kick animation
        if (!scene.anims.exists('monk_kick_anim')) {
            scene.anims.create({
                key: 'monk_kick_anim',
                frames: scene.anims.generateFrameNumbers('monk_kick', { start: 0, end: 7 }),
                frameRate: 15,
                repeat: 0
            });
        }

        // Special attack animation (9 frames)
        if (!scene.anims.exists('monk_special_anim')) {
            scene.anims.create({
                key: 'monk_special_anim',
                frames: scene.anims.generateFrameNumbers('monk_special', { start: 0, end: 8 }),
                frameRate: 15,
                repeat: 0
            });
        }

        // Death animation
        if (!scene.anims.exists('monk_dead_anim')) {
            scene.anims.create({
                key: 'monk_dead_anim',
                frames: scene.anims.generateFrameNumbers('monk_dead', { start: 0, end: 3 }),
                frameRate: 8,
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

    special() {
        if (this.isAttacking || this.hp <= 0) return;
        
        this.isAttacking = true;
        this.sprite.play('monk_special_anim');
        
        this.sprite.once('animationcomplete', () => {
            this.isAttacking = false;
            if (this.hp > 0) {
                this.sprite.play('monk_idle_anim');
            }
        });

        // Check for hit (special does most damage)
        this.checkAttackHit(this.damage * 2);
    }

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

        // Flash effect
        this.scene.tweens.add({
            targets: this.sprite,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: 2
        });

        // Check if dead
        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.isAttacking = true; // Prevent further actions
        this.sprite.play('monk_dead_anim');
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

