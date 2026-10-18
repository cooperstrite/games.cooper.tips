# Archer studio assets

The 3D character is assembled in `arcade/humanoid-mesh.js`. Its clothes, hair,
facial hair, accessories, bow and arrows are independent, recolorable meshes.
It is a static aiming pose for the character studio; it does not alter game physics.

## Anatomical head

`head.bin` and `head.json` are derived from the MakeHuman Community CC0 assets:

- Repository revision: `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`
- [Base mesh](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/makehuman/data/3dobjs/base.obj)
- [Young adult shape target](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/makehuman/data/targets/macrodetails/caucasian-male-young.target)
- [Asset license](https://static.makehumancommunity.org/about/license.html)

Only the head and neck are retained. The mesh is subdivided once, scaled,
converted to Babylon's coordinate/winding convention, and packed into a local
binary file. `head.json` gives counts and anatomical attachment points. The
binary layout is little-endian float32 positions, normals, UVs, then uint16 indices.

## Skin maps

`skin-color.png` and `skin-normal.png` are derived from **Aksel Skin** by
**Mindfront**, shared under CC0 in the official
[Skins 02 pack](https://static.makehumancommunity.org/assets/assetpacks/skins02.html).
Source files: `Aksel_Skin_diffuse.png`, `Aksel_Skin_NRM.png`.

These 1024px maps retain only the head's UV islands. Diffuse colors are normalized
for runtime skin tinting, and baked eye shadows are removed so eyes and brows
remain independent customizations. The original full-body textures are not shipped.

The other material maps (cloth, leather, wood, hair, skin grain) and the studio
reflection cube are generated locally by `arcade/archer-materials.js`.

## Rebuilding

With Blender installed, download the two pinned MakeHuman source files above as
`base.obj` and `male.target` into a temporary source directory. Extract the two
Aksel images from the skin pack into its `skin/` subdirectory, then run:

```sh
blender --background --python scripts/build-archer-head.py -- SOURCE_DIR assets/archer
```

Blender is an authoring tool only. The published site uses local static assets and
the bundled Babylon engine, and does not need Blender or a game server. The mesh
and skin textures are loaded only when the archer's **3D character (Beta)** view is
selected. The default preview remains the game's original 2D artwork.
