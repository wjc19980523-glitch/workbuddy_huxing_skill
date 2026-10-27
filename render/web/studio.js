// The shared 3D stage: the house on a soft studio floor with a sun that can move through the day.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildHouse } from './house.js';
import * as Plan from './plan.js';

export function buildStudio(renderer) {
  const scene = new THREE.Scene();
  const house = buildHouse();
  scene.add(house.root);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.55;

  const bg = new THREE.Color('#d8d3cb');
  scene.background = bg;

  const hemi = new THREE.HemisphereLight('#fff8ee', '#b8ab98', 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1dc', 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 60;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
  scene.add(sun, sun.target);

  // ground that only shows shadow + colour (fades into the background colour)
  const groundMat = new THREE.MeshStandardMaterial({ color: '#d2ccc3', roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.16; ground.receiveShadow = true;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(32, 1280 / 720, 0.05, 400);

  const api = {
    scene, house, sun, hemi, ground, groundMat, camera, bg, env,
    // studio sun by default: a long soft shadow toward the back-right like the reference
    setSunVec(v, intensity = 2.6) {
      sun.position.set(v.x * 30, v.y * 30, v.z * 30); sun.target.position.set(0, 0, 0); sun.intensity = intensity;
    },
    setHour(h) { const d = Plan.sunDir(h); api.setSunVec(d, d.y > 0 ? 1.2 + 2.2 * Math.min(1, d.y * 3) : 0); return d; },
    look(pos, target, fov = 32) {
      camera.position.set(...pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(new THREE.Vector3(...target));
    },
    // orbit helper around the model centre: azimuth (deg, 0 = from -z), elevation (deg), distance
    orbit(az, el, dist, target = [0, 0.6, 0], fov = 32) {
      const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
      const p = [target[0] + Math.sin(a) * Math.cos(e) * dist, target[1] + Math.sin(e) * dist, target[2] - Math.cos(a) * Math.cos(e) * dist];
      api.look(p, target, fov);
    },
    studioLook() {
      scene.background = bg.set('#d8d3cb'); groundMat.color.set('#d2ccc3'); hemi.intensity = 0.9; hemi.color.set('#fff8ee');
      scene.environmentIntensity = 0.55; scene.fog = null;
      api.setSunVec(new THREE.Vector3(-0.35, 0.75, -0.55).normalize(), 2.6);
      house.setNight(0);
    },
  };
  api.studioLook();
  return api;
}
