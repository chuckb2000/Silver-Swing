"""Silver Swings Golf - the long theme suite: nine movements on the same
themes (an original golf-broadcast-style anthem with a primetime drive),
each in its own key, tempo and style. Synthesized from scratch.

python3 suite.py <movement 1-9> out.wav
"""
import sys
import wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import instruments as I
from instruments import SR, hz

MODES = {'major': [0, 2, 4, 5, 7, 9, 11], 'minor': [0, 2, 3, 5, 7, 8, 10],
         'dorian': [0, 2, 3, 5, 7, 9, 10], 'mixo': [0, 2, 4, 5, 7, 9, 10]}
ROMAN = {'vii': 7, 'iii': 3, 'vi': 6, 'iv': 4, 'ii': 2, 'v': 5, 'i': 1}

# ------------------------------------------------------------------ themes (scale degrees, beats)
T = [[(3, 1), (5, 1), (8, 2)], [(7, 1), (6, 1), (3, 2)], [(4, 1), (6, 1), (9, 1.5), (8, .5)], [(7, 3), (5, 1)],
     [(8, 1), (10, 1), (12, 2)], [(11, 1), (10, 1), (8, 2)], [(9, 1), (8, 1), (6, 1), (4, 1)], [(5, 2), (6, 1), (7, 1)]]
T_END = [(5, 1), (6, 1), (7, 1), (9, 1)]           # last bar leading home
T_CH = ['I', 'vi', 'IV', 'V', 'I/3', 'IV', 'ii7', 'V7']
S = [[(6, .5), (8, .5), (10, 1), (10, .5), (9, .5), (8, 1)], [(8, .5), (9, .5), (11, 1.5), (10, .5), (9, 1)],
     [(10, 1), (12, 1), (10, 1), (8, 1)], [(9, 3), (5, .5), (7, .5)],
     [(6, .5), (8, .5), (10, 1), (13, 1), (12, 1)], [(11, .5), (10, .5), (9, 1), (8, 1), (6, 1)],
     [(11, 1), (10, 1), (9, 1), (8, 1)], [(9, 2), (7, 1), (9, 1)]]
S_CH = ['vi', 'IV', 'I', 'V', 'vi', 'IV', 'ii', 'Vsus|V']
U = [[(5, 1.5), (6, .5), (5, 1), (3, 1)], [(2, 1), (3, 1), (5, 2)], [(6, 1.5), (8, .5), (7, 1), (6, 1)], [(5, 4)],
     [(6, 1.5), (5, .5), (8, 1), (10, 1)], [(10, 1), (9, 1), (8, 2)], [(6, 1), (8, 1), (7, 1), (5, 1)], [(8, 4)]]
U_CH = ['I', 'V', 'IV', 'I', 'vi', 'I/3', 'IV|V', 'I']
W = [[(5, 2), (3, 1)], [(4, 2), (6, 1)], [(5, 1), (4, 1), (3, 1)], [(2, 3)], [(4, 2), (2, 1)], [(3, 2), (5, 1)],
     [(4, 1), (3, 1), (2, 1)], [(1, 3)], [(8, 2), (7, 1)], [(6, 2), (8, 1)], [(7, 1), (6, 1), (5, 1)], [(6, 3)],
     [(5, 2), (4, 1)], [(3, 2), (6, 1)], [(5, 1), (4, 1), (2, 1)], [(1, 3)]]
W_CH = ['I', 'IV', 'I', 'V', 'V7', 'I', 'V7', 'I', 'IV', 'ii', 'I/5', 'IV', 'I', 'vi', 'V7', 'I']
X = [[(8, 1), (8, .5), (9, .5), (10, 1), (8, 1)], [(9, 1), (7, 1), (5, 2)], [(6, 1), (6, .5), (7, .5), (8, 1), (6, 1)],
     [(5, 3), (None, 1)], [(8, 1), (8, .5), (9, .5), (10, 1), (11, 1)], [(12, 1.5), (11, .5), (10, 1), (8, 1)],
     [(9, 1), (10, 1), (9, 1), (7, 1)], [(8, 3), (None, 1)]]
X_CH = ['I', 'V', 'IV', 'I', 'I', 'I/3', 'V', 'I']
Y = [[(5, .5), (8, .5), (5, .5), (3, .5), (1, 1), (3, 1)], [(4, .5), (6, .5), (9, .5), (6, .5), (6, 2)],
     [(5, .5), (8, .5), (5, .5), (3, .5), (1, 1), (8, 1)], [(7, .5), (8, .5), (9, .5), (7, .5), (5, 2)],
     [(10, .5), (9, .5), (8, .5), (9, .5), (10, 1), (8, 1)], [(11, .5), (10, .5), (9, .5), (10, .5), (11, 1), (9, 1)],
     [(12, .5), (11, .5), (10, .5), (9, .5), (8, .5), (7, .5), (6, .5), (5, .5)], [(8, 1), (5, 1), (8, 1), (None, 1)]]
Y_CH = ['I', 'ii', 'I', 'V', 'I', 'ii7', 'IV|V', 'I']
Z = [[(6, 4)], [(8, 2), (7, 2)], [(6, 4)], [(4, 2), (6, 2)], [(9, 4)], [(8, 2), (6, 2)], [(7, 4)], [(5, 2), (7, 2)]]
Z_CH = ['vi', 'vi', 'IV', 'IV', 'ii', 'ii', 'V', 'Vsus|V']
FANFARE = [[(5, .5), (5, .5), (8, 1.5), (5, .5), (8, 1)], [(10, 2), (9, 1), (8, 1)],
           [(9, .5), (9, .5), (12, 1.5), (10, .5), (9, 1)], [(8, 3), (None, 1)]]
FAN_CH = ['I', 'I', 'V', 'I']


def flat(bars):
    return [n for b in bars for n in b]


def ending(theme):
    """the theme with its last bar leading home (the next bar is the tonic)."""
    return theme[:-1] + [T_END]


def dotted(notes):
    """march rhythm: two quarters on a beat pair become dotted-quarter + eighth."""
    out, pos, i = [], 0.0, 0
    while i < len(notes):
        d, l = notes[i]
        if l == 1 and i + 1 < len(notes) and notes[i + 1][1] == 1 and pos % 2 == 0:
            out += [(d, 1.5), (notes[i + 1][0], .5)]
            pos += 2
            i += 2
            continue
        out.append((d, l))
        pos += l
        i += 1
    return out


def scale(notes, k):
    return [(d, l * k) for d, l in notes]


def up(notes, k):
    return [(None if d is None else d + k, l) for d, l in notes]


# ------------------------------------------------------------------ a movement
class Mov:
    def __init__(self, tonic, mode, bpm, beats=4):
        self.tonic, self.mode, self.bpm, self.beats = tonic, mode, bpm, beats
        self.beat = 60.0 / bpm
        self.ev = []
        self.prev = [55, 59, 62, 67]
        self.last = 1

    def t(self, bar, beat=0.0):
        return ((bar - 1) * self.beats + beat) * self.beat

    def put(self, bus, bar, beat, fn):
        self.ev.append((bus, self.t(bar, beat), fn))
        self.last = max(self.last, bar)

    def deg(self, d, octave=0):
        sc = MODES[self.mode]
        return self.tonic + 12 * ((d - 1) // 7 + octave) + sc[(d - 1) % 7]

    # chords: tones as absolute pitch classes, and the bass pitch class
    def chord(self, sym):
        if isinstance(sym, tuple):  # ('raw', [pcs], bass pc)
            return sym[1], sym[2]
        s = sym
        bass_on = None
        if '/' in s:
            s, b = s.split('/')
            bass_on = int(b)
        seventh = '7' in s
        sus = 'sus' in s
        name = s.replace('7', '').replace('sus', '')
        r = ROMAN[name.lower()]
        sc = MODES[self.mode]

        def pc(d):
            return (self.tonic + sc[(d - 1) % 7] + 12 * ((d - 1) // 7)) % 12
        root = pc(r)
        third = pc(r + 2)
        iv = (third - root) % 12
        if name.isupper() and iv == 3:
            third = (third + 1) % 12
        if name.islower() and iv == 4:
            third = (third - 1) % 12
        tones = [root, pc(r + 3) if sus else third, pc(r + 4)]
        if seventh:
            tones.append(pc(r + 6))
        bass = root if bass_on is None else {3: third, 5: pc(r + 4)}[bass_on]
        return tones, bass

    def voicing(self, tones, lo=52, hi=76):
        """four notes, closed, nearest the last voicing."""
        best, cost = None, 1e9
        uniq = list(dict.fromkeys(tones))
        for start in range(lo, lo + 12):
            if start % 12 not in uniq:
                continue
            v = [start]
            for p in sorted(uniq, key=lambda q: (q - start) % 12)[1:]:
                n = v[-1] + 1
                while n % 12 != p:
                    n += 1
                v.append(n)
            if len(v) < 4:
                v.append(v[0] + 12)
            if v[-1] > hi + 2:
                continue
            c = sum(abs(a - b) for a, b in zip(sorted(v), sorted(self.prev)))
            if c < cost:
                best, cost = v, c
        self.prev = best
        return best

    def bassnote(self, pc, lo=36):
        n = lo
        while n % 12 != pc:
            n += 1
        return n

    def split(self, sym, beats):
        parts = sym.split('|') if isinstance(sym, str) else [sym]
        each = beats / len(parts)
        return [(p, i * each, each) for i, p in enumerate(parts)]

    # -------------------------------------------------------------- accompaniment
    def pad(self, bar, syms, vel, attack=0.35, bright=1.0, bass=True, span=1):
        for k, sym in enumerate(syms):
            b = bar + k * span
            for p, off, length in self.split(sym, self.beats * span):
                tones, bp = self.chord(p)
                d = length * self.beat
                for nt in self.voicing(tones):
                    self.put('vln', b, off, lambda f=hz(nt), d=d: I.strings(f, d, vel, voices=4, attack=attack, bright=bright))
                if bass:
                    bn = self.bassnote(bp)
                    self.put('cel', b, off, lambda f=hz(bn), d=d: I.strings(f, d, vel * 1.1, voices=3, attack=attack, bright=0.9))
                    self.put('cel', b, off, lambda f=hz(bn + 12), d=d: I.strings(f, d, vel * 0.55, voices=3, attack=attack, bright=0.9))

    def arp(self, bar, syms, vel, step=0.5, inst='harp', base=None, count=None):
        base = self.tonic if base is None else base
        for k, sym in enumerate(syms):
            for p, off, length in self.split(sym, self.beats):
                tones, bp = self.chord(p)
                pool = [x for x in range(base - 2, base + 26) if x % 12 in tones]
                k0 = next((j for j, x in enumerate(pool) if x % 12 == bp and j < 3), 0)
                pool = pool[k0:]
                seq = pool[:6] + pool[4:0:-1]
                n = int(length / step) if count is None else count
                for i in range(n):
                    nt = seq[i % len(seq)]
                    if inst == 'harp':
                        fn = (lambda f=hz(nt), i=i: I.pluck(f, 1.0, vel * (1.0 if i == 0 else 0.85)))
                    elif inst == 'piano':
                        fn = (lambda f=hz(nt): I.pluck(f, step * self.beat * 2.2, vel, harp=False))
                    else:
                        fn = (lambda f=hz(nt): I.pizz(f, vel))
                    self.put(inst if inst != 'piano' else 'pno', bar + k, off + i * step, fn)

    def nocturne(self, bar, syms, vel):
        """piano left hand: root, fifth, tenth, fifth in eighths."""
        for k, sym in enumerate(syms):
            for p, off, length in self.split(sym, self.beats):
                tones, bp = self.chord(p)
                r = self.bassnote(bp, 38)
                fifth = r + 7 if (r + 7) % 12 in tones else r + 12
                third = next(x for x in range(r + 12, r + 24) if x % 12 in tones and x % 12 != bp)
                pat = [r, fifth, third, fifth]
                for i in range(int(length / 0.5)):
                    nt = pat[i % 4]
                    self.put('pno', bar + k, off + i * 0.5, lambda f=hz(nt), i=i: I.pluck(f, 1.2, vel * (1.0 if i % 4 == 0 else 0.7), harp=False))

    def march(self, bar, syms, vel):
        for k, sym in enumerate(syms):
            for p, off, length in self.split(sym, self.beats):
                tones, bp = self.chord(p)
                r = self.bassnote(bp, 40)
                v = [x for x in self.voicing(tones, 55, 74)][:3]
                for beat in range(int(length)):
                    at = off + beat
                    if beat % 2 == 0:
                        nt = r if beat % 4 == 0 else r + 7
                        self.put('pizz', bar + k, at, lambda f=hz(nt): I.pizz(f, vel * 1.3))
                    else:
                        for nt in v:
                            self.put('pizz', bar + k, at, lambda f=hz(nt): I.pizz(f, vel * 0.6))

    def waltz(self, bar, syms, vel, span=1):
        for k, sym in enumerate(syms):
            for j in range(span):
                tones, bp = self.chord(sym)
                r = self.bassnote(bp, 40 if j == 0 else 43)
                v = self.voicing(tones, 55, 74)[:3]
                self.put('pizz', bar + k * span + j, 0, lambda f=hz(r): I.pizz(f, vel * 1.3))
                for beat in (1, 2):
                    for nt in v:
                        self.put('harp', bar + k * span + j, beat, lambda f=hz(nt): I.pluck(f, 0.4, vel * 0.45))

    def drive(self, bar, syms, vel, stabs=True, snare=True):
        for k, sym in enumerate(syms):
            for p, off, length in self.split(sym, self.beats):
                tones, bp = self.chord(p)
                r = self.bassnote(bp, 35)
                for i in range(int(length / 0.5)):
                    acc = 1.0 if (off / 0.5 + i) % 8 in (0, 3, 6) else 0.65
                    at = off + i * 0.5
                    self.put('cel', bar + k, at, lambda f=hz(r), a=acc: I.spiccato(f, 0.3, vel * 1.3 * a))
                    self.put('cel', bar + k, at, lambda f=hz(r + 12), a=acc: I.spiccato(f, 0.3, vel * 0.8 * a))
                if stabs:
                    v = self.voicing(tones, 50, 70)[:3]
                    for beat, L in [(0, 0.45), (1.5, 0.4), (3, 0.9)]:
                        if off <= beat < off + length:
                            for nt in v:
                                self.put('tbn', bar + k, beat, lambda f=hz(nt), L=L * self.beat: I.brass(f, L, vel * 0.8, voices=2))
            if snare:
                for beat in (1, 3):
                    self.put('snr', bar + k, beat, lambda: I.snare(vel * 0.55))

    def staccato(self, bar, syms, vel):
        for k, sym in enumerate(syms):
            for p, off, length in self.split(sym, self.beats):
                tones, bp = self.chord(p)
                v = self.voicing(tones, 55, 74)[:3]
                r = self.bassnote(bp, 40)
                for i in range(int(length)):
                    self.put('pizz', bar + k, off + i, lambda f=hz(r): I.pizz(f, vel * 1.2))
                    for nt in v:
                        self.put('vln', bar + k, off + i + 0.5, lambda f=hz(nt): I.spiccato(f, 0.2, vel * 0.5))

    def chorale(self, bar, syms, vel, span=1):
        for k, sym in enumerate(syms):
            for p, off, length in self.split(sym, self.beats * span):
                tones, bp = self.chord(p)
                d = length * self.beat * 0.97
                v = self.voicing(tones, 52, 72)
                for j, nt in enumerate(v):
                    bus = 'horn' if j >= 2 else 'tbn'
                    self.put(bus, bar + k * span, off, lambda f=hz(nt), d=d: I.brass(f, d, vel, soft=True, voices=2))
                bn = self.bassnote(bp, 36)
                self.put('tbn', bar + k * span, off, lambda f=hz(bn), d=d: I.brass(f, d, vel * 0.9, soft=True, voices=2))

    def drone(self, bar, bars, vel):
        r = self.bassnote(self.tonic % 12, 38)
        d = bars * self.beats * self.beat
        for nt, v in [(r, 1.0), (r + 7, 0.7), (r + 12, 0.5)]:
            self.put('cel', bar, 0, lambda f=hz(nt), d=d, v=v: I.strings(f, d, vel * v, voices=3, attack=1.5, rel=1.5, bright=0.8))

    # -------------------------------------------------------------- melody and percussion
    def mel(self, bus, bar, notes, fn, octave=0, length=1.0):
        b = 0.0
        for d, l in notes:
            if d is not None:
                nt = self.deg(d, octave)
                self.put(bus, bar + int(b // self.beats), b % self.beats, lambda f=hz(nt), dur=l * self.beat * length: fn(f, dur))
            b += l
        return bar + int(np.ceil(b / self.beats - 1e-9))

    def timp(self, bar, beat, d, vel, length=2.2):
        nt = self.deg(d, -2)
        while nt < 40:
            nt += 12
        while nt > 57:
            nt -= 12
        self.put('timp', bar, beat, lambda f=hz(nt): I.timpani(f, vel, length))

    def roll(self, bar, beat, beats, d, v0, v1):
        steps = int(beats * 4)
        for i in range(steps):
            v = v0 + (v1 - v0) * i / max(steps - 1, 1)
            nt = self.deg(d, -2)
            while nt < 40:
                nt += 12
            while nt > 57:
                nt -= 12
            self.put('timp', bar, beat + i * 0.25, lambda f=hz(nt), v=v: I.timpani(f, v * (0.85 + 0.3 * I.rng.random()), 1.2))

    def crash(self, bar, beat, vel, length=3.5):
        self.put('cym', bar, beat, lambda: I.cymbal(vel, length=length))

    def swell(self, bar, secs, vel):
        """a cymbal swell peaking at the start of `bar`."""
        self.put('cym', bar, -secs / self.beat, lambda: I.cymbal(vel, swell=secs))


# instruments for melodies
def horn(v, voices=4):
    return lambda f, d: I.brass(f, d * 0.98, v, soft=True, voices=voices)


def tpt(v, bright=1.0):
    return lambda f, d: I.brass(f, d * 0.95, v, bright=bright)


def fl(v):
    return lambda f, d: I.wind(f, d * 0.97, v, 'flute')


def cl(v):
    return lambda f, d: I.wind(f, d * 0.97, v, 'clarinet')


def ob(v):
    return lambda f, d: I.wind(f, d * 0.97, v, 'oboe')


def vl(v):
    return lambda f, d: I.strings(f, d, v, voices=4, attack=0.12, rel=0.45, bright=1.25)


def pno(v):
    return lambda f, d: I.pluck(f, d, v, harp=False)


def glk(v):
    return lambda f, d: I.glock(f, d, v)


def xyl(v):
    return lambda f, d: I.xylo(f, v)


def stacc(v):
    return lambda f, d: I.spiccato(f, min(d, 0.3), v)


# ------------------------------------------------------------------ the nine movements
def m1():  # Dawn on the first tee: D major, 76
    M = Mov(62, 'major', 76)
    M.pad(1, ['I', 'I', 'IV', 'Vsus'], 0.11, attack=1.0)
    M.arp(1, ['I', 'I', 'IV', 'Vsus'], 0.18)
    M.roll(4, 2, 2, 5, 0.04, 0.25)
    M.swell(5, 2.0, 0.07)
    M.pad(5, T_CH, 0.14)
    M.arp(5, T_CH, 0.16)
    M.mel('horn', 5, flat(T), horn(0.4))
    M.timp(5, 0, 1, 0.45)
    M.pad(13, U_CH, 0.1, attack=0.5)
    M.arp(13, U_CH, 0.14, step=1.0)
    M.mel('vln', 13, flat(U), vl(0.3))
    M.pad(21, T_CH[:-1] + ['V7'], 0.15)
    M.arp(21, T_CH, 0.16)
    M.mel('fl', 21, flat(ending(T)), fl(0.32))
    M.mel('horn', 21, flat(ending(T)), horn(0.22), octave=-1)
    M.timp(21, 0, 1, 0.4)
    M.pad(29, ['I', 'I', 'IV', 'I'], 0.13, attack=0.4)
    M.mel('horn', 29, [(8, 8), (6, 2), (5, 2), (5, 4)], horn(0.3))
    M.arp(29, ['I', 'I', 'IV'], 0.15)
    for i, d in enumerate([1, 3, 5, 8, 10, 12, 15]):
        M.put('harp', 32, i * 0.5, lambda f=hz(M.deg(d)), i=i: I.pluck(f, 2.0, 0.2 - 0.015 * i))
    M.put('glk', 32, 3.5, lambda: I.glock(hz(M.deg(15)), 1, 0.05))
    M.timp(29, 0, 1, 0.5)
    return M, 32


def m2():  # Fairway march: G major, 108
    M = Mov(55, 'major', 108)
    for b in (1, 2):
        for beat in range(4):
            M.put('snr', b, beat, lambda: I.snare(0.1))
            M.put('snr', b, beat + 0.5, lambda: I.snare(0.05))
    M.march(1, ['I', 'V'], 0.18)
    Td = dotted(flat(T))
    M.march(3, T_CH, 0.18)
    M.mel('fl', 3, Td, fl(0.3), octave=1)
    M.mel('cl', 3, Td, cl(0.22))
    M.march(11, T_CH, 0.2)
    M.pad(11, T_CH, 0.07, attack=0.15)
    M.mel('horn', 11, Td, horn(0.36))
    M.mel('fl', 11, Td, fl(0.22), octave=1)
    for b in range(3, 19):
        M.put('snr', b, 1, lambda: I.snare(0.09))
        M.put('snr', b, 3, lambda: I.snare(0.09))
    M.march(19, X_CH, 0.15)
    M.mel('cl', 19, flat(X), cl(0.32))
    M.mel('horn', 19, [(3, 4), (2, 4), (1, 4), (3, 4), (3, 4), (3, 4), (2, 4), (3, 4)], horn(0.14))
    M.march(27, X_CH, 0.2)
    M.pad(27, X_CH, 0.09, attack=0.15)
    M.mel('vln', 27, flat(X), vl(0.3), octave=1)
    M.mel('horn', 27, flat(X), horn(0.3))
    M.timp(27, 0, 1, 0.45)
    M.timp(31, 0, 1, 0.4)
    for b in range(27, 35):
        for beat in (1, 3):
            M.put('snr', b, beat, lambda: I.snare(0.12))
    Te = dotted(flat(ending(T)))
    M.march(35, T_CH[:-1] + ['V7'], 0.22)
    M.pad(35, T_CH[:-1] + ['V7'], 0.1, attack=0.15)
    M.mel('fl', 35, Te, fl(0.28), octave=1)
    M.mel('horn', 35, Te, horn(0.36))
    M.mel('tpt', 35, Te, tpt(0.2), octave=1)
    M.crash(35, 0, 0.14)
    for b in range(35, 43):
        for beat in (1, 3):
            M.put('snr', b, beat, lambda: I.snare(0.13))
    M.roll(42, 2, 2, 5, 0.12, 0.45)
    M.pad(43, ['I'], 0.15, attack=0.05)
    M.march(43, ['I'], 0.24)
    M.mel('horn', 43, [(8, 2), (5, 1), (8, 1)], horn(0.38))
    M.mel('tpt', 43, [(8, 2), (5, 1), (8, 1)], tpt(0.24), octave=1)
    M.timp(43, 0, 1, 0.6)
    M.crash(43, 0, 0.18)
    for nt in M.voicing(M.chord('I')[0], 50, 72) + [M.bassnote(M.tonic % 12, 36)]:
        M.put('tbn', 44, 0, lambda f=hz(nt): I.brass(f, 0.5, 0.3, voices=2))
    M.timp(44, 0, 1, 0.65)
    return M, 44


def m3():  # Waltz on the back nine: Bb major, 3/4, 132
    M = Mov(58, 'major', 132, beats=3)
    M.waltz(1, ['I', 'IV', 'V7', 'I'], 0.18)
    M.waltz(5, W_CH, 0.18)
    M.mel('cl', 5, flat(W), cl(0.34))
    M.waltz(21, W_CH, 0.18)
    M.pad(21, W_CH, 0.07, attack=0.25)
    M.mel('vln', 21, flat(W), vl(0.3), octave=1)
    M.mel('glk', 21, [(d, l) if l >= 2 else (None, l) for d, l in flat(W)], glk(0.05), octave=2)
    Tw = scale(flat(ending(T)), 1.5)
    M.waltz(37, T_CH[:-1] + ['V7'], 0.17, span=2)
    M.mel('ob', 37, Tw, ob(0.3))
    M.mel('horn', 37, [(d, 6) for d in [1, 1, 1, 2, 1, 1, 2, 2]], horn(0.12))
    M.waltz(53, W_CH, 0.2)
    M.pad(53, W_CH, 0.09, attack=0.2)
    M.mel('fl', 53, flat(W), fl(0.28), octave=1)
    M.mel('cl', 53, flat(W), cl(0.24))
    M.mel('vln', 53, flat(W), vl(0.18))
    M.timp(53, 0, 1, 0.35)
    M.timp(61, 0, 1, 0.3)
    M.waltz(69, ['I', 'I'], 0.17)
    M.pad(69, ['I'], 0.1, attack=0.3, span=4)
    for i, d in enumerate([1, 3, 5, 8, 10, 12, 15, 12]):
        M.put('harp', 70, i * 0.5, lambda f=hz(M.deg(d)), i=i: I.pluck(f, 1.5, 0.2))
    for nt in M.voicing(M.chord('I')[0], 55, 74)[:3] + [M.bassnote(M.tonic % 12, 40)]:
        M.put('pizz', 72, 0, lambda f=hz(nt): I.pizz(f, 0.28))
    M.put('glk', 72, 0, lambda: I.glock(hz(M.deg(15)), 1, 0.05))
    return M, 72


def m4():  # Primetime: D major (a B-minor drive), 100
    M = Mov(62, 'major', 100)
    for b in range(1, 5):
        M.drive(b, ['vi'], 0.24 + 0.02 * b, stabs=b >= 3, snare=b >= 2)
        M.timp(b, 0, 6, 0.3 + 0.05 * b)
    M.roll(4, 2, 2, 3, 0.1, 0.4)
    M.drive(5, S_CH, 0.3)
    M.pad(5, S_CH, 0.06, attack=0.2, bass=False)
    M.mel('horn', 5, flat(S), horn(0.4))
    M.drive(13, S_CH, 0.34)
    M.pad(13, S_CH, 0.08, attack=0.2, bass=False)
    M.mel('tpt', 13, flat(S), tpt(0.36, 1.1))
    M.mel('horn', 13, flat(S), horn(0.24), octave=-1)
    M.crash(13, 0, 0.16)
    for b in (13, 15, 17, 19):
        M.timp(b, 0, 6 if b in (13, 17) else 4, 0.4)
    M.drive(21, Z_CH, 0.22, stabs=False, snare=False)
    M.pad(21, Z_CH, 0.12, attack=0.3)
    M.mel('horn', 21, flat(Z), horn(0.38))
    M.mel('cel', 21, flat(Z), lambda f, d: I.strings(f, d, 0.2, voices=3, attack=0.2, bright=1.0), octave=-1)
    M.roll(28, 0, 4, 5, 0.08, 0.5)
    M.swell(29, 2.2, 0.15)
    M.drive(29, S_CH, 0.36)
    M.pad(29, S_CH, 0.1, attack=0.15)
    M.mel('tpt', 29, flat(S), tpt(0.38, 1.15))
    M.mel('vln', 29, flat(S), vl(0.2), octave=1)
    M.crash(29, 0, 0.2)
    M.drive(37, ['I', 'I'], 0.36, snare=True)
    M.pad(37, ['I'], 0.14, attack=0.08, span=2)
    M.mel('tpt', 37, [(8, 8)], tpt(0.36))
    M.mel('horn', 37, [(5, 8)], horn(0.34))
    M.timp(37, 0, 1, 0.75, 3.0)
    M.crash(37, 0, 0.22, 4.0)
    for beat, sym in [(0, 'vi'), (1.5, 'IV'), (3, 'V')]:
        for nt in M.voicing(M.chord(sym)[0], 50, 70)[:3]:
            M.put('tbn', 39, beat, lambda f=hz(nt): I.brass(f, 0.35, 0.34, voices=2))
        M.timp(39, beat, {'vi': 6, 'IV': 4, 'V': 5}[sym], 0.5)
    for nt in M.voicing(M.chord('I')[0], 50, 72) + [M.bassnote(M.tonic % 12, 38)]:
        M.put('tbn', 40, 0, lambda f=hz(nt): I.brass(f, 1.2, 0.34, voices=2))
    M.put('tpt', 40, 0, lambda: I.brass(hz(M.deg(8)), 1.2, 0.36))
    M.timp(40, 0, 1, 0.8, 3.0)
    M.crash(40, 0, 0.2)
    return M, 40


def m5():  # Quiet green: piano nocturne, F major, 70
    M = Mov(65, 'major', 70)
    M.nocturne(1, ['I', 'IV'], 0.16)
    M.nocturne(3, U_CH, 0.16)
    M.mel('pno', 3, flat(U), pno(0.3))
    M.nocturne(11, U_CH, 0.15)
    M.pad(11, U_CH, 0.06, attack=0.8, bass=False)
    M.mel('pno', 11, flat(U), pno(0.3))
    M.mel('cel', 11, [(3, 4), (2, 4), (1, 4), (3, 4), (1, 4), (3, 4), (1, 2), (2, 2), (3, 4)], lambda f, d: I.strings(f, d, 0.12, voices=3, attack=0.5), octave=-1)
    M.nocturne(19, T_CH[:-1] + ['V7'], 0.15)
    M.pad(19, T_CH[:-1] + ['V7'], 0.05, attack=0.8, bass=False)
    M.mel('pno', 19, flat(ending(T)), pno(0.3), octave=-1)
    M.mel('fl', 19, [(d, l) if i % 3 == 0 else (None, l) for i, (d, l) in enumerate(flat(ending(T)))], fl(0.12))
    M.nocturne(27, ['IV', 'I'], 0.14)
    M.pad(27, ['IV', 'I'], 0.06, attack=0.8, bass=False)
    M.mel('pno', 27, [(6, 2), (5, 2), (8, 4)], pno(0.28))
    for i, d in enumerate([1, 3, 5, 8, 10, 12]):
        M.put('pno', 28, 1 + i * 0.5, lambda f=hz(M.deg(d)), i=i: I.pluck(f, 3.0, 0.18 - 0.015 * i, harp=False))
    return M, 28


def m6():  # Coastal wind: D dorian, 84
    M = Mov(62, 'dorian', 84)
    C_T = ['i', 'III', 'IV', 'v', 'i', 'IV', 'ii', 'v']
    C_U = ['i', 'v', 'IV', 'i', 'IV', 'i', 'IV|v', 'i']
    M.drone(1, 4, 0.14)
    M.swell(5, 3.0, 0.05)
    for b in range(1, 5):
        M.put('harp', b, 0, lambda f=hz(M.deg(1)): I.pluck(f, 2, 0.18))
        M.put('harp', b, 1.5, lambda f=hz(M.deg(5)): I.pluck(f, 2, 0.14))
        M.put('harp', b, 3, lambda f=hz(M.deg(8)): I.pluck(f, 2, 0.12))
    M.pad(5, C_T, 0.1, attack=0.6)
    M.mel('horn', 5, flat(T), horn(0.38))
    M.arp(5, C_T, 0.12, step=1.0)
    M.timp(5, 0, 1, 0.35)
    M.pad(13, C_U, 0.09, attack=0.6)
    M.mel('ob', 13, flat(U), ob(0.3))
    M.drone(13, 8, 0.07)
    M.arp(13, C_U, 0.11, step=1.0)
    M.pad(21, C_T, 0.13, attack=0.3)
    M.mel('horn', 21, flat(T), horn(0.36))
    M.mel('vln', 21, flat(T), vl(0.2), octave=1)
    M.arp(21, C_T, 0.13)
    M.roll(20, 2, 2, 1, 0.05, 0.3)
    M.timp(21, 0, 1, 0.5)
    M.timp(25, 0, 1, 0.4)
    M.drone(29, 6, 0.12)
    M.pad(29, ['i', 'IV', 'i', 'i'], 0.08, attack=0.8, bass=False)
    M.mel('horn', 29, [(5, 2), (8, 2), (5, 4), (4, 2), (3, 2), (1, 8)], horn(0.28))
    for b in range(29, 35):
        M.put('harp', b, 0, lambda f=hz(M.deg(1)): I.pluck(f, 2, 0.12))
        M.put('harp', b, 2, lambda f=hz(M.deg(5)): I.pluck(f, 2, 0.1))
    return M, 34


def m7():  # Birdie run: A major, 116
    M = Mov(57, 'major', 116)
    M.staccato(1, ['I', 'V'], 0.18)
    M.staccato(3, Y_CH, 0.18)
    M.mel('xylo', 3, flat(Y), xyl(0.3), octave=1)
    M.staccato(11, Y_CH, 0.18)
    M.mel('fl', 11, flat(Y), fl(0.28), octave=1)
    for b in range(11, 19):
        tones = M.voicing(M.chord(Y_CH[b - 11].split('|')[0])[0], 52, 70)[:3]
        for nt in tones:
            M.put('horn', b, 3, lambda f=hz(nt): I.brass(f, 0.4, 0.2, soft=True, voices=2))
    M.staccato(19, X_CH, 0.17)
    M.mel('cl', 19, flat(X), cl(0.32))
    M.mel('xylo', 19, [(d, l) if l <= 1 else (None, l) for d, l in flat(X)], xyl(0.12), octave=1)
    M.staccato(27, Y_CH, 0.2)
    M.mel('xylo', 27, flat(Y), xyl(0.24), octave=1)
    M.mel('fl', 27, flat(Y), fl(0.2), octave=1)
    M.mel('vln', 27, flat(Y), stacc(0.3), octave=1)
    for b in range(27, 35):
        M.put('snr', b, 1, lambda: I.snare(0.08))
        M.put('snr', b, 3, lambda: I.snare(0.08))
    M.staccato(35, Y_CH, 0.2)
    M.pad(35, Y_CH, 0.07, attack=0.15)
    M.mel('horn', 35, flat(Y), horn(0.32))
    M.mel('fl', 35, flat(Y), fl(0.24), octave=1)
    M.timp(35, 0, 1, 0.4)
    M.staccato(43, ['I', 'IV', 'V', 'I'], 0.2)
    for i, d in enumerate([1, 3, 5, 8, 10, 12, 15, 17]):
        M.put('xylo', 46, i * 0.5, lambda f=hz(M.deg(d, 0)), i=i: I.xylo(f, 0.2))
    for nt in M.voicing(M.chord('I')[0], 52, 72) + [M.bassnote(M.tonic % 12, 40)]:
        M.put('tbn', 47, 0, lambda f=hz(nt): I.brass(f, 0.6, 0.28, voices=2))
    M.put('xylo', 47, 0, lambda: I.xylo(hz(M.deg(15)), 0.25))
    M.timp(47, 0, 1, 0.55)
    M.crash(47, 0, 0.12, 2.5)
    return M, 48


def m8():  # Hymn at the turn: Eb major, 66
    M = Mov(63, 'major', 66)
    M.chorale(1, ['I', 'IV'], 0.14)
    M.chorale(3, U_CH, 0.15)
    M.mel('horn', 3, flat(U), horn(0.3))
    Ta = scale(flat(T[:4]), 2)
    M.pad(11, [c for c in T_CH[:4] for _ in (0, 1)], 0.11, attack=0.6)
    M.chorale(11, [c for c in T_CH[:4] for _ in (0, 1)], 0.1)
    M.mel('vln', 11, Ta, vl(0.28))
    M.chorale(19, U_CH, 0.18)
    M.pad(19, U_CH, 0.12, attack=0.3)
    M.mel('tpt', 19, flat(U), tpt(0.3))
    M.mel('vln', 19, flat(U), vl(0.2), octave=1)
    M.timp(19, 0, 1, 0.4)
    M.timp(23, 0, 1, 0.35)
    M.swell(27, 2.5, 0.1)
    M.chorale(27, ['I'], 0.18, span=2)
    M.pad(27, ['I'], 0.12, attack=0.2, span=2)
    M.mel('tpt', 27, [(8, 8)], tpt(0.28))
    M.roll(27, 0, 4, 1, 0.1, 0.35)
    M.timp(28, 0, 1, 0.45, 3.0)
    return M, 28


def m9():  # Grand finale: D major then E major, 96
    M = Mov(62, 'major', 96)
    M.pad(1, FAN_CH, 0.12, attack=0.1)
    M.mel('tpt', 1, flat(FANFARE), tpt(0.36, 1.1))
    M.mel('horn', 1, flat(FANFARE), horn(0.28), octave=-1)
    for b, d in [(1, 1), (2, 1), (3, 5), (4, 1)]:
        M.timp(b, 0, d, 0.5)
        M.put('snr', b, 2, lambda: I.snare(0.1))
        M.put('snr', b, 3, lambda: I.snare(0.12))
    M.crash(1, 0, 0.16)
    M.pad(5, T_CH, 0.16)
    M.arp(5, T_CH, 0.17)
    M.mel('horn', 5, flat(T), horn(0.42))
    M.timp(5, 0, 1, 0.5)
    M.drive(13, S_CH, 0.32)
    M.pad(13, S_CH, 0.08, attack=0.2, bass=False)
    M.mel('tpt', 13, flat(S), tpt(0.36, 1.1))
    M.roll(20, 2, 2, 5, 0.1, 0.5)
    M.swell(21, 2.0, 0.15)
    M.pad(21, T_CH, 0.19, bright=1.15, attack=0.25)
    M.arp(21, T_CH, 0.16)
    M.mel('tpt', 21, flat(T), tpt(0.34))
    M.mel('horn', 21, flat(T), horn(0.32), octave=-1)
    M.mel('glk', 21, [(d, l) if l >= 2 else (None, l) for d, l in flat(T)], glk(0.06), octave=1)
    M.crash(21, 0, 0.2)
    M.timp(21, 0, 1, 0.65)
    M.timp(25, 0, 1, 0.55)
    # the turn to E: G, then B7
    M.pad(29, ['IV', ('raw', [11, 3, 6, 9], 11)], 0.16, attack=0.2)
    M.mel('horn', 29, [(4, 2), (6, 2), (None, 0)], horn(0.36))
    for i, nt in enumerate([59, 63, 66, 69, 71, 75]):
        M.put('tpt', 30, i * 0.5 + 1, lambda f=hz(nt): I.brass(f, 0.4, 0.3))
    M.roll(30, 0, 4, 5, 0.1, 0.55)
    M.swell(31, 2.5, 0.18)
    M.tonic = 64
    M.prev = [56, 59, 64, 68]
    M.pad(31, T_CH[:-1] + ['V7'], 0.2, bright=1.2, attack=0.2)
    M.arp(31, T_CH, 0.17)
    M.mel('tpt', 31, flat(ending(T)), tpt(0.36, 1.1))
    M.mel('horn', 31, flat(ending(T)), horn(0.34), octave=-1)
    M.mel('vln', 31, flat(ending(T)), vl(0.2), octave=1)
    M.crash(31, 0, 0.22)
    M.timp(31, 0, 1, 0.7)
    M.timp(35, 0, 1, 0.6)
    for b in range(31, 39):
        M.put('snr', b, 1, lambda: I.snare(0.1))
        M.put('snr', b, 3, lambda: I.snare(0.1))
    M.pad(39, ['I'], 0.2, attack=0.08, span=4)
    for nt in M.voicing(M.chord('I')[0], 50, 70):
        M.put('tbn', 39, 0, lambda f=hz(nt): I.brass(f, 4 * 4 * M.beat * 0.85, 0.24, voices=2))
    M.mel('tpt', 39, [(8, 16)], tpt(0.36))
    M.mel('horn', 39, [(5, 16)], horn(0.34))
    M.roll(40, 0, 8, 1, 0.15, 0.6)
    M.timp(39, 0, 1, 0.8, 3.0)
    M.timp(42, 0, 1, 0.85, 3.5)
    M.crash(39, 0, 0.24, 4.5)
    M.crash(42, 0, 0.24, 4.5)
    return M, 42


MOVES = [m1, m2, m3, m4, m5, m6, m7, m8, m9]
LEVEL = [-18.5, -17.5, -18.0, -16.5, -20.5, -19.0, -18.0, -18.0, -16.0]  # target loudness (dB rms)

PAN = {'vln': -0.25, 'cel': 0.3, 'horn': -0.15, 'tpt': 0.15, 'tbn': 0.25, 'harp': -0.4, 'timp': 0.05, 'snr': 0.1,
       'cym': -0.05, 'glk': 0.35, 'fl': -0.3, 'cl': -0.1, 'ob': 0.1, 'pno': 0.0, 'pizz': 0.2, 'xylo': 0.3}
GAIN = {'vln': 0.85, 'cel': 1.0, 'horn': 1.2, 'tpt': 1.0, 'tbn': 0.8, 'harp': 0.9, 'timp': 0.75, 'snr': 0.5,
        'cym': 0.5, 'glk': 1.0, 'fl': 1.0, 'cl': 1.0, 'ob': 1.0, 'pno': 1.0, 'pizz': 0.8, 'xylo': 0.9}
SEND = {'vln': 0.35, 'cel': 0.28, 'horn': 0.4, 'tpt': 0.3, 'tbn': 0.3, 'harp': 0.4, 'timp': 0.3, 'snr': 0.2,
        'cym': 0.4, 'glk': 0.5, 'fl': 0.4, 'cl': 0.35, 'ob': 0.35, 'pno': 0.35, 'pizz': 0.3, 'xylo': 0.35}


def render(k):
    M, bars = MOVES[k - 1]()
    end = M.t(bars + 1) + 3.5
    N = int(end * SR)
    dry = np.zeros((2, N))
    wet_in = np.zeros((2, N))
    for bus, start, fn in M.ev:
        i0 = int(start * SR)
        if i0 >= N or i0 < 0:
            i0 = max(i0, 0)
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
    mix *= 10 ** (LEVEL[k - 1] / 20) / rms
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
    print(f'movement {k}: {mix.shape[1] / SR:.1f} s, {n} notes, peak {np.abs(mix).max():.2f}')
