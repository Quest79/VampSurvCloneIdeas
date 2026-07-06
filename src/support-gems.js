export function createSupportGemAccessors(state) {
  function getEquippedGems() {
    return Object.values(state.equipment)
      .flatMap((item) => item?.sockets ? item.sockets.filter(Boolean) : []);
  }

  function hasEquippedAbility(abilityId) {
    return getEquippedGems()
      .some((gem) => gem.gemType === 'ability' && gem.abilityId === abilityId);
  }

  function getAbilitySupportCount(abilityId, supportEffect) {
    let count = 0;
    Object.values(state.equipment).forEach((gear) => {
      if (!gear?.sockets) return;
      const skillGem = gear.sockets.find(
        (gem) => gem?.gemType === 'ability' && gem.abilityId === abilityId
      );
      if (!skillGem) return;

      const skillAffinities = new Set(skillGem.affinities || []);
      gear.sockets.forEach((gem) => {
        if (!gem || gem.gemType !== 'support' || gem.supportEffect !== supportEffect) return;
        if ((gem.affinities || []).some((affinity) => skillAffinities.has(affinity))) count += 1;
      });
    });
    return count;
  }

  return { getEquippedGems, hasEquippedAbility, getAbilitySupportCount };
}
