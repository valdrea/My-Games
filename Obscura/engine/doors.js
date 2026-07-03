// =============================================================
// DOORS – door class, door management, door dialogue
// =============================================================

class Door {
    constructor(mesh, blocker, roomA, roomB, doorId, startUnlocked) {
        this.mesh = mesh;
        this.blocker = blocker;
        this.roomA = roomA;
        this.roomB = roomB;
        this.doorId = doorId;
        this.unlockCondition = null;
        this.rollCheck = null;
        this.unlocked = startUnlocked;
        this.isOpen = false;
        this.isAnimating = false;
        this.progress = 0;
        this.openSpeed = 0.8;
        this.closeSpeed = 0.8;
        this.startPos = mesh.position.clone();
        this.targetPos = this.startPos.clone();
        this.targetPos.y -= DOOR_H + 0.5;
        this.blockerStartPos = blocker ? blocker.position.clone() : null;
        this.blockerTargetPos = this.blockerStartPos ? this.blockerStartPos.clone() : null;
        if (this.blockerTargetPos) this.blockerTargetPos.y -= DOOR_H + 0.5;
        if (startUnlocked) this.setUnlocked();
        else this.setLocked();
    }

    setLocked() {
        this.unlocked = false;
        this.mesh.material.map = blackDoorTex;
    }

    setUnlocked() {
        this.unlocked = true;
        this.mesh.material.map = greenDoorTex;
    }

    close() {
        if (!this.isOpen || this.isAnimating) return;
        this.isAnimating = true;
        this.progress = 0;
        this.state = 'closing';
    }

    async interact() {
        if (this.isOpen || this.isAnimating) return;
        for (let other of doorList) {
            if (other !== this && other.isOpen) other.close();
        }
        if (!this.unlocked) {
            if (this.unlockCondition && this.unlockCondition()) {
                this.setUnlocked();
                showDoorMsg("The way is clear.");
                await playDoorVoice("The way is clear.");   // this line is custom, not in pool, but we'll skip voice
                this.open();
                return;
            }
            if (this.rollCheck) {
                performResonanceRoll(this.rollCheck.stat, this.rollCheck.dc).then(async res => {
                    if (res.success) {
                        showDoorMsg("The door hums with approval.");
                        await playDoorVoice("The door hums with approval."); // custom
                        this.setUnlocked();
                        this.open();
                    } else {
                        const line = pickLine(LOCKED_LINES);
                        showDoorMsg(line);
                        await playDoorVoice(line);
                    }
                });
                return;
            }
            const line = pickLine(LOCKED_LINES);
            showDoorMsg(line);
            await playDoorVoice(line);
            return;
        }
        const line = pickLine(UNLOCKED_LINES);
        showDoorMsg(line);
        await playDoorVoice(line);
        this.open();
    }

    open() {
        if (this.isOpen || this.isAnimating) return;
        this.isAnimating = true;
        this.progress = 0;
        this.state = 'opening';
        if (this.blocker) {
            const idx = colliders.findIndex(c => c.mesh === this.blocker);
            if (idx !== -1) colliders.splice(idx, 1);
        }
        currentOpenDoor = this;
    }

    update(delta) {
        if (!this.isAnimating) return;
        const speed = this.state === 'opening' ? this.openSpeed : this.closeSpeed;
        this.progress += delta * speed;
        if (this.progress >= 1) {
            this.progress = 1;
            this.isAnimating = false;
            if (this.state === 'opening') {
                this.isOpen = true;
            } else {
                this.isOpen = false;
                currentOpenDoor = null;
            }
        }
        const t = this.progress * this.progress * (3 - 2 * this.progress);
        if (this.state === 'opening') {
            this.mesh.position.lerpVectors(this.startPos, this.targetPos, t);
            if (this.blocker && this.blockerStartPos) this.blocker.position.lerpVectors(this.blockerStartPos, this.blockerTargetPos, t);
        } else {
            this.mesh.position.lerpVectors(this.targetPos, this.startPos, t);
            if (this.blocker && this.blockerTargetPos) this.blocker.position.lerpVectors(this.blockerTargetPos, this.blockerStartPos, t);
        }
    }
}

const unlockedDoors = new Set();
function unlockDoor(doorId) {
    unlockedDoors.add(doorId);
    for (let d of doorList) if (d.doorId === doorId) d.setUnlocked();
}