# GLTF VFX Generator ✨

A powerful web-based tool for creating stunning GLTF VFX models with real-time preview, designed specifically for voxel-styled games like Minecraft and HYTOPIA.

## Features

🎨 **8 VFX Types**
- ✨ Aura - Glowing aura effects around objects
- 🔥 Fireball - Explosive fire effects
- ❄️ Ice - Freezing particle effects
- 💥 Ground Smash - Impact particles
- 🌪️ Tornado - Swirling spiral effects
- ⭐ Sparkles - Magical sparkle particles
- 💨 Smoke - Smoke cloud effects
- ⚡ Energy Beam - Energy blast effects

🎮 **Real-time Preview**
- Interactive Three.js viewer with radial gradient background
- Live preview of all effect parameters
- Smooth animations and particle systems
- Beautiful voxel-styled rendering

⚙️ **Customization Controls**
- Particle count, size, speed, and spread
- Primary and secondary color selection
- Emission shapes (Sphere, Cone, Ring, Box)
- Animation types (Orbit, Rise, Explode, Spiral, Pulse)
- Glow intensity and lifetime controls
- Randomize button for instant variations

💾 **Export to GLTF**
- One-click export to .gltf format
- Compatible with HYTOPIA and other game engines
- Preserves all animations and particle data

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open your browser to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

### Deploy to Production (gltfvfx.fun)

The project includes an automated deployment script for Hostinger:

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your Hostinger credentials:**
   - Get your SSH credentials from Hostinger's control panel
   - SSH Port is typically `65002` for Hostinger
   - Remote directory is usually `public_html`

3. **Deploy:**
   ```bash
   ./deploy-to-hostinger.sh
   ```

The script will:
- Build your project (`npm run build`)
- Upload files to https://gltfvfx.fun/ via SSH
- Sync only changed files for faster deployments

**Getting Hostinger SSH Credentials:**
1. Log into your Hostinger account
2. Go to your hosting dashboard
3. Find "SSH Access" or "Advanced" section
4. Copy your SSH username, password, and port (usually 65002)
5. Update your `.env` file with these credentials

## Usage

1. **Select an Effect Type** - Choose from 8 different VFX types
2. **Customize Parameters** - Adjust colors, particle count, size, speed, etc.
3. **Choose Shape & Animation** - Select emission shape and animation style
4. **Preview in Real-time** - See your effect rendered in the 3D viewer
5. **Export** - Click the "Export GLTF" button to save your creation

### Tips

- Use the 🎲 **Randomize** button to quickly generate variations
- Adjust **Glow Intensity** for more vibrant effects
- Increase **Particle Count** for denser effects (may impact performance)
- Experiment with different **Animation** types for unique behaviors
- Combine **Primary** and **Secondary Colors** for gradient effects

## Tech Stack

- **React 18** - UI framework
- **Vite** - Fast build tool
- **Three.js** - 3D rendering and particle systems
- **Custom Shaders** - GLSL shaders for glowing particle effects

## Project Structure

```
src/
├── components/
│   ├── VFXViewer.jsx        # Three.js viewer component
│   ├── VFXViewer.css        # Viewer styles
│   ├── GeneratorPanel.jsx   # Control panel component
│   └── GeneratorPanel.css   # Panel styles
├── utils/
│   └── vfxGenerator.js      # VFX generation logic
├── App.jsx                   # Main app component
├── App.css                   # App styles
├── main.jsx                  # Entry point
└── index.css                 # Global styles
```

## Exporting to HYTOPIA

**Important**: This tool is designed for **previewing and designing VFX effects in real-time**. The exported GLTF files are templates for reference only.

### For Production-Ready VFX:

#### Option 1: Use Pre-Made Examples ⭐ (Recommended)
The `/public/examples/` folder contains **18 production-ready GLTF VFX files**:
- `fire-particle.gltf`, `gas-explode.gltf`, `ice-aoe.gltf`, etc.
- Fully validated with complete binary data and animations
- Ready to use in HYTOPIA games!

#### Option 2: Create Custom VFX in 3D Tools
1. **Design here**: Use this web app to preview effect parameters and colors
2. **Create in Blockbench**: Recreate your design in [Blockbench](https://www.blockbench.net/) or Blender
3. **Export properly**: Use these tools to generate production GLTFs with valid binary data

> **Note**: Exported files from this tool are JSON templates without proper binary geometry data. They're great for sharing designs but won't work in engines without proper 3D modeling tool export.

### Example: Load VFX in HYTOPIA

```javascript
// Load a VFX effect
const vfxModel = await hytopia.world.createModel({
  modelUri: 'public/examples/fire-particle.gltf',
  position: { x: 0, y: 0, z: 0 }
})

// Play the animation
if (vfxModel.animations && vfxModel.animations.length > 0) {
  vfxModel.playAnimation(vfxModel.animations[0], { loop: true })
}
```

## Contributing

Feel free to contribute by:
- Adding new VFX types
- Improving particle systems
- Adding more customization options
- Optimizing performance

## License

MIT License - feel free to use in your projects!

## Credits

Created for HYTOPIA game development 🎮
Inspired by voxel-styled games and particle effects

