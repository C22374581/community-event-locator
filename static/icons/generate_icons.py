"""
Generate PWA icons from a source image
Requires Pillow: pip install Pillow
"""

from PIL import Image
import os

# Icon sizes required for PWA
SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

def generate_icons(source_path='source-icon.png', output_dir='.'):
    """
    Generate PWA icons from a source image.
    
    Args:
        source_path: Path to source image (should be at least 512x512)
        output_dir: Directory to save generated icons
    """
    try:
        # Open source image
        source = Image.open(source_path)
        
        # Convert to RGB if necessary
        if source.mode != 'RGB':
            source = source.convert('RGB')
        
        # Generate icons for each size
        for size in SIZES:
            # Resize image
            icon = source.resize((size, size), Image.Resampling.LANCZOS)
            
            # Save icon
            output_path = os.path.join(output_dir, f'icon-{size}x{size}.png')
            icon.save(output_path, 'PNG')
            print(f'Generated: {output_path}')
        
        print(f'\nSuccessfully generated {len(SIZES)} icons!')
        
    except FileNotFoundError:
        print(f'Error: Source image not found: {source_path}')
        print('Please provide a source image (recommended: 512x512px or larger)')
    except Exception as e:
        print(f'Error generating icons: {e}')

if __name__ == '__main__':
    import sys
    
    # Check if source image provided
    if len(sys.argv) > 1:
        source_path = sys.argv[1]
    else:
        source_path = 'source-icon.png'
    
    # Get output directory (current directory by default)
    output_dir = os.path.dirname(os.path.abspath(__file__))
    
    generate_icons(source_path, output_dir)

