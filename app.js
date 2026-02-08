const TRACK_COUNT = 7;
const STEP_COUNT = 32;
const TRACK_NAMES = ['VOID', 'AETHER', 'CRYSTAL', 'RESONANCE', 'FLUX', 'CELESTIA', 'ORBIT'];

let isPlaying = false;
let currentStep = 0;
let tracks = [];
let selectedNote = 'C3';
let currentOctave = 3;
// Store the actual note string or null in the sequencer grid
let sequencerData = Array(TRACK_COUNT).fill().map(() => Array(STEP_COUNT).fill(null));

// FX Chain
const delay = new Tone.FeedbackDelay("8n", 0.5).toDestination();
delay.wet.value = 0;

const reverb = new Tone.Reverb({
    decay: 5,
    preDelay: 0.1
}).toDestination();
reverb.wet.value = 0.3;

const filter = new Tone.Filter(20000, "lowpass").toDestination();
const distortion = new Tone.Distortion(0.2).toDestination();
const chorus = new Tone.Chorus(4, 2.5, 0.5).start().toDestination();
const bitcrush = new Tone.BitCrusher(8).toDestination();

// Master chain for all tracks
const masterChain = [delay, reverb, filter, distortion, chorus, bitcrush];

// Initialize Audio Context on first click
document.addEventListener('click', async () => {
    if (Tone.context.state !== 'running') {
        await Tone.start();
        console.log('Audio Context started');
    }
}, { once: true });

// Setup Tracks with Harmonic Instruments
function setupTracks() {
    const SCALE = ['C2', 'G2', 'Eb3', 'G3', 'Bb3', 'C4', 'D4']; // C Minor 7th / Cinematic scale

    for (let i = 0; i < TRACK_COUNT; i++) {
        let synth;
        const panner = new Tone.Panner((i / TRACK_COUNT) * 2 - 1).toDestination();
        const volume = new Tone.Volume(-18).toDestination();

        switch (i) {
            case 0: // DEEP VOID - Sub Bass Pad
                synth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: 'sine' },
                    envelope: { attack: 4, decay: 2, sustain: 1, release: 10 }
                }).connect(filter);
                break;
            case 1: // AETHER - Soft EP/Pad
                synth = new Tone.PolySynth(Tone.MonoSynth, {
                    oscillator: { type: 'triangle' },
                    envelope: { attack: 3, decay: 1, sustain: 1, release: 8 }
                }).connect(reverb);
                break;
            case 2: // CRYSTAL - FM Bells
                synth = new Tone.FMSynth({
                    harmonicity: 3.01,
                    modulationIndex: 14,
                    envelope: { attack: 0.1, decay: 4, sustain: 0.1, release: 4 }
                }).connect(delay);
                break;
            case 3: // RESONANCE - String-like Pad
                synth = new Tone.PolySynth(Tone.AMSynth, {
                    envelope: { attack: 2, decay: 3, sustain: 0.5, release: 6 }
                }).connect(chorus);
                break;
            case 4: // PULSE GLOW - Distorted Harmonic
                synth = new Tone.DuoSynth({
                    vibratoAmount: 0.5,
                    vibratoRate: 5,
                    harmonicity: 1.5,
                    voice0: { oscillator: { type: 'sawtooth' }, envelope: { attack: 1.5, release: 4 } },
                    voice1: { oscillator: { type: 'sine' }, envelope: { attack: 2, release: 5 } }
                }).connect(distortion);
                break;
            case 5: // CELESTIAL - High Harmonics
                synth = new Tone.PolySynth(Tone.FMSynth, {
                    envelope: { attack: 5, decay: 2, sustain: 1, release: 12 }
                }).connect(reverb);
                break;
            case 6: // ORBIT - Modulated Lead
                synth = new Tone.MonoSynth({
                    oscillator: { type: 'square' },
                    envelope: { attack: 2, decay: 8, sustain: 0.2, release: 8 },
                    filterEnvelope: { attack: 4, decay: 2, sustain: 0.5, release: 6, baseFrequency: 200, octaves: 4 }
                }).connect(delay);
                break;
        }

        synth.connect(panner);
        panner.connect(volume);

        tracks.push({
            id: i,
            name: TRACK_NAMES[i],
            instrument: synth,
            volume: volume,
            panner: panner,
            note: SCALE[i]
        });
    }
}

// Generate UI
function createUI() {
    const grid = document.getElementById('sequencer-grid');
    grid.innerHTML = '';

    TRACK_NAMES.forEach((name, trackIdx) => {
        const row = document.createElement('div');
        row.className = 'track-row';

        const info = document.createElement('div');
        info.className = 'track-info';

        // Track Name and Fader
        const nameBadge = document.createElement('div');
        nameBadge.className = 'track-name-badge';
        nameBadge.innerHTML = `<div class="track-name">${name}</div>`;

        const faderContainer = document.createElement('div');
        faderContainer.className = 'track-fader-container';
        const fader = document.createElement('input');
        fader.type = 'range';
        fader.className = 'track-fader';
        fader.min = -60;
        fader.max = 0;
        fader.value = -18;
        fader.addEventListener('input', (e) => {
            tracks[trackIdx].volume.volume.value = e.target.value;
        });
        faderContainer.appendChild(fader);

        // 4 Modulation Knobs
        const paramsGrid = document.createElement('div');
        paramsGrid.className = 'track-params-grid';
        for (let k = 0; k < 4; k++) {
            const knob = document.createElement('div');
            knob.className = 'knob-mini';
            knob.title = `Param ${k + 1}`;

            let startY;
            let currentRotation = 0;

            const onMouseMove = (e) => {
                const diff = startY - e.clientY;
                const sensitivity = 0.01;
                const track = tracks[trackIdx];
                const synth = track.instrument;

                let newAttack, newDecay, newSustain, newRelease;

                if (synth.envelope) {
                    newAttack = synth.envelope.attack;
                    newDecay = synth.envelope.decay;
                    newSustain = synth.envelope.sustain;
                    newRelease = synth.envelope.release;

                    if (k === 0) newAttack = Math.max(0.01, newAttack + diff * sensitivity);
                    if (k === 1) newDecay = Math.max(0.01, newDecay + diff * sensitivity);
                    if (k === 2) newSustain = Math.min(1, Math.max(0, newSustain + diff * sensitivity));
                    if (k === 3) newRelease = Math.max(0.01, newRelease + diff * sensitivity);

                    synth.envelope.attack = newAttack;
                    synth.envelope.decay = newDecay;
                    synth.envelope.sustain = newSustain;
                    synth.envelope.release = newRelease;

                } else if (synth instanceof Tone.PolySynth) {
                    const currentEnvelope = synth.get().envelope;
                    newAttack = currentEnvelope.attack;
                    newDecay = currentEnvelope.decay;
                    newSustain = currentEnvelope.sustain;
                    newRelease = currentEnvelope.release;

                    if (k === 0) newAttack = Math.max(0.01, newAttack + diff * sensitivity);
                    if (k === 1) newDecay = Math.max(0.01, newDecay + diff * sensitivity);
                    if (k === 2) newSustain = Math.min(1, Math.max(0, newSustain + diff * sensitivity));
                    if (k === 3) newRelease = Math.max(0.01, newRelease + diff * sensitivity);

                    synth.set({
                        envelope: {
                            attack: newAttack,
                            decay: newDecay,
                            sustain: newSustain,
                            release: newRelease
                        }
                    });
                }

                currentRotation += diff * 0.5;
                knob.style.transform = `rotate(${currentRotation}deg)`;
                startY = e.clientY;
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            knob.addEventListener('mousedown', (e) => {
                startY = e.clientY;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            paramsGrid.appendChild(knob);
        }

        info.appendChild(nameBadge);
        info.appendChild(faderContainer);
        info.appendChild(paramsGrid);

        const stepGrid = document.createElement('div');
        stepGrid.className = 'step-grid';

        for (let stepIdx = 0; stepIdx < STEP_COUNT; stepIdx++) {
            const step = document.createElement('div');
            step.className = 'step';
            step.dataset.track = trackIdx;
            step.dataset.step = stepIdx;

            step.addEventListener('click', () => {
                if (sequencerData[trackIdx][stepIdx] === selectedNote) {
                    sequencerData[trackIdx][stepIdx] = null;
                    step.classList.remove('active');
                    step.textContent = '';
                } else {
                    sequencerData[trackIdx][stepIdx] = selectedNote;
                    step.classList.add('active');
                    step.textContent = selectedNote.replace(/[0-9]/, '');
                }
            });

            stepGrid.appendChild(step);
        }

        row.appendChild(info);
        row.appendChild(stepGrid);
        grid.appendChild(row);
    });
}

function updateKeyboard() {
    const kb = document.getElementById('keyboard');
    kb.innerHTML = '';
    const notesBase = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const oct = currentOctave;
    const notes = notesBase.map(n => n + oct).concat(['C' + (oct + 1)]);

    notes.forEach(note => {
        const key = document.createElement('div');
        key.className = `key ${note.includes('#') ? 'black' : 'white'} ${note === selectedNote ? 'selected' : ''}`;
        key.dataset.note = note;

        key.addEventListener('mousedown', () => {
            selectedNote = note;
            document.querySelectorAll('.key').forEach(k => k.classList.remove('selected'));
            key.classList.add('selected');
            playTestNote(note);
        });

        kb.appendChild(key);
    });
}

function playTestNote(note) {
    tracks[1].instrument.triggerAttackRelease(note, "4n");
}

// Sequencer Loop
function repeat(time) {
    const step = currentStep % STEP_COUNT;
    const allSteps = document.querySelectorAll('.step');
    allSteps.forEach(s => s.classList.remove('current'));
    const stepsAtThisIdx = document.querySelectorAll(`.step[data-step="${step}"]`);
    stepsAtThisIdx.forEach(s => s.classList.add('current'));

    for (let i = 0; i < TRACK_COUNT; i++) {
        const activeNote = sequencerData[i][step];
        if (activeNote) {
            const track = tracks[i];
            let duration = "2n";

            if (track.instrument.triggerAttackRelease) {
                track.instrument.triggerAttackRelease(activeNote, duration, time);
            } else if (track.instrument.triggerAttack) {
                track.instrument.triggerAttack(activeNote, time);
                track.instrument.triggerRelease(time + Tone.Time(duration));
            }
        }
    }
    currentStep++;
}

// Controls
function setupControls() {
    const playBtn = document.getElementById('play-btn');
    const stopBtn = document.getElementById('stop-btn');
    const clearBtn = document.getElementById('clear-btn');

    const bpmKnob = document.getElementById('bpm-knob');
    const bpmDisplay = document.getElementById('bpm-display');
    const volKnob = document.getElementById('master-vol-knob');
    const volDisplay = document.getElementById('vol-display');

    // BPM Knob
    let startY_bpm, currentBPM = 120;
    bpmKnob.addEventListener('mousedown', (e) => {
        startY_bpm = e.clientY;
        const onMouseMove = (e) => {
            const diff = startY_bpm - e.clientY;
            currentBPM = Math.min(220, Math.max(40, currentBPM + diff));
            Tone.Transport.bpm.value = currentBPM;
            bpmDisplay.textContent = Math.round(currentBPM);
            bpmKnob.style.transform = `rotate(${(currentBPM - 120) * 1.5}deg)`;
            startY_bpm = e.clientY;
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    // Vol Knob
    let startY_vol, currentVol = -12;
    volKnob.addEventListener('mousedown', (e) => {
        startY_vol = e.clientY;
        const onMouseMove = (e) => {
            const diff = (startY_vol - e.clientY) * 0.5;
            currentVol = Math.min(0, Math.max(-60, currentVol + diff));
            Tone.Destination.volume.value = currentVol;
            volDisplay.textContent = Math.round(currentVol) + 'dB';
            volKnob.style.transform = `rotate(${(currentVol + 12) * 4}deg)`;
            startY_vol = e.clientY;
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    playBtn.addEventListener('click', () => {
        if (isPlaying) return;
        isPlaying = true;
        Tone.Transport.start();
        playBtn.textContent = 'PAUSE';
    });

    stopBtn.addEventListener('click', () => {
        isPlaying = false;
        Tone.Transport.stop();
        currentStep = 0;
        playBtn.textContent = 'PLAY';
        document.querySelectorAll('.step').forEach(s => s.classList.remove('current'));
    });

    clearBtn.addEventListener('click', () => {
        sequencerData = Array(TRACK_COUNT).fill().map(() => Array(STEP_COUNT).fill(null));
        document.querySelectorAll('.step').forEach(s => {
            s.classList.remove('active');
            s.textContent = '';
        });
    });

    // Octave
    const octUp = document.getElementById('octave-up');
    const octDown = document.getElementById('octave-down');
    const octDisplay = document.getElementById('octave-display');

    octUp.addEventListener('click', () => {
        if (currentOctave < 6) {
            currentOctave++;
            octDisplay.textContent = currentOctave;
            updateKeyboard();
        }
    });

    octDown.addEventListener('click', () => {
        if (currentOctave > 1) {
            currentOctave--;
            octDisplay.textContent = currentOctave;
            updateKeyboard();
        }
    });

    // FX
    document.querySelectorAll('.fx-param').forEach(input => {
        input.addEventListener('input', (e) => {
            const fxType = e.target.dataset.fx;
            const val = parseFloat(e.target.value);
            switch (fxType) {
                case 'delay': delay.wet.value = val; break;
                case 'reverb': reverb.wet.value = val; break;
                case 'crush': bitcrush.bits.value = val; break;
                case 'chorus': chorus.wet.value = val; break;
                case 'dist': distortion.distortion = val; break;
                case 'filter': filter.frequency.value = val; break;
            }
        });
    });
}

async function init() {
    setupTracks();
    createUI();
    updateKeyboard();
    setupControls();
    Tone.Transport.scheduleRepeat((time) => { repeat(time); }, "16n");
    Tone.Transport.bpm.value = 120;
}

init();
