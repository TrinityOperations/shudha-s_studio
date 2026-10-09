import subprocess
from PIL import Image
src='/tmp/claude-0/-home-claude/c70a516d-4ef5-5e48-919b-f4a0cfcc9b94/scratchpad/fb'
# key, vertical focus (0 top .. 1 bottom)
seq=[('779455107',0.55),('652672328',0.52),('831142396',0.50),('782149400',0.50),('770919088',0.62),('480738904',0.42),('644368186',0.42)]
D=3.6; FPS=30; N=int(D*FPS)
OS=3                       # oversampling factor: render the motion at 3x and scale down
OW,OH=1280*OS,720*OS       # 3840x2160 working size
clips=[]
for i,(k,fy) in enumerate(seq):
    im=Image.open(f'{src}/{k}.jpg'); w,h=im.size
    ch=int(w*9/16); top=int((h-ch)*fy)
    out=f'clip{i}.mp4'
    # zoom 1.00 -> 1.08 over the clip, centred; no sideways drift
    vf=(f"crop={w}:{ch}:0:{top},scale={OW}:{OH}:flags=lanczos,"
        f"zoompan=z='1+0.00074*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={OW}x{OH}:fps={FPS},"
        f"scale=1280:720:flags=lanczos,format=yuv420p")
    subprocess.run(['ffmpeg','-v','error','-y','-loop','1','-framerate',str(FPS),'-t',str(D),'-i',f'{src}/{k}.jpg','-vf',vf,'-frames:v',str(N),'-c:v','libx264','-preset','fast','-crf','16',out],check=True)
    clips.append(out)
clips.append(clips[0])
F=1.0
inputs=[]
for c in clips: inputs+=['-i',c]
fc=''; prev='[0:v]'; off=0.0
for i in range(1,len(clips)):
    off=off+D-F
    lab=f'[x{i}]' if i<len(clips)-1 else '[xo]'
    fc+=f"{prev}[{i}:v]xfade=transition=fade:duration={F}:offset={off:.3f}{lab};"
    prev=lab
end=off+F
fc+=(f"[xo]trim=start={F}:end={end:.3f},setpts=PTS-STARTPTS,"
     "colorbalance=rs=0.025:gs=0.005:bs=-0.03,eq=saturation=1.05:contrast=1.03:brightness=-0.01,"
     "vignette=angle=PI/5.5,format=yuv420p[v]")
subprocess.run(['ffmpeg','-v','error','-y']+inputs+['-filter_complex',fc,'-map','[v]','-r',str(FPS),'-c:v','libx264','-preset','slow','-crf','22','-movflags','+faststart','-an','hero.mp4'],check=True)
subprocess.run(['ffmpeg','-v','error','-y','-i','hero.mp4','-frames:v','1','-q:v','2','hero-poster.jpg'],check=True)
print('length', round(end-F,2))
