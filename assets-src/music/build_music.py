"""The game's music: render the nine movements of the suite (suite.py, about
15 minutes, synthesized from scratch: no samples) and encode each as an MP3
for the game, game/public/music/<id>-<hash>.mp3, with music/index.json.
`--set christmas` does the same for the six carols (carols.py, about 11
minutes) with music/christmas.json, played from 12 to 31 December.

    make music                      # render (about 15 min on two cores) and encode
    make carols                     # the Christmas carols
    python3 assets-src/music/build_music.py --wav-dir DIR   # reuse DIR/<set><k>.wav if there

The hash in each file name changes when the movement does, so the game's
offline copy (public/sw.js, cache "music-1") never keeps an old one.
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'game', 'public', 'music')
TRACKS = [  # in suite order: id, title
    ('dawn', 'dawn on the first tee'), ('march', 'fairway march'), ('waltz', 'waltz on the back nine'),
    ('primetime', 'primetime'), ('nocturne', 'quiet green'), ('coastal', 'coastal wind'),
    ('birdie', 'birdie run'), ('hymn', 'hymn at the turn'), ('finale', 'grand finale'),
]
CAROLS = [  # carols.py order: id, title (each tune published long before 1929)
    ('xmas_jingle', 'jingle bells'), ('xmas_deck', 'deck the halls'), ('xmas_silent', 'silent night'),
    ('xmas_wish', 'we wish you a merry christmas'), ('xmas_joy', 'joy to the world'),
    ('xmas_wenceslas', 'good king wenceslas'),
]
SETS = {'suite': ('suite.py', TRACKS, 'index.json'), 'christmas': ('carols.py', CAROLS, 'christmas.json')}
BITRATE = '96k'


def render(script, k, wav):
    if os.path.exists(wav):
        return
    subprocess.run([sys.executable, os.path.join(HERE, script), str(k), wav], check=True, cwd=HERE)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--wav-dir', default=None)
    ap.add_argument('--jobs', type=int, default=2)
    ap.add_argument('--set', default='suite', choices=sorted(SETS))
    a = ap.parse_args()
    script, TRACKS_, index = SETS[a.set]
    wav_dir = a.wav_dir or tempfile.mkdtemp(prefix='music-')
    ks = range(1, len(TRACKS_) + 1)
    wavs = [os.path.join(wav_dir, f'{a.set}{k}.wav') for k in ks]
    with ThreadPoolExecutor(a.jobs) as ex:
        list(ex.map(lambda kw: render(script, *kw), zip(ks, wavs)))
    os.makedirs(OUT, exist_ok=True)
    ids = {tid for tid, _ in TRACKS_}
    for f in os.listdir(OUT):  # this set's old files only (the other set's stay)
        if f.endswith('.mp3') and f.rsplit('-', 1)[0] in ids:
            os.remove(os.path.join(OUT, f))
    tracks = []
    for (tid, title), wav in zip(TRACKS_, wavs):
        tmp = os.path.join(wav_dir, f'{tid}.mp3')
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', BITRATE,
                        '-map_metadata', '-1', '-id3v2_version', '0', '-write_xing', '1', tmp], check=True)
        data = open(tmp, 'rb').read()
        name = f'{tid}-{hashlib.sha1(data).hexdigest()[:8]}.mp3'
        open(os.path.join(OUT, name), 'wb').write(data)
        secs = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', tmp],
                                    capture_output=True, text=True, check=True).stdout)
        tracks.append({'id': tid, 'title': title, 'file': name, 'seconds': round(secs, 1), 'bytes': len(data)})
        print(f'{name}: {secs:.0f} s, {len(data) / 1e6:.2f} MB')
    with open(os.path.join(OUT, index), 'w') as f:
        json.dump({'tracks': tracks}, f, indent=1)
        f.write('\n')
    print(f'{len(tracks)} tracks, {sum(t["bytes"] for t in tracks) / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
