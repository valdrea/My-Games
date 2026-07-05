import asyncio
import json
import os
import re
import tempfile
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, simpledialog

import edge_tts
import pygame
from pydub import AudioSegment
from pydub.generators import WhiteNoise

# ----------------------------------------------------------------------
# Preset manager
# ----------------------------------------------------------------------
PRESET_FILE = "voice_presets.json"

def load_presets():
    if not os.path.exists(PRESET_FILE):
        return {}
    with open(PRESET_FILE, "r") as f:
        return json.load(f)

def save_presets(presets):
    with open(PRESET_FILE, "w") as f:
        json.dump(presets, f, indent=2)

# ----------------------------------------------------------------------
# Voice fetching
# ----------------------------------------------------------------------
async def fetch_voices():
    voices = await edge_tts.list_voices()
    eng_voices = [v for v in voices if v["Locale"].startswith("en-")]
    eng_voices.sort(key=lambda v: v["ShortName"])
    return eng_voices

def get_all_voice_names():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    voices = loop.run_until_complete(fetch_voices())
    loop.close()
    return voices

# ----------------------------------------------------------------------
# Audio effects library
# ----------------------------------------------------------------------
def band_pass_filter(seg, low_freq, high_freq):
    """pydub has no band_pass, so chain high-pass + low-pass."""
    return seg.high_pass_filter(low_freq).low_pass_filter(high_freq)

def apply_single_effect(seg, effect_name):
    """Apply one named effect. Returns a new AudioSegment."""
    # Normalise parameter strings like "Echo (300ms, -6dB)" -> just "Echo"
    base = effect_name.split(" (")[0].strip()
    
    if base == "Echo":
        delay = 300
        decay = 6
        if "(" in effect_name:
            params = effect_name.split("(")[1].rstrip(")")
            parts = [p.strip() for p in params.split(",")]
            try: delay = int(parts[0].replace("ms",""))
            except: pass
            try: decay = float(parts[1].replace("dB","").replace("-",""))
            except: pass
        echo = seg - decay
        silence = AudioSegment.silent(duration=delay)
        return seg.overlay(echo, position=delay)
    
    elif base == "Reverb":
        decibel = 10
        delays = [50, 100, 150, 200, 250, 300]
        decay_factors = [0.6, 0.5, 0.4, 0.3, 0.2, 0.1]
        mixed = seg
        for d, v in zip(delays, decay_factors):
            mixed = mixed.overlay(seg - (decibel * v), position=d)
        return mixed
    
    elif base == "Hallway":
        filtered = seg.low_pass_filter(800)
        echo = filtered - 8
        return filtered.overlay(echo, position=400)
    
    elif base == "Chipmunk":
        # higher pitch + faster
        return seg._spawn(seg.raw_data, overrides={"frame_rate": int(seg.frame_rate * 1.5)})
    
    elif base == "Monster":
        # deeper + slower
        return seg._spawn(seg.raw_data, overrides={"frame_rate": int(seg.frame_rate * 0.7)})
    
    elif base == "Robot":
        # bandpass + subtle distortion
        return band_pass_filter(seg, 300, 3000).apply_gain(3)
    
    elif base == "Whisper":
        # muffled + noise floor
        noise = WhiteNoise().to_audio_segment(duration=len(seg), volume=-30)
        return seg.low_pass_filter(1000).overlay(noise) - 6
    
    elif base == "Crow":
        # harsh, high, fast flutter
        s = seg._spawn(seg.raw_data, overrides={"frame_rate": int(seg.frame_rate * 1.2)})
        s = s.high_pass_filter(1500)
        # add quick echo
        return s.overlay(s - 5, position=80)
    
    elif base == "Golem":
        # deep, slow, rumbling
        s = seg._spawn(seg.raw_data, overrides={"frame_rate": int(seg.frame_rate * 0.65)})
        s = s.low_pass_filter(600) + 4
        # heavy reverb
        reverb = s - 8
        for pos in [100, 200, 300, 400]:
            s = s.overlay(reverb, position=pos)
        return s
    
    elif base == "Telephone":
        return band_pass_filter(seg, 300, 3400).apply_gain(4)
    
    elif base == "Underwater":
        s = seg.low_pass_filter(200)
        return s.overlay(s - 10, position=150)
    
    elif base == "Distortion":
        # soft clip
        return seg.apply_gain(10).apply_gain(-10)
    
    elif base == "Megaphone":
        s = band_pass_filter(seg, 500, 4000)
        return s.apply_gain(6) + s.low_pass_filter(500).apply_gain(-3)
    
    elif base == "Cave":
        # large echo
        return seg.overlay(seg - 10, position=800).overlay(seg - 15, position=1600)
    
    elif base == "TinCan":
        s = band_pass_filter(seg, 800, 3000)
        return s.apply_gain(5)
    
    elif base == "Flutter":
        # rapid tremolo-like effect by overlaying short shifted copies
        s = seg
        for offset in range(20, 100, 20):
            s = s.overlay(seg - 12, position=offset)
        return s
    
    elif base == "Crystal":
        # bright, shimmery
        s = seg.high_pass_filter(2000)
        s = s._spawn(s.raw_data, overrides={"frame_rate": int(s.frame_rate * 1.1)})
        return s + 3
    
    elif base == "Muffled":
        return seg.low_pass_filter(500)
    
    else:
        # unknown effect, return unchanged
        return seg

def apply_effect_chain(seg, effect_names):
    """Apply a list of effects in order."""
    for eff in effect_names:
        seg = apply_single_effect(seg, eff)
    return seg

def sanitize_filename(name):
    """Remove characters that are invalid in Windows filenames."""
    return re.sub(r'[<>:"/\\|?*]', '', name).strip()

# ----------------------------------------------------------------------
# Main application
# ----------------------------------------------------------------------
class TTSApp:
    def __init__(self, root):
        self.root = root
        self.root.title("TTS Voice Studio – Advanced (Effect Chain)")
        self.root.geometry("750x800")

        self.voices = get_all_voice_names()
        if not self.voices:
            messagebox.showerror("Error", "No voices found. Check your internet connection.")
            self.root.destroy()
            return

        self.selected_voice = tk.StringVar()
        self.rate = tk.DoubleVar(value=0)
        self.pitch = tk.DoubleVar(value=0)
        self.master_volume = tk.DoubleVar(value=0)   # new: master volume in dB
        self.save_dir = tk.StringVar(value=os.getcwd())
        self.temp_audio = None
        self.is_busy = False
        self.stop_preview = False

        # --- Effects management ---
        self.available_effects = [
            "Echo", "Reverb", "Hallway",
            "Chipmunk", "Monster", "Robot", "Whisper",
            "Crow", "Golem", "Telephone", "Underwater",
            "Distortion", "Megaphone", "Cave", "TinCan",
            "Flutter", "Crystal", "Muffled"
        ]
        self.applied_effects = []

        # Presets now save the effect chain
        self.presets = load_presets()
        self.current_preset_name = tk.StringVar(value="")

        self.create_widgets()
        self.selected_voice.set(self.voices[0]["ShortName"])
        self.refresh_preset_dropdown()
        self.refresh_effect_lists()

    # ---------- UI ----------
    def create_widgets(self):
        # Voice selection
        ttk.Label(self.root, text="Voice:").pack(pady=(10,0))
        voice_names = [f"{v['ShortName']} ({v['Locale']})" for v in self.voices]
        self.voice_cb = ttk.Combobox(self.root, values=voice_names, state="readonly", width=60)
        self.voice_cb.pack(pady=5)
        if voice_names:
            self.voice_cb.current(0)
        self.voice_cb.bind("<<ComboboxSelected>>", self.on_voice_select)

        # Text input
        ttk.Label(self.root, text="Text to speak:").pack(pady=(10,0))
        text_frame = ttk.Frame(self.root)
        text_frame.pack(fill=tk.BOTH, padx=10, expand=True)
        self.text_box = tk.Text(text_frame, height=6, wrap=tk.WORD)
        self.text_box.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scroll = ttk.Scrollbar(text_frame, orient=tk.VERTICAL, command=self.text_box.yview)
        scroll.pack(side=tk.RIGHT, fill=tk.Y)
        self.text_box.configure(yscrollcommand=scroll.set)
        self.text_box.insert(tk.END, "Welcome, brave adventurer! Your quest awaits in the ancient ruins of Karth.")

        # Speed & Pitch sliders
        ttk.Label(self.root, text="Speed (%):").pack(pady=(10,0))
        self.rate_scale = ttk.Scale(self.root, from_=-50, to=50, variable=self.rate,
                                    orient=tk.HORIZONTAL, command=self.update_rate_label)
        self.rate_scale.pack(fill=tk.X, padx=20)
        self.rate_label = ttk.Label(self.root, text="+0%")
        self.rate_label.pack()

        ttk.Label(self.root, text="Pitch (Hz):").pack(pady=(10,0))
        self.pitch_scale = ttk.Scale(self.root, from_=-50, to=50, variable=self.pitch,
                                     orient=tk.HORIZONTAL, command=self.update_pitch_label)
        self.pitch_scale.pack(fill=tk.X, padx=20)
        self.pitch_label = ttk.Label(self.root, text="+0 Hz")
        self.pitch_label.pack()

        # Master Volume slider (new)
        ttk.Label(self.root, text="Master Volume (dB):").pack(pady=(10,0))
        self.volume_scale = ttk.Scale(self.root, from_=-20, to=20, variable=self.master_volume,
                                      orient=tk.HORIZONTAL, command=self.update_volume_label)
        self.volume_scale.pack(fill=tk.X, padx=20)
        self.volume_label = ttk.Label(self.root, text="0 dB")
        self.volume_label.pack()

        # ------ Effect chain UI ------
        ttk.Label(self.root, text="Effect Chain (applied in order):").pack(pady=(10,0))
        chain_frame = ttk.Frame(self.root)
        chain_frame.pack(fill=tk.BOTH, padx=10, expand=True)

        # Left: available effects list
        left_frame = ttk.LabelFrame(chain_frame, text="Available")
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0,5))
        self.avail_listbox = tk.Listbox(left_frame, selectmode=tk.SINGLE, exportselection=False)
        self.avail_listbox.pack(fill=tk.BOTH, expand=True)
        ttk.Button(left_frame, text="Add ▶", command=self.add_effect).pack(pady=2)

        # Middle: move up/down buttons
        mid_frame = ttk.Frame(chain_frame)
        mid_frame.pack(side=tk.LEFT, fill=tk.Y, padx=5)
        ttk.Button(mid_frame, text="▲", command=self.move_up).pack(pady=2)
        ttk.Button(mid_frame, text="▼", command=self.move_down).pack(pady=2)
        ttk.Button(mid_frame, text="✕ Remove", command=self.remove_effect).pack(pady=(10,2))

        # Right: applied effects list
        right_frame = ttk.LabelFrame(chain_frame, text="Applied")
        right_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.applied_listbox = tk.Listbox(right_frame, selectmode=tk.SINGLE, exportselection=False)
        self.applied_listbox.pack(fill=tk.BOTH, expand=True)

        # Populate available effects
        for eff in self.available_effects:
            self.avail_listbox.insert(tk.END, eff)

        # Presets
        ttk.Label(self.root, text="Voice Preset:").pack(pady=(10,0))
        preset_frame = ttk.Frame(self.root)
        preset_frame.pack(fill=tk.X, padx=10)
        self.preset_cb = ttk.Combobox(preset_frame, textvariable=self.current_preset_name, state="readonly", width=30)
        self.preset_cb.pack(side=tk.LEFT, padx=(0,5))
        self.preset_cb.bind("<<ComboboxSelected>>", self.on_preset_select)
        ttk.Button(preset_frame, text="💾 Save", command=self.save_preset).pack(side=tk.LEFT, padx=2)
        ttk.Button(preset_frame, text="🗑 Delete", command=self.delete_preset).pack(side=tk.LEFT, padx=2)

        # Save folder
        ttk.Label(self.root, text="Save folder:").pack(pady=(10,0))
        folder_frame = ttk.Frame(self.root)
        folder_frame.pack(fill=tk.X, padx=10)
        ttk.Entry(folder_frame, textvariable=self.save_dir).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(folder_frame, text="Browse", command=self.browse_folder).pack(side=tk.RIGHT, padx=5)

        # Control buttons
        btn_frame = ttk.Frame(self.root)
        btn_frame.pack(pady=15)
        self.preview_btn = ttk.Button(btn_frame, text="▶ Preview", command=self.start_preview)
        self.preview_btn.pack(side=tk.LEFT, padx=5)
        self.stop_btn = ttk.Button(btn_frame, text="⏹ Stop", command=self.stop_preview_now, state=tk.DISABLED)
        self.stop_btn.pack(side=tk.LEFT, padx=5)
        self.save_btn = ttk.Button(btn_frame, text="💾 Save MP3", command=self.start_save)
        self.save_btn.pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Quit", command=self.root.quit).pack(side=tk.LEFT, padx=5)

        self.status = tk.StringVar(value="Ready")
        ttk.Label(self.root, textvariable=self.status, relief=tk.SUNKEN, anchor=tk.W).pack(
            fill=tk.X, side=tk.BOTTOM)

    # ---------- Voice / UI helpers ----------
    def on_voice_select(self, event):
        sel = self.voice_cb.get()
        for v in self.voices:
            if f"{v['ShortName']} ({v['Locale']})" == sel:
                self.selected_voice.set(v["ShortName"])
                return

    def update_rate_label(self, val):
        self.rate_label.config(text=f"{float(val):+.0f}%")

    def update_pitch_label(self, val):
        self.pitch_label.config(text=f"{float(val):+.0f} Hz")

    def update_volume_label(self, val):
        self.volume_label.config(text=f"{float(val):+.1f} dB")

    def browse_folder(self):
        folder = filedialog.askdirectory(initialdir=self.save_dir.get())
        if folder:
            self.save_dir.set(folder)

    def get_text(self):
        text = self.text_box.get("1.0", tk.END).strip()
        if not text:
            messagebox.showwarning("No Text", "Please enter some text.")
            return None
        return text

    def disable_buttons(self):
        self.preview_btn.config(state=tk.DISABLED)
        self.save_btn.config(state=tk.DISABLED)
        self.stop_btn.config(state=tk.NORMAL)

    def enable_buttons(self):
        self.preview_btn.config(state=tk.NORMAL)
        self.save_btn.config(state=tk.NORMAL)
        self.stop_btn.config(state=tk.DISABLED)

    # ---------- Effect chain management ----------
    def refresh_effect_lists(self):
        self.applied_listbox.delete(0, tk.END)
        for eff in self.applied_effects:
            self.applied_listbox.insert(tk.END, eff)

    def add_effect(self):
        sel = self.avail_listbox.curselection()
        if sel:
            eff = self.avail_listbox.get(sel[0])
            self.applied_effects.append(eff)
            self.refresh_effect_lists()

    def remove_effect(self):
        sel = self.applied_listbox.curselection()
        if sel:
            del self.applied_effects[sel[0]]
            self.refresh_effect_lists()

    def move_up(self):
        sel = self.applied_listbox.curselection()
        if sel and sel[0] > 0:
            idx = sel[0]
            self.applied_effects[idx], self.applied_effects[idx-1] = self.applied_effects[idx-1], self.applied_effects[idx]
            self.refresh_effect_lists()
            self.applied_listbox.selection_set(idx-1)

    def move_down(self):
        sel = self.applied_listbox.curselection()
        if sel and sel[0] < len(self.applied_effects)-1:
            idx = sel[0]
            self.applied_effects[idx], self.applied_effects[idx+1] = self.applied_effects[idx+1], self.applied_effects[idx]
            self.refresh_effect_lists()
            self.applied_listbox.selection_set(idx+1)

    # ---------- Preset management ----------
    def refresh_preset_dropdown(self):
        names = list(self.presets.keys())
        self.preset_cb["values"] = names
        if names:
            self.current_preset_name.set(names[0])
        else:
            self.current_preset_name.set("")

    def save_preset(self):
        name = simpledialog.askstring("Preset Name", "Enter a name for this preset:")
        if not name:
            return
        self.presets[name] = {
            "voice": self.selected_voice.get(),
            "rate": self.rate.get(),
            "pitch": self.pitch.get(),
            "effects": self.applied_effects.copy(),
            "master_volume": self.master_volume.get()   # save volume in preset
        }
        save_presets(self.presets)
        self.refresh_preset_dropdown()
        self.current_preset_name.set(name)
        messagebox.showinfo("Saved", f"Preset '{name}' saved.")

    def delete_preset(self):
        name = self.current_preset_name.get()
        if not name:
            messagebox.showwarning("No Preset", "No preset selected.")
            return
        if messagebox.askyesno("Delete", f"Delete preset '{name}'?"):
            del self.presets[name]
            save_presets(self.presets)
            self.refresh_preset_dropdown()
            messagebox.showinfo("Deleted", f"Preset '{name}' deleted.")

    def on_preset_select(self, event):
        name = self.current_preset_name.get()
        if name in self.presets:
            p = self.presets[name]
            self.selected_voice.set(p["voice"])
            self.rate.set(p["rate"])
            self.pitch.set(p["pitch"])
            self.master_volume.set(p.get("master_volume", 0))
            self.applied_effects = p.get("effects", []).copy()
            self.refresh_effect_lists()
            for i, v in enumerate(self.voices):
                if v["ShortName"] == p["voice"]:
                    self.voice_cb.current(i)
                    break

    # ---------- Preview & Stop ----------
    def stop_preview_now(self):
        self.stop_preview = True
        self.status.set("Stopping...")
        pygame.mixer.music.stop()

    def start_preview(self):
        if self.is_busy:
            messagebox.showinfo("Busy", "Already processing.")
            return
        text = self.get_text()
        if not text:
            return
        self.is_busy = True
        self.stop_preview = False
        self.disable_buttons()
        threading.Thread(target=self._preview_thread, args=(text,), daemon=True).start()

    def _preview_thread(self, text):
        self.status.set("Generating preview...")
        self.root.update_idletasks()
        try:
            if self.temp_audio and os.path.exists(self.temp_audio):
                os.unlink(self.temp_audio)
            fd, self.temp_audio = tempfile.mkstemp(suffix=".mp3")
            os.close(fd)

            voice = self.selected_voice.get()
            rate_str = f"{int(self.rate.get()):+d}%"
            pitch_str = f"{int(self.pitch.get()):+d}Hz"

            communicate = edge_tts.Communicate(text, voice, rate=rate_str, pitch=pitch_str)
            asyncio.run(communicate.save(self.temp_audio))

            # Apply effects and/or master volume
            if self.applied_effects or self.master_volume.get() != 0:
                self.status.set("Processing audio...")
                seg = AudioSegment.from_mp3(self.temp_audio)
                if self.applied_effects:
                    seg = apply_effect_chain(seg, self.applied_effects)
                if self.master_volume.get() != 0:
                    seg = seg.apply_gain(self.master_volume.get())
                seg.export(self.temp_audio, format="mp3")

            if self.stop_preview:
                self.status.set("Preview cancelled.")
                return

            self.status.set("Playing...")
            pygame.mixer.init()
            pygame.mixer.music.load(self.temp_audio)
            pygame.mixer.music.play()
            while pygame.mixer.music.get_busy():
                if self.stop_preview:
                    pygame.mixer.music.stop()
                    break
                pygame.time.Clock().tick(10)
            pygame.mixer.quit()
            self.status.set("Preview finished." if not self.stop_preview else "Preview stopped.")
        except Exception as e:
            self.status.set("Preview error")
            messagebox.showerror("Error", f"Preview failed: {e}")
        finally:
            self.is_busy = False
            self.enable_buttons()

    # ---------- Save ----------
    def start_save(self):
        if self.is_busy:
            messagebox.showinfo("Busy", "Already processing.")
            return
        text = self.get_text()
        if not text:
            return
        default_name = "".join(c if c.isalnum() else "_" for c in text[:30].strip()).rstrip("_") or "speech"
        custom_name = simpledialog.askstring("Save As",
                                             "Enter filename (without extension):",
                                             initialvalue=default_name)
        if not custom_name:
            return
        custom_name = sanitize_filename(custom_name)
        if not custom_name:
            messagebox.showwarning("Invalid Name", "The filename is empty or contains only invalid characters.")
            return
        filepath = os.path.join(self.save_dir.get(), custom_name + ".mp3")
        if os.path.exists(filepath):
            if not messagebox.askyesno("Overwrite?", f"'{filepath}' already exists.\nOverwrite?"):
                return

        self.is_busy = True
        self.disable_buttons()
        threading.Thread(target=self._save_thread, args=(text, filepath), daemon=True).start()

    def _save_thread(self, text, out_path):
        self.status.set("Saving MP3...")
        self.root.update_idletasks()
        try:
            voice = self.selected_voice.get()
            rate_str = f"{int(self.rate.get()):+d}%"
            pitch_str = f"{int(self.pitch.get()):+d}Hz"

            communicate = edge_tts.Communicate(text, voice, rate=rate_str, pitch=pitch_str)
            asyncio.run(communicate.save(out_path))

            # Apply effects and/or master volume
            if self.applied_effects or self.master_volume.get() != 0:
                self.status.set("Applying effects & volume...")
                seg = AudioSegment.from_mp3(out_path)
                if self.applied_effects:
                    seg = apply_effect_chain(seg, self.applied_effects)
                if self.master_volume.get() != 0:
                    seg = seg.apply_gain(self.master_volume.get())
                seg.export(out_path, format="mp3")

            self.status.set(f"Saved: {os.path.basename(out_path)}")
            messagebox.showinfo("Success", f"MP3 saved as:\n{out_path}")
        except Exception as e:
            self.status.set("Save error")
            messagebox.showerror("Error", f"Save failed: {e}")
        finally:
            self.is_busy = False
            self.enable_buttons()

if __name__ == "__main__":
    root = tk.Tk()
    app = TTSApp(root)
    root.mainloop()