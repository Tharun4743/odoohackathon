import os
import json
import subprocess
import imageio_ffmpeg

BASE_DIR = r"C:\Users\tharu\.gemini\antigravity-ide\brain\7726e031-fcef-46fd-862b-78099f3fb311\scratch"
AUDIO_DIR = os.path.join(BASE_DIR, "audio")
CLIPS_DIR = os.path.join(BASE_DIR, "clips")
OUTPUT_DIR = r"C:\Users\tharu\.gemini\antigravity-ide\brain\7726e031-fcef-46fd-862b-78099f3fb311"
REPO_OUTPUT = r"c:\Users\tharu\Downloads\odoo hackathon\worksuite_hrms_demo_presentation.mp4"
FINAL_VIDEO = os.path.join(OUTPUT_DIR, "worksuite_hrms_demo_presentation.mp4")

ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

import re

def get_media_duration(filepath):
    cmd = [ffmpeg_exe, "-i", filepath]
    p = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True, errors="ignore")
    match = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", p.stderr)
    if match:
        h, m, s = match.groups()
        return float(h)*3600 + float(m)*60 + float(s)
    return 0.0

def build_master_audio():
    meta_path = os.path.join(AUDIO_DIR, "sections_meta.json")
    with open(meta_path, "r", encoding="utf-8") as f:
        sections = json.load(f)

    audio_list_file = os.path.join(BASE_DIR, "audio_concat.txt")
    with open(audio_list_file, "w", encoding="utf-8") as f:
        for s in sections:
            audio_path = s["audio_file"].replace("\\", "/")
            f.write(f"file '{audio_path}'\n")

    master_audio_path = os.path.join(BASE_DIR, "master_narration.mp3")
    cmd = [
        ffmpeg_exe, "-y", "-f", "concat", "-safe", "0",
        "-i", audio_list_file,
        "-c:a", "libmp3lame", "-q:a", "2",
        master_audio_path
    ]
    subprocess.run(cmd, check=True)
    print("Master Narration Audio built:", master_audio_path)
    return master_audio_path, sections

def find_recorded_webm():
    webm_files = [os.path.join(CLIPS_DIR, f) for f in os.listdir(CLIPS_DIR) if f.endswith(".webm")]
    if not webm_files:
        raise Exception("No recorded webm video found in " + CLIPS_DIR)
    # Get the latest webm
    webm_files.sort(key=os.path.getmtime, reverse=True)
    return webm_files[0]

def render_final_presentation():
    master_audio, sections = build_master_audio()
    recorded_webm = find_recorded_webm()

    audio_dur = get_media_duration(master_audio)
    video_dur = get_media_duration(recorded_webm)
    print(f"Master Audio Duration: {audio_dur:.2f}s | Video Duration: {video_dur:.2f}s")

    # Combine master audio and video with subtle speed adjustment and subtitle drawtext
    # We create a composite presentation with subtitles
    subtitles_filter = []
    # Build subtitle drawtext filters
    current_time = 0.0
    for s in sections:
        sec_dur = get_media_duration(s["audio_file"])
        t_start = current_time
        t_end = current_time + sec_dur
        # Sanitize subtitle text for drawtext
        sub_text = s["subtitle"].replace(":", "\\:").replace("'", "").replace('"', '')
        title_text = s["title"].replace(":", "\\:").replace("'", "").replace('"', '')
        
        # Upper banner for section title
        subtitles_filter.append(
            f"drawtext=text='{title_text}':fontcolor=white:fontsize=24:box=1:boxcolor=black@0.75:boxborderw=10:x=(w-text_w)/2:y=30:enable='between(t,{t_start:.2f},{t_end:.2f})'"
        )
        # Lower subtitle bar
        subtitles_filter.append(
            f"drawtext=text='{sub_text}':fontcolor=white:fontsize=22:box=1:boxcolor=black@0.8:boxborderw=12:x=(w-text_w)/2:y=h-60:enable='between(t,{t_start:.2f},{t_end:.2f})'"
        )
        current_time += sec_dur

    filter_complex = ",".join(subtitles_filter) if subtitles_filter else "null"

    # Scale video or stretch timeline to match audio duration
    pts_ratio = audio_dur / max(video_dur, 1.0)
    video_filter = f"setpts={pts_ratio:.4f}*PTS,{filter_complex},fps=30"

    print("Executing final high-definition render...")
    cmd = [
        ffmpeg_exe, "-y",
        "-i", recorded_webm,
        "-i", master_audio,
        "-filter_complex", f"[0:v]{video_filter}[v]",
        "-map", "[v]",
        "-map", "1:a",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        FINAL_VIDEO
    ]

    subprocess.run(cmd, check=True)
    print("SUCCESS: Final demo video created at:", FINAL_VIDEO)

    # Copy to workspace root
    import shutil
    shutil.copy2(FINAL_VIDEO, REPO_OUTPUT)
    print("SUCCESS: Copied video to workspace root at:", REPO_OUTPUT)

if __name__ == "__main__":
    render_final_presentation()
