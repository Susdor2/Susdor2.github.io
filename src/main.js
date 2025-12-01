// Full game.js - patched: foxes won't chase while rabbit is hidden
class MainScene extends Phaser.Scene {
    constructor() {
        super("MainScene");
    }

    preload() {
        // core assets (make sure these files exist at these paths)
        this.load.image("rabbit", "assets/rabbit.png");
        this.load.image("fox", "assets/fox.png");
        this.load.image("tree", "assets/tree.png");
        this.load.image("carrot", "assets/carrot.png");

        // load bushes 1..10 (fix: <=10)
        for (let i = 1; i <= 10; i++) {
            this.load.image("bush_" + i, "assets/foliage_pack/bush_" + i + ".png");
        }
    }

    create() {
        // ---------------- world + background ----------------
        this.worldWidth = 4000;
        this.worldHeight = 4000;
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.add.rectangle(this.worldWidth / 2, this.worldHeight / 2, this.worldWidth, this.worldHeight, 0x66cc66);

        // ---------------- spawn center (rabbit) ----------------
        this.rabbitStartX = Math.floor(this.worldWidth / 2);
        this.rabbitStartY = Math.floor(this.worldHeight / 2);

        // ---------------- TREE GENERATION (static group) ----------------
        const treeSpacing = 500;
        const treeScale = 0.5;       // visual scale
        const placementChance = 0.45;
        const clearRadius = 220;     // keep clear around rabbit start

        this.treeGroup = this.physics.add.staticGroup();

        // store positions for overlay drawing (if needed)
        var treePositions = [];

        for (let x = 300; x < this.worldWidth; x += treeSpacing) {
            for (let y = 300; y < this.worldHeight; y += treeSpacing) {
                const tx = x + Phaser.Math.Between(-100, 100);
                const ty = y + Phaser.Math.Between(-100, 100);

                if (Math.random() > placementChance) continue;

                const dToSpawn = Phaser.Math.Distance.Between(tx, ty, this.rabbitStartX, this.rabbitStartY);
                if (dToSpawn < clearRadius) continue;

                const tree = this.treeGroup.create(tx, ty, "tree");
                tree.setScale(treeScale).refreshBody();

                treePositions.push({ tx, ty });

                // --- TIGHTER HITBOX (shrink to trunk-like area) ---
                const bw = tree.displayWidth;
                const bh = tree.displayHeight;
                tree.body.setSize(bw * 0.35, bh * 0.45);
                tree.body.setOffset((tree.width * tree.scaleX - bw * 0.35) / 2, bh * 0.55);
            }
        }

        // ---------------- RABBIT (player) ----------------
        this.rabbit = this.physics.add.sprite(this.rabbitStartX, this.rabbitStartY, "rabbit")
            .setScale(0.12)
            .setCollideWorldBounds(true);

        this.physics.add.collider(this.rabbit, this.treeGroup);

        // ---------------- FOXES (group) ----------------
        this.foxGroup = this.physics.add.group();
        const foxCount = 6;
        for (let i = 0; i < foxCount; i++) {
            let fx = Phaser.Math.Between(200, this.worldWidth - 200);
            let fy = Phaser.Math.Between(200, this.worldHeight - 200);

            // avoid spawning too close to player start
            const dist = Phaser.Math.Distance.Between(fx, fy, this.rabbitStartX, this.rabbitStartY);
            if (dist < clearRadius + 100) {
                fx += (fx < this.rabbitStartX ? -clearRadius : clearRadius);
                fy += (fy < this.rabbitStartY ? -clearRadius : clearRadius);
            }

            let fox = this.foxGroup.create(fx, fy, "fox");
            fox.setScale(0.25);
            fox.setCollideWorldBounds(true);
            fox.isChasing = false;
            fox.randomX = Phaser.Math.Between(-200, 200);
            fox.randomY = Phaser.Math.Between(-200, 200);
        }
        this.physics.add.collider(this.foxGroup, this.treeGroup);

        // ---------------- CAMERA ----------------
        this.cameras.main.startFollow(this.rabbit, true, 0.08, 0.08);
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // ---------------- CONTROLS (keyboard) ----------------
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.isRunning = false

        // ---------------- FOX ROAM TIMER ----------------
        this.time.addEvent({
            delay: 1200,
            loop: true,
            callback: () => {
                this.foxGroup.children.iterate((fox) => {
                    if (!fox) return;
                    if (!fox.isChasing) {
                        fox.randomX = Phaser.Math.Between(-260, 260);
                        fox.randomY = Phaser.Math.Between(-260, 260);
                    } else {
                        fox.randomX = Phaser.Math.Between(-300, 300);
                        fox.randomY = Phaser.Math.Between(-300, 300);
                    }
                });
            }
        });

        // ---------------- CARROTS ----------------
        this.carrotGroup = this.physics.add.group();
        this.CARROT_COUNT = 10;
        this.spawnInitialCarrots();
        this.physics.add.overlap(this.rabbit, this.carrotGroup, (rabbit, carrot) => this.collectCarrot(carrot));

        // ----- tree overlay (draw extra tree images above sprites) -----
        for (let i = 0; i < treePositions.length; i++) {
            this.add.image(treePositions[i].tx, treePositions[i].ty, "tree").setScale(0.5);
        }

        // ---------------- BUSHES (static group) ----------------
        this.bushGroup = this.physics.add.staticGroup();
        const bushCount = 35;
        const bushPadding = 120;

        for (let i = 0; i < bushCount; i++) {
            let bx, by, valid;
            for (let attempt = 0; attempt < 80; attempt++) {
                bx = Phaser.Math.Between(100, this.worldWidth - 100);
                by = Phaser.Math.Between(100, this.worldHeight - 100);

                valid = true;
                // avoid trees
                this.treeGroup.children.iterate(tree => {
                    if (!valid) return;
                    if (Phaser.Math.Distance.Between(bx, by, tree.x, tree.y) < bushPadding) valid = false;
                });
                // avoid rabbit clear spawn area
                if (valid && Phaser.Math.Distance.Between(bx, by, this.rabbitStartX, this.rabbitStartY) < clearRadius) valid = false;

                if (valid) break;
            }
            // choose random bush texture among 1..10
            const bushKey = "bush_" + Phaser.Math.Between(1, 10);
            const bush = this.bushGroup.create(bx, by, bushKey);
            bush.setScale(0.5).refreshBody();
            bush.body.setSize(bush.displayWidth * 0.9, bush.displayHeight * 0.75);
            bush.body.setOffset(0, 0);
        }

        // ---------------- SCORE ----------------
        this.score = 0;
        this.scoreText = this.add.text(20, 20, "Carrots: 0", { fontSize: "28px", fill: "#fff" }).setScrollFactor(0);

        // rabbit collides with trees; bushes are for hiding (no physical blocking)
        this.physics.add.overlap(this.rabbit, this.bushGroup);

        // ---------------- HIDE FEATURE state ----------------
        this.isHiding = false;
        this.canHide = false;
        this.currentBush = null;
        this.bushTouchRadius = 0; // radius for "touching" bush

        // ---- IMPORTANT: consistent confuse radius for hide/AI ----
        this.confuseRadius = 400;

        // ---------------- MOBILE UI variables ----------------
        this.mobileMode = false;
        this.joystickBase = this.add.circle(120, 420, 60, 0x000000, 0.25).setScrollFactor(0).setVisible(false);
        this.joystickThumb = this.add.circle(120, 420, 30, 0xffffff, 0.6).setScrollFactor(0).setVisible(false);
        this.joystickPointerId = null;
        this.joystickForce = { x: 0, y: 0 };

        this.interactBtn = this.add.text(config.width-20, 400, "Hide", { fontSize: "36px", fill: "#000", backgroundColor: "#fff", padding: { x: 18, y: 12 } })
            .setScrollFactor(0).setVisible(false).setInteractive();
        this.interactBtn.on("pointerdown", () => {
            if (this.canHide && !this.isHiding) this.enterHide();
            else if (this.isHiding) this.exitHide();
        });
        this.runBtn = this.add.text(config.width-20, 500, "Run", { fontSize: "36px", fill: "#000", backgroundColor: "#fff", padding: { x:18, y:12 } })
            .setScrollFactor(0).setVisible(false).setInteractive();
        this.runBtn.on("pointerdown", () => {
            this.isRunning = !this.isRunning
            this.runBtn.setText(this.isRunning ? "Running" : "Run");
        })

        // mobile toggle button (always visible on top-left)
        this.mobileToggleBtn = this.add.text(config.width-20, 20, "📱 Mobile: OFF", { fontSize: "18px", fill: "#fff", backgroundColor: "rgba(0,0,0,0.4)", padding: { x: 10, y: 6 } })
            .setScrollFactor(0).setInteractive();
        this.mobileToggleBtn.on("pointerdown", () => {
            this.mobileMode = !this.mobileMode;
            this.mobileToggleBtn.setText(this.mobileMode ? "📱 Mobile: ON" : "📱 Mobile: OFF");
            this.toggleMobileUI(this.mobileMode);
        });

        // ensure mobile UI hidden initially
        this.toggleMobileUI(false);

        // pointer events for joystick
        this.input.on("pointerdown", (pointer) => {
            if (!this.mobileMode) return;
            const px = pointer.x, py = pointer.y;
            const dist = Phaser.Math.Distance.Between(px, py, this.joystickBase.x, this.joystickBase.y);
            if (dist <= 80 && this.joystickPointerId === null) {
                this.joystickPointerId = pointer.id;
            }
        }, this);

        this.input.on("pointermove", (pointer) => {
            if (!this.mobileMode) return;
            if (pointer.id !== this.joystickPointerId) return;
            const dx = pointer.x - this.joystickBase.x;
            const dy = pointer.y - this.joystickBase.y;
            const max = 50;
            const dist = Math.min(max, Math.hypot(dx, dy));
            const angle = Math.atan2(dy, dx);
            this.joystickThumb.x = this.joystickBase.x + Math.cos(angle) * dist;
            this.joystickThumb.y = this.joystickBase.y + Math.sin(angle) * dist;
            this.joystickForce.x = Math.cos(angle) * (dist / max);
            this.joystickForce.y = Math.sin(angle) * (dist / max);
        }, this);

        this.input.on("pointerup", (pointer) => {
            if (!this.mobileMode) return;
            if (pointer.id === this.joystickPointerId) {
                this.joystickPointerId = null;
                this.joystickThumb.x = this.joystickBase.x;
                this.joystickThumb.y = this.joystickBase.y;
                this.joystickForce.x = 0;
                this.joystickForce.y = 0;
            }
        }, this);

        // debug: log loaded textures (optional)
        // console.log("Loaded textures:", Object.keys(this.textures.list));
    } // end create()

    // ---------------- CARROT HELPERS ----------------
    spawnInitialCarrots() {
        for (let i = 0; i < this.CARROT_COUNT; i++) this.spawnCarrot();
    }

    _isNearTree(x, y, minDist = 120) {
        let near = false;
        this.treeGroup.children.iterate(tree => {
            if (!tree) return;
            if (Phaser.Math.Distance.Between(x, y, tree.x, tree.y) < minDist) near = true;
        });
        return near;
    }

    spawnCarrot() {
        let valid = false;
        let x = 0, y = 0;
        const safeTreeDistance = 140;

        for (let attempt = 0; attempt < 500; attempt++) {
            x = Phaser.Math.Between(100, this.worldWidth - 100);
            y = Phaser.Math.Between(100, this.worldHeight - 100);

            // avoid near rabbit start
            if (Phaser.Math.Distance.Between(x, y, this.rabbit.x, this.rabbit.y) < 80) continue;
            // avoid trees
            if (this._isNearTree(x, y, safeTreeDistance)) continue;

            valid = true;
            break;
        }

        if (!valid) {
            // fallback: attempt around rabbit
            const offsets = [[150,0],[-150,0],[0,150],[0,-150],[150,150],[-150,150],[150,-150],[-150,-150]];
            for (const off of offsets) {
                const fx = Phaser.Math.Clamp(Math.round(this.rabbit.x + off[0]), 100, this.worldWidth - 100);
                const fy = Phaser.Math.Clamp(Math.round(this.rabbit.y + off[1]), 100, this.worldHeight - 100);
                if (!this._isNearTree(fx, fy, safeTreeDistance)) {
                    const c = this.carrotGroup.create(fx, fy, "carrot").setScale(3);
                    // carrot bobbing tween
                    this.tweens.add({
                        targets: c,
                        y: c.y - 12,
                        duration: 900,
                        ease: "Sine.inOut",
                        yoyo: true,
                        loop: -1
                    });
                    return;
                }
            }
            // last resort center
            const fallback = this.carrotGroup.create(Math.floor(this.worldWidth / 2), Math.floor(this.worldHeight / 2), "carrot").setScale(3);
            this.tweens.add({
                targets: fallback,
                y: fallback.y - 12,
                duration: 900,
                ease: "Sine.inOut",
                yoyo: true,
                loop: -1
            });
            return;
        }

        const carrot = this.carrotGroup.create(x, y, "carrot");
        carrot.setScale(3);
        this.tweens.add({
            targets: carrot,
            y: carrot.y - 12,
            duration: 900,
            ease: "Sine.inOut",
            yoyo: true,
            loop: -1
        });
    }

    collectCarrot(carrot) {
        if (!carrot || !carrot.active) return;
        carrot.destroy();
        this.score++;
        this.scoreText.setText("Carrots: " + this.score);
        this.time.delayedCall(1200, () => this.spawnCarrot());
    }

    // ---------------- HIDE helper functions ----------------
    enterHide() {
        if (this.isHiding) return;
        this.isHiding = true;
        this.rabbit.setVelocity(0);
        this.rabbit.setAlpha(0.25);

        // confuse nearby foxes
        this.foxGroup.children.iterate((fox) => {
            if (!fox) return;
            const dfx = Phaser.Math.Distance.Between(fox.x, fox.y, this.rabbit.x, this.rabbit.y);
            if (dfx <= this.confuseRadius) {
                fox.isChasing = false;
                fox.randomX = Phaser.Math.Between(-200, 200);
                fox.randomY = Phaser.Math.Between(-200, 200);
            }
        });
    }

    exitHide() {
        if (!this.isHiding) return;
        this.isHiding = false;
        this.rabbit.setAlpha(1);

        // un-confuse all foxes
        this.foxGroup.children.iterate((fox) => {
            if (!fox) return;
        });

        // restore mobile interact visibility if overlapping bush
        if (this.mobileMode && this.canHide) this.interactBtn.setVisible(true);
    }

    toggleMobileUI(state) {
        this.joystickBase.setVisible(state);
        this.joystickThumb.setVisible(state);
        this.interactBtn.setVisible(state && this.canHide);
        this.runBtn.setVisible(state);
    }

    update() {
        const baseSpeed = 150;
        const runSpeed = 220;
        const speed = (!this.isHiding && this.isRunning ? runSpeed : baseSpeed);

        if (Phaser.Input.Keyboard.JustDown(this.shiftKey)) {
            this.isRunning = !this.isRunning
        }

        // ---------------- HIDING / MOVEMENT ----------------
        if (this.isHiding) {
            // only allow exit via E key or mobile interact
            if (Phaser.Input.Keyboard.JustDown(this.keyE)) this.exitHide();
            this.rabbit.setVelocity(0);
        } else {
            // movement: keyboard or mobile joystick
            if (!this.mobileMode) {
                this.rabbit.setVelocity(0);
                if (!this.isHiding && Phaser.Input.Keyboard.JustDown(this.shiftKey)) {};
                if (this.cursors.left.isDown) this.rabbit.setVelocityX(-speed);
                else if (this.cursors.right.isDown) this.rabbit.setVelocityX(speed);
                if (this.cursors.up.isDown) this.rabbit.setVelocityY(-speed);
                else if (this.cursors.down.isDown) this.rabbit.setVelocityY(speed);

                // interact via E (desktop)
                if (this.canHide && Phaser.Input.Keyboard.JustDown(this.keyE)) this.enterHide();
            } else {
                // mobile joystick controls
                this.rabbit.setVelocity(this.joystickForce.x * speed, this.joystickForce.y * speed);
            }

            // check bush overlap (distance-based)
            this.canHide = false;
            this.currentBush = null;
            this.bushGroup.children.iterate((bush) => {
                if (!bush) return;
                const d = Phaser.Math.Distance.Between(bush.x, bush.y, this.rabbit.x, this.rabbit.y);
                if (d <= this.bushTouchRadius + (bush.displayWidth * 0.5)) {
                    this.canHide = true;
                    this.currentBush = bush;
                }
            });

            // show/hide mobile interact button depending on overlap
            if (this.mobileMode) this.interactBtn.setVisible(this.canHide && !this.isHiding);
        }

        // ---------------- FOX AI ----------------
        this.foxGroup.children.iterate((fox) => {
            if (!fox) return;

            // compute distance once
            const dist = Phaser.Math.Distance.Between(fox.x, fox.y, this.rabbit.x, this.rabbit.y);

            // If rabbit is hidden, foxes must NOT chase.
            // If they are close enough to the hidden rabbit they become confused and wander.
            if (this.isHiding) {
                if (dist <= this.confuseRadius) {
                    fox.isChasing = false;
                    // immediate slow wander
                    fox.setVelocity(fox.randomX, fox.randomY);
                } else {
                    // rabbit hidden and far away: ensure fox is not in chase mode.
                    fox.isChasing = false;
                    // if previously confused, allow it to stop being confused only when far
                    // normal roam (respect fox.randomX/Y)
                    fox.setVelocity(fox.randomX, fox.randomY);
                }
                return; // skip normal chase logic entirely while hiding
            }

            // If fox is confused (from a previous hide) they wander slowly

            // Normal chase/wander logic when rabbit is NOT hidden
            const chaseDistance = 350;
            const loseDistance = 500;
            const chaseSpeed = 200;

            if (dist < chaseDistance) {
                fox.isChasing = true;
                const angle = Math.atan2(this.rabbit.y - fox.y, this.rabbit.x - fox.x);
                fox.setVelocity(Math.cos(angle) * chaseSpeed, Math.sin(angle) * chaseSpeed);
            } else if (fox.isChasing && dist < loseDistance) {
                const angle = Math.atan2(this.rabbit.y - fox.y, this.rabbit.x - fox.x);
                fox.setVelocity(Math.cos(angle) * chaseSpeed, Math.sin(angle) * chaseSpeed);
            } else {
                fox.isChasing = false;
                fox.setVelocity(fox.randomX, fox.randomY);
            }
        });
    } // end update
} // end class

// ===== GAME CONFIG =====
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    width: 800,
    height: 600,
    backgroundColor: "#000000",
    parent: "game-container",
    physics: {
        default: "arcade",
        arcade: {
            debug: false
        }
    },
    scene: MainScene
};

new Phaser.Game(config);
