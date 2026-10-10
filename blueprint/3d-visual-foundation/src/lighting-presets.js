/* 3D Visual Foundation · lighting-presets.js — tested environment settings for GK.Renderer.setEnv() and the Game Kit
   `environment` / world `lighting` blocks. Copy one, then change a value or two:
     environment: Object.assign({}, GK.LightingPresets.tropicalDay, { fog: [60, 220] })
   sky: [top, middle, horizon] · fogColor should match the horizon · sun.dir points TOWARD the sun (y up). */
(function () {
  'use strict';
  const GK = window.GK = window.GK || {};
  GK.LightingPresets = {
    /** Island Escape act 1: bright tropical noon, puffy clouds, crisp shadows (the style reference). */
    tropicalDay: {
      sky: ['#2f7fd6', '#6fb6ef', '#bfe2f8'], fogColor: '#b7dcf5', fog: [70, 280],
      sun: { dir: [-0.6, 0.75, 0.32], color: '#fff1d6', intensity: 0.68 }, ambient: { sky: '#a9c2dc', ground: '#6b5d45' },
      clouds: { cover: 0.38 }, grid: false,
    },
    /** Late afternoon: warm low sun, long shadows, peach horizon. */
    goldenHour: {
      sky: ['#3d6fb8', '#e9a77a', '#ffd2a1'], fogColor: '#f3c49a', fog: [60, 240],
      sun: { dir: [-0.8, 0.38, 0.45], color: '#ffc58a', intensity: 0.75 }, ambient: { sky: '#9db0cf', ground: '#7a5a3c' },
      clouds: { cover: 0.32, color: '#fff0de', shade: '#d59a86' }, exposure: 0.95, grid: false,
    },
    /** Island Escape act 3: grey storm, heavy clouds, soft shadows. */
    storm: {
      sky: ['#3d4656', '#66738a', '#9aa6b8'], fogColor: '#8e99ab', fog: [60, 240],
      sun: { dir: [0.3, 1, 0.45], color: '#e3e8f0', intensity: 0.48 }, ambient: { sky: '#97a3b6', ground: '#4c4840' },
      clouds: { cover: 0.72, color: '#c3cad6', shade: '#6f7a8c' }, cloudProps: 0, shadowStrength: 0.5, saturation: 1.05, grid: false,
    },
    /** Island Escape act 2: roofed caves lit by glowing crystals and point lights (no sun shadows). */
    cave: {
      sky: ['#05060a', '#0b0d14'], fogColor: '#0d0f18', fog: [28, 95],
      sun: { dir: [0.3, 1, 0.2], color: '#c8d2ff', intensity: 0.42 }, ambient: { sky: '#7c84b4', ground: '#3a332f' },
      shadows: false, exposure: 0.8, grid: false,
    },
    /** Cyber Rush "Neon City": a night city of glowing towers. Grid floors, soft shadows, no clouds; blue floors stay solid. */
    neonNight: {
      sky: ['#0b1026', '#2a1b4d', '#5b2a6e'], fogColor: '#2a1b4d', fog: [60, 230],
      sun: { dir: [0.3, 1, 0.2], color: '#c8b6ff', intensity: 0.38 }, ambient: { sky: '#7a6be0', ground: '#2a2350' },
      water: false, shadowStrength: 0.6, exposure: 1.0,
    },
    /** Indoor / sci-fi rooms (the older Game Kit look): grid floors, no sky dome detail. */
    indoorLab: {
      sky: ['#7fb8f0', '#d9ecfb'], fog: [30, 90],
      sun: { dir: [0.5, 1, 0.3], color: '#fff3dd', intensity: 0.5 }, ambient: { sky: '#8494aa', ground: '#4a433d' },
      shadows: false,
    },
  };
})();
