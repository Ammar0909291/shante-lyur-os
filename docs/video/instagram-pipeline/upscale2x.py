import sys, types, time, os
tv=types.ModuleType('torchvision'); tr=types.ModuleType('torchvision.transforms'); tt=types.ModuleType('torchvision.transforms.transforms')
tr.transforms=tt; tv.transforms=tr
for n,m in (('torchvision',tv),('torchvision.transforms',tr),('torchvision.transforms.transforms',tt)): sys.modules[n]=m
import torch
from PIL import Image
from super_image import EdsrModel, ImageLoader
torch.set_num_threads(4)
m=EdsrModel.from_pretrained('eugenesiow/edsr-base', scale=2)
for n in ['B1','B2','B3','B4','I1','I2','I3','S1','S2','S3']:
    out=f'imgs2x/{n}.png'
    if os.path.exists(out): continue
    t=time.time(); im=Image.open(f'imgs/{n}.png').convert('RGB')
    with torch.no_grad(): y=m(ImageLoader.load_image(im))
    arr=(y.squeeze(0).clamp(0,1).permute(1,2,0).numpy()*255).round().astype('uint8')
    Image.fromarray(arr).save(out); print(n, arr.shape, round(time.time()-t,1),'s', flush=True)
print('UPSCALE_DONE', flush=True)
