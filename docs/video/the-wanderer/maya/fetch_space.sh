#!/usr/bin/env bash
# Real space imagery used in Episode 2 (credits in the YouTube description).
set -e; cd "$(dirname "$0")/images"
g(){ [ -s "$2" ] || curl -sL -o "$2" "$1"; }
g https://www.eso.org/public/archives/images/large/eso0932a.jpg 03_milkyway_eso.jpg          # ESO/S. Brunier, CC BY 4.0
g https://images-assets.nasa.gov/image/as17-148-22727/as17-148-22727~orig.jpg 17_earth_apollo17.jpg  # NASA, public domain
g https://esahubble.org/media/archives/images/large/heic0611b.jpg 18_hudf.jpg                # NASA/ESA Hubble, CC BY 4.0
g https://esawebb.org/media/archives/images/large/weic2209a.jpg 18b_jwst_smacs.jpg          # NASA, ESA, CSA, STScI
g https://www.eso.org/public/archives/images/large/eso1907a.jpg 24_m87_eht.jpg               # EHT Collaboration, CC BY 4.0
g https://svs.gsfc.nasa.gov/vis/a010000/a013300/a013326/BH_AccretionDisk_Sim_360_Center_16x9_1080.mp4 25_bh_nasa_svs.mp4  # NASA GSFC / J. Schnittman
g https://images-assets.nasa.gov/image/iss059e027932/iss059e027932~orig.jpg 31_iss_sunrise.jpg  # NASA, public domain
g https://images-assets.nasa.gov/image/iss061e123823/iss061e123823~orig.jpg 31b_iss_limb.jpg   # NASA, public domain
