export function createSkillTree(state) {
  return [
  {
    id: 'Added Damage',
    title: 'Weapon Overclock',
    description: '+1 projectile damage per point. Unlocks every branch.',
    x: 0,
    y: 0,
    maxLevel: 100,
    apply() { this.level = (this.level || 0) + 1; state.player.bulletDamage += 1; }
  },
  {
    id: 'Swift Feet', title: 'Thruster Servos', description: '+8% move speed per point.',
    x: -480, y: 155, maxLevel: 5, prereqIds: ['Added Damage'],
    requires() { return skillTree.find(n => n.id === 'Added Damage')?.level > 0; },
    apply() { this.level = (this.level || 0) + 1; state.player.speed *= 1.08; }
  },
  {
    id: 'Rapid Fire', title: 'Rapid Fire', description: 'Attack 10% faster per point.',
    x: 0, y: 155, maxLevel: 3, prereqIds: ['Added Damage'],
    requires() { return skillTree.find(n => n.id === 'Added Damage')?.level > 0; },
    apply() { this.level = (this.level || 0) + 1; state.player.attackCooldownMult *= 0.9; }
  },
  {
    id: 'Hardened Body', title: 'Nanofiber Hull', description: '+15 maximum health and heal 15 per point.',
    x: 480, y: 155, maxLevel: 5, prereqIds: ['Added Damage'],
    requires() { return skillTree.find(n => n.id === 'Added Damage')?.level > 0; },
    apply() { this.level = (this.level || 0) + 1; state.player.maxHealth += 15; state.player.health = Math.min(state.player.maxHealth, state.player.health + 15); }
  },
  {
    id: 'Orb Magnet', title: 'Gravity Siphon', description: '+15% crystal pull distance and strength per point.',
    x: -480, y: 310, maxLevel: 3, prereqIds: ['Swift Feet'],
    requires() { return skillTree.find(n => n.id === 'Swift Feet')?.level > 0; },
    apply() { this.level = (this.level || 0) + 1; state.player.orbPullMult *= 1.15; }
  },
  {
    id: 'Multi-Shot', title: 'Multi-Shot', description: 'Fire 1 extra projectile.',
    x: 0, y: 310, maxLevel: 3, prereqIds: ['Rapid Fire'],
    requires() { return skillTree.find(n => n.id === 'Rapid Fire')?.level > 0; },
    apply() { this.level = (this.level || 0) + 1; state.player.projectileCount += 1; }
  },
  {
    id: 'Regeneration', title: 'Nanite Repair', description: 'Recover 1 health per second.',
    x: 480, y: 310, maxLevel: 100, prereqIds: ['Hardened Body'],
    requires() { return skillTree.find(n => n.id === 'Hardened Body')?.level > 0; },
    apply() { this.level = (this.level || 0) + 1; state.player.regenRate += 1; }
  },
  {
    id: 'Faster Shots', title: 'Rail Accelerators', description: '+15% projectile speed per point.',
    x: -480, y: 465, maxLevel: 4, prereqIds: ['Orb Magnet'],
    requires() { return skillTree.find(n => n.id === 'Orb Magnet')?.level > 0; },
    apply() { this.level = (this.level || 0) + 1; state.player.bulletSpeedMult *= 1.15; }
  },
  {
    id: 'Keen Sight', title: 'Threat Optics', description: '+5% enemy detection range per point.',
    x: -480, y: 620, maxLevel: 5, prereqIds: ['Faster Shots'],
    requires() { return skillTree.find(n => n.id === 'Faster Shots')?.level > 0; },
    apply() { this.level = (this.level || 0) + 1; state.player.detectionRange *= 1.05; }
  },
  {
    id: 'Piercing Rounds', title: 'Piercing Rounds', description: 'Projectiles pierce 1 extra enemy.',
    x: 0, y: 465, maxLevel: 5, prereqIds: ['Multi-Shot'],
    requires() { return skillTree.find(n => n.id === 'Multi-Shot')?.level > 0; },
    apply() { this.level = (this.level || 0) + 1; state.player.pierce += 1; }
  },
  {
    id: 'Volatile Aura', title: 'Plasma Halo', description: 'Awaken a damaging plasma field. Each rank adds +1 damage, +10% radius and faster pulses.',
    x: 480, y: 465, maxLevel: 5, prereqIds: ['Regeneration'],
    requires() { return skillTree.find(n => n.id === 'Regeneration')?.level > 0; },
    apply() {
      this.level = (this.level || 0) + 1;
      state.player.aoeEnabled = true;
      state.player.aoeDamage += 1;
      if (this.level > 1) state.player.aoeRadius *= 1.1;
      state.player.aoeTickInterval = Math.max(0.22, state.player.aoeTickInterval * 0.94);
    }
  },
  {
    id: 'Forking Rounds', title: 'Forking Rounds',
    description: 'On impact, rounds split into +1 spectral projectile per rank.',
    x: 300, y: 590, maxLevel: 5, mini: true, prereqIds: ['Piercing Rounds'],
    requires() { return skillTree.find(n => n.id === 'Piercing Rounds')?.level > 0; },
    apply() { this.level = (this.level || 0) + 1; state.player.forkCount += 1; }
  },
  {
    id: 'Heatseeker', title: 'Heatseeker', description: 'Projectiles home toward nearby enemies.',
    x: 0, y: 620, maxLevel: 1, prereqIds: ['Piercing Rounds'],
    requires() { return skillTree.find(n => n.id === 'Piercing Rounds')?.level > 0; },
    apply() { this.level = 1; state.player.heatSeeking = true; }
  }
  /*
  {
    id: 'Strong Bullets',
    title: 'Strong Bullets',
    description: '+1 bullet damage',
    x: 420,
    y: 220,
    maxLevel: 1,
    apply() { this.level = 1; state.player.bulletDamage += 1; }
  },
  {
    id: 'XP Boost',
    title: 'XP Boost',
    description: '+100% XP gain',
    x: -420,
    y: 340,
    maxLevel: 1,
    apply() { this.level = 1; state.player.xpGainMult *= 2.0; }
  },
  {
    id: 'Orb Magnet',
    title: 'Orb Magnet',
    description: '+20% orb pull distance and strength',
    x: 0,
    y: 340,
    maxLevel: 1,
    apply() { this.level = 1; state.player.orbPullMult *= 1.2; }
  },
  {
    id: 'Multi-Shot',
    title: 'Multi-Shot',
    description: 'Fire 1 extra projectile',
    x: 420,
    y: 340,
    maxLevel: 1,
    apply() { this.level = 1; state.player.projectileCount += 1; }
  },
  {
    id: 'Piercing Rounds',
    title: 'Piercing Rounds',
    description: '+1 projectile pierce',
    x: -420,
    y: 460,
    maxLevel: 1,
    apply() { this.level = 1; state.player.pierce += 1; }
  },
  {
    id: 'Rapid Fire',
    title: 'Rapid Fire',
    description: '-5% attack cooldown per point. 6th point grants 200% faster firing.',
    x: 0,
    y: 460,
    maxLevel: 6,
    apply() {
      this.level = (this.level || 0) + 1;
      if (this.level < 6) {
        state.player.attackCooldownMult *= 0.95;
      } else {
        state.player.attackCooldownMult *= 0.3333333333333333;
      }
    }
  },
  {
    id: 'Hardened Body',
    title: 'Hardened Body',
    description: '+1 max health',
    x: 420,
    y: 460,
    maxLevel: 1,
    apply() {
      this.level = 1;
      state.player.maxHealth += 1;
      state.player.health = Math.min(state.player.health + 1, state.player.maxHealth);
    }
  },
  {
    id: 'Volatile Aura',
    title: 'Volatile Aura',
    description: 'Always-on AoE around you deals damage every tick.',
    x: -420,
    y: 580,
    maxLevel: 1,
    apply() {
      this.level = 1;
      state.player.aoeEnabled = true;
      state.player.aoeRadius = Math.max(state.player.aoeRadius, 120);
    }
  },
  {
    id: 'Aura Expansion',
    title: 'Aura Expansion',
    description: 'Increases your active AoE radius by 10%.',
    x: -420,
    y: 700,
    maxLevel: 1,
    prereqIds: ['Volatile Aura'],
    requires() { return skillTree.find(n => n.id === 'Volatile Aura')?.level > 0; },
    apply() {
      this.level = 1;
      state.player.aoeEnabled = true;
      state.player.aoeRadius = Math.max(state.player.aoeRadius, 120) * 1.1;
    }
  },
  {
    id: 'Enhanced Aura',
    title: 'Enhanced Aura',
    description: '+5% AoE radius, +2 AoE damage, and 10% faster AoE ticks',
    x: -420,
    y: 820,
    maxLevel: 1,
    prereqIds: ['Aura Expansion'],
    requires() { return skillTree.find(n => n.id === 'Aura Expansion')?.level > 0; },
    apply() {
      this.level = 1;
      state.player.aoeEnabled = true;
      state.player.aoeRadius = Math.max(state.player.aoeRadius, 120) * 1.05;
      state.player.aoeDamage = Math.max(1, (state.player.aoeDamage || 1)) + 2;
      state.player.aoeTickInterval = Math.max(0.1, state.player.aoeTickInterval * 0.9);
    }
  },
  {
    id: 'Regeneration',
    title: 'Regeneration',
    description: '+1 health per second',
    x: 0,
    y: 580,
    maxLevel: 1,
    apply() { this.level = 1; state.player.regenRate += 1; }
  },
  {
    id: 'Heatseeker',
    title: 'Heatseeker',
    description: 'Main projectile homes to the closest enemy.',
    x: 420,
    y: 580,
    maxLevel: 1,
    rarity: 'rare',
    color: '#4aa3ff',
    apply() {
      this.level = 1;
      state.player.heatSeeking = true;
    }
  }*/
  ];
}
