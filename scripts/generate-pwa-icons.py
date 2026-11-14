import zlib
import struct
import math

def create_png(width, height, render_func):
    """Creates a raw RGBA PNG using standard library zlib and struct."""
    raw_rows = []
    for y in range(height):
        # Filter type 0 (None)
        row = bytearray([0])
        for x in range(width):
            r, g, b, a = render_func(x, y, width, height)
            row.extend([r, g, b, a])
        raw_rows.append(bytes(row))
    
    raw_data = b"".join(raw_rows)
    compressed = zlib.compress(raw_data, 9)
    
    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xffffffff
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)
    
    png = bytearray(b"\x89PNG\r\n\x1a\n")
    # IHDR
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png.extend(chunk(b"IHDR", ihdr_data))
    # IDAT
    png.extend(chunk(b"IDAT", compressed))
    # IEND
    png.extend(chunk(b"IEND", b""))
    return bytes(png)

def draw_icon(x, y, w, h, is_maskable=False):
    # Normalized coords [0, 1]
    nx = x / float(w)
    ny = y / float(h)
    
    # Background color: #0A0A0B with radial subtle gradient
    dist_center = math.sqrt((nx - 0.5)**2 + (ny - 0.45)**2) * 1.4
    center_glow = max(0.0, 1.0 - dist_center)
    bg_r = int(10 + center_glow * 25)
    bg_g = int(10 + center_glow * 25)
    bg_b = int(11 + center_glow * 30)

    # Determine squircle corner radius if not maskable
    if not is_maskable:
        # squircle round corner check
        corner_r = 0.22
        dx = max(0.0, abs(nx - 0.5) - (0.5 - corner_r))
        dy = max(0.0, abs(ny - 0.5) - (0.5 - corner_r))
        corner_dist = math.sqrt(dx*dx + dy*dy)
        if corner_dist > corner_r:
            # transparent outside squircle
            return 0, 0, 0, 0
    
    # Scale inside safe zone: for maskable, shrink card slightly
    card_scale = 0.65 if is_maskable else 0.72
    # Card boundaries centered
    card_w = card_scale
    card_h = card_scale * 0.618  # golden ratio
    
    card_x0 = 0.5 - card_w / 2.0
    card_x1 = 0.5 + card_w / 2.0
    card_y0 = 0.5 - card_h / 2.0
    card_y1 = 0.5 + card_h / 2.0
    
    # Check if point is inside card
    if card_x0 <= nx <= card_x1 and card_y0 <= ny <= card_y1:
        # Inside card
        # Rounded corners for the card itself
        ccr = 0.05
        cdx = max(0.0, abs(nx - 0.5) - (card_w / 2.0 - ccr))
        cdy = max(0.0, abs(ny - 0.5) - (card_h / 2.0 - ccr))
        if math.sqrt(cdx*cdx + cdy*cdy) <= ccr:
            # Card gradient: deep titanium slate
            card_t = (nx - card_x0) * 0.4 + (ny - card_y0) * 0.6
            cr = int(38 - card_t * 20)
            cg = int(38 - card_t * 20)
            cb = int(44 - card_t * 20)
            
            # Gold Chip emblem on top-left of card
            chip_x0 = card_x0 + 0.07 * card_w
            chip_x1 = chip_x0 + 0.18 * card_w
            chip_y0 = card_y0 + 0.16 * card_h
            chip_y1 = chip_y0 + 0.24 * card_h
            if chip_x0 <= nx <= chip_x1 and chip_y0 <= ny <= chip_y1:
                # Gold metallic color #D4AF37
                return 212, 175, 55, 255
            
            # Card edge highlights
            border_dist = min(nx - card_x0, card_x1 - nx, ny - card_y0, card_y1 - ny)
            if border_dist < 0.008:
                return 220, 220, 230, 255
            
            # Text/brand horizontal line simulation
            # Line 1 (primary brand)
            if card_y0 + 0.52 * card_h <= ny <= card_y0 + 0.59 * card_h and (card_x0 + 0.07 * card_w <= nx <= card_x0 + 0.45 * card_w):
                return 255, 255, 255, 255
            
            # Line 2 (sub details)
            if card_y0 + 0.68 * card_h <= ny <= card_y0 + 0.72 * card_h and (card_x0 + 0.07 * card_w <= nx <= card_x0 + 0.35 * card_w):
                return 160, 160, 170, 255
            
            # Line 3 (secondary)
            if card_y0 + 0.76 * card_h <= ny <= card_y0 + 0.80 * card_h and (card_x0 + 0.07 * card_w <= nx <= card_x0 + 0.25 * card_w):
                return 110, 110, 120, 255
            
            # Hologram gold dot on bottom right
            dot_cx = card_x1 - 0.15 * card_w
            dot_cy = card_y1 - 0.22 * card_h
            dot_dist = math.sqrt((nx - dot_cx)**2 + (ny - dot_cy)**2)
            if dot_dist < 0.025:
                return 212, 175, 55, 255
            elif dot_dist < 0.045:
                return 80, 80, 95, 255
                
            return cr, cg, cb, 255

    # Card drop shadow
    shadow_pad = 0.04
    if (card_x0 - shadow_pad <= nx <= card_x1 + shadow_pad and
        card_y0 <= ny <= card_y1 + shadow_pad * 1.5):
        s_dist = max(0.0, 1.0 - math.sqrt((nx - 0.5)**2 + (ny - (0.5 + 0.03))**2) / 0.4)
        bg_r = int(bg_r * (1.0 - s_dist * 0.5))
        bg_g = int(bg_g * (1.0 - s_dist * 0.5))
        bg_b = int(bg_b * (1.0 - s_dist * 0.5))

    return bg_r, bg_g, bg_b, 255

def create_ico(sizes, render_func):
    """Creates a valid multi-size ICO container embedding PNG-encoded icon frames."""
    images = []
    for size in sizes:
        png_data = create_png(size, size, lambda x, y, w, h: render_func(x, y, w, h, False))
        images.append((size, png_data))

    count = len(images)
    # ICONDIR: reserved (2B=0), type (2B=1 for ICO), count (2B)
    header = struct.pack("<HHH", 0, 1, count)
    offset = 6 + count * 16
    entries = bytearray()
    payloads = bytearray()

    for size, png_data in images:
        dim = 0 if size >= 256 else size
        # ICONDIRENTRY: width, height, color_count, reserved, planes, bit_count, bytes_in_res, image_offset
        entries.extend(struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32, len(png_data), offset))
        payloads.extend(png_data)
        offset += len(png_data)

    return header + bytes(entries) + bytes(payloads)


def main():
    import os
    os.makedirs("public", exist_ok=True)
    
    print("Generating 192x192 PNG...")
    png192 = create_png(192, 192, lambda x, y, w, h: draw_icon(x, y, w, h, False))
    with open("public/pwa-192x192.png", "wb") as f:
        f.write(png192)
        
    print("Generating 512x512 PNG...")
    png512 = create_png(512, 512, lambda x, y, w, h: draw_icon(x, y, w, h, False))
    with open("public/pwa-512x512.png", "wb") as f:
        f.write(png512)
        
    print("Generating 512x512 Maskable PNG...")
    png_maskable = create_png(512, 512, lambda x, y, w, h: draw_icon(x, y, w, h, True))
    with open("public/pwa-maskable-512x512.png", "wb") as f:
        f.write(png_maskable)

    print("Generating 180x180 Apple Touch Icon...")
    png_apple = create_png(180, 180, lambda x, y, w, h: draw_icon(x, y, w, h, False))
    with open("public/apple-touch-icon.png", "wb") as f:
        f.write(png_apple)
        
    print("Generating multi-size favicon.ico (16x16, 32x32, 48x48)...")
    ico_fav = create_ico([16, 32, 48], draw_icon)
    with open("public/favicon.ico", "wb") as f:
        f.write(ico_fav)

    print("All PWA assets created successfully.")

if __name__ == "__main__":
    main()
