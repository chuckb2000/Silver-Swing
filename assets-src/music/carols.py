"""Christmas music for Silver Swings (developer, 2026-11-13): six public-domain carols, arranged
here and synthesized from scratch with the suite's instruments (instruments.py, suite.py's Mov).
Played instead of the suite from 12 to 31 December (src/audio/music.ts).

Every tune was published long before 1929:
  1 Jingle Bells          James Lord Pierpont, 1857
  2 Deck the Halls        Welsh traditional ("Nos Galan"), 18th century
  3 Silent Night          Franz Xaver Gruber, 1818
  4 We Wish You a Merry Christmas   English traditional
  5 Joy to the World      Lowell Mason, "Antioch", 1839
  6 Good King Wenceslas   "Tempus adest floridum", Piae Cantiones, 1582

python3 carols.py <1-6> out.wav

Melodies are written in a home key as note names with lengths in beats ("D5:1.5 C5:.5 ...") and
chords as names ("G", "D7", "Am", "C|D7" splits the bar); `shift` transposes both.
"""
import sys
import wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import instruments as I
from instruments import SR, hz
from suite import Mov, horn, tpt, fl, cl, ob, vl, glk, xyl, stacc

PCS = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
QUAL = {'': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'm7': [0, 3, 7, 10], 'maj7': [0, 4, 7, 11],
        'dim': [0, 3, 6], 'sus4': [0, 5, 7], '6': [0, 4, 7, 9]}


def pc(name):
    n, i = PCS[name[0]], 1
    while i < len(name) and name[i] in '#b':
        n += 1 if name[i] == '#' else -1
        i += 1
    return n % 12, name[i:]


class Carol(Mov):
    """A movement written in `key` (its tonic's name), sounding `shift` semitones away."""

    def __init__(self, key, shift, bpm, beats=4):
        t = PCS[key] + shift + 48
        while t < 53:
            t += 12
        while t > 64:
            t -= 12
        super().__init__(t, 'major', bpm, beats)
        self.shift = shift

    def modulate(self, by):
        self.shift += by
        self.tonic += by
        self.prev = [p + by for p in self.prev]

    def cn(self, name):
        bass = None
        if '/' in name:
            name, b = name.split('/')
            bass = (pc(b)[0] + self.shift) % 12
        root, q = pc(name)
        root = (root + self.shift) % 12
        return ('raw', [(root + x) % 12 for x in QUAL[q]], root if bass is None else bass)

    def chord(self, sym):
        return super().chord(self.cn(sym) if isinstance(sym, str) else sym)

    def tune(self, bus, bar, spec, fn, octave=0, beat0=0.0, legato=1.0, only_long=0.0):
        """Play `spec` from (bar, beat0); returns the bar after it ends. only_long: just the notes that long."""
        b = beat0
        for tok in spec.split():
            n, l = tok.split(':')
            l = float(l)
            if n != 'r' and l >= only_long:
                nt = I.m(n) + self.shift + 12 * octave
                self.put(bus, bar + int(b // self.beats), b % self.beats,
                         lambda f=hz(nt), d=l * self.beat * legato: fn(f, d))
            b += l
        return bar + int(np.ceil(b / self.beats - 1e-9))

    def bells(self, bar, bars, vel):
        """sleigh bells: every eighth, the backbeats shaken harder."""
        for b in range(bar, bar + bars):
            for i in range(int(self.beats * 2)):
                acc = 1.0 if i in (2, 6) else 0.5
                self.put('bells', b, i * 0.5, lambda a=acc: jingle(vel * a))

    def waltz(self, bar, syms, vel, span=1):
        """oom-pah-pah: the bass on the downbeat (and where the chord changes), the chord on the others."""
        for k, sym in enumerate(syms):
            for p, off, length in self.split(sym, self.beats):
                tones, bp = self.chord(p)
                v = self.voicing(tones, 55, 74)[:3]
                for beat in range(int(round(off)), int(round(off + length))):
                    if beat == 0 or beat == int(round(off)):
                        self.put('pizz', bar + k, beat, lambda f=hz(self.bassnote(bp, 40)): I.pizz(f, vel * (1.3 if beat == 0 else 1.0)))
                    else:
                        for nt in v:
                            self.put('harp', bar + k, beat, lambda f=hz(nt): I.pluck(f, 0.4, vel * 0.45))

    def hits(self, bar, beat, name, vel, length=0.5):
        """a short tutti chord (brass and pizzicato bass)."""
        tones, bp = self.chord(name)
        for nt in self.voicing(tones, 50, 72):
            self.put('tbn', bar, beat, lambda f=hz(nt): I.brass(f, length, vel, voices=2))
        self.put('pizz', bar, beat, lambda f=hz(self.bassnote(bp, 38)): I.pizz(f, vel * 1.2))


def jingle(vel):
    """a shake of sleigh bells: a cluster of small bright bells and their rattle."""
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    noise = sosfilt(butter(2, [5200, 12500], 'band', fs=SR, output='sos'), I.rng.standard_normal(n))
    tones = np.zeros(n)
    for f in I.rng.uniform(5200, 8800, 7):
        tones += np.sin(2 * np.pi * f * t + I.rng.uniform(0, 6.28)) * np.exp(-t / I.rng.uniform(0.05, 0.12))
    shake = 1 + 0.6 * np.sin(2 * np.pi * 31 * t + I.rng.uniform(0, 6.28))
    return (0.55 * noise * np.exp(-t / 0.05) + 0.06 * tones) * shake * np.minimum(t / 0.002, 1) * vel


def flat_ch(*parts):
    return [c for p in parts for c in p]


# ------------------------------------------------------------------ 1 Jingle Bells (written in G)
JB_VERSE = ("D4:1 B4:1 A4:1 G4:1  D4:3 D4:.5 D4:.5  D4:1 B4:1 A4:1 G4:1  E4:4 "
            "E4:1 C5:1 B4:1 A4:1  F#4:4  D5:1 D5:1 C5:1 A4:1  B4:4 "
            "D4:1 B4:1 A4:1 G4:1  D4:4  D4:1 B4:1 A4:1 G4:1  E4:3 E4:1 "
            "E4:1 C5:1 B4:1 A4:1  D5:1 D5:1 D5:1 D5:1  E5:1 D5:1 C5:1 A4:1  G4:2 r:2")
JB_VERSE_CH = ['G', 'G', 'G', 'C', 'C|C|G|D', 'D', 'D7', 'G', 'G', 'G', 'G', 'C', 'C|C|G|D', 'D7', 'C|D7', 'G']
JB_CHORUS = ("B4:1 B4:1 B4:2  B4:1 B4:1 B4:2  B4:1 D5:1 G4:1.5 A4:.5  B4:4 "
             "C5:1 C5:1 C5:1.5 C5:.5  C5:1 B4:1 B4:1 B4:.5 B4:.5  B4:1 A4:1 A4:1 B4:1  A4:2 D5:2 "
             "B4:1 B4:1 B4:2  B4:1 B4:1 B4:2  B4:1 D5:1 G4:1.5 A4:.5  B4:4 "
             "C5:1 C5:1 C5:1.5 C5:.5  C5:1 B4:1 B4:1 B4:.5 B4:.5  D5:1 D5:1 C5:1 A4:1  G4:4")
JB_CHORUS_CH = ['G', 'G', 'G', 'G', 'C', 'C|G|G|G', 'G|A7|A7|A7', 'D7', 'G', 'G', 'G', 'G', 'C', 'C|G|G|G', 'D7', 'G']


def c1():  # Jingle Bells: A major, 116
    M = Carol('G', 2, 116)
    M.bells(1, 52, 0.16)
    M.staccato(1, ['G', 'C', 'D7', 'G'], 0.15)
    M.tune('glk', 1, "D5:1 B5:1 A5:1 G5:1  r:4  E5:1 C6:1 B5:1 A5:1  F#5:2 D5:2", glk(0.05))
    M.staccato(5, JB_VERSE_CH, 0.16)
    M.tune('cl', 5, JB_VERSE, cl(0.34))
    M.tune('fl', 13, " ".join(JB_VERSE.split()[22:]), fl(0.16), octave=1)  # the flute joins for the second half
    M.march(21, JB_CHORUS_CH, 0.18)
    M.pad(21, JB_CHORUS_CH, 0.07, attack=0.15)
    M.tune('horn', 21, JB_CHORUS, horn(0.38))
    M.tune('glk', 21, JB_CHORUS, glk(0.05), octave=1, only_long=2)
    M.timp(21, 0, 1, 0.35)
    M.roll(36, 2, 2, 5, 0.08, 0.4)
    M.swell(37, 1.6, 0.12)
    M.march(37, JB_CHORUS_CH, 0.21)
    M.pad(37, JB_CHORUS_CH, 0.1, attack=0.12, bright=1.15)
    M.tune('tpt', 37, JB_CHORUS, tpt(0.34, 1.1))
    M.tune('fl', 37, JB_CHORUS, fl(0.2), octave=1)
    M.tune('horn', 37, JB_CHORUS, horn(0.22), octave=-1)
    M.crash(37, 0, 0.14)
    for b in range(37, 53):
        M.put('snr', b, 1, lambda: I.snare(0.09))
        M.put('snr', b, 3, lambda: I.snare(0.09))
    M.timp(37, 0, 1, 0.45)
    M.timp(45, 0, 1, 0.45)
    # the tag: "jingle all the way" once more, slower, and the last chord
    M.tune('tpt', 53, "B4:1 D5:1 G4:1.5 A4:.5", tpt(0.34))
    M.tune('horn', 53, "B4:1 D5:1 G4:1.5 A4:.5", horn(0.3), octave=-1)
    M.pad(53, ['G|D7'], 0.12, attack=0.1)
    for i, n in enumerate(['G5', 'B5', 'D6', 'G6']):
        M.put('xylo', 53, 2 + i * 0.5, lambda f=hz(I.m(n) + M.shift): I.xylo(f, 0.22))
    M.hits(54, 0, 'G', 0.32, 1.4)
    M.put('tpt', 54, 0, lambda: I.brass(hz(I.m('G5') + M.shift), 1.4, 0.34))
    M.put('bells', 54, 0, lambda: jingle(0.3))
    M.timp(54, 0, 1, 0.6)
    M.crash(54, 0, 0.16)
    return M, 54, -17.5


# ------------------------------------------------------------------ 2 Deck the Halls (written in G)
DH_1 = "D5:1.5 C5:.5 B4:1 A4:1  G4:1 A4:1 B4:1 G4:1  A4:.5 B4:.5 C5:.5 A4:.5 B4:1.5 A4:.5  G4:1 F#4:1 G4:2 "
DH_3 = "A4:1.5 B4:.5 C5:1 A4:1  B4:1.5 C5:.5 D5:1 A4:1  B4:.5 C#5:.5 D5:1 E5:.5 F#5:.5 G5:1  F#5:1 E5:1 D5:2 "
DH_4 = "D5:1.5 C5:.5 B4:1 A4:1  G4:1 A4:1 B4:1 G4:1  E5:.5 E5:.5 E5:.5 E5:.5 D5:1.5 C5:.5  B4:1 A4:1 G4:2 "
DECK = DH_1 + DH_1 + DH_3 + DH_4
DH_1_CH = ['G|G|G|D', 'G|D|G|G', 'Am|D7|G|D', 'G|D|G|G']
DECK_CH = DH_1_CH + DH_1_CH + ['D|D|D7|D', 'G|G|G|D', 'A|D|A|A7', 'D|A7|D|D'] + ['G|G|G|D7', 'G|D|G|G', 'C|C|G|D7', 'G|D|G|G']


def c2():  # Deck the Halls: F major, then G; 112
    M = Carol('G', -2, 112)
    M.march(1, ['G', 'D7'], 0.16)
    M.tune('horn', 1, "G4:1 B4:1 D5:2  A4:1 F#4:1 D4:2", horn(0.3))
    M.march(3, DECK_CH, 0.17)
    M.tune('ob', 3, DECK, ob(0.32))
    for b in range(3, 19):
        M.put('snr', b, 1, lambda: I.snare(0.06))
        M.put('snr', b, 3, lambda: I.snare(0.06))
    M.march(19, DECK_CH, 0.17)
    M.pad(19, DECK_CH, 0.08, attack=0.2)
    M.tune('horn', 19, DECK, horn(0.36))
    M.tune('fl', 19, DECK, fl(0.16), octave=1, only_long=1)
    M.arp(19, DECK_CH, 0.09, step=0.5)
    M.timp(19, 0, 1, 0.35)
    # up a step for the last verse
    M.hits(35, 0, 'E7', 0.24, 0.5)   # the new key's dominant (written a step up, before the change)
    M.hits(35, 1.5, 'E7', 0.26, 0.5)
    M.modulate(2)
    M.roll(35, 2, 2, 5, 0.08, 0.45)
    M.swell(36, 1.6, 0.12)
    M.march(36, DECK_CH, 0.2)
    M.pad(36, DECK_CH, 0.1, attack=0.12, bright=1.15)
    M.tune('tpt', 36, DECK, tpt(0.34, 1.1))
    M.tune('horn', 36, DECK, horn(0.24), octave=-1)
    M.tune('vln', 36, DECK, vl(0.18), octave=1)
    M.crash(36, 0, 0.14)
    for b in range(36, 52):
        M.put('snr', b, 1, lambda: I.snare(0.1))
        M.put('snr', b, 3, lambda: I.snare(0.1))
    M.timp(36, 0, 1, 0.45)
    M.timp(44, 0, 1, 0.45)
    # "la la la" once more, broad
    M.tune('tpt', 52, "B4:2 A4:2", tpt(0.34))
    M.tune('horn', 52, "G4:2 F#4:2", horn(0.3))
    M.pad(52, ['G|D7'], 0.12, attack=0.1)
    M.hits(53, 0, 'G', 0.32, 1.6)
    M.put('tpt', 53, 0, lambda: I.brass(hz(I.m('G5') + M.shift), 1.6, 0.34))
    M.timp(53, 0, 1, 0.6)
    M.crash(53, 0, 0.16)
    return M, 53, -17.5


# ------------------------------------------------------------------ 3 Silent Night (written in C, 6/8)
SILENT = ("G4:3 A4:1 G4:2  E4:6  G4:3 A4:1 G4:2  E4:6  D5:4 D5:2  B4:6  C5:4 C5:2  G4:6 "
          "A4:4 A4:2  C5:3 B4:1 A4:2  G4:3 A4:1 G4:2  E4:6  A4:4 A4:2  C5:3 B4:1 A4:2  G4:3 A4:1 G4:2  E4:6 "
          "D5:4 D5:2  F5:3 D5:1 B4:2  C5:6  E5:6  C5:3 G4:1 E4:2  G4:3 F4:1 D4:2  C4:6  C4:6")
SILENT_CH = ['C', 'C', 'C', 'C', 'G', 'G', 'C', 'C', 'F', 'F', 'C', 'C', 'F', 'F', 'C', 'C',
             'G', 'G7', 'C', 'C', 'C', 'G7', 'C', 'C']


def c3():  # Silent Night: Bb major, 6/8 (eighth = 138)
    M = Carol('C', -2, 138, beats=6)
    M.arp(1, ['C', 'C'], 0.14, step=1)
    M.arp(3, SILENT_CH, 0.13, step=1)
    M.pad(3, SILENT_CH, 0.05, attack=0.8, bass=False)
    M.tune('fl', 3, SILENT, fl(0.3))
    M.arp(27, SILENT_CH, 0.11, step=1)
    M.pad(27, SILENT_CH, 0.09, attack=0.6)
    M.tune('horn', 27, SILENT, horn(0.32, voices=3))
    M.tune('glk', 27, SILENT, glk(0.035), octave=1, only_long=6)
    M.tune('cel', 27, " ".join(f"{n}:6" for n in ['E3', 'G3', 'E3', 'G3', 'D3', 'D3', 'E3', 'G3', 'F3', 'A3', 'G3', 'E3',
                                                    'F3', 'A3', 'G3', 'E3', 'D3', 'F3', 'E3', 'G3', 'E3', 'F3', 'E3', 'C3']),
           lambda f, d: I.strings(f, d, 0.11, voices=3, attack=0.5))
    M.pad(51, ['C'], 0.07, attack=0.8, span=2)
    for i, n in enumerate(['C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6']):
        M.put('harp', 51, i, lambda f=hz(I.m(n) + M.shift), i=i: I.pluck(f, 3.0, 0.17 - 0.012 * i))
    M.put('glk', 52, 0, lambda: I.glock(hz(I.m('C6') + M.shift), 1, 0.05))
    return M, 52, -20.0


# ------------------------------------------------------------------ 4 We Wish You a Merry Christmas (G, 3/4)
WW_VERSE = ("D4:1  G4:1 G4:.5 A4:.5 G4:.5 F#4:.5  E4:1 E4:1 E4:1  A4:1 A4:.5 B4:.5 A4:.5 G4:.5  F#4:1 D4:1 D4:1 "
            "B4:1 B4:.5 C5:.5 B4:.5 A4:.5  G4:1 E4:1 D4:.5 D4:.5  E4:1 A4:1 F#4:1  G4:2")
WW_CHORUS = ("D4:1  G4:1 G4:1 G4:1  F#4:2 F#4:1  G4:1 F#4:1 E4:1  D4:2 A4:1 "
             "B4:1 A4:1 G4:1  D5:1 D4:1 D4:.5 D4:.5  E4:1 A4:1 F#4:1  G4:2")
WW_SONG = WW_VERSE + " " + WW_CHORUS           # from beat 2 of the bar before; 16 bars
WW_CH = ['G', 'C', 'A7', 'D', 'B7', 'Em', 'C|D7|D7', 'G', 'G', 'D', 'C|D|A7', 'D', 'G|D|G', 'G', 'C|D7|D7', 'G']


def c4():  # We Wish You a Merry Christmas: G major, then A; 3/4, 138
    M = Carol('G', 0, 138, beats=3)
    M.waltz(1, ['G', 'C', 'D7', 'G'], 0.16)
    M.tune('glk', 1, "G5:1 B5:1 D6:1  E6:1 C6:1 G5:1  F#5:1 A5:1 C6:1  B5:2", glk(0.045))
    M.waltz(5, WW_CH, 0.16)
    M.tune('cl', 4, WW_SONG, cl(0.34), beat0=2)
    M.waltz(21, WW_CH, 0.16)
    M.pad(21, WW_CH, 0.06, attack=0.2)
    M.tune('fl', 20, WW_SONG, fl(0.28), octave=1, beat0=2)
    M.tune('glk', 20, WW_SONG, glk(0.04), octave=1, beat0=2, only_long=2)
    M.waltz(37, WW_CH, 0.17)
    M.pad(37, WW_CH, 0.08, attack=0.15)
    M.tune('horn', 36, WW_SONG, horn(0.38), beat0=2)
    M.tune('vln', 36, WW_SONG, stacc(0.16), octave=1, beat0=2)
    M.timp(37, 0, 1, 0.35)
    # up a step: one bar on the new key's dominant, its pickup in the new key
    M.hits(53, 0, 'E7', 0.24, 0.6)
    M.modulate(2)
    M.roll(53, 1, 1, 5, 0.08, 0.4)
    M.waltz(54, WW_CH, 0.2)
    M.pad(54, WW_CH, 0.1, attack=0.12, bright=1.15)
    M.tune('tpt', 53, WW_SONG, tpt(0.34, 1.1), beat0=2)
    M.tune('horn', 53, WW_SONG, horn(0.24), octave=-1, beat0=2)
    M.tune('fl', 53, WW_SONG, fl(0.18), octave=1, beat0=2)
    M.crash(54, 0, 0.14)
    M.timp(54, 0, 1, 0.45)
    M.timp(62, 0, 1, 0.45)
    for b in range(54, 70):
        M.put('snr', b, 1, lambda: I.snare(0.07))
        M.put('snr', b, 2, lambda: I.snare(0.07))
    M.hits(70, 0, 'G', 0.3, 1.2)
    M.put('tpt', 70, 0, lambda: I.brass(hz(I.m('G5') + M.shift), 1.2, 0.32))
    M.timp(70, 0, 1, 0.55)
    M.crash(70, 0, 0.14)
    return M, 70, -18.0


# ------------------------------------------------------------------ 5 Joy to the World (D, 2/4)
JOY = ("D5:1 C#5:.75 B4:.25  A4:1.5 G4:.5  F#4:1 E4:1  D4:1.5 A4:.5 "
       "B4:1.5 B4:.5  C#5:1.5 C#5:.5  D5:1.5 D5:.5 "
       "D5:.5 C#5:.5 B4:.5 A4:.5  A4:.75 G4:.25 F#4:.5 D5:.5  D5:.5 C#5:.5 B4:.5 A4:.5  A4:.75 G4:.25 F#4:.5 F#4:.5 "
       "F#4:.5 F#4:.5 F#4:.5 F#4:.25 G4:.25  A4:1.5 G4:.25 F#4:.25  E4:.5 E4:.5 E4:.5 E4:.25 F#4:.25  G4:1.5 F#4:.25 E4:.25 "
       "D4:.5 D5:1 B4:.5  A4:.75 G4:.25 F#4:.5 G4:.5  F#4:1 E4:1  D4:2")
JOY_CH = ['D', 'D|G', 'D|A7', 'D', 'G', 'A', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'A7', 'A7', 'D|G', 'D|A7', 'D|A7', 'D']


def c5():  # Joy to the World: D major, then E; 2/4, 96
    M = Carol('D', 0, 96, beats=2)
    for b, n in [(1, "D4:.5 F#4:.5 A4:.5 D5:.5"), (2, "D5:2"), (3, "A4:.5 C#5:.5 E5:.5 G5:.5"), (4, "F#5:2")]:
        M.tune('tpt', b, n, tpt(0.3))
    M.chorale(1, ['D', 'D', 'A7', 'D'], 0.12)
    M.timp(1, 0, 1, 0.4)
    M.timp(4, 0, 1, 0.4)
    M.chorale(5, JOY_CH, 0.12)
    M.tune('tpt', 5, JOY, tpt(0.3))
    M.pad(24, JOY_CH, 0.11, attack=0.25)
    M.arp(24, JOY_CH, 0.1, step=0.5)
    M.tune('vln', 24, JOY, vl(0.3), octave=1)
    M.tune('cel', 24, JOY, lambda f, d: I.strings(f, d, 0.12, voices=3, attack=0.15), octave=-1)
    M.staccato(43, JOY_CH, 0.13)
    M.tune('fl', 43, JOY, fl(0.28), octave=1)
    M.tune('ob', 43, JOY, ob(0.22))
    M.tune('glk', 43, JOY, glk(0.04), octave=1, only_long=1.5)
    # up a step: a bar on the new key's dominant
    M.hits(62, 0, 'B7', 0.24, 0.4)
    M.hits(62, 1, 'B7', 0.26, 0.4)
    M.modulate(2)
    M.roll(62, 1, 1, 5, 0.08, 0.4)
    M.swell(63, 1.5, 0.14)
    M.chorale(63, JOY_CH, 0.17)
    M.pad(63, JOY_CH, 0.12, attack=0.12, bright=1.15)
    M.tune('tpt', 63, JOY, tpt(0.36, 1.15))
    M.tune('vln', 63, JOY, vl(0.2), octave=1)
    M.crash(63, 0, 0.16)
    for b in (63, 67, 70, 74, 78):
        M.timp(b, 0, 1, 0.5)
    for b in range(63, 82):
        M.put('snr', b, 1, lambda: I.snare(0.08))
    M.pad(82, ['D'], 0.16, attack=0.08, span=3)
    M.chorale(82, ['D'], 0.18, span=3)
    M.tune('tpt', 82, "D5:6", tpt(0.36))
    M.roll(82, 0, 5, 1, 0.12, 0.55)
    M.timp(84, 1, 1, 0.75, 3.0)
    M.crash(82, 0, 0.18, 4.0)
    return M, 84, -16.5


# ------------------------------------------------------------------ 6 Good King Wenceslas (G, 4/4)
GKW = ("G4:1 G4:1 G4:1 A4:1  G4:1 G4:1 D4:2  E4:1 D4:1 E4:1 F#4:1  G4:2 G4:2 "
       "G4:1 G4:1 G4:1 A4:1  G4:1 G4:1 D4:2  E4:1 D4:1 E4:1 F#4:1  G4:2 G4:2 "
       "D5:1 C5:1 B4:1 A4:1  B4:1 A4:1 G4:2  E4:1 D4:1 E4:1 F#4:1  G4:2 G4:2 "
       "D4:1 D4:1 E4:1 F#4:1  G4:1 G4:1 A4:2  D5:1 C5:1 B4:1 A4:1  G4:2 C5:2  G4:4")
GKW_CH = ['G|G|G|D', 'G', 'C|G|C|D', 'G', 'G|G|G|D', 'G', 'C|G|C|D', 'G', 'G|Am|G|D', 'G|D|G|G', 'C|G|C|D', 'G',
          'G|G|C|D', 'G|G|D|D', 'G|Am|G|D', 'G|G|C|C', 'G']


def c6():  # Good King Wenceslas: C major, then D; 104
    M = Carol('G', 5, 104)
    M.staccato(1, ['G', 'D7'], 0.15)
    M.tune('xylo', 1, "G5:.5 A5:.5 B5:.5 D6:.5 G6:2  F#6:.5 E6:.5 D6:.5 C6:.5 A5:2", xyl(0.2))
    M.staccato(3, GKW_CH, 0.15)
    M.tune('ob', 3, GKW, ob(0.32))
    M.march(20, GKW_CH, 0.17)
    M.pad(20, GKW_CH, 0.07, attack=0.2)
    M.tune('horn', 20, GKW, horn(0.38))
    M.tune('glk', 20, GKW, glk(0.045), octave=1)
    M.timp(20, 0, 1, 0.35)
    M.hits(37, 0, 'E7', 0.24, 0.6)   # the new key's dominant (written in the old key)
    M.modulate(2)
    M.roll(37, 2, 2, 5, 0.08, 0.45)
    M.swell(38, 1.6, 0.12)
    M.march(38, GKW_CH, 0.2)
    M.pad(38, GKW_CH, 0.1, attack=0.12, bright=1.15)
    M.tune('tpt', 38, GKW, tpt(0.34, 1.1))
    M.tune('horn', 38, GKW, horn(0.24), octave=-1)
    M.tune('fl', 38, GKW, fl(0.18), octave=1)
    M.crash(38, 0, 0.14)
    for b in range(38, 55):
        M.put('snr', b, 1, lambda: I.snare(0.09))
        M.put('snr', b, 3, lambda: I.snare(0.09))
    for b in (38, 42, 46, 50):
        M.timp(b, 0, 1, 0.45)
    M.hits(55, 0, 'G', 0.3, 1.6)
    M.put('tpt', 55, 0, lambda: I.brass(hz(I.m('G5') + M.shift), 1.6, 0.34))
    M.timp(55, 0, 1, 0.6)
    M.crash(55, 0, 0.16)
    return M, 55, -17.5


CAROLS = [c1, c2, c3, c4, c5, c6]

PAN = {'vln': -0.25, 'cel': 0.3, 'horn': -0.15, 'tpt': 0.15, 'tbn': 0.25, 'harp': -0.4, 'timp': 0.05, 'snr': 0.1,
       'cym': -0.05, 'glk': 0.35, 'fl': -0.3, 'cl': -0.1, 'ob': 0.1, 'pno': 0.0, 'pizz': 0.2, 'xylo': 0.3, 'bells': 0.35}
GAIN = {'vln': 0.85, 'cel': 1.0, 'horn': 1.2, 'tpt': 1.0, 'tbn': 0.8, 'harp': 0.9, 'timp': 0.75, 'snr': 0.5,
        'cym': 0.5, 'glk': 1.0, 'fl': 1.0, 'cl': 1.0, 'ob': 1.0, 'pno': 1.0, 'pizz': 0.8, 'xylo': 0.9, 'bells': 0.7}
SEND = {'vln': 0.35, 'cel': 0.28, 'horn': 0.4, 'tpt': 0.3, 'tbn': 0.3, 'harp': 0.4, 'timp': 0.3, 'snr': 0.2,
        'cym': 0.4, 'glk': 0.5, 'fl': 0.4, 'cl': 0.35, 'ob': 0.35, 'pno': 0.35, 'pizz': 0.3, 'xylo': 0.35, 'bells': 0.3}


def render(k):
    """the suite's mix (suite.render): pan, a little hall, level to its loudness, a soft limit."""
    M, bars, level = CAROLS[k - 1]()
    end = M.t(bars + 1) + 3.5
    N = int(end * SR)
    dry = np.zeros((2, N))
    wet_in = np.zeros((2, N))
    for bus, start, fn in M.ev:
        i0 = max(int(start * SR), 0)
        if i0 >= N:
            continue
        x = fn() * GAIN[bus]
        x = x[: N - i0]
        p = PAN[bus]
        l, r = np.cos((p + 1) * np.pi / 4), np.sin((p + 1) * np.pi / 4)
        dry[0, i0:i0 + len(x)] += x * l
        dry[1, i0:i0 + len(x)] += x * r
        wet_in[0, i0:i0 + len(x)] += x * l * SEND[bus]
        wet_in[1, i0:i0 + len(x)] += x * r * SEND[bus]
    L = int(2.6 * SR)
    t = np.arange(L) / SR
    ir = []
    for side in range(2):
        nz = I.rng.standard_normal(L) * np.exp(-t / 0.5)
        nz = sosfilt(butter(1, 5000, 'low', fs=SR, output='sos'), nz)
        nz[: int(0.018 * SR)] = 0
        ir.append(nz / np.sqrt(np.sum(nz ** 2)))
    wet = np.stack([fftconvolve(wet_in[s], ir[s])[:N] for s in range(2)])
    mix = dry + 1.4 * wet
    mix = sosfilt(butter(2, 11000, 'low', fs=SR, output='sos'), mix)
    mix = sosfilt(butter(1, 30, 'high', fs=SR, output='sos'), mix)
    rms = np.sqrt(np.mean(mix ** 2))
    mix *= 10 ** (level / 20) / rms
    mix = 0.95 * np.tanh(mix / 0.95)
    fl_ = int(3.0 * SR)
    mix[:, -fl_:] *= np.linspace(1, 0, fl_) ** 2
    return mix, len(M.ev)


if __name__ == '__main__':
    k = int(sys.argv[1])
    mix, n = render(k)
    with wave.open(sys.argv[2], 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix.T * 32767).astype('<i2').tobytes())
    print(f'carol {k}: {mix.shape[1] / SR:.1f} s, {n} notes, peak {np.abs(mix).max():.2f}')
