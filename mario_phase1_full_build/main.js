
// Phaser 3 - Full Phase 1 build (NTE GPI)
// Controls: arrows / space; mobile buttons map to same inputs
const config = {
  type: Phaser.AUTO,
  parent: 'gameDiv',
  width: 960,
  height: 540,
  backgroundColor: '#87CEEB',
  physics: { default: 'arcade', arcade: { gravity: { y: 1000 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: { preload, create, update }
};
const game = new Phaser.Game(config);

let player, cursors, platforms, coins, enemies, flagContainer;
let score = 0, scoreText, lives = 3, livesText;
let moveLeft=false, moveRight=false, jumpDown=false;

function preload() {
  // load assets (ensure assets/player.png and assets/enemies.png exist)
  this.load.image('playerImg', 'assets/player.png');
  this.load.spritesheet('enemies', 'assets/enemies.png', { frameWidth: 32, frameHeight: 32 });
  this.load.audio('jump', 'assets/jump.wav');
  // debug events
  this.load.on('filecomplete', (key) => { console.log('Loaded:', key); });
  this.load.on('loaderror', (file) => { console.error('Failed:', file); });
}

function create() {
  // world larger to allow camera travel
  this.physics.world.setBounds(0,0,2400,540);
  this.cameras.main.setBounds(0,0,2400,540);

  // platforms group (static)
  platforms = this.physics.add.staticGroup();
  // ground body (invisible)
  platforms.create(1200, 520, 'enemies').setScale(200,1).refreshBody().setVisible(false);

  // draw level using graphics for NES-like tiles
  drawGroundTiles(this);
  createBricksAndPipes(this);

  // player creation: try to use provided image; fallback to a rectangle
  if (this.textures.exists('playerImg')) {
    player = this.physics.add.sprite(80, 420, 'playerImg').setScale(0.48);
    player.setBounce(0.05);
    player.setCollideWorldBounds(true);
    player.body.setSize(player.width*0.6, player.height*0.9, true);
  } else {
    console.warn('playerImg not found; using fallback rectangle');
    player = this.add.rectangle(80, 420, 30, 48, 0xff9966);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);
    player.body.setBounce(0.05);
  }

  // coins
  coins = this.physics.add.group();
  spawnCoin(this, 320, 300);
  spawnCoin(this, 400, 260);
  spawnCoin(this, 480, 260);
  spawnCoin(this, 640, 300);

  // enemies
  enemies = this.physics.add.group();
  spawnGoomba(this, 500, 460, 440, 660);
  spawnGoomba(this, 900, 460, 820, 980);

  // flagpole and castle at the far right
  flagContainer = this.add.container(2320, 260);
  const pole = this.add.rectangle(0, 0, 8, 380, 0x66ff66).setOrigin(0.5, 0);
  const flag = this.add.triangle(14, 10, 0, 0, 64, 16, 0, 32, 0xffffff);
  flag.setFillStyle(0xffffff);
  flag.setData('scored', false);
  flagContainer.add(pole); flagContainer.add(flag);
  this.add.text(2000, 80, 'DIRETORIA REGIONAL DE ENSINO', { fontSize:'22px', fill:'#ffffff' });

  // UI fixed to camera
  scoreText = this.add.text(12, 12, 'Pontos: 0', { fontSize:'20px', fill:'#fff' }).setScrollFactor(0);
  livesText = this.add.text(12, 42, 'Vidas: ' + lives, { fontSize:'16px', fill:'#fff' }).setScrollFactor(0);

  // collisions
  this.physics.add.collider(player, platforms);
  this.physics.add.collider(coins, platforms);
  this.physics.add.collider(enemies, platforms);
  this.physics.add.overlap(player, coins, collectCoin, null, this);
  this.physics.add.overlap(player, enemies, hitEnemy, null, this);

  // simple enemy animation if sheet exists
  if (this.textures.exists('enemies')) {
    this.anims.create({ key:'walk', frames: this.anims.generateFrameNumbers('enemies', { start:1, end:3 }), frameRate:6, repeat:-1 });
  }

  // camera follow
  this.cameras.main.startFollow(player, true, 0.1, 0.1);

  // input
  cursors = this.input.keyboard.createCursorKeys();
  setupMobileButtons();
  // sound
  this.jumpSnd = this.sound.add('jump');
}

function update() {
  const left = (cursors.left && cursors.left.isDown) || moveLeft;
  const right = (cursors.right && cursors.right.isDown) || moveRight;
  const jumpPressed = Phaser.Input.Keyboard.JustDown(cursors.up) || Phaser.Input.Keyboard.JustDown(cursors.space) || jumpDown;

  // movement handling for sprite or fallback rect
  if (player.body && typeof player.body.setVelocityX === 'function') {
    if (left) { player.body.setVelocityX(-180); player.setFlipX(true); }
    else if (right) { player.body.setVelocityX(180); player.setFlipX(false); }
    else { player.body.setVelocityX(0); }

    if (jumpPressed && player.body.touching.down) {
      player.body.setVelocityY(-540);
      if (this.jumpSnd) this.jumpSnd.play();
      jumpDown = false;
    }
  } else {
    if (left) player.x -= 4;
    if (right) player.x += 4;
    if (jumpPressed) { player.y -= 60; setTimeout(()=>player.y += 60, 260); jumpDown=false; }
  }

  // check end of level
  const dist = Phaser.Math.Distance.Between(player.x, player.y, 2320, 260);
  if (dist < 50 && !flagContainer.getAt(1).getData('scored')) {
    flagContainer.getAt(1).setData('scored', true);
    score += 400; scoreText.setText('Pontos: ' + score);
    this.add.text(player.x - 120, player.y - 120, 'Fase concluída!', { fontSize:'26px', fill:'#ffff00', stroke:'#000', strokeThickness:3 }).setScrollFactor(0);
  }

  // enemy patrol behavior
  enemies.children.iterate(function(en) {
    if (!en.active || !en.body) return;
    if (en.x < en._minX) en.body.setVelocityX(40);
    if (en.x > en._maxX) en.body.setVelocityX(-40);
  });
}

// Helper: draw ground tiles visually
function drawGroundTiles(scene) {
  const g = scene.add.graphics();
  const tileW = 48, tileH = 32;
  for (let i=0;i<50;i++) {
    const x = 24 + i*tileW;
    const y = 504;
    g.fillStyle(0x8B4513, 1);
    g.fillRect(x - tileW/2, y - tileH/2, tileW, tileH);
    g.lineStyle(2, 0x5c2f13, 1);
    g.strokeRect(x - tileW/2, y - tileH/2, tileW, tileH);
  }
}

// Helper: create bricks and pipes across the level
function createBricksAndPipes(scene) {
  drawBrickGroup(scene, 320, 360); drawBrickGroup(scene, 400, 320); drawBrickGroup(scene, 480, 320);
  drawQuestionBlock(scene, 400, 260);
  drawPipe(scene, 640, 424); drawPipe(scene, 760, 424);
  drawCastle(scene, 1960, 420);
  // add some invisible static platform bodies so player stands on bricks
  const staticPlat = scene.physics.add.staticGroup();
  staticPlat.create(320, 392, 'enemies').setVisible(false).refreshBody();
  staticPlat.create(400, 352, 'enemies').setVisible(false).refreshBody();
  staticPlat.create(480, 352, 'enemies').setVisible(false).refreshBody();
  scene.physics.add.collider(player, staticPlat); scene.physics.add.collider(enemies, staticPlat);
}

function drawBrickGroup(scene, x, y) {
  const g = scene.add.graphics();
  g.fillStyle(0x8B4513, 1);
  for (let bx=0; bx<3; bx++) {
    g.fillRect(x + bx*38, y - 16, 36, 32);
    g.lineStyle(2, 0x5c2f13, 1);
    g.strokeRect(x + bx*38, y - 16, 36, 32);
  }
}

function drawQuestionBlock(scene, x, y) {
  const g = scene.add.graphics();
  g.fillStyle(0xD9A441, 1);
  g.fillRect(x-18, y-18, 36, 36);
  g.lineStyle(2, 0x8B5A17, 1);
  g.strokeRect(x-18, y-18, 36, 36);
  // put a coin above it
  spawnCoin(scene, x, y - 60);
}

function drawPipe(scene, x, y) {
  const g = scene.add.graphics();
  g.fillStyle(0x2ea43f, 1);
  g.fillRect(x-36, y-96, 72, 96);
  g.fillStyle(0x1b7a2b,1);
  g.fillRect(x-36, y-96, 72, 20);
}

// castle
function drawCastle(scene, x, y) {
  const g = scene.add.graphics();
  g.fillStyle(0xC87D3A, 1);
  for (let r=0;r<6;r++) {
    for (let c=0;c<6-r;c++) {
      const bx = x + c*36 + r*18;
      const by = y - r*18;
      g.fillRect(bx, by, 36, 36);
      g.lineStyle(2, 0x7a4f2e, 1);
      g.strokeRect(bx, by, 36, 36);
    }
  }
}

// spawn coin helper
function spawnCoin(scene, x, y) {
  const c = scene.add.circle(x, y, 10, 0xFFD700);
  scene.physics.add.existing(c); c.body.setAllowGravity(false); coins.add(c);
}

// spawn basic enemies (goomba-like)
function spawnGoomba(scene, x, y, minX, maxX) {
  const g = scene.add.rectangle(x, y - 8, 28, 28, 0x663300);
  scene.physics.add.existing(g); g.body.setBounce(1); g.body.setCollideWorldBounds(true);
  g._minX = minX; g._maxX = maxX; g.body.setVelocityX(40);
  enemies.add(g);
}

// collisions & pickups
function collectCoin(playerObj, coin) {
  coin.destroy(); score += 100; scoreText.setText('Pontos: ' + score);
}

function hitEnemy(playerObj, enemy) {
  if (playerObj.body && playerObj.body.velocity && playerObj.body.velocity.y > 150) {
    enemy.destroy(); score += 200; scoreText.setText('Pontos: ' + score); playerObj.body.setVelocityY(-260);
  } else {
    lives -= 1; livesText.setText('Vidas: ' + lives);
    if (playerObj.setFillStyle) { playerObj.setFillStyle(0xff6666); setTimeout(()=>playerObj.setFillStyle(0xff9966), 300); }
    if (lives <= 0) { game.scene.scenes[0].scene.restart(); score = 0; lives = 3; }
  }
}

// mobile buttons hookup
function setupMobileButtons() {
  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');
  const btnJump = document.getElementById('btnJump');
  if (!btnLeft) return;

  ['touchstart','pointerdown','mousedown'].forEach(ev => {
    btnLeft.addEventListener(ev, ()=>moveLeft=true);
    btnRight.addEventListener(ev, ()=>moveRight=true);
    btnJump.addEventListener(ev, ()=>jumpDown=true);
  });
  ['touchend','pointerup','mouseleave','pointerout','mouseout'].forEach(ev => {
    btnLeft.addEventListener(ev, ()=>moveLeft=false);
    btnRight.addEventListener(ev, ()=>moveRight=false);
    btnJump.addEventListener(ev, ()=>jumpDown=false);
  });
}
