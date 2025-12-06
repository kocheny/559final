import * as T from "https://unpkg.com/THREE@0.164.0/build/THREE.module.js";

//vars
let scene, camera, renderer;
let ship, bullets = [], enemies = [], starField;
let keys = {};
let isGameOver = false;
let score = 0;
let enhancedMode = false;
let shipColor = 0x00ffff;
let enemyInterval;
let highScore = localStorage.getItem("highScore") || 0;

//ui
const uiOverlay = document.getElementById("uiOverlay");
const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const scoreUI = document.getElementById("scoreUI");
const restartBtn = document.getElementById("restartBtn");
const startBtn = document.getElementById("startBtn");
const highScoreUI = document.getElementById("highScore");
const finalScoreUI = document.getElementById("finalScore");
const shipColorInput = document.getElementById("shipColor");
const modeSelect = document.getElementById("modeSelect");
const previewContainer = document.getElementById("shipPreview");

highScoreUI.textContent = highScore;

//start screen ship
let previewScene, previewCamera, previewRenderer, previewShip;
function initShipPreview() {
    previewScene = new T.Scene();
    previewScene.background = new T.Color(0x000000);

    previewRenderer = new T.WebGLRenderer({ antialias:true });
    previewRenderer.setSize(previewContainer.clientWidth, previewContainer.clientHeight);
    previewContainer.appendChild(previewRenderer.domElement);

    previewCamera = new T.PerspectiveCamera(70, previewContainer.clientWidth/previewContainer.clientHeight, 0.1, 1000);
    previewCamera.position.set(3,3,6);
    previewCamera.lookAt(0,0,0);

    const ambient = new T.AmbientLight(0xffffff,1);
    previewScene.add(ambient);

    previewShip = createShipEnhanced();
    previewScene.add(previewShip);

    animatePreview();
}

function animatePreview(){
    requestAnimationFrame(animatePreview);
    if(previewShip) previewShip.rotation.y += 0.02;
    if(previewRenderer) previewRenderer.render(previewScene, previewCamera);
}

// Update preview color live
shipColorInput.addEventListener("input", () => {
    const color = new T.Color(shipColorInput.value);
    if(previewShip){
        previewShip.traverse(obj => {
            if(obj.material) obj.material.color.set(color);
        });
    }
});

//events for controls
startBtn.addEventListener("click", () => {
    shipColor = new T.Color(shipColorInput.value);
    enhancedMode = modeSelect.value === "enhanced";
    startGame();
});

restartBtn.addEventListener("click", restartGame);

document.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
    if(e.key===" " && !isGameOver) shoot();
});
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

//setup
function initScene() {
    scene = new T.Scene();
    scene.background = new T.Color(0x000000);

    renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    camera = new T.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0,5,17);
    camera.lookAt(0,0,-50);

    window.addEventListener("resize", () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

    scene.add(new T.AmbientLight(0xffffff, 0.6));
    const directional = new T.DirectionalLight(0xffffff,0.8);
    directional.position.set(5,10,7);
    scene.add(directional);
    scene.add(new T.PointLight(0xffffff,0.5));
}

//moving stars for full mode
function createStarField() {
    const starCount = 1000;
    const geometry = new T.BufferGeometry();
    const positions = [];
    for(let i=0;i<starCount;i++){
        positions.push((Math.random()-0.5)*200);
        positions.push((Math.random()-0.5)*200);
        positions.push(-Math.random()*500);
    }
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions,3));
    const material = new T.PointsMaterial({color:0xffffff,size:0.3});
    starField = new T.Points(geometry, material);
    scene.add(starField);
}

function removeStarField(){
    if(starField){
        scene.remove(starField);
        starField.geometry.dispose();
        starField.material.dispose();
        starField = null;
    }
}

//ship
function createShipPrototype() {
    const mat = new T.MeshStandardMaterial({ color: shipColor });
    return new T.Mesh(new T.BoxGeometry(2,1,3), mat);
}

function createShipEnhanced() {
    const ship = new T.Group();
    const bodyMat = new T.MeshStandardMaterial({color: shipColor, metalness:0.6, roughness:0.3, emissive:0x003344});
    const body = new T.Mesh(new T.CylinderGeometry(0.6,1,4,12), bodyMat);
    body.rotation.x = Math.PI/2;
    ship.add(body);

    const nose = new T.Mesh(new T.ConeGeometry(0.6,1,12), bodyMat);
    nose.position.z = 2.5;
    nose.rotation.x = Math.PI/2;
    ship.add(nose);

    const wingGeo = new T.BoxGeometry(0.1,1.5,0.5);
    const wingMat = new T.MeshStandardMaterial({color: shipColor, metalness:0.5, roughness:0.3, emissive:0x002222});
    const wingLeft = new T.Mesh(wingGeo, wingMat); wingLeft.position.x = -0.8; ship.add(wingLeft);
    const wingRight = wingLeft.clone(); wingRight.position.x = 0.8; ship.add(wingRight);

    return ship;
}

//enemies
function createEnemyPrototype() {
    return new T.Mesh(new T.BoxGeometry(1.5,1.5,1.5), new T.MeshStandardMaterial({color:0xff0000}));
}

function createEnemyEnhanced() {
    const shapes = [new T.IcosahedronGeometry(1,1), new T.OctahedronGeometry(1,0), new T.DodecahedronGeometry(1,0)];
    const geo = shapes[Math.floor(Math.random()*shapes.length)];
    const mat = new T.MeshStandardMaterial({
        color: new T.Color(`hsl(${Math.random()*360},100%,50%)`),
        metalness:0.7, roughness:0.1, emissive: new T.Color(`hsl(${Math.random()*360},100%,30%)`)
    });
    const enemy = new T.Mesh(geo, mat);
    enemy.rotationSpeed = Math.random()*0.05+0.01;
    enemy.scale.multiplyScalar(0.8 + Math.random()*0.4);
    return enemy;
}

//bullets
function shoot(){
    if(isGameOver) return;
    const bullet = new T.Mesh(new T.BoxGeometry(0.2,0.2,1), new T.MeshStandardMaterial({color:0xffff00}));
    bullet.position.set(ship.position.x,0,ship.position.z-2);
    bullet.speed = 0.6;
    bullets.push(bullet);
    scene.add(bullet);
}

function spawnEnemy(){
    if(isGameOver) return;
    const enemy = enhancedMode ? createEnemyEnhanced() : createEnemyPrototype();
    enemy.position.set((Math.random()-0.5)*16,0,-70);
    enemy.speed = 0.1 + Math.random()*0.2;
    enemies.push(enemy);
    scene.add(enemy);
}

//collision here
function isColliding(a,b){
    const boxA = new T.Box3().setFromObject(a);
    const boxB = new T.Box3().setFromObject(b);
    return boxA.intersectsBox(boxB);
}

//clear
function clearScene() {
    bullets.forEach(b => scene.remove(b));
    enemies.forEach(e => scene.remove(e));
    if(ship) scene.remove(ship);
    if(starField) removeStarField();

    scene.traverse(obj => {
        if(obj.geometry) obj.geometry.dispose();
        if(obj.material) obj.material.dispose();
    });

    bullets = [];
    enemies = [];
    ship = null;
}

//actual game controls
function startGame(){
    uiOverlay.style.display = "none";
    startScreen.style.display = "none";
    isGameOver = false;
    score = 0;
    scoreUI.textContent = "Score: 0";

    initScene();

    ship = enhancedMode ? createShipEnhanced() : createShipPrototype();
    ship.position.set(0,0,8);
    ship.speed = 0.2;
    scene.add(ship);

    if(enhancedMode) createStarField();

    enemies = [];
    bullets = [];

    clearInterval(enemyInterval);
    enemyInterval = setInterval(spawnEnemy, 900);

    animate();
}

function triggerGameOver(){
    isGameOver = true;
    clearInterval(enemyInterval);

    if(score > highScore){
        highScore = score;
        localStorage.setItem("highScore", highScore);
    }

    finalScoreUI.textContent = score;
    highScoreUI.textContent = highScore;

    gameOverScreen.style.display = "flex";
    uiOverlay.style.display = "flex";
    startScreen.style.display = "none";
}

function restartGame(){
    gameOverScreen.style.display = "none";
    startScreen.style.display = "flex";
    uiOverlay.style.display = "flex";

    clearInterval(enemyInterval);
    clearScene();

    if(renderer){
        renderer.dispose();
        renderer.domElement.remove();
        renderer = null;
    }
}

//animation
function animate(){
    requestAnimationFrame(animate);

    if(!isGameOver){
        if(keys["a"]) ship.position.x -= ship.speed;
        if(keys["d"]) ship.position.x += ship.speed;
        ship.position.x = T.MathUtils.clamp(ship.position.x,-8,8);

        bullets.forEach((b,i)=>{
            b.position.z -= b.speed;
            if(b.position.z<-120){ scene.remove(b); bullets.splice(i,1); }
        });

        enemies.forEach((e,i)=>{
            e.position.z += e.speed;
            if(enhancedMode){
                e.rotation.x += e.rotationSpeed||0;
                e.rotation.y += e.rotationSpeed||0;
            }
            if(isColliding(e,ship)) triggerGameOver();
            if(e.position.z>12){ scene.remove(e); enemies.splice(i,1); }
        });

        for(let i=enemies.length-1;i>=0;i--){
            for(let j=bullets.length-1;j>=0;j--){
                if(isColliding(enemies[i],bullets[j])){
                    score++;
                    scoreUI.textContent = "Score: "+score;
                    scene.remove(enemies[i]);
                    scene.remove(bullets[j]);
                    enemies.splice(i,1);
                    bullets.splice(j,1);
                    break;
                }
            }
        }

        if(starField){
            starField.position.z += 0.2;
            if(starField.position.z>10) starField.position.z = 0;
        }
    }

    if(renderer) renderer.render(scene,camera);
}

//initialize ship preview
initShipPreview();