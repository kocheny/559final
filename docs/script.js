import * as THREE from "https://unpkg.com/three@0.164.0/build/three.module.js";

//scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
document.body.appendChild(renderer.domElement);

// Camera
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1000);
camera.position.set(0, 5, 17);   // camera closer
camera.lookAt(0, 0, -50);        // look toward middle of playfield

// resize issue
function resizeRenderer() {
    const width = document.body.clientWidth;
    const height = 300; // match iframe height

    renderer.setSize(width, height);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

resizeRenderer();
window.addEventListener("resize", resizeRenderer);

//lights
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const directional = new THREE.DirectionalLight(0xffffff, 0.8);
directional.position.set(5, 10, 7);
scene.add(directional);

const pointLight = new THREE.PointLight(0xffffff, 0.5);
pointLight.position.set(0, 20, 20);
scene.add(pointLight);

//spaceship
const shipGeo = new THREE.BoxGeometry(2, 1, 3);
const shipMat = new THREE.MeshStandardMaterial({ color: 0x00ffff });
const ship = new THREE.Mesh(shipGeo, shipMat);
ship.position.set(0, 0, 8); // right in front of camera
scene.add(ship);

ship.speed = 0.3;

//bullets
let bullets = [];

function shoot() {
    const bulletGeo = new THREE.BoxGeometry(0.2, 0.2, 1);
    const bulletMat = new THREE.MeshStandardMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeo, bulletMat);

    bullet.position.set(ship.position.x, 0, ship.position.z - 2);
    bullet.speed = 0.6;

    bullets.push(bullet);
    scene.add(bullet);
}

//enemies
let enemies = [];

function spawnEnemy() {
    const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const enemy = new THREE.Mesh(geo, mat);

    enemy.position.set(
        (Math.random() - 0.5) * 16, // spread across X-axis
        0,
        -70                       // far away on -Z
    );
    enemy.speed = 0.1 + Math.random() * 0.2;

    enemies.push(enemy);
    scene.add(enemy);
}

// Spawn enemies every 900ms
setInterval(spawnEnemy, 900);

//ui
let keys = {};

document.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === " ") shoot();
});

document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

//collision func
function isColliding(a, b) {
    const aBox = new THREE.Box3().setFromObject(a);
    const bBox = new THREE.Box3().setFromObject(b);
    return aBox.intersectsBox(bBox);
}

//animation loop
function animate() {
    requestAnimationFrame(animate);

    // Ship movement
    if (keys["a"]) ship.position.x -= ship.speed;
    if (keys["d"]) ship.position.x += ship.speed;

    ship.position.x = THREE.MathUtils.clamp(ship.position.x, -8, 8);

    // Update bullets
    bullets.forEach((b, i) => {
        b.position.z -= b.speed;
        if (b.position.z < -120) {
            scene.remove(b);
            bullets.splice(i, 1);
        }
    });

    // Update enemies
    enemies.forEach((e, i) => {
        e.position.z += e.speed;

        if (e.position.z > 12) {
            scene.remove(e);
            enemies.splice(i, 1);
        }
    });

    // Bullet–enemy collisions
    for (let i = enemies.length - 1; i >= 0; i--) {
        for (let j = bullets.length - 1; j >= 0; j--) {
            if (isColliding(enemies[i], bullets[j])) {
                scene.remove(enemies[i]);
                scene.remove(bullets[j]);
                enemies.splice(i, 1);
                bullets.splice(j, 1);
                break;
            }
        }
    }

    renderer.render(scene, camera);
}

animate();