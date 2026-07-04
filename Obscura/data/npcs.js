// =============================================================
// DATA: NPCS
// =============================================================
const NPCS = {
    Origami_Crow: {
        id: 'Origami_Crow', name: 'Barnaby, the Origami Crow', roomKey: '3,3',
        texture: 'assets/Origami_Crow.png', position: { x: -3, y: 2.5, z: -3 }, scale: 2.8,
        glb: 'assets/Origami_Crow.glb', glbScale: 6.0,
        materialConfig: { roughness: 3, metalness: 0.0, emissiveIntensity: 0.0 },
        faction: 'Custodian',
        floatBounce: { amplitude: 0.2, speed: 1.0 },
        wander: { speed: .25, radius: .50, interval: 1 },
        onFirstMeet() { flags.metOrigami_Crow = true; },
        dialogue: { start: { text: '"A child with thick blood and no label. Welcome to the Pavilion of False Horizons..."', choices: [ { label: "Tell me more about the name.", next: 'explain_name' }, { label: "Who are you?", next: 'whoami' }, { label: "How do I get out?", next: 'exit' } ] }, explain_name: { text: "Six letters. D... something. The shards are hidden in rooms with peculiar atmospheres. The one to the west floats without gravity; perhaps another letter lingers there. Find them, unscramble the girl's name, and speak it at the Sanctuary.", choices: [ { label: "I'll search for them.", next: 'quest' }, { label: "Go back.", next: 'start' } ] }, whoami: { text: "I am Barnaby, folded from sheet music and silver thread. I've been here since before the Pavilion forgot itself. I remember the girl's laughter, but not her full name.", choices: [ { label: "Help me find the name.", next: 'quest' }, { label: "Go back.", next: 'start' } ] }, exit: { text: "Every door is a judge. Green doors will flatter you; black doors demand a toll. If you force a black door, the whole maze grows harsher. The east door is black – you'll need a stronger reason to pass.", choices: [ { label: "I understand.", next: 'quest' }, { label: "Go back.", next: 'start' } ] }, quest: { text: "Will you help restore the name? I can offer you the Folded Compass, but it drinks 1 Curiosity each use. Or perhaps examine my armillary sphere – there's a hidden lever that may help.", choices: [ { label: "Give me the compass.", next: 'compass' }, { label: "Examine the sphere.", next: 'examine_sphere' }, { label: "Not yet.", next: 'start' } ] }, compass: { text: "The Folded Compass will cost 1 Curiosity. Still want it?", choices: [ { label: "Yes, take my Curiosity.", next: 'give_compass' }, { label: "No thanks.", next: 'start' } ] }, give_compass: { text: "Here. Unfold it, and it will tug toward the nearest name-shard.", choices: [], onShow() { if (stats.curiosity > 0) { stats.curiosity -= 1; flags.hasCompass = true; spawnTemporaryItem('folded_compass', { x: 3, y: 1.8, z: 3 }); updateHUD(); showMessage('You received the Folded Compass. Your Curiosity dims slightly.'); } else { showMessage('Your Curiosity is too low to bear the compass.'); } } }, examine_sphere: { text: "Look closely. The lever is tiny, hidden in the brass gears. Can you spot it? (Curiosity DC 8)", choices: [ { label: "Try to find the lever.", next: async () => { const res = await mercyRoll('crow_sphere', performResonanceRoll('curiosity', 8), '"Hey, at least you tried. Take this ink – your persistence means something."', async () => { spawnTemporaryItem('lavender_ink', { x: 4, y: 1.5, z: 4 }); flags.leverFound = true; updateHUD(); }); if (res.success) { if (!res.mercy) { showMessage('You spot the lever and pull it. A Vial of Lavender Ink drops onto the desk.'); spawnTemporaryItem('lavender_ink', { x: 4, y: 1.5, z: 4 }); flags.leverFound = true; updateHUD(); } closeDialogue(); } else { showMessage('The mechanism eludes you. Perhaps another glance.'); closeDialogue(); } } }, { label: "Never mind.", next: 'start' } ] }, done: { text: "The halls await. The west green door leads to a place where gravity has forgotten its job. Bring your charm.", choices: [{ label: "Goodbye.", next: null }] } },
        getStartNode() { if (flags.leverFound && flags.hasCompass) return 'done'; return flags.metOrigami_Crow ? 'start' : 'start'; }
    },
    Baron_von_Bounce: {
        id: 'Baron_von_Bounce', name: 'Baron von Bounce', roomKey: '2,3',
        texture: 'assets/Baron_von_Bounce.png', position: { x: 0, y: 2.8, z: 0 }, scale: 3.0,
        glb: 'assets/Baron_von_Bounce.glb',
        materialConfig: { roughness: 1.5, metalness: -1.0, emissiveIntensity: 0.05 },
        faction: 'EnigmaticStar',
        floatBounce: { amplitude: 0.25, speed: 2.0 },
        wander: { speed: 3, radius: 3, interval: 2 },
        dialogue: { start: { text: '"Manners, child! Keep your toes pointed downward..."', choices: [ { label: "I'll try the waltz.", next: 'waltz_challenge' }, { label: "What is this place?", next: 'explain_ballroom' }, { label: "No, thank you.", next: null } ] }, explain_ballroom: { text: "This is the Ballroom of Weightless Slippers. Gravity takes a holiday; only rhythm holds you upright. The green door east leads back to the study. To cross with style, prove your balance.", choices: [ { label: "Prove my balance.", next: 'waltz_challenge' }, { label: "I'll just walk.", next: null } ] }, waltz_challenge: { text: "Float from chandelier to chandelier. Keep your mind steady. (Willpower DC 8)", choices: function() { const opts = []; if (inventory.includes('vial_of_resolve')) { opts.push({ label: "Use Vial (+2 Will)", next: () => attemptWaltzWithMercy(true) }); } opts.push({ label: "Attempt the waltz", next: () => attemptWaltzWithMercy(false) }); opts.push({ label: "I changed my mind.", next: null }); return opts; } }, done: { text: "Ah, you dance like a sparrow on a wire! Your Helium Loafers have arrived. Pick them up, they're just over there.", choices: [{ label: "Thank you, Baron.", next: null }] } },
        getStartNode() { if (flags.waltzComplete) return 'done'; return 'start'; }
    },
    Uncle_Gesso: {
        id: 'Uncle_Gesso', name: 'Uncle Gesso', roomKey: '2,4',
        texture: 'assets/Uncle_Gesso.png', position: { x: -2, y: 0.50, z: -3 }, scale: 6.24,
        materialConfig: { roughness: 1.5, metalness: -1.0, emissiveIntensity: 0.05 },
        glb: 'assets/Uncle_Gesso.glb', glbScale: 1.7,
        colliderRadius: 1.2,
        wander: { speed: 0.75, radius: 3, interval: 2 },
        faction: 'EnigmaticStar',
        dialogue: { start: { text: '"Hush, hush! Don\'t run across the floor; the porcelain is very thin..."', choices: [ { label: "A letter? Let me see.", next: 'eye_search' }, { label: "What is this place?", next: 'explain_nursery' }, { label: "I'll be quiet.", next: null } ] }, explain_nursery: { text: "I am Uncle Gesso, the dollmaker. Every cradle holds an unfinished child. They wait for a name, a soul, a pair of eyes. One of these glass eyes carries a fragment of the girl's name – I've seen it, but I cannot remember which drawer it's in.", choices: [ { label: "Help me find it.", next: 'eye_search' }, { label: "I see.", next: null } ] }, eye_search: { text: "I have fifty drawers of doll eyes. To spot the special one, you'll need keen sight. (Curiosity DC 8)", choices: [ { label: "Search the drawers.", next: async () => { const res = await mercyRoll('gesso_eye', performResonanceRoll('curiosity', 8), '"You\'ve rummaged through my drawers long enough. Here, take this eye – you\'ve more than earned it."', async () => { spawnTemporaryItem('shard_I', { x: -2, y: 1.5, z: 2 }); flags.foundShardI = true; updateHUD(); }); if (res.success) { if (!res.mercy) { showMessage('You find the eye marked with the letter "I". It glows warmly.'); spawnTemporaryItem('shard_I', { x: -2, y: 1.5, z: 2 }); flags.foundShardI = true; updateHUD(); } closeDialogue(); } else { showMessage('The drawers all look the same. Perhaps come back with sharper eyes.'); closeDialogue(); } } }, { label: "Not now.", next: null } ] }, done: { text: "The little eye is yours now. Treat it gently – it holds more than glass. Good luck with the rest of the name.", choices: [{ label: "Thank you.", next: null }] } },
        getStartNode() { if (flags.foundShardI) return 'done'; return 'start'; }
    },
    Curator_Vance: {
        id: 'Curator_Vance', name: 'Curator Vance', roomKey: '1,3',
        texture: 'assets/Curator_Vance.png', position: { x: 3, y: 0, z: -3 }, scale: 3.6,
        materialConfig: { roughness: 1.5, metalness: -1.0, emissiveIntensity: 0.05 },
        glb: 'assets/Curator_Vance.glb',
        faction: 'MischiefMaker',
        wander: { speed: 1.5, radius: 3, interval: 2 },
        dialogue: { start: { text: '"The paintings are hungry today..."', choices: [ { label: "My shadow? Where is it?", next: 'shadow_hint' }, { label: "What is this gallery?", next: 'explain_gallery' }, { label: "I'll keep moving.", next: null } ] }, explain_gallery: { text: "I am Curator Vance. Every frame here once held a beautiful picture, but they've all escaped. Now the frames are hungry for something to hold – shadows, memories, even names.", choices: [ { label: "That's unsettling.", next: 'shadow_hint' }, { label: "I'll be careful.", next: null } ] }, shadow_hint: { text: "Your shadow fled into the east frame the moment you entered. If you want it back, you must command it – or paint something just as valuable in its place. (Willpower DC 8 or Charm DC 8)", choices: [ { label: "Command my shadow (Willpower).", next: async () => { const res = await mercyRoll('vance_shadow_wp', performResonanceRoll('willpower', 8), '"You have stood firm. Your stubbornness has moved me. Your shadow is freed."', async () => { flags.shadowRecovered = true; }); if (res.success) { if (!res.mercy) showMessage('Your shadow obeys and snaps back to your feet.'); flags.shadowRecovered = true; closeDialogue(); } else { showMessage('Your shadow wavers but doesn\'t return.'); closeDialogue(); } } }, { label: "Paint a replacement (Charm).", next: async () => { const res = await mercyRoll('vance_shadow_ch', performResonanceRoll('charm', 8), '"Your persistence with that brush is touching. Fine, the frame accepts your... effort. Here is your shadow."', async () => { flags.shadowRecovered = true; replaceEaselWithPortrait(0); }); if (res.success) { if (!res.mercy) { showMessage('You paint a lovely portrait; the frame accepts it and releases your shadow.'); replaceEaselWithPortrait(0); } else { showMessage('The frame begrudgingly releases your shadow.'); } flags.shadowRecovered = true; closeDialogue(); } else { showMessage('Your painting is... unrecognisable. The frame rejects it.'); closeDialogue(); } } }, { label: "Not now.", next: null } ] }, done: { text: "Ah, your shadow is back where it belongs. If you see any stray colours, do send them my way.", choices: [{ label: "Goodbye.", next: null }] } },
        getStartNode() { if (flags.shadowRecovered) return 'done'; return 'start'; }
    },

    Faceless_Queen: {
        id: 'Faceless_Queen', name: 'The Faceless Queen', roomKey: '4,3',
        texture: 'assets/Faceless_Queen.png', position: { x: 0, y: 0.10, z: -3 }, scale: 3.5,
        glb: 'assets/Faceless_Queen.glb', glbScale: 2.5,
        materialConfig: { roughness: 1.5, metalness: -1.0, emissiveIntensity: 0.05 },
        faction: 'Custodian',
        dialogue: {
            start: {
                text: '"You are accused of existing without a certified permit! How do you plead?"',
                choices: [
                    { label: "Defend myself (Charm DC 9)", next: async () => {
                        const res = await mercyRoll('queen_charm', performResonanceRoll('charm', 9),
                            '"You are either very brave or very foolish. Take this letter and leave my court."',
                            async () => { spawnTemporaryItem('shard_A', { x: -3, y: 1.5, z: -3 }); flags.foundShardA = true; updateHUD(); });
                        if (res.success) {
                            if (!res.mercy) { showMessage('The Queen is delighted by your eloquence. She hands you the letter "A".'); spawnTemporaryItem('shard_A', { x: -3, y: 1.5, z: -3 }); flags.foundShardA = true; updateHUD(); }
                            closeDialogue();
                        } else { showMessage('Your argument falls flat. The Queen sentences you to hard labor.'); stats.willpower = Math.max(0, stats.willpower - 1); updateHUD(); closeDialogue(); }
                    }},
                    { label: "Plead guilty (Willpower DC 9)", next: async () => {
                        const res = await mercyRoll('queen_wp', performResonanceRoll('willpower', 9),
                            '"Your stubbornness is… admirable. Take this letter, and do not return."',
                            async () => { spawnTemporaryItem('shard_A', { x: -3, y: 1.5, z: -3 }); flags.foundShardA = true; updateHUD(); });
                        if (res.success) {
                            if (!res.mercy) { showMessage('The Queen respects your resolve and grants you the letter "A".'); spawnTemporaryItem('shard_A', { x: -3, y: 1.5, z: -3 }); flags.foundShardA = true; updateHUD(); }
                            closeDialogue();
                        } else { showMessage('Your submission only amuses her. Hard labor it is.'); stats.willpower = Math.max(0, stats.willpower - 1); updateHUD(); closeDialogue(); }
                    }}
                ]
            },
            done: { text: '"You may leave my court. For now."', choices: [{ label: "Goodbye.", next: null }] }
        },
        getStartNode() { return flags.foundShardA ? 'done' : 'start'; }
    },

    Chirp: {
        id: 'Chirp', name: 'Chirp, the Glass Falcon', roomKey: '3,4',
        texture: 'assets/Chirp.png', position: { x: 0, y: 2.0, z: 0 }, scale: 3.0,
        glb: 'assets/Chirp.glb', glbScale: 8,
        materialConfig: { roughness: 0.0, metalness: 0.60, emissiveIntensity: 0.0 },
        faction: 'EnigmaticStar',
        dialogue: {
            start: {
                text: '"Shh! My children are so fragile. A clumsy step will shatter them into needles."',
                choices: [
                    { label: "Move silently (Willpower DC 9)", next: async () => {
                        const res = await mercyRoll('chirp_wp', performResonanceRoll('willpower', 9),
                            '"You have shattered enough of my children. Your persistence is… something. Take this feather."',
                            async () => {
                                spawnTemporaryItem('glass_feather', { x: -3, y: 1.5, z: -4 });
                                flags.glassFeatherTaken = true;
                                updateHUD();
                                removeHummingbirds();
                            });
                        if (res.success) {
                            if (!res.mercy) {
                                showMessage('You glide through the aviary without a sound. Chirp offers you a glass feather.');
                                spawnTemporaryItem('glass_feather', { x: -3, y: 1.5, z: -4 });
                                flags.glassFeatherTaken = true;
                                updateHUD();
                            }
                            closeDialogue();
                        } else {
                            showMessage('A twig snaps underfoot. Glass shards rain down.');
                            stats.willpower = Math.max(0, stats.willpower - 1);
                            stats.charm = Math.max(0, stats.charm - 1);
                            updateHUD();
                            changeRoomFloor('3,4', 'assets/3-4_floor_Fail.png');
                            if (!res.mercy) removeHummingbirds();
                            closeDialogue();
                        }
                    }}
                ]
            },
            done: { text: '"You are quiet enough. Perhaps you are not a threat."', choices: [{ label: "Goodbye.", next: null }] }
        },
        getStartNode() { return flags.glassFeatherTaken ? 'done' : 'start'; }
    },

    Keyhole_Specter: {
        id: 'Keyhole_Specter', name: 'The Keyhole Specter', roomKey: '3,2',
        texture: 'assets/Keyhole_Specter.png', position: { x: 0, y: 1.5, z: 0 }, scale: 2.8,
        glb: 'assets/Keyhole_Specter.glb', glbScale: 13.0,
        materialConfig: { roughness: 1.5, metalness: -1.0, emissiveIntensity: 0.05 },
        faction: 'MischiefMaker',
        verticalWander: true,
        wander: { speed: .25, radius: 4, interval: 1 },
        dialogue: {
            start: {
                text: '"So many keyholes… but which one sings the C-sharp? Listen closely."',
                choices: [
                    { label: "Listen for the note (Curiosity DC 9)", next: async () => {
                        const res = await mercyRoll('specter_curi', performResonanceRoll('curiosity', 9),
                            '"Fine. You are deaf, but you are here. Take this key and leave me to my sighs."',
                            async () => { spawnTemporaryItem('skeleton_key', { x: 0, y: 1.5, z: 0 }); flags.skeletonKeyGiven = true; updateHUD(); });
                        if (res.success) {
                            if (!res.mercy) { showMessage('You press your ear to the C-sharp keyhole. The Specter hands you a skeleton key.'); spawnTemporaryItem('skeleton_key', { x: 0, y: 1.5, z: 0 }); flags.skeletonKeyGiven = true; updateHUD(); }
                            closeDialogue();
                        } else { showMessage('All keyholes sound the same. The Specter sighs and vanishes.'); closeDialogue(); }
                    }}
                ]
            },
            done: { text: '"You already have my key. What more do you want?"', choices: [{ label: "Nothing.", next: null }] }
        },
        getStartNode() { return flags.skeletonKeyGiven ? 'done' : 'start'; }
    },

    Spindle: {
        id: 'Spindle', name: 'Spindle, the Hedge-Laird', roomKey: '4,4',
        texture: 'assets/Spindle.png', position: { x: 0, y: 0.0, z: 0 }, scale: 2.5,
        glb: 'assets/Spindle.glb', glbScale: 8.0,
        materialConfig: { roughness: 1.5, metalness: -1.0, emissiveIntensity: 0.05 },
        faction: 'MischiefMaker',
        wander: { speed: 0.4, radius: 3, interval: 2 },
        dialogue: {
            start: {
                text: '"Keep your boots out of my thistle patches! The hedges don\'t like people who can\'t keep their eyes open."',
                choices: [
                    { label: "Ask for a way through.", next: 'puzzle' }
                ]
            },
            puzzle: {
                text: "If you can prove you're not afraid of being pricked, I might let you pass. (Willpower DC 8)",
                choices: [
                    { label: "Push through the thorns.", next: async () => {
                        const res = await mercyRoll('spindle_wp', performResonanceRoll('willpower', 8),
                            '"Fine, fine! Take this key and leave my garden alone."',
                            async () => { spawnTemporaryItem('thistle_key', { x: -2, y: 1.5, z: -2 }); flags.thistleKeyGiven = true; updateHUD(); });
                        if (res.success) {
                            if (!res.mercy) { showMessage('You brave the thorns and Spindle hands you a thistle key.'); spawnTemporaryItem('thistle_key', { x: -2, y: 1.5, z: -2 }); flags.thistleKeyGiven = true; updateHUD(); }
                            closeDialogue();
                        } else {
                            showMessage('The thorns scratch you. Spindle chuckles.'); stats.willpower = Math.max(0, stats.willpower - 1); updateHUD(); closeDialogue();
                        }
                    }},
                    { label: "Maybe later.", next: null }
                ]
            },
            done: { text: '"You already have my key. Now shoo."', choices: [{ label: "Goodbye.", next: null }] }
        },
        getStartNode() { return flags.thistleKeyGiven ? 'done' : 'start'; }
    },

    Lost_Scout: {
        id: 'Lost_Scout', name: 'The Lost Scout', roomKey: '4,2',
        texture: 'assets/Lost_Scout.png', position: { x: 0, y: .20, z: -2 }, scale: 2.0,
        glb: 'assets/Lost_Scout.glb', glbScale: 4.0, glbRotation: Math.PI,
        materialConfig: { roughness: 1.5, metalness: -1.0, emissiveIntensity: 0.05 },
        faction: 'EnigmaticStar',
        dialogue: {
            start: {
                text: '"Company, halt! The General went north sixty years ago to buy some tea. Do you have any dry matches?"',
                choices: [
                    { label: "Search your pockets (Curiosity DC 8)", next: async () => {
                        const res = await mercyRoll('scout_curi', performResonanceRoll('curiosity', 8),
                            '"You\'re shivering harder than I am. Here, take this match – I found another."',
                            async () => { spawnTemporaryItem('dry_match', { x: 0, y: 1.2, z: 1 }); flags.dryMatchGiven = true; updateHUD(); });
                        if (res.success) {
                            if (!res.mercy) { showMessage('You find a dry match and hand it to the Scout. He gives you one in return.'); spawnTemporaryItem('dry_match', { x: 0, y: 1.2, z: 1 }); flags.dryMatchGiven = true; updateHUD(); }
                            closeDialogue();
                        } else {
                            showMessage('You come up empty. The Scout sighs.'); closeDialogue();
                        }
                    }},
                    { label: "I don't have any.", next: null }
                ]
            },
            done: { text: '"Thank you, soldier. Keep your powder dry."', choices: [{ label: "Goodbye.", next: null }] }
        },
        getStartNode() { return flags.dryMatchGiven ? 'done' : 'start'; }
    },

    Keeper_of_the_Rust: {
        id: 'Keeper_of_the_Rust', name: 'The Keeper of the Rust', roomKey: '5,3',
        texture: 'assets/Keeper_of_the_Rust.png', position: { x: 0, y: 0.15, z: 0 }, scale: 2.0,
        glb: 'assets/Keeper_of_the_Rust.glb', glbScale: 3.0,
        materialConfig: { roughness: 1.5, metalness: -1.0, emissiveIntensity: 0.05 },
        faction: 'Custodian',
        dialogue: {
            start: {
                text: '"We grow the keys to everything that has ever been shut… but we have forgotten which key fits which secret."',
                choices: [
                    { label: "Ask about the keys.", next: 'explain' }
                ]
            },
            explain: {
                text: "Pick a key, traveler, but remember: once you pluck it from the soil, it will never grow back. (Curiosity DC 9)",
                choices: [
                    { label: "Pluck a key.", next: async () => {
                        const res = await mercyRoll('rust_curi', performResonanceRoll('curiosity', 9),
                            '"You have a good eye. This one has a bit of shine left."',
                            async () => { /* no item, just a message */ });
                        if (res.success) {
                            showMessage('You pull a key that glints faintly. It may open nothing, but it feels important.');
                            closeDialogue();
                        } else {
                            showMessage('The key crumbles in your hand.'); stats.curiosity = Math.max(0, stats.curiosity - 1); updateHUD(); closeDialogue();
                        }
                    }},
                    { label: "Leave them be.", next: null }
                ]
            },
            done: { text: '"The rust remembers all."', choices: [{ label: "Goodbye.", next: null }] }
        },
        getStartNode() { return flags.rustKeyPlucked ? 'done' : 'start'; }
    },

    // ---- NEW NPCs ----
    Lovelace_the_Fern: {
        id: 'Lovelace_the_Fern', name: 'Lovelace-the-Fern', roomKey: '1,4',
        texture: 'assets/Barnaby_the_Fern.png', position: { x: 0, y: 0.2, z: 0 }, scale: 4.0,
        glb: 'assets/Barnaby_the_Fern.glb', glbScale: 6.0, glbRotation: Math.PI/3,
        materialConfig: { roughness: 1.5, metalness: -1.0, emissiveIntensity: 0.08 },
        faction: 'EnigmaticStar',
        dialogue: {
            start: {
                text: '"Vance is head‑less, yes… but he is not heart‑less. The girl whose name you seek… her first sound is a soft, wet buzz… VVVVV."',
                choices: [
                    { label: "Reach for the shard (Willpower DC 9)", next: async () => {
                        const res = await mercyRoll('fern_wp', performResonanceRoll('willpower', 9),
                            '"You are braver than you look. Take the letter – but mind the thorns."',
                            async () => { spawnTemporaryItem('shard_D', { x: 1, y: 1.5, z: 1 }); flags.foundShardD = true; updateHUD(); });
                        if (res.success) {
                            if (!res.mercy) { showMessage('You pull the shard from the fern. It hums softly with the letter D.'); spawnTemporaryItem('shard_D', { x: 1, y: 1.5, z: 1 }); flags.foundShardD = true; updateHUD(); }
                            closeDialogue();
                        } else {
                            showMessage('Thorns prick your skin. The plant giggles.'); stats.willpower = Math.max(0, stats.willpower - 1); updateHUD(); closeDialogue();
                        }
                    }}
                ]
            },
            done: { text: '"You have taken the sound. I will keep whispering."', choices: [{ label: "Goodbye.", next: null }] }
        },
        getStartNode() { return flags.foundShardD ? 'done' : 'start'; }
    },

    Epitaphist: {
        id: 'Epitaphist', name: 'The Epitaphist', roomKey: '1,5',
        texture: 'assets/Epitaphist.png', position: { x: 0, y: 0.1, z: 0 }, scale: 2.0,
        glb: 'assets/Epitaphist.glb', glbScale: 5.0, glbRotation: Math.PI/3,
        materialConfig: { roughness: 1.5, metalness: -1.0, emissiveIntensity: 0.08 },
        faction: 'Custodian',
        dialogue: {
            start: {
                text: '"Ah, another reader who has not yet stopped breathing. How inconvenient. Your stone is quite blank here. Let us see…"',
                choices: [
                    { label: "Ask for the chisel.", next: 'riddle' }
                ]
            },
            riddle: {
                text: "The more of them you take, the more you leave behind. What are they? (Curiosity DC 9)",
                choices: [
                    { label: "Answer: Footsteps", next: async () => {
                        const res = await mercyRoll('epitaphist_curi', performResonanceRoll('curiosity', 9),
                            '"A fine answer! Take this chisel – carve your own postscript."',
                            async () => { spawnTemporaryItem('chisel_of_renown', { x: 0, y: 1.5, z: 1 }); flags.hasChisel = true; updateHUD(); });
                        if (res.success) {
                            if (!res.mercy) { showMessage('The gargoyle nods and hands you the Chisel of Renown.'); spawnTemporaryItem('chisel_of_renown', { x: 0, y: 1.5, z: 1 }); flags.hasChisel = true; updateHUD(); }
                            closeDialogue();
                        } else {
                            showMessage('The gargoyle cackles. "Wrong! Come back when you have listened to your own feet."'); closeDialogue();
                        }
                    }}
                ]
            },
            done: { text: '"Use that chisel wisely. Your postscript is still blank."', choices: [{ label: "Goodbye.", next: null }] }
        },
        getStartNode() { return flags.hasChisel ? 'done' : 'start'; }
    },

    Grand_Pendulum: {
        id: 'Grand_Pendulum', name: 'The Grand Pendulum', roomKey: '2,5',
        texture: 'assets/Grand_Pendulum.png', position: { x: 0, y: 2.0, z: 0 }, scale: 3.5,
        glb: 'assets/Grand_Pendulum.glb', glbScale: 10.0, glbRotation: Math.PI,
        materialConfig: { roughness: 1.5, metalness: -1.0, emissiveIntensity: 0.05 },
        faction: 'Custodian',
        dialogue: {
            start: {
                text: '"Time is a stain… that you cannot scrub out… unless you have the soap… of a yesterday."',
                choices: [
                    { label: "Ask to pass (Willpower DC 9)", next: async () => {
                        const res = await mercyRoll('pendulum_wp', performResonanceRoll('willpower', 9),
                            '"Your persistence grinds the gears. Very well – pass quickly."',
                            async () => { /* just allows passage, no item */ });
                        if (res.success) {
                            showMessage('The pendulum swings aside, granting you passage.');
                            closeDialogue();
                        } else {
                            showMessage('The pendulum clips your shoulder.'); stats.willpower = Math.max(0, stats.willpower - 1); updateHUD(); closeDialogue();
                        }
                    }}
                ]
            },
            done: { text: '"Tick… tock… you may pass again, but time is not your friend."', choices: [{ label: "Goodbye.", next: null }] }
        },
        getStartNode() { return false ? 'done' : 'start'; }
    }
};