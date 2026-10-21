#!/bin/bash
cd "$(dirname "$0")"; mkdir -p tex_hi; cd tex_hi
g() { for i in 1 2 3 4; do curl -sSL -m 600 -o "$1" "$2" && [ -s "$1" ] && file "$1" | grep -qiE "JPEG|TIFF|PNG" && echo "OK $1" && return; sleep $((i*4)); done; echo "FAIL $1"; }
g day_hi.jpg "https://eoimages.gsfc.nasa.gov/images/imagerecords/73000/73909/world.topo.bathy.200412.3x21600x10800.jpg"
g clouds_hi.jpg "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_4096.jpg"
g night_hi.jpg "https://eoimages.gsfc.nasa.gov/images/imagerecords/79000/79765/dnb_land_ocean_ice.2012.13500x6750.jpg"
echo FETCH_DONE
