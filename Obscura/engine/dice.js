// =============================================================
// DICE – resonance roll system & mercy
// =============================================================

function initDieCanvas() {
    dieCanvas = document.getElementById('dice-canvas');
    dieCtx = dieCanvas.getContext('2d');
    drawDieFace(1);
}

function drawDieFace(num) {
    dieCtx.clearRect(0,0,150,150);
    dieCtx.fillStyle='#fff';
    dieCtx.fillRect(10,10,130,130);
    dieCtx.fillStyle='#000';
    dieCtx.font='bold 80px monospace';
    dieCtx.textAlign='center';
    dieCtx.textBaseline='middle';
    dieCtx.fillText(num,75,75);
}

async function spinDieToFace(targetFace) {
    const duration=800;
    const startTime=performance.now();
    const startRot=dieRotation;
    const targetRot=startRot+(2+Math.random()*2)*Math.PI*2;
    return new Promise(resolve=>{
        function anim(now){
            const elapsed=now-startTime;
            const t=Math.min(elapsed/duration,1);
            dieRotation=startRot+(targetRot-startRot)*(1-Math.pow(1-t,3));
            dieCtx.save();
            dieCtx.clearRect(0,0,150,150);
            dieCtx.translate(75,75);
            dieCtx.rotate(dieRotation);
            dieCtx.fillStyle='#fff';
            dieCtx.fillRect(-65,-65,130,130);
            dieCtx.fillStyle='#000';
            dieCtx.font='bold 80px monospace';
            dieCtx.textAlign='center';
            dieCtx.textBaseline='middle';
            const currentFace=t<0.9?Math.floor(Math.random()*6)+1:targetFace;
            dieCtx.fillText(currentFace,0,0);
            dieCtx.restore();
            if(t<1)requestAnimationFrame(anim);
            else{dieRotation=targetRot;dieFace=targetFace;resolve();}
        }
        requestAnimationFrame(anim);
    });
}

function performResonanceRoll(stat, dc, extraBonus = 0) {
    return new Promise(resolve => {
        let bonus = extraBonus;
        if (flickerGrace && flickerGrace.stat === stat) {
            bonus += 1;
            flickerGrace.turnsLeft--;
            if (flickerGrace.turnsLeft <= 0) flickerGrace = null;
        }
        const statVal = stats[stat.toLowerCase()];
        const finalDC = dc + spiteModifier;
        document.getElementById('dice-stat').innerHTML = `${stat.toUpperCase()} Check (Base: ${statVal})${bonus>0?' +'+bonus:''}`;
        document.getElementById('dice-dc').innerHTML = `DC: ${dc} + Spite (${spiteModifier}) = <b>${finalDC}</b>`;
        document.getElementById('dice-result').textContent = '???';
        document.getElementById('dice-button').style.display = 'block';
        document.getElementById('dice-close').style.display = 'none';
        document.getElementById('dice-overlay').classList.add('active');
        drawDieFace(1);
        diceState = 'idle';
        rollResolve = resolve;
        rollStat = stat;
        rollDC = finalDC;
        rollBonus = bonus;
    });
}

function rollDiceNow() {
    if (diceState !== 'idle' || !rollResolve) return;
    diceState = 'spinning';
    document.getElementById('dice-button').style.display = 'none';
    const d6 = Math.floor(Math.random() * 6) + 1;
    const statVal = stats[rollStat.toLowerCase()];
    const total = d6 + statVal + rollBonus;
    const success = total >= rollDC;
    const critFail = (d6 === 1);
    const critSucc = (d6 === 6);
    spinDieToFace(d6).then(() => {
        let resultHTML = `d6: <b>${d6}</b> + ${statVal} + ${rollBonus} = <b>${total}</b> `;
        resultHTML += success ? '(SUCCESS)' : '(FAIL)';
        if (critFail) {
            resultHTML += '<br><span style="color:#ff4444;">SIGH OF THE MAZE</span> – ';
            const lostStat = rollStat.toLowerCase();
            const currentRoom = getCurrentRoom();
            if (!flags.tempStatLoss) flags.tempStatLoss = {};
            if (!flags.tempStatLoss[lostStat]) flags.tempStatLoss[lostStat] = { amount: 0, room: currentRoom };
            flags.tempStatLoss[lostStat].amount += 1;
            flags.tempStatLoss[lostStat].room = currentRoom;
            stats[lostStat] = Math.max(0, stats[lostStat] - 1);
            resultHTML += `${rollStat} temporarily reduced by 1 (restores when you leave this room).`;
            updateHUD();
        } else if (critSucc) {
            resultHTML += '<br><span style="color:#ffd700;">FLICKER OF GRACE</span> – ';
            flickerGrace = { stat: rollStat, turnsLeft: 1 };
            resultHTML += `+1 to your next ${rollStat} roll.`;
        }
        document.getElementById('dice-result').innerHTML = resultHTML;
        document.getElementById('dice-close').style.display = 'block';
        diceState = 'result';
        rollResult = total;
    });
}

function closeDiceOverlay() {
    document.getElementById('dice-overlay').classList.remove('active');
    if (rollResolve) {
        const success = rollResult >= rollDC;
        rollResolve({ success, total: rollResult });
        rollResolve = null;
    }
    diceState = 'idle';
    rollStat = null;
    rollDC = 0;
    rollResult = 0;
    rollBonus = 0;
}

async function mercyRoll(questId, rollPromise, pityMessage, pityAction) {
    const res = await rollPromise;
    if (!res.success) {
        mercyTracker[questId] = (mercyTracker[questId] || 0) + 1;
        if (mercyTracker[questId] >= 2) {
            mercyTracker[questId] = 0;
            showMessage(pityMessage);
            await pityAction();
            return { success: true, mercy: true };
        }
    } else {
        mercyTracker[questId] = 0;
    }
    return res;
}