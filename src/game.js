import { playFireballSound, playGemSlotSound, playUIClick } from './audio.js';
import { createSupportGemAccessors } from './support-gems.js';
import { createInventoryLoot, tooltipRarityColors } from './data/items.js';
import { createSkillTree } from './data/skills.js';
import { createInitialState } from './state.js';
import { clamp, getDistance, wrapText } from './utils.js';
import { baseHeight, baseWidth, canvas, ctx, resizeCanvas } from './canvas.js';
import { createUiPrimitives } from './rendering/ui.js';

let width = baseWidth;
let height = baseHeight;
function applyRenderScale(scale) {
  state.renderScale = Math.max(0.5, Math.min(2, scale));
  canvas.width = Math.round(baseWidth * state.renderScale);
  canvas.height = Math.round(baseHeight * state.renderScale);
  resizeCanvas();
}

resizeCanvas();

const state = createInitialState(width, height);
const { fantasyButton, fantasyPanel, gothicFrame } = createUiPrimitives(ctx);
const { getAbilitySupportCount, hasEquippedAbility } = createSupportGemAccessors(state);

const input = { up: false, down: false, left: false, right: false, fast: false };

const skillTree = createSkillTree(state);

const inventoryLoot = createInventoryLoot(state);

function createBossLoot(x, y) {
  if (state.nullweaveDropped) return null;
  state.nullweaveDropped = true;
  const template = inventoryLoot.find((item) => item.code === 'NC5');
  return { ...template, x, y, radius: 12, picked: false };
}

function maybeDropFireRateModule(x, y) {
  if (Math.random() >= 0.5) return;
  state.items.push({
    name: 'Cycler Module',
    code: 'FR',
     rarity: 'COMMON',
     slotType: 'module',
    color: '#ff9f5a',
    description: '+5% faster shooting.',
    x: x + (Math.random() - 0.5) * 18,
    y: y + (Math.random() - 0.5) * 18,
    radius: 10,
    picked: false,
     activate: () => { state.player.attackCooldownMult /= 1.05; },
     deactivate: () => { state.player.attackCooldownMult *= 1.05; }
  });
}

function collectInventoryItem(item) {
  const existingStack = item.stackable === false
    ? null
    : state.inventory.find((entry) => entry && entry.stackable !== false && entry.code === item.code);
  const emptySlot = state.inventory.findIndex((entry) => !entry);
  const occupiedSlots = state.inventory.reduce((total, entry) => total + (entry ? 1 : 0), 0);
  if (!existingStack && occupiedSlots >= state.inventoryCapacity) {
    state.score += 150;
    state.popupTexts.push({ x: item.x, y: item.y - 18, text: 'INVENTORY FULL  +150', alpha: 1, life: 1.4, color: '#ffcf68' });
    return;
  }
  if (existingStack) {
    existingStack.count = (existingStack.count || 1) + 1;
  } else {
    const normalizedSlotType = item.activate || item.deactivate ? 'module' : item.slotType;
    const inventoryItem = { name: item.name, code: item.code, slotType: normalizedSlotType || 'module', gemType: item.gemType, abilityId: item.abilityId, supportEffect: item.supportEffect, affinities: item.affinities ? [...item.affinities] : undefined, rarity: item.rarity, color: item.color, description: item.description, count: 1, stackable: item.stackable !== false, activate: item.activate, deactivate: item.deactivate, sockets: item.sockets ? [...item.sockets] : undefined };
    if (emptySlot >= 0) state.inventory[emptySlot] = inventoryItem;
    else state.inventory.push(inventoryItem);
  }
  if (item.slotType !== 'module' && item.apply) item.apply();
  state.score += 50;
  state.popupTexts.push({ x: item.x, y: item.y - 18, text: item.name.toUpperCase(), alpha: 1, life: 1.4, color: item.color });
}

function canPurchaseSkill(node) {
  const level = node.level || 0;
  return level < node.maxLevel && (!node.requires || node.requires());
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const bossAlerts = [
  'The night has teeth! Brace yourself!',
  'Something huge is incoming!',
  'The boss smells your courage!',
  'Enemies, unite! Boss has arrived!',
  'Alert: big trouble is on the way!',
  'A massive threat storms the arena!',
  'You activated the chaos meter!',
  'Get ready to rage! Boss inbound!'
];

function triggerBossMessage() {
  const text = bossAlerts[Math.floor(Math.random() * bossAlerts.length)];
  state.bossMessage = {
    text: `BOSS WAVE! ${text}`,
    time: 0,
    duration: 3,
    hue: Math.floor(Math.random() * 360),
    offsetX: -220,
    direction: Math.random() < 0.5 ? -1 : 1
  };
}

function chooseLevelUp(index) {
  if (!state.levelUpActive) return;
  const node = skillTree[index];
  if (!node || state.skillPoints <= 0 || !canPurchaseSkill(node)) return;
  node.apply();
  playUIClick('skill');
  state.skillPoints -= 1;
  if (state.skillPoints <= 0) {
    state.levelUpActive = false;
  }
}

window.addEventListener('resize', () => {
  resizeCanvas();
  if (!state.gameOver) {
    state.player.x = Math.min(baseWidth - state.player.radius, Math.max(state.player.radius, state.player.x));
    state.player.y = Math.min(baseHeight - state.player.radius, Math.max(state.player.radius, state.player.y));
  }
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'End' && !event.repeat) {
    event.preventDefault();
    resetGame();
    playUIClick('close');
    return;
  }
  if ((event.key === 'i' || event.key === 'I') && !event.repeat && !state.gameOver) {
    if (state.socketDragSource) {
      state.socketDragSource.gear.sockets[state.socketDragSource.index] = state.socketDragSource.gem;
    }
    state.inventoryOpen = !state.inventoryOpen;
    state.inventoryDragIndex = -1;
    state.equipmentDragSlot = null;
    state.moduleDragIndex = -1;
    state.socketDragSource = null;
    state.inventoryHoverIndex = -1;
    state.equipmentHoverSlot = null;
    state.moduleHoverIndex = -1;
    state.hoveredSocketGem = null;
    if (state.inventoryOpen) { state.levelUpActive = false; state.paused = false; }
    playUIClick(state.inventoryOpen ? 'open' : 'close');
  }
  if ((event.key === 't' || event.key === 'T') && !event.repeat && !state.gameOver) {
    state.levelUpActive = !state.levelUpActive;
    if (state.levelUpActive) state.inventoryOpen = false;
    playUIClick(state.levelUpActive ? 'open' : 'close');
  }
  if (event.key === 'Escape' && !event.repeat && !state.gameOver) {
    if (state.inventoryOpen) {
      state.inventoryOpen = false;
      playUIClick('close');
    } else if (state.levelUpActive) {
      state.levelUpActive = false;
      playUIClick('close');
    } else {
      state.paused = !state.paused;
      playUIClick(state.paused ? 'open' : 'close');
    }
  }
  if (event.key === 'w' || event.key === 'ArrowUp') input.up = true;
  if (event.key === 's' || event.key === 'ArrowDown') input.down = true;
  if (event.key === 'a' || event.key === 'ArrowLeft') input.left = true;
  if (event.key === 'd' || event.key === 'ArrowRight') input.right = true;
  if (event.key === ' ') input.fast = true;
  if (event.key === 'r' && state.gameOver) resetGame();
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'w' || event.key === 'ArrowUp') input.up = false;
  if (event.key === 's' || event.key === 'ArrowDown') input.down = false;
  if (event.key === 'a' || event.key === 'ArrowLeft') input.left = false;
  if (event.key === 'd' || event.key === 'ArrowRight') input.right = false;
  if (event.key === ' ') input.fast = false;
});

canvas.addEventListener('click', (event) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = baseWidth / rect.width;
  const scaleY = baseHeight / rect.height;
  const clickX = (event.clientX - rect.left) * scaleX;
  const clickY = (event.clientY - rect.top) * scaleY;

  if (state.paused) {
    const healthToggle = state.enemyHealthToggleRect;
    const pullToggle = state.pickupPullToggleRect;
    const shootToggle = state.shootDistanceToggleRect;
    if (healthToggle &&
      clickX >= healthToggle.x && clickX <= healthToggle.x + healthToggle.w &&
      clickY >= healthToggle.y && clickY <= healthToggle.y + healthToggle.h
    ) {
      state.showEnemyHealth = !state.showEnemyHealth;
      playUIClick('toggle');
    } else if (pullToggle &&
      clickX >= pullToggle.x && clickX <= pullToggle.x + pullToggle.w &&
      clickY >= pullToggle.y && clickY <= pullToggle.y + pullToggle.h
    ) {
      state.triplePickupPull = !state.triplePickupPull;
      playUIClick('toggle');
    } else if (shootToggle &&
      clickX >= shootToggle.x && clickX <= shootToggle.x + shootToggle.w &&
      clickY >= shootToggle.y && clickY <= shootToggle.y + shootToggle.h
    ) {
      state.tripleShootDistance = !state.tripleShootDistance;
      playUIClick('toggle');
    }
    return;
  }

  if (!state.levelUpActive) return;
  state.cardRects.forEach((cardRect, index) => {
    if (
      clickX >= cardRect.x && clickX <= cardRect.x + cardRect.w &&
      clickY >= cardRect.y && clickY <= cardRect.y + cardRect.h
    ) {
      chooseLevelUp(index);
    }
  });
});

function updateRenderScaleFromPointer(event) {
  const slider = state.renderScaleSliderRect;
  if (!state.paused || !slider) return;
  const rect = canvas.getBoundingClientRect();
  const clickX = (event.clientX - rect.left) * (baseWidth / rect.width);
  const normalized = Math.max(0, Math.min(1, (clickX - slider.x) / slider.w));
  applyRenderScale(0.5 + normalized * 1.5);
  const soundStep = Math.round(state.renderScale * 20);
  if (soundStep !== state.lastRenderScaleSoundStep) {
    state.lastRenderScaleSoundStep = soundStep;
    playUIClick('confirm');
  }
}

canvas.addEventListener('pointerdown', (event) => {
  if (state.inventoryOpen) {
    const point = getCanvasPointer(event);
    state.inventoryMouseX = point.x;
    state.inventoryMouseY = point.y;
    const equipmentSlot = getEquipmentSlotAtPoint(point.x, point.y);
    const moduleSlot = getModuleSlotAtPoint(point.x, point.y);
    const slot = getInventorySlotAtPointer(event);
    const socket = getSocketAtPoint(point.x, point.y);
    if (socket && socket.gem) {
      state.socketDragSource = socket;
      socket.gear.sockets[socket.index] = null;
      state.hoveredSocketGem = null;
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    } else if (moduleSlot >= 0 && state.moduleSlots[moduleSlot]) {
      state.moduleDragIndex = moduleSlot;
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    } else if (equipmentSlot && state.equipment[equipmentSlot]) {
      state.equipmentDragSlot = equipmentSlot;
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    } else if (slot >= 0 && state.inventory[slot]) {
      state.inventoryDragIndex = slot;
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    }
    return;
  }
  if (!state.paused || !state.renderScaleSliderRect) return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (baseWidth / rect.width);
  const y = (event.clientY - rect.top) * (baseHeight / rect.height);
  const slider = state.renderScaleSliderRect;
  if (x >= slider.x - 20 && x <= slider.x + slider.w + 20 && y >= slider.y - 25 && y <= slider.y + 25) {
    state.draggingRenderScale = true;
    canvas.setPointerCapture(event.pointerId);
    updateRenderScaleFromPointer(event);
  }
});

canvas.addEventListener('pointermove', (event) => {
  if (state.inventoryOpen) {
    const point = getCanvasPointer(event);
    state.inventoryMouseX = point.x;
    state.inventoryMouseY = point.y;
    state.inventoryHoverIndex = getInventorySlotAtPoint(point.x, point.y);
    state.equipmentHoverSlot = getEquipmentSlotAtPoint(point.x, point.y);
    state.moduleHoverIndex = getModuleSlotAtPoint(point.x, point.y);
    const socket = getSocketAtPoint(point.x, point.y);
    state.hoveredSocketGem = socket && socket.gem ? socket.gem : null;
    return;
  }
  if (state.levelUpActive) {
    const rect = canvas.getBoundingClientRect();
    const mx = (event.clientX - rect.left) * (baseWidth / rect.width);
    const my = (event.clientY - rect.top) * (baseHeight / rect.height);
    state.skillMouseX = mx;
    state.skillMouseY = my;
    state.skillHoverIndex = state.cardRects.findIndex((r) =>
      mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h
    );
  }
  if (state.draggingRenderScale) updateRenderScaleFromPointer(event);
});
canvas.addEventListener('pointerleave', () => { state.skillHoverIndex = -1; });

canvas.addEventListener('pointerup', (event) => {
  if (state.inventoryDragIndex >= 0 || state.equipmentDragSlot || state.moduleDragIndex >= 0 || state.socketDragSource) {
    const point = getCanvasPointer(event);
    const targetIndex = getInventorySlotAtPointer(event);
    const targetEquipmentSlot = getEquipmentSlotAtPoint(point.x, point.y);
    const targetModuleIndex = getModuleSlotAtPoint(point.x, point.y);
    if (state.socketDragSource) {
      const source = state.socketDragSource;
      const gem = source.gem;
      const targetGear = targetEquipmentSlot
        ? state.equipment[targetEquipmentSlot]
        : (targetIndex >= 0 ? state.inventory[targetIndex] : null);
      if (socketGem(targetGear, gem)) {
        playGemSlotSound();
      } else if (targetIndex >= 0 && !state.inventory[targetIndex]) {
        state.inventory[targetIndex] = gem;
        playUIClick('confirm');
      } else {
        source.gear.sockets[source.index] = gem;
        playUIClick('close');
      }
    } else if (state.inventoryDragIndex >= 0 && targetModuleIndex >= 0) {
      const heldItem = state.inventory[state.inventoryDragIndex];
      const targetItem = state.moduleSlots[targetModuleIndex];
      if (heldItem && heldItem.slotType === 'module') {
        if (targetItem && targetItem.code === heldItem.code) {
          targetItem.count = (targetItem.count || 1) + (heldItem.count || 1);
          state.inventory[state.inventoryDragIndex] = null;
        } else {
          setModuleActive(targetItem, false);
          state.inventory[state.inventoryDragIndex] = targetItem;
          state.moduleSlots[targetModuleIndex] = heldItem;
        }
        setModuleActive(heldItem, true);
        playUIClick('confirm');
      } else {
        playUIClick('close');
      }
    } else if (state.moduleDragIndex >= 0 && targetModuleIndex >= 0 && targetModuleIndex !== state.moduleDragIndex) {
      const heldItem = state.moduleSlots[state.moduleDragIndex];
      const targetItem = state.moduleSlots[targetModuleIndex];
      if (targetItem && targetItem.code === heldItem.code) {
        targetItem.count = (targetItem.count || 1) + (heldItem.count || 1);
        state.moduleSlots[state.moduleDragIndex] = null;
      } else {
        state.moduleSlots[state.moduleDragIndex] = targetItem;
        state.moduleSlots[targetModuleIndex] = heldItem;
      }
      playUIClick('confirm');
    } else if (state.moduleDragIndex >= 0 && targetIndex >= 0) {
      const heldItem = state.moduleSlots[state.moduleDragIndex];
      const targetItem = state.inventory[targetIndex];
      if (targetItem && targetItem.code === heldItem.code) {
        targetItem.count = (targetItem.count || 1) + (heldItem.count || 1);
        state.moduleSlots[state.moduleDragIndex] = null;
        setModuleActive(heldItem, false);
        playUIClick('confirm');
      } else if (!targetItem || targetItem.slotType === 'module') {
        setModuleActive(heldItem, false);
        setModuleActive(targetItem, true);
        state.moduleSlots[state.moduleDragIndex] = targetItem;
        state.inventory[targetIndex] = heldItem;
        playUIClick('confirm');
      } else {
        playUIClick('close');
      }
    } else if (state.inventoryDragIndex >= 0 && targetEquipmentSlot) {
      const heldItem = state.inventory[state.inventoryDragIndex];
      const targetGear = state.equipment[targetEquipmentSlot];
      if (socketGem(targetGear, heldItem)) {
        state.inventory[state.inventoryDragIndex] = null;
        playGemSlotSound();
      } else if (canEquipItem(heldItem, targetEquipmentSlot)) {
        state.inventory[state.inventoryDragIndex] = state.equipment[targetEquipmentSlot];
        state.equipment[targetEquipmentSlot] = heldItem;
        playUIClick('confirm');
      } else {
        playUIClick('close');
      }
    } else if (state.equipmentDragSlot && targetEquipmentSlot && targetEquipmentSlot !== state.equipmentDragSlot) {
      const heldItem = state.equipment[state.equipmentDragSlot];
      const targetItem = state.equipment[targetEquipmentSlot];
      if (canEquipItem(heldItem, targetEquipmentSlot) && (!targetItem || canEquipItem(targetItem, state.equipmentDragSlot))) {
        state.equipment[state.equipmentDragSlot] = targetItem;
        state.equipment[targetEquipmentSlot] = heldItem;
        playUIClick('confirm');
      } else {
        playUIClick('close');
      }
    } else if (state.equipmentDragSlot && targetIndex >= 0) {
      const heldItem = state.equipment[state.equipmentDragSlot];
      const targetItem = state.inventory[targetIndex];
      if (!targetItem || canEquipItem(targetItem, state.equipmentDragSlot)) {
        state.equipment[state.equipmentDragSlot] = targetItem;
        state.inventory[targetIndex] = heldItem;
        playUIClick('confirm');
      } else {
        playUIClick('close');
      }
    } else if (state.inventoryDragIndex >= 0 && targetIndex >= 0 && targetIndex !== state.inventoryDragIndex) {
      const heldItem = state.inventory[state.inventoryDragIndex];
      const targetItem = state.inventory[targetIndex];
      if (socketGem(targetItem, heldItem)) {
        state.inventory[state.inventoryDragIndex] = null;
        playGemSlotSound();
      } else {
        state.inventory[state.inventoryDragIndex] = targetItem;
        state.inventory[targetIndex] = heldItem;
        playUIClick('confirm');
      }
    }
    state.inventoryDragIndex = -1;
    state.equipmentDragSlot = null;
    state.moduleDragIndex = -1;
    state.socketDragSource = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    return;
  }
  if (!state.draggingRenderScale) return;
  state.draggingRenderScale = false;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
});

function createEnemy(isBoss = false) {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = Math.random() * width; y = -20; }
  if (edge === 1) { x = Math.random() * width; y = height + 20; }
  if (edge === 2) { x = -20; y = Math.random() * height; }
  if (edge === 3) { x = width + 20; y = Math.random() * height; }
  if (isBoss) {
    const size = 12 + Math.random() * 8;
    let bossHealth = Math.max(10, state.player.level * 10) * 1.5;
    let bossSpeed = 35 * 3;
    if (state.wave >= 20) {
      bossHealth *= (5 + state.wave / 100);
      bossSpeed *= 2;
    }
    state.enemies.push({
      x,
      y,
      radius: size * 2.25,
      speed: bossSpeed,
      health: bossHealth,
      maxHealth: bossHealth,
      tint: '48,8,76',
      boss: true,
      shootTimer: 0,
      shootDelay: 1.0,
      mergeLevel: undefined,
      damageMult: 1,
      hitShake: 0,
      haloTimer: 5 + Math.random() * 55,
      haloPulse: 0,
      lastHitCooldown: 0
    });
  } else {
    const size = 12 + Math.random() * 8;
    const levelSpeed = 1 + (state.player.level - 1) * 0.01;
    const eliteChance = Math.min(0.15, 0.0025 * state.wave);
    const isElite = state.wave > 10 && Math.random() < eliteChance;
    const eliteScale = isElite ? 1.5 : 1;
    const baseSpeed = (60 + Math.random() * 40) * levelSpeed * 1.25;
    const speed = baseSpeed * (isElite ? 1.5 : 1);
    const normalHealth = Math.max(1, Math.round(state.wave * 0.25 * 1.5));
    const health = isElite ? Math.max(5, Math.round(state.wave * 5 * 1.5)) : normalHealth;
    state.enemies.push({
      x,
      y,
      radius: size * eliteScale * 0.5,
      speed,
      health,
      maxHealth: health,
      tint: isElite ? '180,60,240' : `${Math.random() * 40 + 200},50,50`,
      elite: isElite,
      mergeLevel: isElite ? undefined : 0,
      damageMult: 1,
      hitShake: 0,
      haloTimer: 5 + Math.random() * 55,
      haloPulse: 0,
      lastHitCooldown: 0
    });
  }
}

function spawnWave() {
  state.bossActive = false;
  if (state.wave % 5 === 0 && state.wave !== state.lastBossLevel) {
    state.lastBossLevel = state.wave;
    state.bossActive = true;
    createEnemy(true);
    triggerBossMessage();
  } else {
    const levelScale = 1 + (state.player.level - 1) * 0.1;
    const count = Math.min(15, Math.max(1, Math.ceil((4 + state.wave * 2) * levelScale * 0.5)));
    for (let i = 0; i < count; i++) createEnemy();
  }
  state.spawnTimer = 0;
}

function spawnBossCookEffect(x, y, item) {
  const hue = Math.floor(Math.random() * 360);
  const effect = {
    x,
    y,
    time: 0,
    duration: 1.8,
    fadeTimer: 0,
    particles: [],
    arms: 12,
    twist: Math.random() * Math.PI * 2,
    hue,
    persistentItem: item || null,
    picked: false
  };
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    effect.particles.push({
      x,
      y,
      angle,
      speed: 80 + Math.random() * 180,
      radius: 2 + Math.random() * 4,
      life: 1.8 + Math.random() * 1.2,
      alpha: 1,
      color: `hsla(${hue}, 90%, ${55 + Math.random() * 20}%,`
    });
  }
  state.cookEffects.push(effect);
}

function spawnBossExplosion(x, y) {
  const effect = { x, y, particles: [], age: 0, duration: 1.8 };
  for (let i = 0; i < 130; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 620;
    const hotCore = i < 40;
    effect.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: hotCore ? 3 + Math.random() * 7 : 1.5 + Math.random() * 4,
      life: 0.7 + Math.random() * 1.1,
      alpha: 1,
      color: hotCore
        ? `hsla(${285 + Math.random() * 35}, 100%, ${65 + Math.random() * 25}%,`
        : `hsla(${185 + Math.random() * 125}, 100%, ${45 + Math.random() * 30}%,`
    });
  }
  state.explosions.push(effect);
}

function spawnOrbParticles(x, y) {
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 80;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 1 + Math.random() * 1.2,
      life: 0.5 + Math.random() * 0.3,
      alpha: 1,
      color: 'rgba(255,215,0,'
    });
  }
}

function spawnOrbSparkles(orb) {
  orb.sparkles = [];
  orb.sparkTimer = 0;
  orb.sheenTimer = 1 + Math.random() * 2;
  orb.sheenProgress = -1;
  for (let i = 0; i < 10; i++) {
    orb.sparkles.push({
      angle: Math.random() * Math.PI * 2,
      distance: orb.radius + 3 + Math.random() * 3,
      speed: 1 + Math.random() * 1.2,
      size: 1 + Math.random() * 1.5,
      pulse: Math.random() * Math.PI * 2,
      alpha: 0.6 + Math.random() * 0.4
    });
  }
}

function spawnMobDeathEffect(x, y, elite) {
  const hue = elite ? 280 : 40;
  const brightness = elite ? 70 : 65;
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 120;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 1 + Math.random() * 2,
      life: 0.5 + Math.random() * 0.4,
      alpha: 1,
      color: `hsla(${hue}, 90%, ${brightness}%,`
    });
  }
}

function resetGame() {
  state.player.x = width / 2;
  state.player.y = height / 2;
  state.player.health = 100;
  state.player.maxHealth = 100;
  state.player.level = 1;
  state.player.xp = 0;
  state.player.xpToNext = 20;
  state.player.speed = 240;
  state.player.bulletSpeedMult = 1;
  state.player.bulletDamage = 1;
  state.player.xpGainMult = 1;
  state.player.orbPullMult = 1;
  state.player.detectionRange = 500;
  state.player.projectileCount = 1;
  state.player.pierce = 0;
  state.player.forkCount = 0;
  state.player.heatSeeking = false;
  state.player.specialAttackCount = 0;
  state.player.attackCooldownMult = 1;
  state.player.regenRate = 0;
  state.player.regenTimer = 0;
  state.player.aoeEnabled = false;
  state.player.aoeRadius = 120;
  state.player.aoeDamage = 1;
  state.player.aoeTimer = 0;
  state.player.aoeTickInterval = 0.5;
  state.displayHealth = state.player.health;
  state.healthText = Math.round(state.player.health);
  state.healthUpdateTimer = 0;
  state.bullets = [];
  state.enemies = [];
  state.orbs = [];
  state.items = [];
  state.groundFires = [];
  const starterGear = inventoryLoot.find((item) => item.code === 'NC5');
  const starterFireballGem = inventoryLoot.find((item) => item.code === 'FB');
  const starterSupportGems = inventoryLoot.filter((item) => item.gemType === 'support');
  state.inventory = [
    { ...starterGear, sockets: [...starterGear.sockets], count: 1 },
    { ...starterFireballGem, affinities: [...starterFireballGem.affinities], count: 1 },
    ...starterSupportGems.map((gem) => ({ ...gem, affinities: [...gem.affinities], count: 1 }))
  ];
  Object.keys(state.equipment).forEach((slot) => { state.equipment[slot] = null; });
  state.moduleSlots = [null, null, null];
  state.inventoryOpen = false;
  state.inventoryDragIndex = -1;
  state.equipmentDragSlot = null;
  state.moduleDragIndex = -1;
  state.socketDragSource = null;
  state.inventoryHoverIndex = -1;
  state.equipmentHoverSlot = null;
  state.moduleHoverIndex = -1;
  state.hoveredSocketGem = null;
  state.levelUpEffects = [];
  state.score = 0;
  state.wave = 1;
  state.time = 0;
  state.lastShot = 0;
  state.lastFireball = 0;
  state.spawnTimer = 0;
  state.mergeTimer = 0;
  state.player.hitShake = 0;
  state.lastBossLevel = 0;
  state.bossActive = false;
  state.nullweaveDropped = false;
  state.levelUpActive = false;
  state.skillPoints = 0;
  state.gameOver = false;
  state.paused = false;
  skillTree.forEach((node) => { node.level = 0; });
  if (state.stars.length === 0) initializeStarfield();
  spawnWave();
}

function getOrbXpAmount(orb) {
  const levelBonus = 1 + state.player.level * 0.1;
  const gainedXp = Math.ceil(orb.xp * state.player.xpGainMult * levelBonus);
  const minimumXp = orb.special
    ? Math.ceil(state.player.xpToNext)
    : Math.ceil(1 + state.player.level + state.player.xpToNext * 0.005);
  return Math.max(gainedXp, minimumXp);
}

function resetStar(star, initial = false) {
  const angle = Math.random() * Math.PI * 2;
  const distance = initial ? Math.random() * Math.hypot(width, height) * 0.55 : 10 + Math.random() * 55;
  star.x = width / 2 + Math.cos(angle) * distance;
  star.y = height / 2 + Math.sin(angle) * distance;
  star.depth = 0.25 + Math.random() * 0.75;
  star.size = 0.4 + star.depth * 1.5;
  star.twinkle = Math.random() * Math.PI * 2;
}

function initializeStarfield() {
  state.stars = Array.from({ length: 170 }, () => {
    const star = {};
    resetStar(star, true);
    return star;
  });
}

function updateStarfield(delta) {
  for (const star of state.stars) {
    const dx = star.x - width / 2;
    const dy = star.y - height / 2;
    const distance = Math.hypot(dx, dy) || 1;
    const speed = (18 + distance * 0.035) * star.depth;
    star.x += (dx / distance) * speed * delta;
    star.y += (dy / distance) * speed * delta;
    star.twinkle += delta * (1.2 + star.depth * 2);
    if (star.x < -20 || star.x > width + 20 || star.y < -20 || star.y > height + 20) resetStar(star);
  }
}

function spawnImpact(x, y, color = 'rgba(255,210,90,') {
  const room = Math.max(0, 1800 - state.particles.length);
  const count = Math.min(10, room);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 170;
    state.particles.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      radius: 1.2 + Math.random() * 2.2, life: 0.18 + Math.random() * 0.25,
      alpha: 1, color
    });
  }
}

function spawnFireballTrail(bullet) {
  if (state.particles.length >= 1800 || Math.random() > 0.78) return;
  const speed = Math.hypot(bullet.vx, bullet.vy) || 1;
  const backX = -bullet.vx / speed;
  const backY = -bullet.vy / speed;
  state.particles.push({
    x: bullet.x + backX * bullet.radius * 0.8 + (Math.random() - 0.5) * 5,
    y: bullet.y + backY * bullet.radius * 0.8 + (Math.random() - 0.5) * 5,
    vx: backX * (25 + Math.random() * 35) + (Math.random() - 0.5) * 18,
    vy: backY * (25 + Math.random() * 35) + (Math.random() - 0.5) * 18,
    radius: 1.5 + Math.random() * 2.8,
    life: 0.18 + Math.random() * 0.2,
    alpha: 0.1,
    maxAlpha: 0.1,
    color: Math.random() < 0.5 ? 'rgba(255,105,20,' : 'rgba(255,205,70,'
  });
}

function spawnFireballHitFX(x, y) {
  const room = Math.max(0, 1800 - state.particles.length);
  const count = Math.min(22, room);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 55 + Math.random() * 230;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - Math.random() * 35,
      radius: 1.5 + Math.random() * 4.5,
      life: 0.25 + Math.random() * 0.45,
      alpha: 0.32,
      maxAlpha: 0.32,
      color: i % 3 === 0 ? 'rgba(255,225,110,' : (i % 2 ? 'rgba(255,75,20,' : 'rgba(255,145,35,')
    });
  }
}

function damageEnemiesInRadius(x, y, radius, damage, ignoredEnemy = null) {
  state.enemies.forEach((enemy) => {
    if (enemy === ignoredEnemy || getDistance(enemy, { x, y }) > radius + enemy.radius) return;
    enemy.health -= damage;
    enemy.hitShake = 0.12;
    spawnImpact(enemy.x, enemy.y, 'rgba(255,105,25,');
  });
}

function applyFireballSupportImpact(bullet, enemy) {
  const blastRadius = bullet.expanding ? 155 : 88;
  if (bullet.detonation || bullet.expanding) damageEnemiesInRadius(bullet.x, bullet.y, blastRadius, bullet.damage * (bullet.expanding ? 0.375 : 0.5), enemy);
  if (bullet.aftershock) {
    const x = bullet.x, y = bullet.y, damage = bullet.damage * 0.5;
    setTimeout(() => {
      if (state.gameOver) return;
      spawnFireballHitFX(x, y);
      damageEnemiesInRadius(x, y, blastRadius, damage);
    }, 320);
  }
  if (bullet.burningGround) state.groundFires.push({ x: bullet.x, y: bullet.y, radius: bullet.expanding ? 105 : 72, life: 2, tick: 0, damage: bullet.damage * 0.16 });
  if (bullet.ignite) {
    enemy.burnTime = bullet.wildfire ? 2.25 : 3;
    enemy.burnDps = Math.max(enemy.burnDps || 0, bullet.damage * 0.32);
    enemy.wildfire = Boolean(bullet.wildfire);
  }
  if (bullet.blackHole) {
    state.enemies.forEach((other) => {
      if (other === enemy) return;
      const dx = bullet.x - other.x, dy = bullet.y - other.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance < 190) {
        other.x += (dx / distance) * Math.min(55, distance * 0.35);
        other.y += (dy / distance) * Math.min(55, distance * 0.35);
      }
    });
  }
  if (bullet.chainRemaining > 0) {
    const next = state.enemies.filter((candidate) => candidate !== enemy && getDistance(candidate, bullet) < 260)
      .sort((a, b) => getDistance(a, bullet) - getDistance(b, bullet))[0];
    if (next) {
      const angle = Math.atan2(next.y - bullet.y, next.x - bullet.x);
      state.bullets.push({ ...bullet, vx: Math.cos(angle) * bullet.speed, vy: Math.sin(angle) * bullet.speed, damage: bullet.damage * 0.7, pierce: 0, life: 0.9, maxLife: 0.9, chainRemaining: bullet.chainRemaining - 1, supportForkCount: 0, hasForked: true, ignoreEnemy: enemy });
    }
  }
}

function spawnSupportedProjectilesOnKill(bullet, enemy) {
  const spawnShots = (count, damageMult, colorFireball = true) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.35;
      const speed = 300;
      state.bullets.push({
        x: enemy.x, y: enemy.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        speed, radius: 5, damage: Math.max(1, bullet.damage * damageMult), pierce: 0,
        life: 0.85, maxLife: 0.85, owner: 'player', fireball: colorFireball,
        hasForked: true, supportForkCount: 0, splitDeath: false, ignoreEnemy: enemy
      });
    }
  };
  if (bullet.splitDeath) spawnShots(2, 0.6);
  if (bullet.cinderburst) spawnShots(3, 0.6);
  if (bullet.wildfire && enemy.wildfire) {
    spawnFireballHitFX(enemy.x, enemy.y);
    damageEnemiesInRadius(enemy.x, enemy.y, 105, bullet.damage * 0.55, enemy);
  }
}

function mergeNearbyEnemies() {
  for (let i = 0; i < state.enemies.length; i++) {
    const a = state.enemies[i];
    if (a.boss || a.elite || (a.mergeLevel || 0) >= 4) continue;
    for (let j = i + 1; j < state.enemies.length; j++) {
      const b = state.enemies[j];
      if (b.boss || b.elite || (b.mergeLevel || 0) >= 4) continue;
      const nextLevel = Math.max(a.mergeLevel || 0, b.mergeLevel || 0) + 1;
      if (nextLevel > 4 || getDistance(a, b) > a.radius + b.radius + 8) continue;
      a.x = (a.x + b.x) / 2; a.y = (a.y + b.y) / 2;
      a.health += b.health; a.maxHealth += b.maxHealth;
      a.damageMult = (a.damageMult || 1) + (b.damageMult || 1);
      a.mergeLevel = nextLevel;
      a.radius = Math.min(36, Math.sqrt(a.radius * a.radius + b.radius * b.radius) * 0.9);
      a.speed = Math.min(a.speed, b.speed) * 0.96;
      const purple = 45 + nextLevel * 30;
      a.tint = `${Math.max(85, 205 - nextLevel * 25)},${Math.max(25, 50 - nextLevel * 4)},${purple}`;
      spawnImpact(a.x, a.y, 'rgba(180,55,255,');
      state.enemies.splice(j, 1);
      break;
    }
  }
}

function updateOrbFusion(delta) {
  for (let i = state.orbs.length - 1; i >= 0; i--) {
    const orb = state.orbs[i];
    const permanentCorruption = Math.min(0.9, (orb.absorbed || 0) * 0.14);
    orb.corruption = Math.max(permanentCorruption, (orb.corruption || 0) - delta * 0.025);
    orb.energyPulse = (orb.energyPulse || Math.random() * Math.PI * 2) + delta * 3.2;
    orb.energySparkTimer = (orb.energySparkTimer || 0) - delta;
    if ((orb.absorbed || 0) >= 4 && orb.energySparkTimer <= 0 && state.particles.length < 1800) {
      orb.energySparkTimer = 0.12 + Math.random() * 0.16;
      const angle = Math.random() * Math.PI * 2;
      const fieldRadius = orb.radius + 10;
      state.particles.push({
        x: orb.x + Math.cos(angle) * fieldRadius,
        y: orb.y + Math.sin(angle) * fieldRadius,
        vx: Math.cos(angle) * (8 + Math.random() * 18),
        vy: Math.sin(angle) * (8 + Math.random() * 18),
        radius: 0.8 + Math.random() * 1.8,
        life: 0.25 + Math.random() * 0.3,
        alpha: 0.8,
        color: Math.random() < 0.5 ? 'rgba(255,30,100,' : 'rgba(175,35,255,'
      });
    }
    orb.fusionSparkTimer = (orb.fusionSparkTimer || 0) - delta;
    let nearestIndex = -1;
    let nearestDistance = Infinity;
    for (let j = 0; j < state.orbs.length; j++) {
      if (i === j) continue;
      const other = state.orbs[j];
      const distance = getDistance(orb, other);
      const fusionRange = (orb.radius + other.radius) * 21;
      if (distance < fusionRange && distance < nearestDistance) {
        nearestIndex = j;
        nearestDistance = distance;
      }
    }
    if (nearestIndex < 0) continue;
    const other = state.orbs[nearestIndex];
    const dx = other.x - orb.x;
    const dy = other.y - orb.y;
    const distance = Math.hypot(dx, dy) || 1;
    const pull = 24 + (1 - distance / ((orb.radius + other.radius) * 21)) * 80;
    orb.vx += (dx / distance) * pull * delta;
    orb.vy += (dy / distance) * pull * delta;
    orb.corruption = Math.min(1, (orb.corruption || 0) + delta * 0.55);
    other.corruption = Math.min(1, (other.corruption || 0) + delta * 0.3);

    if (orb.fusionSparkTimer <= 0 && state.particles.length < 1800) {
      orb.fusionSparkTimer = 0.09 + Math.random() * 0.1;
      const dark = Math.random() < 0.48;
      state.particles.push({
        x: orb.x + (Math.random() - 0.5) * orb.radius * 2,
        y: orb.y + (Math.random() - 0.5) * orb.radius * 2,
        vx: (Math.random() - 0.5) * 35, vy: (Math.random() - 0.5) * 35,
        radius: 1 + Math.random() * 2.2, life: 0.3 + Math.random() * 0.35,
        alpha: 0.9, color: dark ? 'rgba(3,0,8,' : 'rgba(255,25,55,', dark
      });
    }

    if (distance > orb.radius + other.radius + 1) continue;
    const survivor = orb;
    const absorbed = other;
    survivor.xp += absorbed.xp;
    survivor.special = survivor.special || absorbed.special;
    survivor.absorbed = (survivor.absorbed || 0) + (absorbed.absorbed || 0) + 1;
    survivor.radius = Math.min(14, 6 + Math.sqrt(survivor.absorbed) * 1.6 + (survivor.special ? 2 : 0));
    survivor.corruption = 1;
    spawnImpact(survivor.x, survivor.y, 'rgba(210,25,255,');
    state.orbs.splice(nearestIndex, 1);
  }
}

function update(delta) {
  if (state.gameOver) return;
  if (state.paused || state.inventoryOpen) return;
  if (state.levelUpActive) return;
  state.time += delta;
  state.spawnTimer += delta;
  state.mergeTimer = (state.mergeTimer || 0) + delta;
  state.player.hitShake = Math.max(0, (state.player.hitShake || 0) - delta);
  updateStarfield(delta);
  updateOrbFusion(delta);
  if (state.mergeTimer >= 0.18) { state.mergeTimer = 0; mergeNearbyEnemies(); }
  state.player.regenTimer += delta;
  state.healthUpdateTimer += delta;
  state.displayHealth += (state.player.health - state.displayHealth) * Math.min(1, delta / 0.1);
  if (state.healthUpdateTimer >= 0.1) {
    state.healthText = Math.round(state.displayHealth);
    state.healthUpdateTimer -= 0.1;
  }
  let waveSpawned = false;

  if (state.player.regenRate > 0 && state.player.regenTimer >= 1) {
    const regenAmount = Math.floor(state.player.regenRate * state.player.regenTimer);
    state.player.health = Math.min(state.player.maxHealth, state.player.health + regenAmount);
    state.player.regenTimer %= 1;
  }

  const dirX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const dirY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const speed = state.player.speed * delta;
  if (dirX !== 0 || dirY !== 0) {
    const length = Math.hypot(dirX, dirY);
    state.player.x += (dirX / length) * speed;
    state.player.y += (dirY / length) * speed;
  }
  state.player.x = clamp(state.player.x, state.player.radius, width - state.player.radius);
  state.player.y = clamp(state.player.y, state.player.radius, height - state.player.radius);

  if (state.time - state.lastShot > 1.0 * (state.player.attackCooldownMult || 1)) {
    if (shootProjectile()) state.lastShot = state.time;
  }
  if (hasEquippedAbility('fireball') && state.time - state.lastFireball > getFireballCooldown()) {
    if (shootFireball()) {
      state.lastFireball = state.time;
      playFireballSound();
    }
  }

  if (state.player.aoeEnabled) {
    state.player.aoeTimer += delta;
    if (state.player.aoeTimer >= state.player.aoeTickInterval) {
      const aoeDamage = Math.max(1, state.player.aoeDamage || 1);
      for (let enemyIndex = state.enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
        const enemy = state.enemies[enemyIndex];
        if (getDistance(enemy, state.player) < state.player.aoeRadius + enemy.radius) {
          enemy.health -= aoeDamage;
          enemy.hitShake = 0.12;
          spawnImpact(enemy.x, enemy.y, 'rgba(90,220,255,');
          state.popupTexts.push({
            x: enemy.x,
            y: enemy.y - enemy.radius - 10,
            text: `-${aoeDamage}`,
            alpha: 1,
            life: 0.8,
            color: '#7adcff'
          });
          if (enemy.health <= 0) {
            state.score += enemy.boss ? 50 : 10;
            const xpValue = enemy.boss ? 250 : 5;
            const shouldDropOrb = enemy.boss || Math.random() < 0.8;
            if (shouldDropOrb) {
              const orb = { x: enemy.x, y: enemy.y, vx: 0, vy: 0, radius: enemy.boss ? 10 : 6, xp: xpValue, special: enemy.boss, sparkles: [], sparkTimer: 0 };
              state.orbs.push(orb);
              if (!enemy.boss) spawnOrbParticles(enemy.x, enemy.y);
              spawnOrbSparkles(orb);
            }
            if (!enemy.boss) spawnMobDeathEffect(enemy.x, enemy.y, enemy.elite);
            if (enemy.boss) {
              const item = createBossLoot(enemy.x, enemy.y);
              if (item) state.items.push(item);
              state.bossActive = false;
              if (item) spawnBossCookEffect(enemy.x, enemy.y, item);
              spawnBossExplosion(enemy.x, enemy.y);
            } else {
              const item = createBossLoot(enemy.x, enemy.y);
              if (item) state.items.push(item);
            }
            maybeDropFireRateModule(enemy.x, enemy.y);
            state.enemies.splice(enemyIndex, 1);
          }
        }
      }
      state.player.aoeTimer %= state.player.aoeTickInterval;
    }
  }

  for (let index = state.bullets.length - 1; index >= 0; index--) {
    const bullet = state.bullets[index];
    if (typeof bullet.life === 'number') {
      bullet.life -= delta;
      if (bullet.life <= 0) {
        state.bullets.splice(index, 1);
        continue;
      }
    }
    if (bullet.orbitTime > 0) {
      bullet.orbitTime -= delta;
      bullet.orbitAngle = (bullet.orbitAngle ?? Math.atan2(bullet.vy, bullet.vx)) + delta * 9;
      bullet.x = state.player.x + Math.cos(bullet.orbitAngle) * 46;
      bullet.y = state.player.y + Math.sin(bullet.orbitAngle) * 46;
      if (bullet.fireball) spawnFireballTrail(bullet);
      if (bullet.orbitTime > 0) continue;
      const orbitTarget = state.enemies.includes(bullet.homingTarget) ? bullet.homingTarget : state.enemies[0];
      const launchAngle = orbitTarget ? Math.atan2(orbitTarget.y - bullet.y, orbitTarget.x - bullet.x) : bullet.orbitAngle;
      bullet.vx = Math.cos(launchAngle) * bullet.speed;
      bullet.vy = Math.sin(launchAngle) * bullet.speed;
    }
    if (bullet.accelerating) {
      const acceleration = 1 + delta * 0.65;
      bullet.vx *= acceleration;
      bullet.vy *= acceleration;
      bullet.speed = Math.min(850, (bullet.speed || 330) * acceleration);
      bullet.damage *= 1 + delta * 0.22;
    }
    if (bullet.returning && !bullet.didReturn && bullet.maxLife && bullet.life < bullet.maxLife * 0.45) {
      bullet.didReturn = true;
      const returnAngle = Math.atan2(state.player.y - bullet.y, state.player.x - bullet.x);
      bullet.vx = Math.cos(returnAngle) * bullet.speed;
      bullet.vy = Math.sin(returnAngle) * bullet.speed;
    }
    // homing behavior for heat-seeking bullets
    if (bullet.homing) {
      let nearest = state.enemies.includes(bullet.homingTarget) ? bullet.homingTarget : null;
      if (!nearest) {
        let nd = 1e9;
        for (let e = 0; e < state.enemies.length; e++) {
          const enemy = state.enemies[e];
          const d = getDistance(enemy, bullet);
          if (d < nd) { nd = d; nearest = enemy; }
        }
        bullet.homingTarget = nearest;
      }
      if (nearest) {
        const dx = nearest.x - bullet.x;
        const dy = nearest.y - bullet.y;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = bullet.speed || Math.hypot(bullet.vx, bullet.vy) || 300;
        const desiredVx = (dx / dist) * speed;
        const desiredVy = (dy / dist) * speed;
        const t = Math.min(1, (bullet.homingStrength || 6) * delta);
        bullet.vx += (desiredVx - bullet.vx) * t;
        bullet.vy += (desiredVy - bullet.vy) * t;
        const mag = Math.hypot(bullet.vx, bullet.vy) || speed;
        bullet.vx = (bullet.vx / mag) * speed;
        bullet.vy = (bullet.vy / mag) * speed;
      }
    }
    if (bullet.bossShot) {
      bullet.pulse += delta * 11;
      for (let p = 0; p < 2; p++) {
        state.particles.push({
          x: bullet.x + (Math.random() - 0.5) * 7,
          y: bullet.y + (Math.random() - 0.5) * 7,
          vx: -bullet.vx * (0.08 + Math.random() * 0.1) + (Math.random() - 0.5) * 35,
          vy: -bullet.vy * (0.08 + Math.random() * 0.1) + (Math.random() - 0.5) * 35,
          radius: 1.5 + Math.random() * 2.5,
          life: 0.22 + Math.random() * 0.28,
          alpha: 0.9,
          color: Math.random() < 0.35 ? 'rgba(255,20,190,' : 'rgba(105,20,255,'
        });
      }
    }
    if (bullet.fireball) spawnFireballTrail(bullet);
    bullet.x += bullet.vx * delta;
    bullet.y += bullet.vy * delta;

    if (bullet.owner === 'enemy' && getDistance(bullet, state.player) < bullet.radius + state.player.radius) {
      state.player.health -= bullet.damage;
      state.player.hitShake = 0.18;
      spawnImpact(bullet.x, bullet.y, 'rgba(190,45,255,');
      state.bullets.splice(index, 1);
      if (state.player.health <= 0) state.gameOver = true;
      continue;
    }

    if (bullet.x < -20 || bullet.x > width + 20 || bullet.y < -20 || bullet.y > height + 20) {
      if (bullet.ricochets > 0) {
        if (bullet.x < -20 || bullet.x > width + 20) bullet.vx *= -1;
        if (bullet.y < -20 || bullet.y > height + 20) bullet.vy *= -1;
        bullet.x = clamp(bullet.x, -18, width + 18);
        bullet.y = clamp(bullet.y, -18, height + 18);
        bullet.ricochets -= 1;
      } else {
        state.bullets.splice(index, 1);
      }
    }
  }

  for (let enemyIndex = state.enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
    const enemy = state.enemies[enemyIndex];
    enemy.hitShake = Math.max(0, (enemy.hitShake || 0) - delta);
    if (enemy.burnTime > 0) {
      enemy.burnTime -= delta;
      enemy.health = Math.max(1, enemy.health - (enemy.burnDps || 0) * delta);
      if (Math.random() < delta * 12) spawnImpact(enemy.x, enemy.y, 'rgba(255,85,20,');
    }
    enemy.haloTimer = (enemy.haloTimer ?? (5 + Math.random() * 55)) - delta;
    enemy.haloPulse = Math.max(0, (enemy.haloPulse || 0) - delta / 1.35);
    if (enemy.haloTimer <= 0) {
      enemy.haloPulse = 1;
      enemy.haloTimer = 5 + Math.random() * 55;
    }
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    enemy.x += (dx / dist) * enemy.speed * delta;
    enemy.y += (dy / dist) * enemy.speed * delta;

    if (enemy.boss) {
      enemy.shootTimer += delta;
      if (enemy.shootTimer >= enemy.shootDelay) {
        enemy.shootTimer = 0;
        shootBossProjectile(enemy);
      }
    }

    enemy.lastHitCooldown = Math.max(0, enemy.lastHitCooldown - delta);
    if (getDistance(enemy, state.player) < enemy.radius + state.player.radius) {
      if (enemy.lastHitCooldown <= 0) {
        const baseDamage = Math.max(1, Math.round(1 + state.player.level * 0.1));
        const hitDamage = (enemy.boss ? baseDamage * 10 : baseDamage) * (enemy.damageMult || 1);
        state.player.health -= hitDamage;
        state.player.hitShake = 0.18;
        enemy.hitShake = 0.12;
        spawnImpact((enemy.x + state.player.x) / 2, (enemy.y + state.player.y) / 2, 'rgba(255,75,100,');
        enemy.lastHitCooldown = 1;
        state.popupTexts.push({
          x: state.player.x,
          y: state.player.y - state.player.radius - 10,
          text: `-${hitDamage}`,
          alpha: 1,
          life: 0.8,
          color: '#ff6b6b'
        });
        if (state.player.health <= 0) state.gameOver = true;
      }
    }

    for (let bulletIndex = state.bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
      const bullet = state.bullets[bulletIndex];
      // Enemy projectiles can only damage the player. Without this guard,
      // boss shots collide with and damage other enemies (including bosses).
      if (bullet.owner !== 'player') continue;
      if (bullet.ignoreEnemy !== enemy && getDistance(enemy, bullet) < enemy.radius + bullet.radius) {
        enemy.health -= bullet.damage;
        enemy.hitShake = 0.14;
        spawnImpact(bullet.x, bullet.y, bullet.fireball ? 'rgba(255,85,25,' : (enemy.boss ? 'rgba(205,45,255,' : 'rgba(255,210,90,'));
        if (bullet.fireball) spawnFireballHitFX(bullet.x, bullet.y);
        if (bullet.fireball) applyFireballSupportImpact(bullet, enemy);
        state.popupTexts.push({
          x: enemy.x,
          y: enemy.y - enemy.radius - 10,
          text: `-${bullet.damage}`,
          alpha: 1,
          life: 0.8,
          color: '#ffd166'
        });
        bullet.pierce -= 1;
        const supportForkCount = bullet.supportForkCount || 0;
        const totalForkCount = Math.max(supportForkCount, state.player.forkCount || 0);
        if (!bullet.hasForked && totalForkCount > 0) {
          bullet.hasForked = true;
          const baseAngle = Math.atan2(bullet.vy, bullet.vx);
          const forkCount = totalForkCount;
          for (let fork = 0; fork < forkCount; fork++) {
            const side = fork % 2 === 0 ? 1 : -1;
            const tier = Math.floor(fork / 2) + 1;
            const forkAngle = baseAngle + side * (0.28 + tier * 0.16);
            const forkSpeed = (bullet.speed || Math.hypot(bullet.vx, bullet.vy)) * 0.92;
            state.bullets.push({
              x: bullet.x, y: bullet.y,
              vx: Math.cos(forkAngle) * forkSpeed, vy: Math.sin(forkAngle) * forkSpeed,
              speed: forkSpeed, radius: Math.max(2, bullet.radius * 0.9),
              damage: Math.max(1, Math.ceil(bullet.damage * 0.65)), pierce: 0, life: 0.8,
              owner: 'player', homing: false, hasForked: true, ignoreEnemy: enemy,
              fireball: Boolean(bullet.fireball), supportForkCount: 0
            });
          }
        }
        if (enemy.health <= 0) {
          if (bullet.fireball) spawnSupportedProjectilesOnKill(bullet, enemy);
          state.score += enemy.boss ? 50 : 10;
          const xpValue = enemy.boss ? 250 : 5;
          const shouldDropOrb = enemy.boss || Math.random() < 0.8;
          if (shouldDropOrb) {
            const orb = { x: enemy.x, y: enemy.y, vx: 0, vy: 0, radius: enemy.boss ? 10 : 6, xp: xpValue, special: enemy.boss, sparkles: [], sparkTimer: 0 };
            state.orbs.push(orb);
            if (!enemy.boss) spawnOrbParticles(enemy.x, enemy.y);
            spawnOrbSparkles(orb);
          }
          if (!enemy.boss) spawnMobDeathEffect(enemy.x, enemy.y, enemy.elite);
          if (enemy.boss) {
            const item = createBossLoot(enemy.x, enemy.y);
            if (item) state.items.push(item);
            state.bossActive = false;
            if (item) spawnBossCookEffect(enemy.x, enemy.y, item);
            spawnBossExplosion(enemy.x, enemy.y);
          } else {
            const item = createBossLoot(enemy.x, enemy.y);
            if (item) state.items.push(item);
          }
          maybeDropFireRateModule(enemy.x, enemy.y);
          if (bullet.pierce < 0) {
            state.bullets.splice(bulletIndex, 1);
          }
          state.enemies.splice(enemyIndex, 1);
          break;
        }
        if (bullet.pierce < 0) {
          state.bullets.splice(bulletIndex, 1);
        }
      }
    }
  }

  for (let fireIndex = state.groundFires.length - 1; fireIndex >= 0; fireIndex--) {
    const fire = state.groundFires[fireIndex];
    fire.life -= delta;
    fire.tick += delta;
    if (fire.tick >= 0.25) {
      fire.tick %= 0.25;
      state.enemies.forEach((enemy) => {
        if (getDistance(enemy, fire) < fire.radius + enemy.radius) enemy.health = Math.max(1, enemy.health - fire.damage);
      });
    }
    if (Math.random() < delta * 22) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * fire.radius;
      state.particles.push({ x: fire.x + Math.cos(angle) * radius, y: fire.y + Math.sin(angle) * radius, vx: 0, vy: -25 - Math.random() * 35, radius: 1 + Math.random() * 2.5, life: 0.25 + Math.random() * 0.25, alpha: 0.16, maxAlpha: 0.16, color: 'rgba(255,90,20,' });
    }
    if (fire.life <= 0) state.groundFires.splice(fireIndex, 1);
  }

  state.orbs.forEach((orb, orbIndex) => {
    if (!orb.sparkles || orb.sparkles.length === 0) spawnOrbSparkles(orb);
    orb.sparkTimer += delta;
    if (orb.sheenProgress >= 0) {
      orb.sheenProgress += delta / 0.42;
      if (orb.sheenProgress >= 1) {
        orb.sheenProgress = -1;
        orb.sheenTimer = 1 + Math.random() * 2;
      }
    } else {
      orb.sheenTimer = (orb.sheenTimer ?? (1 + Math.random() * 2)) - delta;
      if (orb.sheenTimer <= 0) orb.sheenProgress = 0;
    }
    orb.sparkles.forEach((spark) => {
      spark.angle += delta * spark.speed;
      spark.pulse += delta * 6;
      spark.distance = orb.radius + 3 + Math.sin(spark.pulse) * 1.6;
      spark.alpha = 0.4 + 0.4 * Math.abs(Math.sin(spark.pulse * 1.2));
    });
    const dx = state.player.x - orb.x;
    const dy = state.player.y - orb.y;
    const dist = Math.hypot(dx, dy) || 1;
    const pullOptionMult = state.triplePickupPull ? 5 : 1;
    const attractRange = 150 * state.player.orbPullMult * pullOptionMult;
    const driftDamping = 0.90;

    if (dist < attractRange) {
      const pull = ((attractRange - dist) / attractRange) * 28000 * state.player.orbPullMult * pullOptionMult;
      orb.vx += (dx / dist) * pull * delta;
      orb.vy += (dy / dist) * pull * delta;
    }

    orb.vx *= driftDamping;
    orb.vy *= driftDamping;

    const speedLimit = Math.hypot(orb.vx, orb.vy);
    if (speedLimit > 900) {
      orb.vx = (orb.vx / speedLimit) * 900;
      orb.vy = (orb.vy / speedLimit) * 900;
    }
    orb.x += orb.vx * delta;
    orb.y += orb.vy * delta;

    if (dist < state.player.radius + orb.radius + 4) {
      const xpAmount = getOrbXpAmount(orb);
      state.popupTexts.push({
        x: orb.x,
        y: orb.y,
        text: `+${xpAmount} XP`,
        alpha: 1,
        life: 0.8,
        color: '#5cff75'
      });
      state.player.xp += xpAmount;
      state.orbs.splice(orbIndex, 1);

      let levelsGained = 0;
      while (state.player.xp >= state.player.xpToNext) {
        state.player.xp -= state.player.xpToNext;
        state.player.level += 1;
        state.player.xpToNext = Math.max(20, Math.floor(state.player.xpToNext * 1.35));
        levelsGained += 1;
      }

      if (levelsGained > 0) {
        state.skillPoints += levelsGained;
        for (let i = 0; i < levelsGained; i++) triggerLevelUpEffect();
        state.popupTexts.push({
          x: state.player.x, y: state.player.y - 42,
          text: `+${levelsGained} SKILL POINT${levelsGained === 1 ? '' : 'S'} (T)`,
          alpha: 1, life: 1.5, color: '#ffd75c'
        });
      }
    }
  });

  for (let i = state.popupTexts.length - 1; i >= 0; i--) {
    const popup = state.popupTexts[i];
    popup.y -= 30 * delta;
    popup.life -= delta;
    popup.alpha = Math.max(0, popup.life / 0.8);
    if (popup.life <= 0) state.popupTexts.splice(i, 1);
  }

  for (let i = state.cookEffects.length - 1; i >= 0; i--) {
    const effect = state.cookEffects[i];
    effect.time += delta;
    effect.twist += delta * 1.8;
    const hasItem = effect.persistentItem && !effect.persistentItem.picked;
    for (let j = effect.particles.length - 1; j >= 0; j--) {
      const particle = effect.particles[j];
      if (hasItem) {
        particle.life = Math.max(particle.life, 0.4);
        particle.alpha = 0.95;
      } else {
        particle.life -= delta * 0.6;
        particle.alpha = Math.max(0, particle.life / 2.5);
      }
      particle.x += Math.cos(particle.angle + effect.twist * 0.6) * particle.speed * delta;
      particle.y += Math.sin(particle.angle + effect.twist * 0.6) * particle.speed * delta;
      particle.speed *= hasItem ? 0.99 : 0.95;
      if (!hasItem && particle.life <= 0) effect.particles.splice(j, 1);
    }
    if (effect.persistentItem && effect.persistentItem.picked) {
      effect.picked = true;
      effect.fadeTimer += delta;
      effect.fadeAlpha = Math.max(0, 1 - effect.fadeTimer / 1.6);
    }
    if (effect.picked && effect.fadeTimer >= 1.6) {
      state.cookEffects.splice(i, 1);
    }
  }

  if (state.bossMessage) {
    state.bossMessage.time += delta;
    state.bossMessage.offsetX += state.bossMessage.direction * 80 * delta;
    if (state.bossMessage.time >= state.bossMessage.duration) {
      state.bossMessage = null;
    }
  }

  for (let i = state.explosions.length - 1; i >= 0; i--) {
    const explosion = state.explosions[i];
    explosion.age = (explosion.age || 0) + delta;
    for (let j = explosion.particles.length - 1; j >= 0; j--) {
      const particle = explosion.particles[j];
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx *= 0.92;
      particle.vy *= 0.92;
      particle.life -= delta;
      particle.alpha = Math.max(0, particle.life / 1.2);
      if (particle.life <= 0) explosion.particles.splice(j, 1);
    }
    if (explosion.particles.length === 0) state.explosions.splice(i, 1);
  }

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const particle = state.particles[i];
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vx *= 0.92;
    particle.vy *= 0.92;
    particle.life -= delta;
    particle.alpha = (particle.maxAlpha ?? 1) * Math.max(0, particle.life / 0.8);
    if (particle.life <= 0) state.particles.splice(i, 1);
  }

  for (let i = state.levelUpEffects.length - 1; i >= 0; i--) {
    const effect = state.levelUpEffects[i];
    effect.time += delta;
    if (effect.time >= effect.duration) state.levelUpEffects.splice(i, 1);
  }

  for (let itemIndex = state.items.length - 1; itemIndex >= 0; itemIndex--) {
    const item = state.items[itemIndex];
    const dx = state.player.x - item.x;
    const dy = state.player.y - item.y;
    const dist = Math.hypot(dx, dy) || 1;
    const pullOptionMult = state.triplePickupPull ? 5 : 1;
    const attractRange = 150 * state.player.orbPullMult * pullOptionMult;
    item.vx = item.vx || 0;
    item.vy = item.vy || 0;
    if (dist < attractRange) {
      const pull = ((attractRange - dist) / attractRange) * 28000 * state.player.orbPullMult * pullOptionMult;
      item.vx += (dx / dist) * pull * delta;
      item.vy += (dy / dist) * pull * delta;
    }
    item.vx *= 0.90;
    item.vy *= 0.90;
    const itemSpeed = Math.hypot(item.vx, item.vy);
    if (itemSpeed > 900) {
      item.vx = (item.vx / itemSpeed) * 900;
      item.vy = (item.vy / itemSpeed) * 900;
    }
    item.x += item.vx * delta;
    item.y += item.vy * delta;
    if (dist < item.radius + state.player.radius) {
      collectInventoryItem(item);
      item.picked = true;
      state.items.splice(itemIndex, 1);
    }
  }
  // Ensure there are always at least 5 living (non-boss) enemies
  let livingCount = 0;
  for (let i = 0; i < state.enemies.length; i++) {
    if (!state.enemies[i].boss) livingCount++;
  }
  const minLiving = Math.max(1, Math.ceil((5 + (state.player.level || 0)) * 0.5));
  while (livingCount < minLiving) {
    createEnemy(false);
    livingCount++;
  }

  if (state.enemies.length === 0 && !waveSpawned) {
    state.wave += 1;
    spawnWave();
    waveSpawned = true;
  }

  if (state.spawnTimer > 10 && !waveSpawned) {
    state.wave += 1;
    spawnWave();
    waveSpawned = true;
  }
}

function shootBossProjectile(enemy) {
  const angle = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
  const speed = 260;
  const count = 1 + Math.floor(state.wave / 10);
  const spread = Math.min(Math.PI * 0.7, (count - 1) * 0.14);
  for (let i = 0; i < count; i++) {
    const shotAngle = angle + (count === 1 ? 0 : -spread / 2 + spread * i / (count - 1));
    state.bullets.push({
      x: enemy.x, y: enemy.y,
      vx: Math.cos(shotAngle) * speed, vy: Math.sin(shotAngle) * speed,
      radius: 7, damage: 10, pierce: 0, life: 3,
      owner: 'enemy', bossShot: true, pulse: Math.random() * Math.PI * 2
    });
  }
}

function shootProjectile() {
  if (state.levelUpActive) return false;
  const shootDistanceMult = state.tripleShootDistance ? 3 : 1;
  const targets = state.enemies.filter(
    (enemy) => getDistance(enemy, state.player) <= state.player.detectionRange * shootDistanceMult
  ).sort(
    (a, b) => getDistance(a, state.player) - getDistance(b, state.player)
  );
  if (targets.length === 0) return false;
  const angle = Math.atan2(targets[0].y - state.player.y, targets[0].x - state.player.x);
  const speed = 420 * state.player.bulletSpeedMult;
  const count = Math.max(1, state.player.projectileCount);
  for (let i = 0; i < count; i++) {
    const target = targets.length > 0 ? targets[i % targets.length] : null;
    const shotAngle = target
      ? Math.atan2(target.y - state.player.y, target.x - state.player.x)
      : angle;
    state.bullets.push({
      x: state.player.x,
      y: state.player.y,
      vx: Math.cos(shotAngle) * speed,
      vy: Math.sin(shotAngle) * speed,
      speed,
      radius: 2.73,
      damage: state.player.bulletDamage,
      pierce: state.player.pierce,
      life: 1.2 * shootDistanceMult,
      owner: 'player',
      homing: state.player.heatSeeking,
      homingTarget: target,
      homingStrength: 8
    });
  }
  if (state.player.specialAttackCount > 0) {
    const specialSpeed = 320;
    const extraCount = Math.min(8, state.player.specialAttackCount * 2);
    const specialSpread = Math.PI / 2;
    const specialCenter = (extraCount - 1) / 2;
    for (let i = 0; i < extraCount; i++) {
      const offset = (i - specialCenter) * (specialSpread / Math.max(1, extraCount - 1));
      state.bullets.push({
        x: state.player.x,
        y: state.player.y,
        vx: Math.cos(angle + offset) * specialSpeed,
        vy: Math.sin(angle + offset) * specialSpeed,
        radius: 3.5,
        damage: Math.max(1, Math.floor(state.player.bulletDamage / 2)),
        pierce: 0,
        life: 0.9 * shootDistanceMult,
        owner: 'player'
      });
    }
  }
  return true;
}

function getFireballCooldown() {
  let cooldown = 1.6;
  if (getAbilitySupportCount('fireball', 'overcharge')) cooldown *= 1.4;
  if (getAbilitySupportCount('fireball', 'rapid')) cooldown *= 0.7;
  if (getAbilitySupportCount('fireball', 'burningGround')) cooldown *= 1.1;
  if (getAbilitySupportCount('fireball', 'orbit')) cooldown *= 1.15;
  return cooldown;
}

function shootFireball(isEcho = false) {
  if (state.levelUpActive) return false;
  const shootDistanceMult = state.tripleShootDistance ? 3 : 1;
  const target = state.enemies
    .filter((enemy) => getDistance(enemy, state.player) <= state.player.detectionRange * shootDistanceMult)
    .sort((a, b) => getDistance(a, state.player) - getDistance(b, state.player))[0];
  if (!target) return false;
  const angle = Math.atan2(target.y - state.player.y, target.x - state.player.x);
  const support = (effect) => getAbilitySupportCount('fireball', effect);
  const homing = support('homing') > 0;
  const volley = support('volley') > 0;
  const acceleration = support('acceleration') > 0;
  const overcharge = support('overcharge') > 0;
  const rapid = support('rapid') > 0;
  const bloodMagic = support('bloodMagic') > 0;
  let damageMult = isEcho ? 0.6 : 1;
  if (volley) damageMult *= 0.8;
  if (acceleration) damageMult *= 0.85;
  if (support('ricochet')) damageMult *= 0.85;
  if (support('detonation')) damageMult *= 0.8;
  if (support('ignite')) damageMult *= 0.9;
  if (overcharge) damageMult *= 1.75;
  if (rapid) damageMult *= 0.8;
  if (bloodMagic) damageMult *= 1.7;
  if (support('return')) damageMult *= 0.85;
  if (support('blackHole')) damageMult *= 0.8;
  if (bloodMagic && !isEcho) {
    state.player.health = Math.max(1, state.player.health - 4);
    state.popupTexts.push({ x: state.player.x, y: state.player.y - 30, text: '-4 BLOOD', alpha: 1, life: 0.8, color: '#e24b67' });
  }
  const speed = 330 * (homing ? 0.85 : 1);
  const offsets = volley ? [-0.2, 0, 0.2] : [0];
  offsets.forEach((offset) => {
    const shotAngle = angle + offset;
    const life = 2 * shootDistanceMult;
    state.bullets.push({
      x: state.player.x, y: state.player.y,
      vx: Math.cos(shotAngle) * speed, vy: Math.sin(shotAngle) * speed,
      speed, radius: overcharge ? 12 : 9,
      damage: Math.max(1, state.player.bulletDamage * 4 * damageMult),
      pierce: support('pierce'), life, maxLife: life, owner: 'player', fireball: true,
      supportForkCount: support('fork') > 0 ? 1 : 0,
      chainRemaining: support('chain') > 0 ? 1 : 0,
      homing, homingTarget: target, homingStrength: 6,
      accelerating: acceleration, ricochets: support('ricochet') > 0 ? 2 : 0,
      detonation: support('detonation') > 0, aftershock: support('aftershock') > 0,
      expanding: support('expanding') > 0, burningGround: support('burningGround') > 0,
      ignite: support('ignite') > 0, wildfire: support('wildfire') > 0,
      cinderburst: support('cinderburst') > 0, returning: support('return') > 0,
      splitDeath: support('splitDeath') > 0, blackHole: support('blackHole') > 0,
      orbitTime: support('orbit') > 0 ? 0.45 : 0
    });
  });
  if (!isEcho && support('echo')) setTimeout(() => { if (!state.gameOver) shootFireball(true); }, 350);
  return true;
}

function drawStarfield() {
  ctx.save();
  ctx.fillStyle = '#020207';
  ctx.fillRect(0, 0, width, height);

  const galaxyX = width * 0.51;
  const galaxyY = height * 0.43;
  ctx.translate(galaxyX, galaxyY);
  ctx.rotate(-0.28);
  ctx.scale(1.7, 0.72);
  const galaxy = ctx.createRadialGradient(0, 0, 0, 0, 0, 360);
  galaxy.addColorStop(0, 'rgba(225,225,255,0.12)');
  galaxy.addColorStop(0.12, 'rgba(115,105,255,0.09)');
  galaxy.addColorStop(0.42, 'rgba(112,35,170,0.055)');
  galaxy.addColorStop(0.72, 'rgba(25,90,155,0.025)');
  galaxy.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = galaxy;
  ctx.beginPath();
  ctx.arc(0, 0, 360, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const star of state.stars) {
    const alpha = (0.18 + star.depth * 0.42) * (0.78 + Math.sin(star.twinkle) * 0.22);
    const dx = star.x - width / 2;
    const dy = star.y - height / 2;
    const distance = Math.hypot(dx, dy) || 1;
    const trail = star.depth * 5;
    ctx.strokeStyle = `rgba(150,185,255,${alpha * 0.3})`;
    ctx.lineWidth = Math.max(0.45, star.size * 0.45);
    ctx.beginPath();
    ctx.moveTo(star.x, star.y);
    ctx.lineTo(star.x - (dx / distance) * trail, star.y - (dy / distance) * trail);
    ctx.stroke();
    ctx.fillStyle = `rgba(205,220,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function getCanvasPointer(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (baseWidth / rect.width),
    y: (event.clientY - rect.top) * (baseHeight / rect.height)
  };
}

const equipmentSlotDefinitions = [
  { id: 'head', label: 'HEAD', accepts: ['head'], dx: -43, dy: 32 },
  { id: 'amulet', label: 'AMULET', accepts: ['amulet'], dx: 144, dy: 66 },
  { id: 'chest', label: 'CHEST', accepts: ['chest'], dx: -43, dy: 154 },
  { id: 'gloves', label: 'GLOVES', accepts: ['gloves'], dx: -246, dy: 194 },
  { id: 'mainHand', label: 'MAIN HAND', accepts: ['weapon'], dx: -366, dy: 76 },
  { id: 'offHand', label: 'OFF HAND', accepts: ['offhand', 'weapon'], dx: 280, dy: 76 },
  { id: 'belt', label: 'BELT', accepts: ['belt'], dx: -43, dy: 276 },
  { id: 'ring1', label: 'RING', accepts: ['ring'], dx: -246, dy: 316 },
  { id: 'ring2', label: 'RING', accepts: ['ring'], dx: 160, dy: 316 },
  { id: 'boots', label: 'BOOTS', accepts: ['boots'], dx: -43, dy: 398 }
];

function getEquipmentLayout() {
  const slotW = 86, slotH = 86;
  const originX = width / 2;
  const originY = 150;
  return equipmentSlotDefinitions.map((slot) => ({ ...slot, x: originX + slot.dx, y: originY + slot.dy, w: slotW, h: slotH }));
}

function getEquipmentSlotAtPoint(x, y) {
  const slot = getEquipmentLayout().find((entry) => x >= entry.x && x <= entry.x + entry.w && y >= entry.y && y <= entry.y + entry.h);
  return slot ? slot.id : null;
}

function canEquipItem(item, slotId) {
  if (!item) return false;
  const slot = equipmentSlotDefinitions.find((entry) => entry.id === slotId);
  return Boolean(slot && slot.accepts.includes(item.slotType || 'module'));
}

function socketGem(gear, gem) {
  if (!gear || !gem || gem.slotType !== 'gem' || !gear.sockets) return false;
  const emptySocket = gear.sockets.findIndex((socket) => !socket);
  if (emptySocket < 0) return false;
  gear.sockets[emptySocket] = gem;
  return true;
}

function getModuleLayout() {
  const inventoryLayout = getInventoryLayout();
  return [9, 10, 11].map((column, index) => ({
    index,
    x: inventoryLayout.startX + column * (inventoryLayout.slotW + inventoryLayout.gap),
    y: 668,
    w: inventoryLayout.slotW,
    h: inventoryLayout.slotH
  }));
}

function getModuleSlotAtPoint(x, y) {
  const slot = getModuleLayout().find((entry) => x >= entry.x && x <= entry.x + entry.w && y >= entry.y && y <= entry.y + entry.h);
  return slot ? slot.index : -1;
}

function setModuleActive(item, active) {
  if (!item || item.slotType !== 'module') return;
  const callback = active ? item.activate : item.deactivate;
  if (!callback) return;
  for (let i = 0; i < (item.count || 1); i++) callback();
}

function getInventoryLayout() {
  const cols = 12, rows = 5, slotW = 76, slotH = 76, gap = 8;
  const gridW = cols * slotW + (cols - 1) * gap;
  const gridH = rows * slotH + (rows - 1) * gap;
  return { cols, rows, slotW, slotH, gap, gridW, gridH, startX: width / 2 - gridW / 2, startY: 800 };
}

function getInventorySlotAtPoint(x, y) {
  const layout = getInventoryLayout();
  const localX = x - layout.startX;
  const localY = y - layout.startY;
  if (localX < 0 || localY < 0 || localX >= layout.gridW || localY >= layout.gridH) return -1;
  const col = Math.floor(localX / (layout.slotW + layout.gap));
  const row = Math.floor(localY / (layout.slotH + layout.gap));
  if (localX % (layout.slotW + layout.gap) > layout.slotW || localY % (layout.slotH + layout.gap) > layout.slotH) return -1;
  const index = row * layout.cols + col;
  return index < state.inventoryCapacity ? index : -1;
}

function getInventorySlotAtPointer(event) {
  const point = getCanvasPointer(event);
  return getInventorySlotAtPoint(point.x, point.y);
}

function getItemSocketLayout(item, x, y, slotW, slotH) {
  if (!item || !item.sockets || !item.sockets.length) return [];
  const size = Math.max(5, Math.min(9, slotW * 0.105));
  const gap = Math.max(2, slotW * 0.035);
  const rowW = item.sockets.length * size + (item.sockets.length - 1) * gap;
  const startX = x + (slotW - rowW) / 2;
  const socketY = y + Math.min(slotH - size - 5, 43);
  return item.sockets.map((gem, index) => ({ gem, index, x: startX + index * (size + gap), y: socketY, size }));
}

function getSocketAtPoint(x, y) {
  const inventoryLayout = getInventoryLayout();
  for (let index = 0; index < state.inventoryCapacity; index++) {
    const item = state.inventory[index];
    const itemX = inventoryLayout.startX + (index % inventoryLayout.cols) * (inventoryLayout.slotW + inventoryLayout.gap);
    const itemY = inventoryLayout.startY + Math.floor(index / inventoryLayout.cols) * (inventoryLayout.slotH + inventoryLayout.gap);
    const socket = getItemSocketLayout(item, itemX, itemY, inventoryLayout.slotW, inventoryLayout.slotH)
      .find((entry) => x >= entry.x - 3 && x <= entry.x + entry.size + 3 && y >= entry.y - 3 && y <= entry.y + entry.size + 3);
    if (socket) return { ...socket, gear: item, container: 'inventory', key: index };
  }
  for (const slot of getEquipmentLayout()) {
    const item = state.equipment[slot.id];
    const socket = getItemSocketLayout(item, slot.x + 5, slot.y + 5, slot.w - 10, slot.h - 10)
      .find((entry) => x >= entry.x - 3 && x <= entry.x + entry.size + 3 && y >= entry.y - 3 && y <= entry.y + entry.size + 3);
    if (socket) return { ...socket, gear: item, container: 'equipment', key: slot.id };
  }
  return null;
}

function drawInventoryItem(item, x, y, slotW, slotH, dragging = false) {
  ctx.save();
  if (dragging) ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(7,24,34,0.98)';
  ctx.strokeStyle = item.color; ctx.lineWidth = 2;
  ctx.fillRect(x, y, slotW, slotH); ctx.strokeRect(x, y, slotW, slotH);
  ctx.textAlign = 'center';
  ctx.fillStyle = item.color; ctx.shadowColor = item.color; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(x + slotW / 2, y + 27, 17, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#071018'; ctx.font = 'bold 11px Arial'; ctx.fillText(item.code, x + slotW / 2, y + 31);
  if (item.sockets && item.sockets.length) {
    getItemSocketLayout(item, x, y, slotW, slotH).forEach(({ gem: socket, x: sx, y: socketY, size: socketSize }) => {
      ctx.fillStyle = socket ? (socket.color || item.color) : 'rgba(2,8,12,0.95)';
      ctx.strokeStyle = socket ? '#e8ffff' : item.color;
      ctx.lineWidth = 1;
      ctx.fillRect(sx, socketY, socketSize, socketSize);
      ctx.strokeRect(sx, socketY, socketSize, socketSize);
    });
  }
  ctx.fillStyle = '#e7faff'; ctx.font = 'bold 10px Arial';
  const shortName = item.name.length > 12 ? `${item.name.slice(0, 11)}…` : item.name;
  ctx.fillText(shortName, x + slotW / 2, y + slotH - 10);
  if ((item.count || 1) > 1) {
    ctx.textAlign = 'right'; ctx.fillStyle = item.color; ctx.font = 'bold 13px Arial';
    ctx.fillText(`x${item.count}`, x + slotW - 6, y + slotH - 6);
  }
  ctx.restore();
}

function drawInventoryScreen() {
  ctx.save();
  ctx.fillStyle = 'rgba(1,5,12,0.86)';
  ctx.fillRect(0, 0, width, height);
  const panelW = 1160, panelH = 1230;
  const panelX = width / 2 - panelW / 2, panelY = height / 2 - panelH / 2;
  fantasyPanel(panelX, panelY, panelW, panelH, '#35b9d0');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#bff7ff'; ctx.shadowColor = '#38dfff'; ctx.shadowBlur = 10;
  ctx.font = '700 40px "Segoe UI", Arial, sans-serif'; ctx.fillText('LOADOUT', width / 2, panelY + 54);
  ctx.shadowBlur = 0; ctx.font = '15px Arial, sans-serif'; ctx.fillStyle = '#75aeb9';
  ctx.fillText('DRAG CYBERWARE INTO A COMPATIBLE EQUIPMENT SLOT', width / 2, panelY + 80);

  const equipmentLayout = getEquipmentLayout();
  const heldItem = state.inventoryDragIndex >= 0
    ? state.inventory[state.inventoryDragIndex]
    : (state.equipmentDragSlot
      ? state.equipment[state.equipmentDragSlot]
      : (state.moduleDragIndex >= 0
        ? state.moduleSlots[state.moduleDragIndex]
        : (state.socketDragSource ? state.socketDragSource.gem : null)));

  ctx.save();
  ctx.strokeStyle = 'rgba(74,184,202,0.24)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(width / 2, 332, 62, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(width / 2, 394); ctx.lineTo(width / 2, 592); ctx.moveTo(width / 2, 430); ctx.lineTo(width / 2 - 92, 520); ctx.moveTo(width / 2, 430); ctx.lineTo(width / 2 + 92, 520); ctx.moveTo(width / 2, 592); ctx.lineTo(width / 2 - 65, 700); ctx.moveTo(width / 2, 592); ctx.lineTo(width / 2 + 65, 700); ctx.stroke();
  ctx.restore();

  equipmentLayout.forEach((slot) => {
    const item = state.equipment[slot.id];
    const isSource = state.equipmentDragSlot === slot.id;
    const isHovered = state.equipmentHoverSlot === slot.id && Boolean(heldItem);
    const validDrop = isHovered && canEquipItem(heldItem, slot.id);
    ctx.fillStyle = 'rgba(3,10,16,0.92)';
    ctx.strokeStyle = isHovered ? (validDrop ? '#84f4c0' : '#ff667a') : (item ? item.color : '#31545f');
    ctx.lineWidth = isHovered ? 3 : 2;
    ctx.fillRect(slot.x, slot.y, slot.w, slot.h); ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
    ctx.fillStyle = '#668590'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
    ctx.fillText(slot.label, slot.x + slot.w / 2, slot.y - 8);
    if (item && !isSource) drawInventoryItem(item, slot.x + 5, slot.y + 5, slot.w - 10, slot.h - 10);
    else if (!item) {
      ctx.fillStyle = 'rgba(73,130,143,0.24)'; ctx.font = 'bold 26px Arial';
      ctx.fillText('+', slot.x + slot.w / 2, slot.y + slot.h / 2 + 9);
    }
  });

  const moduleLayout = getModuleLayout();
  ctx.fillStyle = '#75aeb9'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'left';
  ctx.fillText('ACTIVE MODULES', moduleLayout[0].x, moduleLayout[0].y - 12);
  moduleLayout.forEach((slot) => {
    const item = state.moduleSlots[slot.index];
    const isSource = state.moduleDragIndex === slot.index;
    const isHovered = state.moduleHoverIndex === slot.index && Boolean(heldItem);
    const validDrop = isHovered && heldItem.slotType === 'module';
    ctx.fillStyle = 'rgba(3,10,16,0.92)';
    ctx.strokeStyle = isHovered ? (validDrop ? '#84f4c0' : '#ff667a') : (item ? item.color : '#31545f');
    ctx.lineWidth = isHovered ? 3 : 2;
    ctx.fillRect(slot.x, slot.y, slot.w, slot.h); ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
    if (item && !isSource) drawInventoryItem(item, slot.x, slot.y, slot.w, slot.h);
    else if (!item) {
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(73,130,143,0.24)'; ctx.font = 'bold 24px Arial';
      ctx.fillText('M', slot.x + slot.w / 2, slot.y + slot.h / 2 + 8);
    }
  });

  ctx.strokeStyle = 'rgba(55,185,208,0.42)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(panelX + 48, 756); ctx.lineTo(panelX + panelW - 48, 756); ctx.stroke();
  ctx.fillStyle = '#bff7ff'; ctx.font = '700 24px "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('CYBERWARE VAULT', panelX + 78, 786);
  const occupiedSlots = state.inventory.reduce((total, item) => total + (item ? 1 : 0), 0);
  ctx.fillStyle = '#75aeb9'; ctx.font = '13px Arial'; ctx.textAlign = 'right';
  ctx.fillText(`${occupiedSlots} / ${state.inventoryCapacity} SLOTS`, panelX + panelW - 78, 786);

  const { cols, slotW, slotH, gap, startX, startY } = getInventoryLayout();
  for (let i = 0; i < state.inventoryCapacity; i++) {
    const x = startX + (i % cols) * (slotW + gap);
    const y = startY + Math.floor(i / cols) * (slotH + gap);
    const item = state.inventory[i];
    const isDragSource = i === state.inventoryDragIndex;
    const isDropTarget = (state.inventoryDragIndex >= 0 || state.equipmentDragSlot || state.moduleDragIndex >= 0) && i === state.inventoryHoverIndex;
    ctx.fillStyle = 'rgba(3,10,16,0.72)';
    ctx.strokeStyle = isDropTarget ? '#ffffff' : '#263943'; ctx.lineWidth = isDropTarget ? 2 : 1;
    ctx.fillRect(x, y, slotW, slotH); ctx.strokeRect(x, y, slotW, slotH);
    if (item && !isDragSource) drawInventoryItem(item, x, y, slotW, slotH);
  }
  const hoveredItem = state.hoveredSocketGem || (state.moduleHoverIndex >= 0
    ? state.moduleSlots[state.moduleHoverIndex]
    : (state.equipmentHoverSlot
      ? state.equipment[state.equipmentHoverSlot]
      : (state.inventoryHoverIndex >= 0 ? state.inventory[state.inventoryHoverIndex] : null)));
  if (hoveredItem && state.inventoryDragIndex < 0 && !state.equipmentDragSlot && state.moduleDragIndex < 0 && !state.socketDragSource) {
    const hasSockets = Boolean(hoveredItem.sockets && hoveredItem.sockets.length);
    const hasAffinities = Boolean(hoveredItem.affinities && hoveredItem.affinities.length);
    const tipW = 420, tipH = 110 + (hasAffinities ? 24 : 0) + (hasSockets ? 32 : 0);
    const tipX = Math.min(width - tipW - 18, Math.max(18, state.inventoryMouseX + 18));
    const tipY = Math.min(height - tipH - 18, Math.max(18, state.inventoryMouseY + 18));
    const rarityColor = tooltipRarityColors[(hoveredItem.rarity || 'COMMON').toUpperCase()] || hoveredItem.color || '#9b7134';
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#171016'; ctx.fillRect(tipX, tipY, tipW, tipH);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#2b1a22'; ctx.lineWidth = 8; ctx.strokeRect(tipX + 4, tipY + 4, tipW - 8, tipH - 8);
    ctx.fillStyle = '#1b1218'; ctx.fillRect(tipX + 9, tipY + 9, tipW - 18, tipH - 18);
    ctx.strokeStyle = rarityColor; ctx.lineWidth = 2; ctx.strokeRect(tipX + 9, tipY + 9, tipW - 18, tipH - 18);
    ctx.strokeStyle = 'rgba(239,202,126,0.16)'; ctx.lineWidth = 1; ctx.strokeRect(tipX + 12, tipY + 12, tipW - 24, tipH - 24);
    ctx.restore();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f0dfbd'; ctx.font = '700 15px "Segoe UI", Arial, sans-serif'; ctx.fillText(hoveredItem.name.toUpperCase(), tipX + 22, tipY + 31);
    ctx.strokeStyle = rarityColor; ctx.globalAlpha = 0.42; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tipX + 22, tipY + 40); ctx.lineTo(tipX + tipW - 22, tipY + 40); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = rarityColor; ctx.font = '700 10px "Segoe UI", Arial, sans-serif';
    const gemRole = hoveredItem.gemType ? ` ${hoveredItem.gemType.toUpperCase()}` : '';
    const countLabel = hoveredItem.stackable === false || hoveredItem.slotType === 'gem' ? '' : `  //  x${hoveredItem.count || 1}`;
    ctx.fillText(`${hoveredItem.rarity}  //  ${(hoveredItem.slotType || 'module').toUpperCase()}${gemRole}${countLabel}`, tipX + 22, tipY + 57);
    if (hasAffinities) {
      ctx.fillStyle = '#8ee7ff'; ctx.font = '700 10px "Segoe UI", Arial, sans-serif';
      ctx.fillText(`AFFINITIES  //  ${hoveredItem.affinities.join('  /  ')}`, tipX + 22, tipY + 78);
    }
    ctx.fillStyle = '#bbae93'; ctx.font = '12px "Segoe UI", Arial, sans-serif';
    ctx.fillText(hoveredItem.description, tipX + 22, tipY + (hasAffinities ? 102 : 81));
    if (hasSockets) {
      const socketOffset = hasAffinities ? 24 : 0;
      ctx.fillStyle = '#8f806d'; ctx.font = '700 10px "Segoe UI", Arial, sans-serif'; ctx.fillText('SLOTS', tipX + 22, tipY + 112 + socketOffset);
      const socketSize = 15, socketGap = 7, socketStartX = tipX + 72, socketY = tipY + 100 + socketOffset;
      hoveredItem.sockets.forEach((socket, index) => {
        const socketX = socketStartX + index * (socketSize + socketGap);
        ctx.fillStyle = socket ? (socket.color || rarityColor) : 'rgba(5,4,7,0.95)';
        ctx.strokeStyle = socket ? '#eee0bd' : rarityColor;
        ctx.lineWidth = 1;
        ctx.fillRect(socketX, socketY, socketSize, socketSize);
        ctx.strokeRect(socketX, socketY, socketSize, socketSize);
      });
    }
  }
  if (heldItem) {
    drawInventoryItem(heldItem, state.inventoryMouseX - slotW / 2, state.inventoryMouseY - slotH / 2, slotW, slotH, true);
  }
  ctx.textAlign = 'center'; ctx.fillStyle = '#77aab5'; ctx.font = '15px Arial'; ctx.fillText('Press I or Esc to close', width / 2, panelY + panelH - 18);
  ctx.restore();
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(state.renderScale, 0, 0, state.renderScale, 0, 0);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  drawStarfield();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(0, 0, width, height);

  if (state.levelUpActive) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  state.groundFires.forEach((fire) => {
    const alpha = Math.min(0.16, fire.life * 0.08);
    const gradient = ctx.createRadialGradient(fire.x, fire.y, 0, fire.x, fire.y, fire.radius);
    gradient.addColorStop(0, `rgba(255,120,25,${alpha})`);
    gradient.addColorStop(0.55, `rgba(255,55,15,${alpha * 0.7})`);
    gradient.addColorStop(1, 'rgba(90,10,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(fire.x, fire.y, fire.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.save();
  ctx.fillStyle = '#0f0';
  ctx.shadowColor = '#0f0';
  ctx.shadowBlur = 16;
  const playerShakeX = state.player.hitShake > 0 ? (Math.random() - 0.5) * 9 : 0;
  const playerShakeY = state.player.hitShake > 0 ? (Math.random() - 0.5) * 9 : 0;
  ctx.beginPath();
  ctx.arc(state.player.x + playerShakeX, state.player.y + playerShakeY, state.player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (state.player.aoeEnabled) {
    ctx.save();
    ctx.strokeStyle = 'rgba(122,220,255,0.35)';
    ctx.lineWidth = 8;
    ctx.shadowColor = '#7adcff';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(state.player.x, state.player.y, state.player.aoeRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  state.bullets.forEach((bullet) => {
    ctx.save();
    const pulse = bullet.bossShot ? 1 + Math.sin(bullet.pulse || 0) * 0.28 : 1;
    ctx.fillStyle = bullet.bossShot ? '#4b073f' : (bullet.fireball ? '#ffb12b' : '#a0ffb0');
    ctx.shadowColor = bullet.bossShot ? '#b020ff' : (bullet.fireball ? '#ff3b16' : '#a0ffb0');
    ctx.shadowBlur = bullet.bossShot ? 24 + pulse * 8 : (bullet.fireball ? 22 : 10);
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius * pulse, 0, Math.PI * 2);
    ctx.fill();
    if (bullet.fireball) {
      ctx.strokeStyle = '#fff0a0'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.radius * 0.55, 0, Math.PI * 2); ctx.stroke();
    }
    if (bullet.bossShot) {
      ctx.strokeStyle = `rgba(230,60,255,${0.55 + 0.3 * Math.sin(bullet.pulse || 0)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius * (1.55 + pulse * 0.25), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  });

  state.orbs.forEach((orb) => {
    const corruption = orb.corruption || 0;
    if (orb.sparkles) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      orb.sparkles.forEach((spark) => {
        const sx = orb.x + Math.cos(spark.angle) * spark.distance;
        const sy = orb.y + Math.sin(spark.angle) * spark.distance;
        const sr = Math.round(255 - corruption * 90);
        const sg = Math.round(230 - corruption * 190);
        const sb = Math.round(140 + corruption * 110);
        ctx.fillStyle = `rgba(${sr},${sg},${sb},${spark.alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, spark.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    const crystalBlue = (orb.absorbed || 0) >= 4;
    if (crystalBlue) {
      const pulse = 0.5 + 0.5 * Math.sin(orb.energyPulse || 0);
      const fieldRadius = orb.radius + 8 + pulse * 4;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const field = ctx.createRadialGradient(orb.x, orb.y, orb.radius * 0.7, orb.x, orb.y, fieldRadius);
      field.addColorStop(0, `rgba(100,225,255,${0.018 + pulse * 0.018})`);
      field.addColorStop(0.62, `rgba(45,155,255,${0.025 + pulse * 0.025})`);
      field.addColorStop(1, 'rgba(65,120,255,0)');
      ctx.fillStyle = field;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, fieldRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(120,225,255,${0.07 + pulse * 0.1})`;
      ctx.lineWidth = 0.7 + pulse * 0.7;
      ctx.shadowColor = '#65dfff';
      ctx.shadowBlur = 5 + pulse * 5;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, fieldRadius - 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    const gemR = crystalBlue ? 125 : Math.round(255 - corruption * 125);
    const gemG = crystalBlue ? 225 : Math.round(215 - corruption * 190);
    const gemB = crystalBlue ? 255 : Math.round(corruption * 230);
    const crystalPath = () => {
      ctx.beginPath();
      ctx.moveTo(orb.x, orb.y - orb.radius * 1.25);
      ctx.lineTo(orb.x + orb.radius * 0.72, orb.y - orb.radius * 0.48);
      ctx.lineTo(orb.x + orb.radius * 0.86, orb.y + orb.radius * 0.38);
      ctx.lineTo(orb.x, orb.y + orb.radius * 1.18);
      ctx.lineTo(orb.x - orb.radius * 0.86, orb.y + orb.radius * 0.38);
      ctx.lineTo(orb.x - orb.radius * 0.72, orb.y - orb.radius * 0.48);
      ctx.closePath();
    };
    const gemGradient = ctx.createLinearGradient(
      orb.x - orb.radius, orb.y - orb.radius,
      orb.x + orb.radius, orb.y + orb.radius
    );
    gemGradient.addColorStop(0, `rgba(${Math.min(255, gemR + 55)},${Math.min(255, gemG + 45)},${Math.min(255, gemB + 35)},0.95)`);
    gemGradient.addColorStop(0.48, `rgba(${gemR},${gemG},${gemB},0.88)`);
    gemGradient.addColorStop(1, `rgba(${Math.round(gemR * 0.48)},${Math.round(gemG * 0.48)},${Math.round(gemB * 0.58)},0.96)`);
    ctx.fillStyle = gemGradient;
    ctx.shadowColor = crystalBlue ? '#72e7ff' : corruption > 0.15 ? '#b010ff' : '#ffd700';
    ctx.shadowBlur = 10 + corruption * 12;
    crystalPath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = crystalBlue ? '#163c61' : corruption > 0.15 ? '#351047' : '#4a2d08';
    ctx.lineWidth = Math.max(1.5, orb.radius * 0.22);
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Cut-gem facets catch enough ambient light to read even between sheens.
    ctx.strokeStyle = `rgba(255,255,255,${0.25 + (1 - corruption) * 0.18})`;
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.moveTo(orb.x, orb.y - orb.radius * 1.12);
    ctx.lineTo(orb.x, orb.y + orb.radius * 1.04);
    ctx.moveTo(orb.x - orb.radius * 0.68, orb.y - orb.radius * 0.42);
    ctx.lineTo(orb.x, orb.y - orb.radius * 0.05);
    ctx.lineTo(orb.x + orb.radius * 0.68, orb.y - orb.radius * 0.42);
    ctx.stroke();

    if (orb.sheenProgress >= 0) {
      ctx.save();
      crystalPath();
      ctx.clip();
      ctx.globalCompositeOperation = 'screen';
      const sweepX = orb.x - orb.radius * 2.2 + orb.sheenProgress * orb.radius * 4.4;
      const sheen = ctx.createLinearGradient(sweepX - orb.radius, orb.y, sweepX + orb.radius, orb.y);
      sheen.addColorStop(0, 'rgba(255,255,255,0)');
      sheen.addColorStop(0.42, 'rgba(255,255,255,0)');
      sheen.addColorStop(0.5, 'rgba(255,255,255,0.95)');
      sheen.addColorStop(0.58, 'rgba(255,255,255,0)');
      sheen.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sheen;
      ctx.translate(sweepX, orb.y);
      ctx.rotate(-0.38);
      ctx.translate(-sweepX, -orb.y);
      ctx.fillRect(sweepX - orb.radius * 1.4, orb.y - orb.radius * 2, orb.radius * 2.8, orb.radius * 4);
      ctx.restore();
    }
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = crystalBlue ? 'rgba(180,240,255,0.9)' : corruption > 0.25 ? 'rgba(235,170,255,0.9)' : 'rgba(255,240,175,0.85)';
    ctx.shadowColor = crystalBlue ? '#43cfff' : corruption > 0.25 ? '#a010ff' : '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(`${getOrbXpAmount(orb)}`, orb.x, orb.y - orb.radius - 4);
    ctx.restore();
  });

  state.items.forEach((item) => {
    ctx.save();
    ctx.fillStyle = item.color || '#5c9cff';
    ctx.shadowColor = item.color || '#5c9cff';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    for (let p = 0; p < 6; p++) {
      const angle = -Math.PI / 2 + p * Math.PI / 3;
      const px = item.x + Math.cos(angle) * item.radius;
      const py = item.y + Math.sin(angle) * item.radius;
      if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#e8f7ff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#071018'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(item.code || '?', item.x, item.y + 1);
    ctx.restore();
  });

  state.popupTexts.forEach((popup) => {
    ctx.save();
    ctx.globalAlpha = popup.alpha;
    ctx.fillStyle = popup.color || '#ffffff';
    ctx.shadowColor = popup.color || '#ffffff';
    ctx.shadowBlur = 10;
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(popup.text, popup.x, popup.y);
    ctx.restore();
  });

  state.levelUpEffects.forEach((effect) => {
    const progress = Math.min(1, effect.time / effect.duration);
    const alpha = (1 - progress) * (1 - progress);
    const ringRadius = 25 + effect.radius * Math.min(1, progress * 1.55);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const flash = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, 130 * (1 + progress));
    flash.addColorStop(0, `rgba(255,255,255,${alpha * 0.8})`);
    flash.addColorStop(0.25, `rgba(0,240,255,${alpha * 0.45})`);
    flash.addColorStop(1, 'rgba(255,0,220,0)');
    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, 130 * (1 + progress), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 28;
    ctx.shadowColor = progress < 0.5 ? '#00f0ff' : '#ff23dc';
    ctx.strokeStyle = `rgba(0,240,255,${alpha})`;
    ctx.lineWidth = 10 * (1 - progress) + 2;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,35,220,${alpha * 0.8})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, ringRadius * 0.82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  state.cookEffects.forEach((effect) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (effect.picked) ctx.globalAlpha = effect.fadeAlpha || 1;
    effect.particles.forEach((particle) => {
      const alpha = Math.max(0, particle.alpha);
      ctx.fillStyle = `${particle.color}${alpha})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    const ringCount = effect.persistentItem ? 3 : 2;
    for (let a = 0; a < effect.arms; a++) {
      const armAngle = (a / effect.arms) * Math.PI * 2 + effect.twist;
      ctx.strokeStyle = `hsla(${effect.hue}, 90%, 70%, ${0.2 - a * 0.007})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.08) {
        const radius = 14 + t * 90 + Math.sin(t * 15 + effect.time * 5) * 8;
        const px = effect.x + Math.cos(armAngle + t * 4) * radius;
        const py = effect.y + Math.sin(armAngle + t * 4) * radius;
        if (t === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    for (let r = 0; r < ringCount; r++) {
      const ringRadius = 30 + r * 22 + Math.sin(effect.time * 2 + r) * 8;
      ctx.strokeStyle = `hsla(${effect.hue}, 85%, 65%, ${0.18 - r * 0.04})`;
      ctx.lineWidth = 3 - r * 0.8;
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (effect.persistentItem && !effect.persistentItem.picked) {
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(effect.persistentItem.x, effect.persistentItem.y, effect.persistentItem.radius + 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  });

  state.explosions.forEach((explosion) => {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const blastProgress = Math.min(1, (explosion.age || 0) / (explosion.duration || 1.8));
    for (let ring = 0; ring < 3; ring++) {
      const ringProgress = Math.max(0, Math.min(1, blastProgress * 1.45 - ring * 0.13));
      if (ringProgress <= 0) continue;
      ctx.strokeStyle = `rgba(${ring === 1 ? '255,35,210' : '90,45,255'},${(1 - ringProgress) * 0.9})`;
      ctx.lineWidth = (12 - ring * 3) * (1 - ringProgress) + 2;
      ctx.shadowColor = ring === 1 ? '#ff23d2' : '#6a2cff';
      ctx.shadowBlur = 35;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, 25 + ringProgress * (300 + ring * 90), 0, Math.PI * 2);
      ctx.stroke();
    }
    explosion.particles.forEach((particle) => {
      const alpha = Math.max(0, particle.alpha);
      ctx.fillStyle = `${particle.color}${alpha})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  });

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  state.particles.forEach((particle) => {
    ctx.globalCompositeOperation = particle.dark ? 'source-over' : 'lighter';
    const alpha = Math.max(0, particle.alpha);
    ctx.fillStyle = `${particle.color}${alpha})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  if (state.bossMessage) {
    const msg = state.bossMessage;
    const progress = Math.min(1, msg.time / msg.duration);
    const alpha = Math.sin(progress * Math.PI) * 0.95;
    const y = height * 0.2 + Math.sin(msg.time * 6) * 18;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 72px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = `hsl(${msg.hue}, 100%, 72%)`;
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 32;
    ctx.fillText(msg.text, width / 2 + msg.offsetX, y);
    ctx.restore();
  }

  state.enemies.forEach((enemy) => {
    ctx.save();
    const shakeX = enemy.hitShake > 0 ? (Math.random() - 0.5) * 8 : 0;
    const shakeY = enemy.hitShake > 0 ? (Math.random() - 0.5) * 8 : 0;
    const drawX = enemy.x + shakeX;
    const drawY = enemy.y + shakeY;
    const color = enemy.boss ? '48,8,76' : enemy.elite ? '180,60,240' : enemy.tint;
    const glow = enemy.boss ? '#7110a8' : enemy.elite ? '#b463ff' : '#ff5f5f';
    const haloPulse = Math.max(0, enemy.haloPulse || 0);
    const ambientPulse = 0.5 + Math.sin(performance.now() * 0.0018 + enemy.x * 0.01) * 0.5;
    const haloScale = 1 + haloPulse * 0.28;

    // Two fine halo layers give enemies a little presence without turning them
    // into neon signs. Their center follows hit shake, so impacts rattle the aura too.
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = glow;
    ctx.shadowBlur = (enemy.boss ? 16 : enemy.elite ? 12 : 8) + haloPulse * 12;
    ctx.lineWidth = enemy.boss ? 2.2 : 1.35;
    ctx.strokeStyle = `rgba(${color},${0.11 + ambientPulse * 0.04 + haloPulse * 0.16})`;
    ctx.beginPath();
    ctx.arc(drawX, drawY, enemy.radius * 1.28 * haloScale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur *= 0.55;
    ctx.lineWidth = enemy.boss ? 1.5 : 0.8;
    ctx.strokeStyle = `rgba(${color},${0.07 + haloPulse * 0.1})`;
    ctx.beginPath();
    ctx.arc(drawX, drawY, enemy.radius * 1.55 * (1 + haloPulse * 0.18), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';

    const gradient = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, enemy.radius * 1.3);
    gradient.addColorStop(0, `rgba(${color},0.95)`);
    gradient.addColorStop(1, `rgba(${color},0.05)`);
    ctx.fillStyle = gradient;
    ctx.shadowColor = glow;
    ctx.shadowBlur = enemy.boss ? 28 : enemy.elite ? 18 : 8;
    ctx.beginPath();
    ctx.arc(drawX, drawY, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (enemy.boss || enemy.elite || (enemy.mergeLevel || 0) >= 3) {
      const barW = enemy.radius * 1.6;
      const barH = enemy.boss ? 8 : 6;
      const barX = drawX - barW / 2;
      const barY = drawY - enemy.radius - (enemy.boss ? 18 : 12);
      const hpRatio = Math.max(0, enemy.health / enemy.maxHealth);

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barW, barH);
      ctx.fillStyle = enemy.boss ? '#7210a8' : '#d16cff';
      ctx.fillRect(barX + 1, barY + 1, Math.max(2, (barW - 2) * hpRatio), barH - 2);
      ctx.restore();
    }

    if (state.showEnemyHealth) {
      const hasHealthBar = enemy.boss || enemy.elite || (enemy.mergeLevel || 0) >= 3;
      const healthTextY = drawY - enemy.radius - (hasHealthBar ? (enemy.boss ? 23 : 17) : 7);
      ctx.save();
      ctx.font = 'bold 10px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillStyle = '#ffffff';
      const currentHealth = Math.max(0, Math.ceil(enemy.health));
      ctx.strokeText(`${currentHealth} HP`, drawX, healthTextY);
      ctx.fillText(`${currentHealth} HP`, drawX, healthTextY);
      ctx.restore();
    }
  });

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.direction = 'ltr';
  fantasyPanel(14, 14, 360, 218, '#9b7134');
  ctx.fillStyle = '#d8ad5c';
  ctx.font = '700 13px "Segoe UI", Arial, sans-serif';
  ctx.fillText('THE NIGHT ENDURES', 32, 43);
  ctx.strokeStyle = 'rgba(184,137,63,.38)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(32, 53); ctx.lineTo(356, 53); ctx.stroke();
  ctx.fillStyle = '#c0b39a';
  ctx.font = '16px "Segoe UI", Arial, sans-serif';
  ctx.fillText('SCORE', 32, 80);
  ctx.fillText('WAVE', 194, 80);
  ctx.fillStyle = '#f0dfbd';
  ctx.font = '700 22px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`${state.score}`, 92, 80);
  ctx.fillText(`${state.wave}`, 250, 80);
  ctx.fillStyle = '#c0b39a';
  ctx.font = '16px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`LEVEL  ${state.player.level}`, 32, 108);
  const aps = 1 / (1.0 * (state.player.attackCooldownMult || 1));
  ctx.fillText(`ATTACK  ${aps.toFixed(2)}/s`, 194, 108);
  ctx.fillStyle = state.skillPoints > 0 ? '#e8bd64' : '#aa9f8d';
  ctx.font = '700 16px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`SKILL POINTS  ${state.skillPoints}`, 32, 137);
  ctx.fillStyle = '#806f5e';
  ctx.font = '13px "Segoe UI", Arial, sans-serif';
  ctx.fillText('[ T ] OPEN TREE', 232, 137);

  const barX = 32;
  const healthY = 153;
  const xpY = 187;
  const barW = 324;
  const barH = 20;
  const healthRatio = Math.min(1, Math.max(0, state.displayHealth / state.player.maxHealth));
  const xpRatio = Math.min(1, state.player.xp / state.player.xpToNext);

  const healthGradient = ctx.createLinearGradient(barX, healthY, barX + barW, healthY);
  healthGradient.addColorStop(0, '#ff5f6d');
  healthGradient.addColorStop(1, '#ff1f3d');
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(barX, healthY, barW, barH);
  ctx.strokeStyle = '#76552f';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, healthY, barW, barH);
  ctx.fillStyle = healthGradient;
  ctx.fillRect(barX + 1, healthY + 1, Math.max(2, (barW - 2) * healthRatio), barH - 2);
  ctx.fillStyle = '#fff';
  ctx.font = '700 12px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`${state.player.health} / ${state.player.maxHealth}  VITALITY`, barX + 9, healthY + 14);

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(barX, xpY, barW, barH);
  ctx.strokeStyle = '#76552f';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, xpY, barW, barH);
  const xpGradient = ctx.createLinearGradient(barX, xpY, barX + barW, xpY);
  xpGradient.addColorStop(0, '#4b7e66');
  xpGradient.addColorStop(1, '#8fb98a');
  ctx.fillStyle = xpGradient;
  ctx.fillRect(barX + 1, xpY + 1, Math.max(2, (barW - 2) * xpRatio), barH - 2);
  ctx.fillStyle = '#fff';
  ctx.font = '700 12px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`${state.player.xp} / ${state.player.xpToNext}  ESSENCE`, barX + 9, xpY + 14);
  ctx.restore();

  if (state.levelUpActive) {
    ctx.fillStyle = 'rgba(5, 3, 7, 0.9)';
    ctx.fillRect(0, 0, width, height);

    const atlasPanelX = width / 2 - 760;
    const atlasPanelY = 35;
    const atlasPanelW = 1520;
    const atlasPanelH = 1250;
    fantasyPanel(atlasPanelX,atlasPanelY,atlasPanelW,atlasPanelH,'#9f7136');
    ctx.fillStyle = '#ead7aa';
    ctx.font = '700 42px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ATLAS OF THE NIGHT', width / 2, 90);
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText(`Skill Points: ${state.skillPoints}`, width / 2, 128);
    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = '#8f7a5f';
    ctx.fillText('Every mark carved here changes what survives the dark.', width / 2, 152);

    const treeOffsetX = width / 2;
    const treeOffsetY = 220;
    const atlasX = (node) => treeOffsetX + node.x * 1.3;
    const atlasY = (node) => treeOffsetY + node.y * 1.12;
    const atlasRadius = (node) => node.id === 'Added Damage' ? 44 : node.mini ? 24 : 33;

    // Subtle astrolabe engraving behind the passive constellation.
    ctx.save();ctx.translate(treeOffsetX,treeOffsetY+390);
    ctx.strokeStyle='rgba(151,105,47,.13)';ctx.lineWidth=2;
    [155,330,540,690].forEach((r,i)=>{ctx.setLineDash(i%2?[4,13]:[]);ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke()});
    ctx.setLineDash([]);
    for(let i=0;i<16;i++){const a=i*Math.PI/8;ctx.strokeStyle='rgba(123,77,47,.055)';ctx.beginPath();ctx.moveTo(Math.cos(a)*110,Math.sin(a)*110);ctx.lineTo(Math.cos(a)*700,Math.sin(a)*700);ctx.stroke()}
    ctx.restore();

    skillTree.forEach((node) => {
      if (!node.prereqIds) return;
      node.prereqIds.forEach((prereqId) => {
        const prereq = skillTree.find((n) => n.id === prereqId);
        if (!prereq) return;
        const rawFromX=atlasX(prereq), rawFromY=atlasY(prereq), rawToX=atlasX(node), rawToY=atlasY(node);
        const dx=rawToX-rawFromX,dy=rawToY-rawFromY,distance=Math.hypot(dx,dy)||1;
        const ux=dx/distance,uy=dy/distance;
        const fromX=rawFromX+ux*(atlasRadius(prereq)+8),fromY=rawFromY+uy*(atlasRadius(prereq)+8);
        const toX=rawToX-ux*(atlasRadius(node)+8),toY=rawToY-uy*(atlasRadius(node)+8);
        const alive = canPurchaseSkill(node) || (node.level || 0) > 0;
        const bend=Math.min(75,Math.abs(dx)*.12+28);
        ctx.save();
        ctx.shadowColor=alive?'#c66e2d':'#000';ctx.shadowBlur=alive?12:3;
        ctx.strokeStyle=alive?'rgba(185,101,42,.24)':'rgba(0,0,0,.45)';ctx.lineWidth=8;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.bezierCurveTo(fromX,fromY+bend,toX,toY-bend,toX,toY);
        ctx.stroke();
        ctx.shadowBlur=0;ctx.strokeStyle=alive?'#b47a3c':'#484047';ctx.lineWidth=2.5;
        ctx.stroke();
        ctx.strokeStyle=alive?'rgba(246,190,101,.65)':'rgba(143,124,112,.16)';ctx.lineWidth=.8;ctx.stroke();
        if(alive){const t=(state.time*.32+skillTree.indexOf(node)*.19)%1,o=1-t;
          const c1x=fromX,c1y=fromY+bend,c2x=toX,c2y=toY-bend;
          const px=o**3*fromX+3*o**2*t*c1x+3*o*t**2*c2x+t**3*toX;
          const py=o**3*fromY+3*o**2*t*c1y+3*o*t**2*c2y+t**3*toY;
          ctx.fillStyle='#ffd080';ctx.shadowColor='#ff762e';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(px,py,3,0,Math.PI*2);ctx.fill()}
        ctx.restore();
      });
    });

    state.cardRects = [];
    skillTree.forEach((node, index) => {
      const cx = atlasX(node), cy = atlasY(node);
      const radius = atlasRadius(node);
      const x = cx-radius-12, y = cy-radius-12, thisW=(radius+12)*2, thisH=(radius+12)*2;
      const level = node.level || 0;
      const available = canPurchaseSkill(node) && state.skillPoints > 0;
      state.cardRects[index] = { x, y, w: thisW, h: thisH };
      const branchColor = '#bb7b3b';
      ctx.save(); ctx.translate(cx,cy);
      if(available||level){ctx.shadowColor='#d88639';ctx.shadowBlur=available?16:8}
      ctx.fillStyle='#061017'; ctx.strokeStyle=available?'#e4ae61':level?'#b97a3c':'#72583d'; ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();ctx.stroke();
      // Dotted medallion rim from the reference shrine.
      ctx.fillStyle=available?'#e4ae61':'#8a6844';
      for(let d=0;d<24;d++){const a=d*Math.PI/12;ctx.beginPath();ctx.arc(Math.cos(a)*(radius+5),Math.sin(a)*(radius+5),1.5,0,Math.PI*2);ctx.fill()}
      const gem=ctx.createRadialGradient(-radius*.2,-radius*.25,2,0,0,radius);
      gem.addColorStop(0,available?'#3c342a':level?'#18303a':'#162127');gem.addColorStop(1,'#02070a');
      ctx.fillStyle=gem;ctx.beginPath();ctx.arc(0,0,radius-4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=available?'#efc47d':level?'#d8b47a':'#a89983';ctx.shadowBlur=5;
      ctx.font=`${node.mini?16:22}px "Segoe UI", Arial, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(node.title.split(' ').map(w=>w[0]).join('').slice(0,2),0,1);
      ctx.restore();
      ctx.textBaseline='alphabetic';ctx.textAlign='center';ctx.fillStyle=available?'#ead19b':'#a99b83';
      ctx.font=`${node.mini?12:15}px "Segoe UI", Arial, sans-serif`;ctx.fillText(node.title,cx,cy+radius+28);
      ctx.font='12px "Segoe UI", Arial, sans-serif';ctx.fillStyle='#9a8b77';ctx.fillText(`${level} / ${node.maxLevel}`,cx,cy+radius+45);
    });

    const hovered = skillTree[state.skillHoverIndex];
    if (hovered) {
      const tipW=390, tipH=126;
      let tipX=state.skillMouseX+28, tipY=state.skillMouseY+24;
      if(tipX+tipW>atlasPanelX+atlasPanelW-42) tipX=state.skillMouseX-tipW-28;
      if(tipY+tipH>atlasPanelY+atlasPanelH-42) tipY=state.skillMouseY-tipH-24;
      tipX=Math.max(atlasPanelX+42,Math.min(tipX,atlasPanelX+atlasPanelW-tipW-42));
      tipY=Math.max(atlasPanelY+42,Math.min(tipY,atlasPanelY+atlasPanelH-tipH-42));
      fantasyPanel(tipX,tipY,tipW,tipH,canPurchaseSkill(hovered)?'#bd8540':'#59483a');
      ctx.textAlign='left';ctx.fillStyle='#ead19b';ctx.font='700 20px "Segoe UI", Arial, sans-serif';ctx.fillText(hovered.title,tipX+24,tipY+34);
      ctx.fillStyle='#a99d8b';ctx.font='14px "Segoe UI", Arial, sans-serif';wrapText(ctx,hovered.description,tipX+24,tipY+60,tipW-48,18);
      ctx.fillStyle='#d39c4d';ctx.font='12px "Segoe UI", Arial, sans-serif';ctx.fillText(`RANK ${hovered.level||0} / ${hovered.maxLevel}  •  CLICK TO INVEST`,tipX+24,tipY+106);
    }

    ctx.textAlign = 'start';
  }

  if (state.inventoryOpen) drawInventoryScreen();

  if (state.gameOver) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, width, height);
    fantasyPanel(width/2-340, height/2-130, 680, 260, '#8f3b3b');
    ctx.fillStyle = '#d9b36c';
    ctx.font = '700 42px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', width / 2, height / 2 - 20);
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText(`Score: ${state.score}  |  Wave: ${state.wave}`, width / 2, height / 2 + 22);
    ctx.fillText('Press R to restart', width / 2, height / 2 + 60);
    ctx.restore();
  }

  if (state.paused) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillRect(0, 0, width, height);
    const panelW = 600;
    const panelH = 600;
    const panelX = width / 2 - panelW / 2;
    const panelY = height / 2 - panelH / 2;
    fantasyPanel(panelX, panelY, panelW, panelH, '#ad7d39');
    ctx.fillStyle = '#ead7aa';
    ctx.font = '700 52px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', width / 2, panelY + 72);
    ctx.font = 'bold 25px Arial, sans-serif';
    ctx.fillText('OPTIONS', width / 2, panelY + 122);

    const toggleW = 410;
    const toggleH = 62;
    const toggleX = width / 2 - toggleW / 2;
    const toggleY = panelY + 146;
    state.enemyHealthToggleRect = { x: toggleX, y: toggleY, w: toggleW, h: toggleH };
    fantasyButton(toggleX, toggleY, toggleW, toggleH, state.showEnemyHealth, `ENEMY HEALTH  ·  ${state.showEnemyHealth ? 'ON' : 'OFF'}`);
    const pullToggleY = panelY + 218;
    state.pickupPullToggleRect = { x: toggleX, y: pullToggleY, w: toggleW, h: toggleH };
    fantasyButton(toggleX, pullToggleY, toggleW, toggleH, state.triplePickupPull, `5x PICKUP PULL  -  ${state.triplePickupPull ? 'ON' : 'OFF'}`);
    const shootToggleY = panelY + 290;
    state.shootDistanceToggleRect = { x: toggleX, y: shootToggleY, w: toggleW, h: toggleH };
    fantasyButton(toggleX, shootToggleY, toggleW, toggleH, state.tripleShootDistance, `3x SHOOT DISTANCE  -  ${state.tripleShootDistance ? 'ON' : 'OFF'}`);
    ctx.fillStyle = '#c8c8c8';
    ctx.fillText('Rendering resolution', width / 2, panelY + 398);

    const sliderW = 410;
    const sliderX = width / 2 - sliderW / 2;
    const sliderY = panelY + 438;
    state.renderScaleSliderRect = { x: sliderX, y: sliderY, w: sliderW };
    ctx.strokeStyle = '#76768a';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sliderX, sliderY);
    ctx.lineTo(sliderX + sliderW, sliderY);
    ctx.stroke();
    const sliderProgress = (state.renderScale - 0.5) / 1.5;
    const knobX = sliderX + sliderW * sliderProgress;
    ctx.strokeStyle = '#62c8ff';
    ctx.beginPath();
    ctx.moveTo(sliderX, sliderY);
    ctx.lineTo(knobX, sliderY);
    ctx.stroke();
    ctx.fillStyle = '#f4f4f4';
    ctx.beginPath();
    ctx.arc(knobX, sliderY, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = 'butt';
    ctx.font = '18px Arial, sans-serif';
    ctx.fillText('50%', sliderX, sliderY + 38);
    ctx.fillText(`${Math.round(state.renderScale * 100)}%`, width / 2, sliderY + 38);
    ctx.fillText('200%', sliderX + sliderW, sliderY + 38);
    ctx.fillStyle = '#c8c8c8';
    ctx.fillText('Press Esc to resume', width / 2, panelY + 568);
    ctx.textAlign = 'start';
  } else {
    state.enemyHealthToggleRect = null;
    state.pickupPullToggleRect = null;
    state.shootDistanceToggleRect = null;
    state.renderScaleSliderRect = null;
    state.draggingRenderScale = false;
  }
}

function triggerLevelUpEffect() {
  const x = state.player.x;
  const y = state.player.y;
  const radius = 360;
  state.levelUpEffects.push({ x, y, time: 0, duration: 0.7, radius });
  for (let i = 0; i < 96; i++) {
    const angle = (i / 96) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
    const speed = 280 + Math.random() * 520;
    state.particles.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      radius: 1.5 + Math.random() * 3.5, life: 0.35 + Math.random() * 0.35, alpha: 1,
      color: Math.random() < 0.5 ? 'rgba(0,240,255,' : 'rgba(255,35,220,'
    });
  }
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (getDistance(enemy, state.player) > radius + enemy.radius) continue;
    const damage = Math.ceil(enemy.health * 0.5 + state.player.health * 0.1);
    enemy.health -= damage;
    enemy.hitShake = 0.18;
    spawnImpact(enemy.x, enemy.y, 'rgba(0,240,255,');
    state.popupTexts.push({ x: enemy.x, y: enemy.y - enemy.radius - 10, text: `-${damage}`, alpha: 1, life: 0.9, color: '#00f0ff' });
    if (enemy.health > 0) continue;
    state.score += enemy.boss ? 50 : 10;
    const orb = { x: enemy.x, y: enemy.y, vx: 0, vy: 0, radius: enemy.boss ? 10 : 6, xp: enemy.boss ? 250 : 5, special: enemy.boss, sparkles: [], sparkTimer: 0 };
    state.orbs.push(orb);
    spawnOrbSparkles(orb);
    if (enemy.boss) {
      const item = createBossLoot(enemy.x, enemy.y);
      if (item) state.items.push(item);
      state.bossActive = false;
      if (item) spawnBossCookEffect(enemy.x, enemy.y, item);
      spawnBossExplosion(enemy.x, enemy.y);
    } else {
      spawnOrbParticles(enemy.x, enemy.y); spawnMobDeathEffect(enemy.x, enemy.y, enemy.elite);
      const item = createBossLoot(enemy.x, enemy.y);
      if (item) state.items.push(item);
    }
    maybeDropFireRateModule(enemy.x, enemy.y);
    state.enemies.splice(i, 1);
  }
}

let lastTime = performance.now();
function loop(timestamp) {
  const delta = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;
  const speedMultiplier = input.fast ? 3 : 1;
  update(delta * speedMultiplier);
  draw();
  requestAnimationFrame(loop);
}

resetGame();
requestAnimationFrame(loop);
