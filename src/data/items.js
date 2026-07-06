export function createInventoryLoot(state) {
  return [
  { name: 'Vanta Capacitor', code: 'VC', slotType: 'ring', rarity: 'UNCOMMON', color: '#54d8ff', description: '+1 weapon damage.', apply: () => { state.player.bulletDamage += 1; } },
  { name: 'Aegis Weave', code: 'AW', slotType: 'chest', rarity: 'UNCOMMON', color: '#62f0a5', description: '+10 maximum health and restore 10 health.', apply: () => { state.player.maxHealth += 10; state.player.health = Math.min(state.player.maxHealth, state.player.health + 10); } },
  { name: 'Ion Thruster', code: 'IT', slotType: 'boots', rarity: 'RARE', color: '#b083ff', description: '+6% movement speed.', apply: () => { state.player.speed *= 1.06; } },
  { name: 'Ghost Lens', code: 'GL', slotType: 'head', rarity: 'RARE', color: '#ff70df', description: '+8% enemy detection range.', apply: () => { state.player.detectionRange *= 1.08; } },
  { name: 'Grav Coil', code: 'GC', slotType: 'gloves', rarity: 'RARE', color: '#ffb84d', description: '+8% crystal pull range and strength.', apply: () => { state.player.orbPullMult *= 1.08; } },
  { name: 'Nullweave Carapace', code: 'NC5', slotType: 'chest', rarity: 'RARE', color: '#77d7c4', description: 'Blank chestpiece with five empty sockets.', stackable: false, sockets: [null, null, null, null, null] },
  { name: 'Fireball Gem', code: 'FB', slotType: 'gem', gemType: 'ability', abilityId: 'fireball', affinities: ['Spell', 'Projectile', 'AoE', 'Fire'], rarity: 'RARE', color: '#ff6738', description: 'Grants the ability to launch fireballs at nearby enemies.', stackable: false },
  { name: 'Fork', code: 'FK', slotType: 'gem', gemType: 'support', supportEffect: 'fork', affinities: ['Projectile'], rarity: 'RARE', color: '#8ee7ff', description: 'Compatible projectiles fork into two on hit.', stackable: false },
  { name: 'Pierce', code: 'PR', slotType: 'gem', gemType: 'support', supportEffect: 'pierce', affinities: ['Projectile'], rarity: 'RARE', color: '#d6a6ff', description: 'Compatible projectiles pierce one additional enemy.', stackable: false },
  { name: 'Chain', code: 'CH', slotType: 'gem', gemType: 'support', supportEffect: 'chain', affinities: ['Projectile'], rarity: 'RARE', color: '#74dfff', description: 'Chains once to a nearby enemy. Chained hit deals 30% less damage.', stackable: false },
  { name: 'Greater Volley', code: 'GV', slotType: 'gem', gemType: 'support', supportEffect: 'volley', affinities: ['Projectile'], rarity: 'RARE', color: '#a7e7ff', description: 'Fires two extra projectiles. Projectiles deal 20% less damage.', stackable: false },
  { name: 'Homing', code: 'HM', slotType: 'gem', gemType: 'support', supportEffect: 'homing', affinities: ['Projectile'], rarity: 'RARE', color: '#89ffce', description: 'Projectiles seek enemies. Projectile speed is reduced by 15%.', stackable: false },
  { name: 'Acceleration', code: 'AC', slotType: 'gem', gemType: 'support', supportEffect: 'acceleration', affinities: ['Projectile'], rarity: 'RARE', color: '#f7e06d', description: 'Projectiles gain speed and damage while traveling. Starts 15% weaker.', stackable: false },
  { name: 'Ricochet', code: 'RCB', slotType: 'gem', gemType: 'support', supportEffect: 'ricochet', affinities: ['Projectile'], rarity: 'RARE', color: '#77b7ff', description: 'Projectiles bounce twice from arena edges. Deals 15% less damage.', stackable: false },
  { name: 'Detonation', code: 'DT', slotType: 'gem', gemType: 'support', supportEffect: 'detonation', affinities: ['AoE'], rarity: 'RARE', color: '#ff805e', description: 'Impact damages nearby enemies. Direct-hit damage is 20% lower.', stackable: false },
  { name: 'Aftershock', code: 'AS', slotType: 'gem', gemType: 'support', supportEffect: 'aftershock', affinities: ['AoE'], rarity: 'RARE', color: '#d88cff', description: 'Repeats the impact blast after a delay for 50% damage.', stackable: false },
  { name: 'Expanding Blast', code: 'EB', slotType: 'gem', gemType: 'support', supportEffect: 'expanding', affinities: ['AoE'], rarity: 'RARE', color: '#ffb36b', description: 'Greatly increases impact radius. Blast damage is 25% lower.', stackable: false },
  { name: 'Burning Ground', code: 'BG', slotType: 'gem', gemType: 'support', supportEffect: 'burningGround', affinities: ['Fire', 'AoE'], rarity: 'RARE', color: '#ff5e37', description: 'Leaves burning ground for 2 seconds. Cast speed is 10% slower.', stackable: false },
  { name: 'Ignite', code: 'IG', slotType: 'gem', gemType: 'support', supportEffect: 'ignite', affinities: ['Fire'], rarity: 'RARE', color: '#ff4c35', description: 'Hits ignite enemies for damage over time. Direct damage is 10% lower.', stackable: false },
  { name: 'Wildfire', code: 'WF', slotType: 'gem', gemType: 'support', supportEffect: 'wildfire', affinities: ['Fire'], rarity: 'RARE', color: '#ff9838', description: 'Ignited enemies burst on death. Ignite duration is 25% shorter.', stackable: false },
  { name: 'Cinderburst', code: 'CB', slotType: 'gem', gemType: 'support', supportEffect: 'cinderburst', affinities: ['Fire', 'Projectile'], rarity: 'RARE', color: '#ffc15a', description: 'Kills launch three embers. Embers deal 40% less damage.', stackable: false },
  { name: 'Echo Cast', code: 'EC', slotType: 'gem', gemType: 'support', supportEffect: 'echo', affinities: ['Spell'], rarity: 'RARE', color: '#bca7ff', description: 'Repeats the spell after 0.35 seconds for 60% damage.', stackable: false },
  { name: 'Overcharge', code: 'OC', slotType: 'gem', gemType: 'support', supportEffect: 'overcharge', affinities: ['Spell'], rarity: 'RARE', color: '#ff73ca', description: '75% more damage and larger projectiles. 40% slower cast speed.', stackable: false },
  { name: 'Rapid Casting', code: 'RA', slotType: 'gem', gemType: 'support', supportEffect: 'rapid', affinities: ['Spell'], rarity: 'RARE', color: '#62f0da', description: '30% faster cast speed. Deals 20% less damage.', stackable: false },
  { name: 'Blood Magic', code: 'BM', slotType: 'gem', gemType: 'support', supportEffect: 'bloodMagic', affinities: ['Spell'], rarity: 'RARE', color: '#e24b67', description: '70% more damage but costs 4 health per cast.', stackable: false },
  { name: 'Orbit', code: 'OR', slotType: 'gem', gemType: 'support', supportEffect: 'orbit', affinities: ['Projectile', 'Spell'], rarity: 'RARE', color: '#79a8ff', description: 'Projectiles orbit briefly before launching. 15% slower cast speed.', stackable: false },
  { name: 'Return', code: 'RT', slotType: 'gem', gemType: 'support', supportEffect: 'return', affinities: ['Projectile'], rarity: 'RARE', color: '#88ffc8', description: 'Projectiles reverse toward the player near expiration. 15% less damage.', stackable: false },
  { name: 'Split on Death', code: 'SD', slotType: 'gem', gemType: 'support', supportEffect: 'splitDeath', affinities: ['Projectile'], rarity: 'RARE', color: '#ffe18a', description: 'Kills split into two weaker projectiles. Split shots cannot split again.', stackable: false },
  { name: 'Black Hole', code: 'BH', slotType: 'gem', gemType: 'support', supportEffect: 'blackHole', affinities: ['AoE', 'Spell'], rarity: 'EPIC', color: '#9b67ff', description: 'Impact pulls nearby enemies inward. Deals 20% less damage.', stackable: false },
  { name: 'Rail Core', code: 'RC', slotType: 'weapon', rarity: 'EPIC', color: '#ff5f78', description: '+10% projectile speed.', apply: () => { state.player.bulletSpeedMult *= 1.10; } },
  { name: 'Nova Chamber', code: 'NC', slotType: 'offhand', rarity: 'EPIC', color: '#ffe66b', description: '+1 nova projectile burst.', apply: () => { state.player.specialAttackCount += 1; } }
  ];
}

export const tooltipRarityColors = {
  COMMON: '#9b7134',
  UNCOMMON: '#65a66f',
  RARE: '#667fd1',
  EPIC: '#a765c7',
  LEGENDARY: '#d39a42'
};
