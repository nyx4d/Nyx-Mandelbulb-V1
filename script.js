// Required libraries:
// - Three.js (https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js)

// Configuration
const CONFIG = {
    MAX_ITERATIONS: 1000000, // Change this value to speed up or slow down the evolution
    EVOLUTION_SPEED: 1.0  // Adjust this to change how fast the shape evolves
};

// Vertex Shader
const vertexShader = `
varying vec3 vPosition;
void main() {
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// Fragment Shader
const fragmentShader = `
varying vec3 vPosition;
uniform float iteration;
uniform vec2 resolution;

const int MAX_STEPS = 100000;
const float MIN_DIST = 1.0;
const float MAX_DIST = 10000.0;
const float POWER = 3.0;

float mandelbulbSDF(vec3 pos) {
    vec3 z = pos;
    float dr = 1.0;
    float r = 0.0;
    
    // Use iteration uniform to modify the fractal
    float iterationFactor = sin(iteration * 0.01) * 0.95 + 1.5;
    
    for (int i = 0; i < 15; i++) {
        r = length(z);
        if (r > 2.0) break;
        
        float theta = acos(z.z / r) * iterationFactor;
        float phi = atan(z.y, z.x) * iterationFactor;
        dr = pow(r, POWER - 1.0) * POWER * dr + 1.0;
        
        float zr = pow(r, POWER);
        theta = theta * POWER;
        phi = phi * POWER;
        
        z = zr * vec3(
            sin(theta) * cos(phi),
            sin(phi) * sin(theta)* sin(theta)* sin(theta)* sin(theta) / cos(phi),
            cos(theta)* sin(theta)* sin(theta) * sin(theta)
        );
        z += pos * sin((iteration * 0.1988) * 1.01 + 0.1988);
    }
    return 1.9 * log(r) * r / dr;
}

float raymarch(vec3 ro, vec3 rd) {
    float t = 0.0;
    
    for(int i = 0; i < MAX_STEPS; i++) {
        vec3 pos = ro + rd * t;
        float d = mandelbulbSDF(pos);
        
        if(d < MIN_DIST) return t;
        if(t > MAX_DIST) break;
        
        t += d * 0.5;
    }
    
    return -1.0;
}

vec3 getNormal(vec3 p) {
    float d = mandelbulbSDF(p);
    vec2 e = vec2(0.001, 0.0);
    vec3 n = d - vec3(
        mandelbulbSDF(p - e.xyy),
        mandelbulbSDF(p - e.yxy),
        mandelbulbSDF(p - e.yyx)
    );
    return normalize(n);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;
    
    vec3 ro = vec3(0.0, 0.0, 4.0);
    vec3 rd = normalize(vec3(uv, -1.0));
    
    float t = raymarch(ro, rd);
    
    vec3 color = vec3(0.0);
    
    if(t > 0.0) {
        vec3 pos = ro + rd * t;
        vec3 normal = getNormal(pos);
        
        vec3 lightPos = vec3(2.0, 4.0, 2.0);
        vec3 lightDir = normalize(lightPos - pos);
        
        float diff = max(dot(normal, lightDir), 0.0);
        
        // Evolving colors based on iteration
        vec3 baseColor = vec3(
            sin(iteration * 0.2) * 0.5 + 0.5,
            cos(iteration * 0.15) * 0.5 + 0.5,
            sin(iteration * 0.1) * 0.5 + 0.5
        );
        
        color = baseColor * diff;
        color += vec3(0.1, 0.2, 0.3) * pow(1.0 - abs(dot(normal, rd)), 2.0);
    }
    
    gl_FragColor = vec4(color, 1.0);
}`;

// Three.js Setup
let camera, scene, renderer;
let uniforms;
let currentIteration = 0;
const clock = new THREE.Clock();

function init() {
    scene = new THREE.Scene();
    
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    const geometry = new THREE.PlaneGeometry(2, 2);
    
    uniforms = {
        iteration: { value: 0 },
        resolution: { value: new THREE.Vector2() }
    };
    
    const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    onWindowResize();
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.resolution.value.x = window.innerWidth;
    uniforms.resolution.value.y = window.innerHeight;
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update iteration based on elapsed time
    const delta = clock.getDelta();
    currentIteration = (currentIteration + delta * CONFIG.EVOLUTION_SPEED) % CONFIG.MAX_ITERATIONS;
    uniforms.iteration.value = currentIteration;
    
    renderer.render(scene, camera);
}

init();
animate();
