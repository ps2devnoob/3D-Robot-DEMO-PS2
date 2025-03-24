const font = new Font("default");
font.scale = 0.4;

Screen.setFrameCounter(true);
Screen.setVSync(true);

const canvas = Screen.getMode();
canvas.zbuffering = true;
canvas.psmz = Z16S;
Screen.setMode(canvas);

const menusoundtrack = Sound.load("/Source/sound/menusoundtrack.wav")

const selecteffect = Sound.load("/Source/sound/select.adp")
const selectedeffect = Sound.load("/Source/sound/selected.adp")

const logo = new Image("/Source/gui/logo.png");

Render.setView(50.0, 5.0, 4000.0);

let planeModel = new RenderObject("Source/Map/plane.obj");


planeModel.setPipeline(Render.PL_NO_LIGHTS);

let skybox = new RenderObject("Source/Map/skybox.obj");
skybox.setPipeline(Render.PL_NO_LIGHT);


let currentFrame = 0;
let frameTime = 0.0;
const animationSpeed = 30.0;

let menuModels = [];
for (let i = 1; i <= 31; i++) {
    menuModels.push(new RenderObject(`Source/Menu/${i}.obj`));
    menuModels[i - 1].setPipeline(Render.PL_NO_LIGHTS);
}

const cameraPosition = { x: -7.0, y: 10.0, z: 50.0 };
const cameraTarget = { x: 0.0, y: 0.0, z: 0.0 };

Camera.position(cameraPosition.x, cameraPosition.y, cameraPosition.z);
Camera.target(cameraTarget.x, cameraTarget.y, cameraTarget.z);
let skyboxRotation = 0.0;

let options = ["Play", "Online", "Options", "Exit"];
let selectedOption = 0;

Sound.play(menusoundtrack)

const pad = Pads.get(0);
font.scale = 1;

Screen.display(() => {
    pad.update();
    
    Camera.update();

    skyboxRotation += 0.0001;
    if (skyboxRotation >= 360.0) {
        skyboxRotation = 0.0;
    }

    frameTime += 1 / 60;
    if (frameTime >= (1.0 / animationSpeed)) {
        currentFrame++;
        frameTime = 0.0;
        if (currentFrame >= menuModels.length) {
            currentFrame = 0;
        }
    }

    menuModels[currentFrame].draw(0.0, 0.0, 0.0, 0.0, 0.0, 0.0);

    skybox.draw(0.0, -1.0, 0.0, 0.0, skyboxRotation, 0.0);

    planeModel.draw(0.0, -1.0, 0.0, 0.0, 0.0, 0.0);

    const rectColor = Color.new(0, 0, 0, 50);
    Draw.rect(0, 0, 200, 448, rectColor);
    logo.draw(100, 0);

    for (let i = 0; i < options.length; i++) {
        font.color = (i === selectedOption) ? Color.new(255, 0, 0) : Color.new(255, 255, 255); 
        font.print(60, 150 + i * 40, options[i]);
    }

    if (pad.justPressed(Pads.CROSS)) {
        if (selectedOption === 0) {
            Sound.play(selectedeffect)
            let alpha = 0;

            while (alpha < 128) {
                alpha += 5;  
                Screen.clear(Color.new(0, 0, 0)); 
                Draw.rect(0, 0, 640, 448, Color.new(0, 0, 0, alpha)); 
                Screen.flip(); 
            }
            Sound.pause(menusoundtrack)
            std.reload("/gameplay.js");
        }
    }

    if (pad.justPressed(Pads.UP)) {
        selectedOption = (selectedOption - 1 + options.length) % options.length;
        Sound.play(selecteffect)
    }

    if (pad.justPressed(Pads.DOWN)) {
        selectedOption = (selectedOption + 1) % options.length;
        Sound.play(selecteffect)
    }

});
