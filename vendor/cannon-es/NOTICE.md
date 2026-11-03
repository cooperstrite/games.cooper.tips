# Cannon ES

Pinned `cannon-es` 0.20.0, MIT licensed. Source: https://github.com/pmndrs/cannon-es

The unmodified ES module is vendored locally; no network service is required during gameplay. Rocket Boost uses its rigid bodies, angular dynamics, fixed-step integration, and ground contact solver. The game supplies thrust, inverse-square gravity, drag, lift, and parachute forces in SI units. Atmosphere, heating, life support, and control guidance are simplified for gameplay.

Tetris Isles also uses the local engine for compound four-cell blocks, island contacts, friction, gravity, sleeping, and tipping. Its bodies are constrained to a 2D plane and advanced at 60 fixed steps per second; the Classic grid remains a separate discrete rules engine.
