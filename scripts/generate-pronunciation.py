"""Generate personal study clips with the installed macOS Samantha voice and ffmpeg.
The committed MP3 files are deployed directly; the Pages build needs neither tool.
"""
import concurrent.futures, hashlib, json, pathlib, re, subprocess, tempfile
ROOT = pathlib.Path(__file__).resolve().parents[1]
path = ROOT / 'dist/words.json'
data = json.loads(path.read_text())
output = ROOT / 'dist/audio'
output.mkdir(exist_ok=True)
def generate(word):
    with tempfile.TemporaryDirectory(prefix='noir-voice-') as temp:
        aiff = pathlib.Path(temp) / 'word.aiff'
        mp3 = pathlib.Path(temp) / 'word.mp3'
        subprocess.run(['say', '-v', 'Samantha', '-r', '155', '-o', str(aiff), word['word']], check=True)
        subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-y', '-i', str(aiff), '-ac', '1', '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '64k', '-map_metadata', '-1', str(mp3)], check=True)
        content = mp3.read_bytes()
        slug = re.sub(r'[^a-z0-9-]+', '-', word['id']).strip('-')
        name = f"{slug}-{hashlib.sha256(content).hexdigest()[:12]}.mp3"
        (output / name).write_bytes(content)
        word['audio'] = f'audio/{name}'
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(generate, data['words']))
path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print(f"Generated {len(data['words'])} English clips")
