// Free Flight ground layers stay in world space when the renderer moves its
// floating origin. A PBR plugin keeps the normal sun, fog, and aircraft shadows.
export function createFlightSurface({ B, scene, textureUrl = new URL("./assets/free-flight-ground.png", import.meta.url).href }) {
  const origin = { x: 0, z: 0 };
  const atlas = new B.Texture(textureUrl, scene, false, false, B.Texture.TRILINEAR_SAMPLINGMODE);
  atlas.name = "free-flight-landscape-atlas";
  atlas.wrapU = atlas.wrapV = B.Texture.CLAMP_ADDRESSMODE;
  atlas.anisotropicFilteringLevel = 8;
  // With invertY=false, v=0 addresses the top of the source image. The atlas is
  // grass / forest on its top row, and rock / sand on its bottom row.
  atlas.gammaSpace = false;
  const material = new B.PBRMaterial("free-flight-terrain", scene);
  material.albedoColor = B.Color3.White();
  material.metallic = 0;
  material.roughness = .99;
  material.environmentIntensity = .48;
  material.directIntensity = 1;
  material.specularIntensity = .12;

  class FlightLandscape extends B.MaterialPluginBase {
    constructor() { super(material, "FlightLandscape", 180, {}, true, true); }
    getClassName() { return "FlightLandscape"; }
    isReadyForSubMesh() { return atlas.isReadyOrNotBlocking(); }
    getSamplers(samplers) { samplers.push("ffGroundAtlas"); }
    getUniforms() {
      return {
        ubo: [{ name: "ffGroundOrigin", size: 2, type: "vec2" }],
        fragment: "#ifndef UNIFORMBUFFERS\nuniform vec2 ffGroundOrigin;\n#endif",
      };
    }
    bindForSubMesh(buffer) {
      buffer.updateFloat2("ffGroundOrigin", origin.x, origin.z);
      buffer.setTexture("ffGroundAtlas", atlas);
    }
    getActiveTextures(textures) { textures.push(atlas); }
    hasTexture(texture) { return texture === atlas; }
    getCustomCode(shaderType) {
      if (shaderType !== "fragment") return null;
      return {
        CUSTOM_FRAGMENT_DEFINITIONS: `
uniform sampler2D ffGroundAtlas;
float ffLandHash(vec2 p) {
  p = fract(p * vec2(.1031, .11369));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}
float ffLandNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(ffLandHash(i), ffLandHash(i + vec2(1.0, 0.0)), f.x),
             mix(ffLandHash(i + vec2(0.0, 1.0)), ffLandHash(i + 1.0), f.x), f.y);
}
vec3 ffGroundSample(vec2 p, vec2 quadrant) {
  // Reflected coordinates have continuous tile edges. A second rotated scale
  // hides the reflection pattern without grid-shaped random color patches.
  vec2 a = 1.0 - abs(fract(p * .5) * 2.0 - 1.0);
  vec2 q = mat2(.7986, -.6018, .6018, .7986) * p * .731 + vec2(.237, .619);
  vec2 b = 1.0 - abs(fract(q * .5) * 2.0 - 1.0);
  // Keep each sample inside its quadrant, even in the lower mip levels.
  vec3 first = texture2D(ffGroundAtlas, quadrant + .008 + a * .484).rgb;
  vec3 second = texture2D(ffGroundAtlas, quadrant + .008 + b * .484).rgb;
  return mix(first, second, .34);
}
`,
        CUSTOM_FRAGMENT_BEFORE_LIGHTS: `
vec2 ffWorld = vPositionW.xz + ffGroundOrigin;
float ffHeight = vPositionW.y;
float ffSlope = 1.0 - clamp(geometricNormalW.y, 0.0, 1.0);
float ffMacro = ffLandNoise(ffWorld / 3800.0);
float ffMeadow = ffLandNoise(ffWorld / 740.0 + vec2(8.1, 2.7));
float ffDetail = ffLandNoise(ffWorld / 170.0 + vec2(2.3, 7.9));
float ffForest = smoothstep(.35, .69, ffMeadow * .7 + ffDetail * .3);
ffForest *= 1.0 - smoothstep(1000.0, 1460.0, ffHeight);
float ffRock = max(smoothstep(.07, .34, ffSlope), smoothstep(930.0, 1480.0, ffHeight + (ffMacro - .5) * 370.0));
float ffBeach = 1.0 - smoothstep(3.0, 18.0 + ffDetail * 13.0, ffHeight);
float ffSnow = smoothstep(1560.0, 1960.0, ffHeight + (ffMeadow - .5) * 210.0);
ffSnow *= 1.0 - smoothstep(.23, .56, ffSlope);
vec3 ffGrass = ffGroundSample(ffWorld / 230.0, vec2(0.0, 0.0));
vec3 ffWoodland = ffGroundSample(ffWorld / 350.0 + 2.7, vec2(.5, 0.0));
vec3 ffStone = ffGroundSample(ffWorld / 170.0 + 5.1, vec2(0.0, .5));
vec3 ffSand = ffGroundSample(ffWorld / 120.0 + 1.3, vec2(.5, .5));
vec3 ffLand = mix(ffGrass, ffWoodland, ffForest * .85);
ffLand = mix(ffLand, ffStone, ffRock);
ffLand = mix(ffLand, ffSand, ffBeach);
ffLand = mix(ffLand, vec3(.77, .80, .78), ffSnow);
// Broad, smoothly varying vegetation color and relief remain readable from
// cruise altitude; the atlas supplies fine natural detail during an approach.
ffLand *= .86 + ffMacro * .20 + ffDetail * .07;
surfaceAlbedo = toLinearSpace(clamp(ffLand, vec3(.025), vec3(.92)));
float ffNear = 1.0 - smoothstep(90.0, 750.0, length(vEyePosition.xyz - vPositionW));
vec2 ffBumpPoint = ffWorld * .19;
float ffBump = ffLandNoise(ffBumpPoint);
vec2 ffGradient = vec2(ffLandNoise(ffBumpPoint + vec2(.11, 0.0)) - ffBump,
                       ffLandNoise(ffBumpPoint + vec2(0.0, .11)) - ffBump);
normalW = normalize(normalW + vec3(-ffGradient.x, 0.0, -ffGradient.y) * ffNear * mix(.24, .55, ffRock));
`,
      };
    }
  }
  new FlightLandscape();
  return {
    material,
    update({ origin: nextOrigin } = {}) {
      if (nextOrigin) { origin.x = nextOrigin.x; origin.z = nextOrigin.z; }
    },
    dispose() { material.dispose(false, false); atlas.dispose(); },
  };
}
