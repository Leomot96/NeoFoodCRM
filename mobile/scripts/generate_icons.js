import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.resolve(__dirname, '../public/isotipo.svg');
const androidResPath = path.resolve(__dirname, '../android/app/src/main/res');

// Colores del tema NeoFood
const BG_COLOR = '#090D16'; // Fondo oscuro premium
const BG_COLOR_OBJ = { r: 9, g: 13, b: 22, alpha: 1 };

async function generate() {
  console.log('--- Generando iconos para NeoFood Móvil con Sharp ---');
  
  if (!fs.existsSync(svgPath)) {
    console.error('No se encontró el SVG en:', svgPath);
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(svgPath);

  // Densidades estándar de Android
  const densities = [
    { name: 'mipmap-mdpi', size: 48, fgSize: 108 },
    { name: 'mipmap-hdpi', size: 72, fgSize: 162 },
    { name: 'mipmap-xhdpi', size: 96, fgSize: 216 },
    { name: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
    { name: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
  ];

  for (const d of densities) {
    const dir = path.join(androidResPath, d.name);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // 1. Foreground adaptativo (el isotipo más pequeño y estético, ~44% de fgSize para buen margen)
    const logoTargetSize = Math.round(d.fgSize * 0.44);
    const renderedLogo = await sharp(svgBuffer)
      .resize({ width: logoTargetSize, height: logoTargetSize, fit: 'inside' })
      .toBuffer();

    const logoMeta = await sharp(renderedLogo).metadata();
    const leftFg = Math.round((d.fgSize - logoMeta.width) / 2);
    const topFg = Math.round((d.fgSize - logoMeta.height) / 2);

    await sharp({
      create: {
        width: d.fgSize,
        height: d.fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: renderedLogo, left: leftFg, top: topFg }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    // 2. Icono estándar legacy (fondo oscuro + isotipo con margen estético ~52% del icono)
    const legacyLogoSize = Math.round(d.size * 0.52);
    const renderedLegacyLogo = await sharp(svgBuffer)
      .resize({ width: legacyLogoSize, height: legacyLogoSize, fit: 'inside' })
      .toBuffer();

    const legacyMeta = await sharp(renderedLegacyLogo).metadata();
    const leftLegacy = Math.round((d.size - legacyMeta.width) / 2);
    const topLegacy = Math.round((d.size - legacyMeta.height) / 2);

    // Cuadrado
    await sharp({
      create: {
        width: d.size,
        height: d.size,
        channels: 4,
        background: BG_COLOR_OBJ
      }
    })
      .composite([{ input: renderedLegacyLogo, left: leftLegacy, top: topLegacy }])
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    // Redondo (con máscara circular suave)
    const circleSvg = Buffer.from(
      `<svg width="${d.size}" height="${d.size}"><circle cx="${d.size / 2}" cy="${d.size / 2}" r="${d.size / 2}" fill="#fff"/></svg>`
    );

    const baseRound = await sharp({
      create: {
        width: d.size,
        height: d.size,
        channels: 4,
        background: BG_COLOR_OBJ
      }
    })
      .composite([{ input: renderedLegacyLogo, left: leftLegacy, top: topLegacy }])
      .png()
      .toBuffer();

    await sharp(baseRound)
      .composite([{ input: circleSvg, blend: 'dest-in' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    console.log(`✓ Generados iconos para ${d.name} (${d.size}x${d.size} y fg ${d.fgSize}x${d.fgSize})`);
  }

  // 3. Splash Screen (pantalla de carga inicial nativa elegante)
  const splashSize = 512;
  const splashLogo = await sharp(svgBuffer)
    .resize({ width: 150, height: 150, fit: 'inside' })
    .toBuffer();
  const splashMeta = await sharp(splashLogo).metadata();

  const splashDir = path.join(androidResPath, 'drawable');
  if (fs.existsSync(splashDir)) {
    await sharp({
      create: {
        width: splashSize,
        height: splashSize,
        channels: 4,
        background: BG_COLOR_OBJ
      }
    })
      .composite([{
        input: splashLogo,
        left: Math.round((splashSize - splashMeta.width) / 2),
        top: Math.round((splashSize - splashMeta.height) / 2)
      }])
      .png()
      .toFile(path.join(splashDir, 'splash.png'));
    console.log('✓ Splash screen actualizada en drawable/splash.png');
  }

  console.log('--- ¡Todos los iconos nativos de Android fueron generados con éxito! ---');
}

generate().catch((err) => {
  console.error('Error generando iconos:', err);
  process.exit(1);
});
