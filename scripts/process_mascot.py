#!/usr/bin/env python3
"""
Mascot Chroma Key & Transparent PNG Generator for iDevak Video Engine
Takes green-screen mascot portraits (#00FF00) and converts them to transparent PNGs
with anti-aliased edge feathering and green spill suppression.
"""

import os
import shutil
from PIL import Image
import numpy as np

def process_mascot_image(src_path, dest_green_path, dest_png_path):
    # Copy green screen version
    shutil.copy2(src_path, dest_green_path)
    
    # Load and key out green background
    img = Image.open(src_path).convert('RGBA')
    arr = np.array(img, dtype=np.float32)
    
    r, g, b, a = arr[:,:,0], arr[:,:,1], arr[:,:,2], arr[:,:,3]
    
    # Green screen detection: green significantly higher than red and blue
    green_diff = g - np.maximum(r, b)
    
    # Smooth alpha mask with despill
    alpha = np.clip(1.0 - (green_diff - 20) / 40.0, 0.0, 1.0) * 255.0
    
    is_pure_green = (g > 140) & (r < 120) & (b < 120)
    alpha[~is_pure_green & (green_diff < 30)] = 255.0
    
    # Color spill suppression: clamp green channel on edge pixels
    spill = np.maximum(0, g - np.maximum(r, b))
    arr[:,:,1] = np.clip(g - spill * 0.8, 0, 255)
    arr[:,:,3] = alpha
    
    result = Image.fromarray(arr.astype(np.uint8), mode='RGBA')
    result.save(dest_png_path, format='PNG')
    print(f"Processed: {os.path.basename(dest_png_path)}")

if __name__ == '__main__':
    mascot_dir = os.path.join(os.path.dirname(__file__), '..', 'assets', 'mascot')
    print(f"Mascot assets directory: {mascot_dir}")
