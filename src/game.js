class Runner3D {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('gameContainer').appendChild(this.renderer.domElement);
        
        this.player = null;
        this.obstacles = [];
        this.coins = [];
        this.ground = [];
        
        this.score = 0;
        this.speed = 1;
        this.gameOver = false;
        this.keys = {};
        this.touch = { left: false, right: false, jump: false };
        
        this.playerVelocity = { x: 0, y: 0 };
        this.isJumping = false;
        this.spawnTimer = 0;
        
        this.init();
        this.setupControls();
        this.animate();
    }
    
    init() {
        // Camera
        this.camera.position.set(0, 5, 8);
        this.camera.lookAt(0, 0, 0);
        
        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Player
        const playerGeometry = new THREE.BoxGeometry(0.5, 1, 0.5);
        const playerMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        this.player = new THREE.Mesh(playerGeometry, playerMaterial);
        this.player.position.set(0, 0.5, 0);
        this.player.castShadow = true;
        this.scene.add(this.player);
        
        // Ground
        this.createGround();
        
        // Mobile detection
        if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            document.getElementById('mobileControls').style.display = 'flex';
        }
    }
    
    createGround() {
        for (let i = 0; i < 20; i++) {
            const groundGeometry = new THREE.PlaneGeometry(10, 5);
            const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
            const groundPiece = new THREE.Mesh(groundGeometry, groundMaterial);
            groundPiece.rotation.x = -Math.PI / 2;
            groundPiece.position.set(0, 0, -i * 5);
            groundPiece.receiveShadow = true;
            this.ground.push(groundPiece);
            this.scene.add(groundPiece);
        }
    }
    
    setupControls() {
        // Keyboard
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if ((e.code === 'Space' || e.code === 'Enter') && this.gameOver) {
                this.restart();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Mobile controls
        document.getElementById('leftBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touch.left = true;
        });
        document.getElementById('leftBtn').addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touch.left = false;
        });
        
        document.getElementById('rightBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touch.right = true;
        });
        document.getElementById('rightBtn').addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touch.right = false;
        });
        
        document.getElementById('jumpBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.jump();
        });
        
        // Touch to restart
        this.renderer.domElement.addEventListener('touchstart', (e) => {
            if (this.gameOver) {
                e.preventDefault();
                this.restart();
            }
        });
        
        // Resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    update() {
        if (this.gameOver) return;
        
        // Player movement
        const moveSpeed = 0.1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft'] || this.touch.left) {
            this.playerVelocity.x = Math.max(this.playerVelocity.x - 0.02, -moveSpeed);
        } else if (this.keys['KeyD'] || this.keys['ArrowRight'] || this.touch.right) {
            this.playerVelocity.x = Math.min(this.playerVelocity.x + 0.02, moveSpeed);
        } else {
            this.playerVelocity.x *= 0.9;
        }
        
        // Jump
        if (this.keys['Space'] && !this.isJumping) {
            this.jump();
        }
        
        // Apply movement
        this.player.position.x += this.playerVelocity.x;
        this.player.position.x = Math.max(-4, Math.min(4, this.player.position.x));
        
        // Gravity and jumping
        if (this.isJumping) {
            this.player.position.y += this.playerVelocity.y;
            this.playerVelocity.y -= 0.02;
            
            if (this.player.position.y <= 0.5) {
                this.player.position.y = 0.5;
                this.isJumping = false;
                this.playerVelocity.y = 0;
            }
        }
        
        // Move world
        this.moveWorld();
        
        // Spawn objects
        this.spawnTimer++;
        if (this.spawnTimer > 60 / this.speed) {
            this.spawnObjects();
            this.spawnTimer = 0;
        }
        
        // Update objects
        this.updateObjects();
        this.checkCollisions();
        this.updateScore();
        this.updateUI();
    }
    
    jump() {
        if (!this.isJumping) {
            this.isJumping = true;
            this.playerVelocity.y = 0.3;
        }
    }
    
    moveWorld() {
        const worldSpeed = 0.1 * this.speed;
        
        // Move ground
        this.ground.forEach(piece => {
            piece.position.z += worldSpeed;
            if (piece.position.z > 10) {
                piece.position.z -= 100;
            }
        });
        
        // Move obstacles
        this.obstacles.forEach(obstacle => {
            obstacle.position.z += worldSpeed;
        });
        
        // Move coins
        this.coins.forEach(coin => {
            coin.position.z += worldSpeed;
            coin.rotation.y += 0.1;
        });
    }
    
    spawnObjects() {
        // Spawn obstacle
        if (Math.random() < 0.7) {
            const obstacleGeometry = new THREE.BoxGeometry(0.8, 1.5, 0.8);
            const obstacleMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
            const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
            obstacle.position.set((Math.random() - 0.5) * 8, 0.75, -20);
            obstacle.castShadow = true;
            this.obstacles.push(obstacle);
            this.scene.add(obstacle);
        }
        
        // Spawn coin
        if (Math.random() < 0.5) {
            const coinGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 8);
            const coinMaterial = new THREE.MeshLambertMaterial({ color: 0xffd700 });
            const coin = new THREE.Mesh(coinGeometry, coinMaterial);
            coin.position.set((Math.random() - 0.5) * 8, 1 + Math.random() * 2, -20);
            this.coins.push(coin);
            this.scene.add(coin);
        }
    }
    
    updateObjects() {
        // Remove distant obstacles
        this.obstacles = this.obstacles.filter(obstacle => {
            if (obstacle.position.z > 10) {
                this.scene.remove(obstacle);
                return false;
            }
            return true;
        });
        
        // Remove distant coins
        this.coins = this.coins.filter(coin => {
            if (coin.position.z > 10) {
                this.scene.remove(coin);
                return false;
            }
            return true;
        });
    }
    
    checkCollisions() {
        // Obstacle collisions
        this.obstacles.forEach(obstacle => {
            if (this.player.position.distanceTo(obstacle.position) < 1) {
                this.endGame();
            }
        });
        
        // Coin collisions
        this.coins = this.coins.filter(coin => {
            if (this.player.position.distanceTo(coin.position) < 1) {
                this.scene.remove(coin);
                this.score += 10;
                return false;
            }
            return true;
        });
    }
    
    updateScore() {
        this.score += 0.1 * this.speed;
        this.speed = 1 + Math.floor(this.score / 100) * 0.2;
    }
    
    updateUI() {
        document.getElementById('score').textContent = Math.floor(this.score);
        document.getElementById('speed').textContent = this.speed.toFixed(1);
    }
    
    endGame() {
        this.gameOver = true;
        document.getElementById('finalScore').textContent = Math.floor(this.score);
        document.getElementById('gameOver').style.display = 'block';
    }
    
    restart() {
        this.gameOver = false;
        this.score = 0;
        this.speed = 1;
        this.spawnTimer = 0;
        
        // Reset player
        this.player.position.set(0, 0.5, 0);
        this.playerVelocity = { x: 0, y: 0 };
        this.isJumping = false;
        
        // Clear objects
        this.obstacles.forEach(obstacle => this.scene.remove(obstacle));
        this.coins.forEach(coin => this.scene.remove(coin));
        this.obstacles = [];
        this.coins = [];
        
        document.getElementById('gameOver').style.display = 'none';
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game
window.addEventListener('load', () => {
    new Runner3D();
});