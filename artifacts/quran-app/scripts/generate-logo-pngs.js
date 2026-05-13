#!/usr/bin/env node
// Generates icon.png (1024x1024) and splash-icon.png (1024x1024)
// No external dependencies — uses Node built-in zlib for PNG encoding

const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

// Logo colors
const BG = [0xfd, 0xfb, 0xf7]; // #FDFBF7
const BAR = [0x39, 0x0a, 0x0a]; // #390A0A
const ARCH = [0xc0, 0x70, 0x60]; // #C07060 terracotta

function drawLogo(size) {
  const W = size;
  const H = size;
  const pixels = new Uint8Array(W * H * 4);

  // Fill background
  for (let i = 0; i < W * H; i++) {
    pixels[i * 4 + 0] = BG[0];
    pixels[i * 4 + 1] = BG[1];
    pixels[i * 4 + 2] = BG[2];
    pixels[i * 4 + 3] = 255;
  }

  // Top dark bar: 18% height
  const barH = Math.round(H * 0.18);
  for (let y = 0; y < barH; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      pixels[i] = BAR[0];
      pixels[i + 1] = BAR[1];
      pixels[i + 2] = BAR[2];
      pixels[i + 3] = 255;
    }
  }

  // Mihrab arch: 60% width, centered
  const archW = Math.round(W * 0.60);
  const archX = Math.floor((W - archW) / 2);
  const archTop = barH;
  const archBottom = Math.round(H * 0.92);
  const rx = archW / 2; // horizontal radius
  const ry = rx;        // circular arc (equal radii)
  const cx = W / 2;
  const cy = archTop + ry; // arc center y

  for (let y = archTop; y < archBottom; y++) {
    for (let x = archX; x < archX + archW; x++) {
      let inArch = false;
      if (y >= cy) {
        // Rectangle part (below arc center)
        inArch = true;
      } else {
        // Semicircle part: check if inside circle
        const dx = x - cx;
        const dy = y - cy;
        if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
          inArch = true;
        }
      }
      if (inArch) {
        const i = (y * W + x) * 4;
        pixels[i] = ARCH[0];
        pixels[i + 1] = ARCH[1];
        pixels[i + 2] = ARCH[2];
        pixels[i + 3] = 255;
      }
    }
  }

  return { pixels, W, H };
}

function encodePNG(pixels, W, H) {
  // Build raw scanlines: filter byte (0 = None) + RGBA row
  const rawSize = H * (1 + W * 4);
  const raw = Buffer.alloc(rawSize);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 4 + 1)] = 0; // filter type None
    for (let x = 0; x < W; x++) {
      const src = (y * W + x) * 4;
      const dst = y * (W * 4 + 1) + 1 + x * 4;
      raw[dst] = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
      raw[dst + 3] = pixels[src + 3];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type, "ascii");
    const body = Buffer.concat([typeB, data]);
    const crc = crc32(body);
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeB, data, crcB]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// CRC32 table
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const outDir = path.join(__dirname, "../assets/images");

// icon.png — 1024x1024
const icon = drawLogo(1024);
fs.writeFileSync(path.join(outDir, "icon.png"), encodePNG(icon.pixels, icon.W, icon.H));
console.log("✓ icon.png written (1024×1024)");

// splash-icon.png — 1024x1024 (Expo recommends 1284×2778 but 1024² works)
const splash = drawLogo(1024);
fs.writeFileSync(path.join(outDir, "splash-icon.png"), encodePNG(splash.pixels, splash.W, splash.H));
console.log("✓ splash-icon.png written (1024×1024)");
