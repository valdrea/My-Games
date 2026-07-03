// =============================================================
// ITEMS
// =============================================================
const ITEMS = {
    folded_compass: { id: 'folded_compass', name: 'Folded Compass', desc: 'Points to the nearest name shard.', texture: 'assets/Folded_Compass.png', pickupText: 'You unfold the compass. It tugs toward a distant room.' },
    lavender_ink: { id: 'lavender_ink', name: 'Vial of Lavender Ink', desc: '+2 Charm for one transition.', texture: 'assets/Lavender_Ink.png', pickupText: 'The ink shimmers; it might make doors more agreeable.' },
    vial_of_resolve: { id: 'vial_of_resolve', name: 'Vial of Resolve', desc: '+2 Will for one check.', texture: 'assets/resolve.png', pickupText: 'You feel a surge of determination.' },
    helium_loafers: { id: 'helium_loafers', name: 'Helium Loafers', desc: 'Float over pit traps.', texture: 'assets/Helium_Loafers.png', pickupText: 'The loafers feel weightless. They might lift you over dangers.' },
    shard_D: { id: 'shard_D', name: 'Name Shard: D', desc: 'Fragment of the name.', texture: 'assets/shard_D.png', pickupText: 'You pocket the letter D.' },
    shard_I: { id: 'shard_I', name: 'Name Shard: I', desc: 'Fragment of the name.', texture: 'assets/shard_I.png', pickupText: 'The eye gazes softly. You pocket the letter I.' },
    shard_A: { id: 'shard_A', name: 'Name Shard: A', desc: 'A regal fragment etched with the letter A.', texture: 'assets/shard_A.png', pickupText: 'You take the shard. It hums with courtroom authority.' },
    shard_N: { id: 'shard_N', name: 'Name Shard: N', desc: 'Fragment of the name.', texture: 'assets/shard_N.png', pickupText: 'You pocket the letter N.' },
    shard_N2: { id: 'shard_N2', name: 'Name Shard: N', desc: 'Another N.', texture: 'assets/shard_N2.png', pickupText: 'You pocket the second N.' },
    shard_E: { id: 'shard_E', name: 'Name Shard: E', desc: 'Fragment of the name.', texture: 'assets/shard_E.png', pickupText: 'You pocket the letter E.' },
    glass_feather: { id: 'glass_feather', name: 'Glass Feather', desc: 'A delicate glass feather, cold to the touch.', texture: 'assets/glass_feather.png', pickupText: 'The feather chimes softly as you pocket it.' },
    skeleton_key: { id: 'skeleton_key', name: 'Skeleton Key', desc: 'A key that might open something hidden.', texture: 'assets/skeleton_key.png', pickupText: 'You pocket the skeleton key. It feels important.' },
    thistle_key: { id: 'thistle_key', name: 'Thistle Key', desc: 'A prickly key from the hedge maze.', texture: 'assets/thistle_key.png', pickupText: 'You carefully pocket the thistle key.' },
    dry_match: { id: 'dry_match', name: 'Dry Match', desc: 'A single dry match, saved for a cold day.', texture: 'assets/dry_match.png', pickupText: 'You take the dry match. It might light something later.' },
    chisel_of_renown: { id: 'chisel_of_renown', name: 'Chisel of Renown', desc: 'A stone‑carving tool that can rewrite one\'s own fate.', texture: 'assets/chisel_of_renown.png', pickupText: 'The chisel feels heavy with possibility.' },

    // Permanent stat boosts (not yet placed in world)
    courageous_knot: { id: 'courageous_knot', name: 'Courageous Knot', desc: 'A sailor\'s knot that stiffens your resolve. Permanently raises Willpower by 1.', texture: 'assets/courageous_knot.png', pickupText: 'You feel a surge of courage. Your Willpower has permanently increased.' },
    magnifying_lens: { id: 'magnifying_lens', name: 'Magnifying Lens', desc: 'A brass lens that reveals hidden details. Permanently raises Curiosity by 1.', texture: 'assets/magnifying_lens.png', pickupText: 'The world comes into sharper focus. Your Curiosity has permanently increased.' },
    gilded_tongue: { id: 'gilded_tongue', name: 'Gilded Tongue', desc: 'A silver tongue charm. Permanently raises Charm by 1.', texture: 'assets/gilded_tongue.png', pickupText: 'Words flow like honey. Your Charm has permanently increased.' },
    lumin_essence: { id: 'lumin_essence', name: 'Lumin Essence', desc: 'A glowing drop of pure potential. Permanently raises a stat of your choice by 1.', texture: 'assets/lumin_essence.png', pickupText: 'You feel a gentle warmth spread through you. Choose a stat to increase permanently.' }
};