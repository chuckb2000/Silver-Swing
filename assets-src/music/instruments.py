"""Instruments for the Silver Swings music: additive synthesis, no samples."""
import sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
rng = np.random.default_rng(7)

NAMES = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def m(name):
    """'F#4' -> midi"""
    n = NAMES[name[0]]
    i = 1
    while i < len(name) and name[i] in '#b':
        n += 1 if name[i] == '#' else -1
        i += 1
    return n + 12 * (int(name[i:]) + 1)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


# ------------------------------------------------------------------ voices
def adsr(n, a, d, s, r, hold):
    """envelope of n samples: attack a, decay d to level s, held for `hold` s, release r (seconds)."""
    t = np.arange(n) / SR
    env = np.empty(n)
    a = max(a, 1e-3)
    env[:] = s
    att = t < a
    env[att] = t[att] / a
    dec = (t >= a) & (t < a + d)
    env[dec] = 1 - (1 - s) * (t[dec] - a) / max(d, 1e-3)
    rel = t >= hold
    if rel.any():
        lvl = np.interp(hold, t, env)
        env[rel] = lvl * np.exp(-(t[rel] - hold) / max(r / 4, 1e-3))
    return env


def vibrato(n, rate, depth, delay):
    t = np.arange(n) / SR
    ramp = np.clip((t - delay) / 0.4, 0, 1)
    return 1 + depth * ramp * np.sin(2 * np.pi * rate * t + rng.uniform(0, 6.28))


def additive(f0, n, amps_fn, fm, nmax=40):
    """sum of harmonics; amps_fn(k, t) -> amplitude vector; fm: frequency multiplier vector."""
    t = np.arange(n) / SR
    phase = 2 * np.pi * np.cumsum(f0 * fm) / SR
    out = np.zeros(n)
    for k in range(1, nmax + 1):
        if f0 * k > 15000:
            break
        out += amps_fn(k, t) * np.sin(k * phase + rng.uniform(0, 6.28))
    return out


def brass(f0, dur, vel, bright=1.0, voices=3, soft=False):
    """trumpets/trombones (soft=True: horns)."""
    rel = 0.25
    n = int((dur + rel + 0.1) * SR)
    out = np.zeros(n)
    for v in range(voices):
        det = 2 ** (rng.uniform(-7, 7) / 1200)
        fm = vibrato(n, 5.0 + rng.uniform(-0.4, 0.4), 0.0025, 0.35) * det
        a_t = 0.06 if soft else 0.035

        def amps(k, t, a_t=a_t):
            # brightness opens with the attack and with velocity
            c_end = (0.75 if soft else 0.42) / (bright * (0.6 + 0.6 * vel))
            c = c_end + 1.2 * np.exp(-t / a_t)
            base = 1.0 / k ** (1.5 if soft else 1.05)
            return base * np.exp(-(k - 1) * c)
        x = additive(f0 * det, n, amps, fm, nmax=28)
        delay = int(rng.uniform(0, 0.012) * SR)
        out[delay:] += x[: n - delay]
    env = adsr(n, 0.05 if soft else 0.03, 0.15, 0.82, rel, dur)
    return out * env * vel / voices


def strings(f0, dur, vel, voices=5, attack=0.35, rel=0.7, bright=1.0):
    n = int((dur + rel + 0.2) * SR)
    out = np.zeros(n)
    for v in range(voices):
        det = 2 ** (rng.uniform(-9, 9) / 1200)
        fm = vibrato(n, 5.4 + rng.uniform(-0.5, 0.5), 0.003, 0.25) * det
        c = 0.22 / bright

        def amps(k, t, c=c):
            return (1.0 / k) * np.exp(-(k - 1) * c)
        out += additive(f0 * det, n, amps, fm, nmax=30)
    env = adsr(n, attack, 0.2, 0.9, rel, dur)
    return out * env * vel / voices


def spiccato(f0, dur, vel):
    """short bowed low strings (the driving pulse)."""
    n = int((dur + 0.3) * SR)
    out = np.zeros(n)
    for v in range(3):
        det = 2 ** (rng.uniform(-8, 8) / 1200)

        def amps(k, t):
            return (1.0 / k) * np.exp(-(k - 1) * (0.3 + 1.5 * np.clip(t / 0.25, 0, 1)))
        out += additive(f0 * det, n, amps, np.full(n, det), nmax=24)
    t = np.arange(n) / SR
    env = np.minimum(t / 0.008, 1) * np.exp(-t / 0.16)
    return out * env * vel / 3


def pluck(f0, dur, vel, harp=True):
    """harp (or piano with harp=False)."""
    n = int((min(dur, 2.5) + 2.0) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    B = 0.00015 if harp else 0.0004
    for k in range(1, 16):
        fk = k * f0 * np.sqrt(1 + B * k * k)
        if fk > 14000:
            break
        tau = (1.8 if harp else 2.4) * (220 / max(f0, 80)) ** 0.3 / (1 + 0.55 * k)
        amp = 1.0 / k ** (1.6 if harp else 1.2)
        out += amp * np.exp(-t / tau) * np.sin(2 * np.pi * fk * t + rng.uniform(0, 6.28))
    out *= np.minimum(t / 0.004, 1)
    if not harp:  # damper at note off
        off = t > dur
        out[off] *= np.exp(-(t[off] - dur) / 0.12)
    return out * vel


def glock(f0, dur, vel):
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for ratio, amp, tau in [(1, 1, 1.4), (2.76, 0.35, 0.5), (5.4, 0.15, 0.2)]:
        out += amp * np.exp(-t / tau) * np.sin(2 * np.pi * f0 * ratio * t)
    return out * np.minimum(t / 0.002, 1) * vel


def timpani(f0, vel, length=2.2):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    glide = 1 + 0.03 * np.exp(-t / 0.05)
    for ratio, amp, tau in [(1, 1, 1.1), (1.5, 0.45, 0.6), (1.98, 0.3, 0.45), (2.44, 0.15, 0.3)]:
        ph = 2 * np.pi * np.cumsum(f0 * ratio * glide) / SR
        out += amp * np.exp(-t / tau) * np.sin(ph)
    noise = sosfilt(butter(2, 400, 'low', fs=SR, output='sos'), rng.standard_normal(n))
    out += 0.6 * noise * np.exp(-t / 0.03)
    return out * vel


def snare(vel):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    noise = sosfilt(butter(2, [1500, 7000], 'band', fs=SR, output='sos'), rng.standard_normal(n))
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.03)
    return (0.8 * noise * np.exp(-t / 0.09) + 0.5 * tone) * vel


def cymbal(vel, swell=0.0, length=3.5):
    """a crash, or (swell>0) a rising swell of that many seconds ending at its peak."""
    n = int((swell if swell else length) * SR)
    t = np.arange(n) / SR
    noise = sosfilt(butter(2, 3500, 'high', fs=SR, output='sos'), rng.standard_normal(n))
    if swell:
        env = (t / swell) ** 2.5
    else:
        env = np.exp(-t / 1.1) * np.minimum(t / 0.003, 1)
    return noise * env * vel




def wind(f0, dur, vel, kind='flute'):
    """flute, clarinet or oboe: a few harmonics, a breath, vibrato."""
    rel = 0.15
    n = int((dur + rel + 0.1) * SR)
    t = np.arange(n) / SR
    fm = vibrato(n, 5.2 + rng.uniform(-0.3, 0.3), 0.004 if kind == 'flute' else 0.003, 0.22)
    if kind == 'flute':
        table = {1: 1.0, 2: 0.22, 3: 0.09, 4: 0.03}
    elif kind == 'clarinet':
        table = {1: 1.0, 2: 0.04, 3: 0.55, 4: 0.03, 5: 0.28, 6: 0.02, 7: 0.14, 9: 0.06}
    else:  # oboe: a nasal peak around 1.2 kHz
        table = {k: (1 / k ** 0.6) * (0.35 + np.exp(-((k * f0 - 1200) / 700) ** 2)) for k in range(1, 14) if k * f0 < 9000}

    def amps(k, tt):
        return table.get(k, 0.0) * np.ones_like(tt)
    x = additive(f0, n, amps, fm, nmax=max(table))
    if kind == 'flute':
        br = sosfilt(butter(2, [f0 * 0.8, min(f0 * 6, 16000)], 'band', fs=SR, output='sos'), rng.standard_normal(n))
        x += 0.05 * br * (0.4 + np.exp(-t / 0.08))
    env = adsr(n, 0.07 if kind == 'flute' else 0.04, 0.1, 0.85, rel, dur)
    return x * env * vel / sum(table.values()) * 1.6


def pizz(f0, vel):
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(1, 8):
        out += (1 / k ** 1.4) * np.exp(-t / (0.22 / (1 + 0.4 * k))) * np.sin(2 * np.pi * f0 * k * t + rng.uniform(0, 6.28))
    return out * np.minimum(t / 0.003, 1) * vel


def xylo(f0, vel):
    n = int(0.8 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for ratio, amp, tau in [(1, 1, 0.28), (3.93, 0.3, 0.09), (9.2, 0.1, 0.04)]:
        out += amp * np.exp(-t / tau) * np.sin(2 * np.pi * f0 * ratio * t)
    return out * np.minimum(t / 0.001, 1) * vel
