# Real-ESRGAN general x4v3 (SRVGGNetCompact) on CPU. usage: compact.py out_dir in1.png [in2.png ...]
import sys, os, torch, torch.nn as nn, torch.nn.functional as F, numpy as np
from PIL import Image
class Net(nn.Module):
    def __init__(s, nf=64, nc=32, up=4):
        super().__init__(); b=[nn.Conv2d(3,nf,3,1,1), nn.PReLU(nf)]
        for _ in range(nc): b += [nn.Conv2d(nf,nf,3,1,1), nn.PReLU(nf)]
        b += [nn.Conv2d(nf,3*up*up,3,1,1)]; s.body=nn.ModuleList(b); s.up=nn.PixelShuffle(up)
    def forward(s,x):
        o=x
        for l in s.body: o=l(o)
        return s.up(o)+F.interpolate(x,scale_factor=4,mode='nearest')
torch.set_num_threads(4)
m=Net(); sd=torch.load('/root/vw/models/realesr-general-x4v3.pth',map_location='cpu'); m.load_state_dict(sd.get('params',sd)); m.eval()
for f in sys.argv[2:]:
    im=np.asarray(Image.open(f).convert('RGB'),np.float32)/255; x=torch.from_numpy(im).permute(2,0,1)[None]
    _,_,h,w=x.shape; T,P=384,12; out=torch.zeros(1,3,h*4,w*4)
    with torch.no_grad():
        for y in range(0,h,T):
            for xx in range(0,w,T):
                y0,y1,x0,x1=max(y-P,0),min(y+T+P,h),max(xx-P,0),min(xx+T+P,w)
                o=m(x[:,:,y0:y1,x0:x1]); ty,tx=y-y0,xx-x0; th,tw=min(T,h-y),min(T,w-xx)
                out[:,:,y*4:(y+th)*4,xx*4:(xx+tw)*4]=o[:,:,ty*4:(ty+th)*4,tx*4:(tx+tw)*4]
    r=(out[0].permute(1,2,0).clamp(0,1).numpy()*255).round().astype(np.uint8)
    Image.fromarray(r).resize((w*2,h*2),Image.LANCZOS).save(os.path.join(sys.argv[1],os.path.basename(f)),optimize=False)
    print('ok',f,flush=True)
