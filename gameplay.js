const font = new Font("default");
font.scale = 1;

Screen.setFrameCounter(true);
Screen.setVSync(true);

const canvas = Screen.getMode();
canvas.zbuffering = true;
canvas.psmz = Z16S;
Screen.setMode(canvas);

Render.setView(50.0, 5.0, 4000.0);

let progress = 0;
let planeModel, skybox, box;
let idleModels = [], jumpModels = [], runModels = [];

function showLoadingScreen(step, totalSteps) {
    Screen.clear(Color.new(0, 0, 0));

    let barWidth = 400;
    let barHeight = 20;
    let barX = (640 - barWidth) / 2;
    let barY = (448 - barHeight) / 2;

    progress = (step / totalSteps) * 100;  

    font.color = Color.new(255, 255, 255);
    font.print(270, 180, "Loading...");

    Draw.rect(barX, barY, barWidth, barHeight, Color.new(50, 50, 50));
    Draw.rect(barX, barY, (barWidth * progress) / 100, barHeight, Color.new(0, 255, 0));

    Screen.flip();
}

function loadAssets() {
    let totalSteps = 4 + 29 + 21 + 26; 
    let step = 0;

    showLoadingScreen(step, totalSteps);

    step++;
    showLoadingScreen(step, totalSteps);

    planeModel = new RenderObject("Source/Map/plane.obj");

    planeModel.setPipeline(Render.PL_NO_LIGHT);
    step++;
    showLoadingScreen(step, totalSteps);

    skybox = new RenderObject("Source/Map/skybox.obj");
    skybox.setPipeline(Render.PL_NO_LIGHT);
    step++;
    showLoadingScreen(step, totalSteps);

    box = new RenderObject("Source/Map/block.obj");
    box.setPipeline(Render.PL_NO_LIGHT);
    step++;
    showLoadingScreen(step, totalSteps);


    for (let i = 1; i <= 29; i++) {
        idleModels.push(new RenderObject(`Source/Player/Idle/${i}.obj`));
        idleModels[i - 1].setPipeline(Render.PL_NO_LIGHT);
        step++;
        showLoadingScreen(step, totalSteps);
    }


    for (let i = 1; i <= 21; i++) {
        runModels.push(new RenderObject(`Source/Player/Run/${i}.obj`));
        runModels[i - 1].setPipeline(Render.PL_NO_LIGHT);
        step++;
        showLoadingScreen(step, totalSteps);
    }


    for (let i = 1; i <= 21; i++) {
        jumpModels.push(new RenderObject(`Source/Player/Jump/${i}.obj`));
        jumpModels[i - 1].setPipeline(Render.PL_NO_LIGHT);
        step++;
        showLoadingScreen(step, totalSteps);
    }
}


loadAssets();


const hud = new Image("/Source/gui/hud.png");
const soundtrack = Sound.load("/Source/sound/gameplay.wav")

let collisionBox = Physics.createBox(200, 0.5, 200);
let blockBoundingBox = Physics.createBox(6, 6, 6);

const light = Lights.new();
Lights.set(light, Lights.DIRECTION, -0.5, -1.0, -0.5);
Lights.set(light, Lights.AMBIENT, 0.3, 0.3, 0.3);
Lights.set(light, Lights.DIFFUSE, 0.8, 0.8, 0.8);
Lights.set(light, Lights.SPECULAR, 1.0, 1.0, 1.0);

let playerPosition = { x: 0.0, y: 0.0, z: 0.0 };
let playerRotation = 0.0;
let cameraYaw = 0.0;
let cameraPitch = 0.2;
let cameraDistance = 50.0;

const PITCH_MIN = 0.05;
const PITCH_MAX = 1.5;

Camera.type(Camera.LOOKAT);

let pad = Pads.get();
const gray = Color.new(40, 40, 40, 128);
let skyboxRotation = 0.0;

let gravity = -0.05;
let jumpForce = 1.5;
let isJumping = false;
let jumpComplete = false;
let currentJumpFrame = 0;
let playerVelocityY = 0.0;
let isOnGround = false;

let cameraTargetHeight = 10.0;

const animationSpeed = 30.0;

let currentFrame = 0;
let frameTime = 0.0;
let isMoving = false;

let targetRotation = 0.0;
let rotationSpeed = 0.3;


Sound.play(soundtrack)

while (true) {
    Screen.clear(gray);
    Camera.update();
    pad.update();

    let rx = ((pad.rx > 25 || pad.rx < -25) ? pad.rx : 0) / 6000.0;
    let ry = ((pad.ry > 25 || pad.ry < -25) ? pad.ry : 0) / 6000.0;
    
    cameraYaw += rx;
    cameraPitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, cameraPitch + ry));

    let moveSpeed = 0.8;
    let moveX = 0.0;
    let moveZ = 0.0;

    let forwardX = Math.sin(cameraYaw);
    let forwardZ = Math.cos(cameraYaw);
    let rightX = Math.sin(cameraYaw - Math.PI / 2);
    let rightZ = Math.cos(cameraYaw - Math.PI / 2);

    let lx = pad.lx / 128.0; 
    let ly = pad.ly / 128.0;

    if (Math.abs(lx) > 0.2 || Math.abs(ly) > 0.2) {  
        moveX = (forwardX * -ly + rightX * lx) * moveSpeed;
        moveZ = (forwardZ * -ly + rightZ * lx) * moveSpeed;
        
        targetRotation = Math.atan2(moveX, moveZ);
    }

    isMoving = moveX !== 0 || moveZ !== 0;

    if (isOnGround && pad.pressed(Pads.CROSS) && !isJumping) {
        playerVelocityY = jumpForce;
        isJumping = true;
        isOnGround = false;
        currentJumpFrame = 0; 
        jumpComplete = false;
    }

    if (!isOnGround) {
        playerVelocityY += gravity;
        playerPosition.y += playerVelocityY;

        if (playerPosition.y <= 0.0) {
            playerPosition.y = 0.0;
            isOnGround = true;
            playerVelocityY = 0.0;
        }
    }

    let length = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (length > 0) {
        moveX /= length;
        moveZ /= length;
    }

    let newX = playerPosition.x + moveX * moveSpeed;
    let newZ = playerPosition.z + moveZ * moveSpeed;

    let collisionWithBlock = Physics.boxBoxCollide(
        blockBoundingBox, newX, playerPosition.y, newZ,
        blockBoundingBox, 0.0, -1.0, 50.0
    );

    if (!collisionWithBlock) {
        playerPosition.x = newX;
        playerPosition.z = newZ;
    }

    const cameraX = playerPosition.x - forwardX * cameraDistance;
    const cameraZ = playerPosition.z - forwardZ * cameraDistance;
    const cameraY = playerPosition.y + Math.sin(cameraPitch) * cameraDistance;

    Camera.position(cameraX, cameraY, cameraZ);
    Camera.target(playerPosition.x, playerPosition.y + cameraTargetHeight, playerPosition.z);

    skyboxRotation += 0.001;
    if (skyboxRotation >= 360.0) {
        skyboxRotation = 0.0;
    }

    if (isJumping) {

        frameTime += 1 / 60;
        if (frameTime >= (1.0 / animationSpeed)) {
            currentJumpFrame++;
            if (currentJumpFrame >= jumpModels.length) {
                currentJumpFrame = jumpModels.length - 1; 
                isJumping = false; 
                jumpComplete = true;
            }
            frameTime = 0.0;
        }
        if (jumpModels[currentJumpFrame]) {
            jumpModels[currentJumpFrame].draw(playerPosition.x, playerPosition.y, playerPosition.z, 0.0, playerRotation, 0.0);
        }
    } else if (!isJumping) {
        if (isMoving) {
         
            frameTime += 1 / 60;
            if (frameTime >= (1.0 / animationSpeed)) {
                currentFrame = (currentFrame + 1) % runModels.length;
                frameTime = 0.0;
            }
            if (runModels[currentFrame]) {
                runModels[currentFrame].draw(playerPosition.x, playerPosition.y, playerPosition.z, 0.0, playerRotation, 0.0);
            }
        } else {

            frameTime += 1 / 60;
            if (frameTime >= (1.0 / animationSpeed)) {
                currentFrame = (currentFrame + 1) % idleModels.length;
                frameTime = 0.0;
            }
            if (idleModels[currentFrame]) {
                idleModels[currentFrame].draw(playerPosition.x, playerPosition.y, playerPosition.z, 0.0, playerRotation, 0.0);
            }
        }
    }

    let rotationDifference = targetRotation - playerRotation;
    if (rotationDifference > Math.PI) {
        rotationDifference -= 2 * Math.PI;
    } else if (rotationDifference < -Math.PI) {
        rotationDifference += 2 * Math.PI;
    }

    playerRotation += rotationDifference * rotationSpeed;

    skybox.draw(0.0, -1.0, 0.0, 0.0, skyboxRotation, 0.0);
    planeModel.draw(0.0, -1.0, 0.0, 0.0, 0.0, 0.0);
    box.draw(0.0, -1.0, 50.0, 0.0, 0.0, 0.0);

    planeModel.drawBounds(0.0, -1.0, 0.0, 0.0, 0.0, 0.0, Color.new(0, 0, 0));
    box.drawBounds(0.0, -1.0, 50.0, 0.0, 0.0, 0.0, Color.new(0, 0, 0));
    Draw.rect(86, 34, 141, 20, Color.new(0,255,0));
    Draw.rect(87, 54, 137, 6, Color.new(0,248,255));
    hud.draw(0, 0);

    font.color = Color.new(0, 0, 0);
    font.print(10, 10, Screen.getFPS(360) + " FPS");

    Screen.flip();
}
