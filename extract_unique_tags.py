#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""uncategorizedリストから全ユニークタグを抽出"""

uncategorized_text = """
black bra, heart, simple background, bare shoulders, lace-trimmed bra
bare shoulders, simple background, heart, bed sheet
bare shoulders, pillow, heart, sleeveless, bed sheet
sailor collar, wet clothes, short sleeves, wooden floor, water
:d, sleeveless, wet clothes, sunlight, bare shoulders, blurry background, blurry, sleeveless shirt
long sleeves, plant
covered navel, short sleeves, wet clothes, blurry, wet shirt, blurry background
highleg swimsuit, covered navel, plant, water, bare shoulders, wet clothes, arm support, wet swimsuit, groin
bare shoulders, sleeveless, bare arms, bare legs, blurry background, blurry, :d
bare shoulders, covered navel, plant, highleg swimsuit, bare arms, bed sheet, bare legs, arm support, toes, sleeveless
o-ring, floral print, o-ring bikini, bare shoulders, white bikini, halterneck, bare arms, water, blurry, blurry background
covered navel, highleg swimsuit, bare shoulders, bare arms, water, wet swimsuit, wet clothes, groin
wooden floor, covered navel, long sleeves, floral print, thigh gap
long sleeves, blurry background, blurry, cleavage cutout, clothing cutout
underwear only, pillow, bare shoulders, white panties, bed sheet, lace-trimmed bra, bare arms
short sleeves
pencil skirt, long sleeves, shirt tucked in
long sleeves, wooden floor, blurry, blurry background
bare shoulders, front-tie top, bare arms, front-tie bikini top, blurry, arm support, blurry background, o-ring
black bra, underwear only, lace-trimmed bra, bare shoulders, bare arms, groin
palm tree, side-tie bikini bottom, bare shoulders, water, bare arms, front-tie top, bare legs, front-tie bikini top, blurry
bare shoulders, wet clothes, shiny clothes, wet swimsuit, bare arms, sand, water
pink bikini, side-tie bikini bottom, bare shoulders, sunlight, :d, halterneck, water, o-ring, o-ring bikini, sand, cloudy sky
white panties, bare shoulders, long sleeves, sailor collar, thigh gap, groin, plant, sleeveless, blurry, string panties
black bra, bare shoulders, off shoulder, sailor collar, long sleeves, open shirt
toes, black bra, pillow, bare legs, long sleeves, open shirt, lace-trimmed bra, bed sheet, plant, shirt tucked in
bare shoulders, pillow, bed sheet, bare arms
palm tree, side-tie bikini bottom, blue bikini, bare shoulders, toes, bare arms, halterneck, sunlight, water, bare legs, sand
long sleeves, wooden floor, wet clothes
toes, off shoulder, bare legs, bare shoulders, long sleeves, arm support
bare shoulders, halterneck, bare arms
covered navel, bare shoulders, water, sunlight, wet swimsuit, bare arms, wet clothes
sleeveless, sleeveless shirt, wet clothes, :d
bare shoulders, sleeveless, bare arms, floral print, sleeveless shirt, water
short sleeves, :d
bare shoulders, blurry background, short sleeves, pencil skirt, blurry, :d, off shoulder
pencil skirt, open shirt, blurry, blurry background, shirt tucked in, bra visible through clothes
blue bikini, side-tie bikini bottom, water, bare shoulders, sunlight, bare arms, sand, bare legs
white bra, white panties, bare shoulders, open shirt, sleeveless, pencil skirt, sleeveless shirt, bare arms, lace-trimmed bra
bare shoulders, water, :d, sand, bare arms, blurry, wet clothes
simple background, short sleeves, cleavage cutout, clothing cutout, arm support
halterneck, front-tie top, water, bare shoulders, front-tie bikini top, bare arms, blue bikini, o-ring bikini, blurry
open shirt, long sleeves, lace-trimmed bra, string panties
palm tree, bare shoulders, water, highleg swimsuit, o-ring, clothing cutout, sand, sunlight, bare arms, thigh gap
black bra, open shirt, pencil skirt, covered navel, long sleeves, shiny clothes, shirt tucked in, lace-trimmed bra
white panties, long sleeves, groin, blurry background, blurry, string panties
bare shoulders, floral print, covered navel, sleeveless, bare arms, blurry background, blurry
pillow, sailor collar, short sleeves, bra visible through clothes, white bra
wet clothes, sailor collar, short sleeves, wet shirt
short sleeves, sailor collar, blurry, blurry background
long sleeves, bare legs, off shoulder, wet clothes, plant, open shirt, toes, wet shirt
bare shoulders, simple background, heart, arm support, :d, covered navel, bare arms, shiny clothes
floral print, white bikini, bare shoulders, side-tie bikini bottom, front-tie top, halterneck, front-tie bikini top, water, :d, bare arms, o-ring, o-ring bikini, cloudy sky
bare shoulders, white bikini, bare arms, halterneck, thigh gap, sunlight, groin
long sleeves, plant, bra visible through clothes, shirt tucked in
white bikini, water, bare shoulders, thigh gap, :d, front-tie top, sunlight, halterneck, front-tie bikini top, bare arms, o-ring
bare shoulders, pillow, groin, bare arms, string panties, underwear only, blurry, blurry background
covered navel, highleg swimsuit, wet swimsuit, wet clothes, groin, water, thigh gap, bare shoulders, bare arms
short sleeves, bra visible through clothes, wet clothes, shirt tucked in, water, wet shirt, sand
bare shoulders, water, underwear only, bare arms, blurry, string panties
short sleeves, simple background, :d, groin
long sleeves, :d
side-tie bikini bottom, bare shoulders, groin, water, front-tie top, blurry, front-tie bikini top, blurry background
sailor collar, short sleeves, blurry background, blurry
wet clothes, short sleeves, sailor collar, heart, wet shirt, simple background
short sleeves
short sleeves, sailor collar, blurry, blurry background
sailor collar, short sleeves, wet clothes, bra visible through clothes, blurry
bare shoulders, off shoulder
wet clothes, wet shirt, sailor collar, bra visible through clothes, short sleeves
white bra, off shoulder, bare shoulders, long sleeves, open shirt, lace-trimmed bra, bed sheet
covered navel, wet swimsuit, highleg swimsuit, wet clothes, bare shoulders, water, groin
bare shoulders, bed sheet, bare arms, heart
blue bikini, water, open shirt, off shoulder, bare shoulders, halterneck, wet clothes, side-tie bikini bottom, long sleeves, pillow, wet shirt, o-ring
black bra, underwear only, lace-trimmed bra, bare shoulders, bare arms, groin
pink bikini, bare shoulders, sleeveless, sleeveless shirt
water, bare shoulders, bare arms, o-ring, halterneck, o-ring bikini, blurry, blue bikini, blurry background
white bikini, bare shoulders, side-tie bikini bottom, halterneck, water, front-tie top, blurry, palm tree, :d, blurry background, front-tie bikini top, bare arms, sunlight
long sleeves, blurry background, blurry, pencil skirt
underwear only, pillow, bare shoulders, bed sheet, bare arms, lace-trimmed bra
side-tie bikini bottom, blue bikini, bare shoulders, bare arms, halterneck, front-tie top, arm support, front-tie bikini top, bed sheet, blurry, blurry background
bare shoulders, shiny clothes, bare arms
black bra, open shirt, pencil skirt, :d, lace-trimmed bra, long sleeves, shirt tucked in
bare shoulders
long sleeves, white panties, blurry background, water, blurry, :d, cloudy sky
black bra, off shoulder, bare shoulders, long sleeves, lace-trimmed bra, blurry, open shirt
bare shoulders, front-tie top, front-tie bikini top
covered navel, highleg swimsuit, water, bare shoulders, wet swimsuit, wet clothes, shiny clothes, :d, groin, bare arms, sunlight
bare shoulders, sleeveless, bare arms, bra visible through clothes, sleeveless shirt, wet clothes, thigh gap, arm support, blurry, wooden floor
short sleeves, blurry background, blurry
white panties, white bra, underwear only, bare shoulders, groin, bare arms, plant, lace-trimmed bra, sunlight
bare shoulders, plant, sleeveless, blurry, bare legs, floral print, toes, off shoulder
short sleeves
floral print, long sleeves, blurry, blurry background
white panties, white bra, underwear only, bare shoulders, bare arms, lace-trimmed bra, plant
pink bikini, water, bare shoulders, blurry background, blurry, halterneck, bare arms
bare shoulders, bed sheet, bare arms
underwear only, bare shoulders, bed sheet, arm support, bare arms, string panties, blurry, lace-trimmed bra
floral print, bare shoulders, blue bikini, wooden floor, bare arms, sunlight, blurry background, blurry, front-tie top
bare shoulders, off shoulder, floral print, long sleeves
simple background, bare shoulders, off shoulder, long sleeves, halterneck
covered navel, bare shoulders, pillow, bed sheet, bare arms, highleg swimsuit
white bikini, wooden floor, bare shoulders, front-tie top, bare arms, halterneck, front-tie bikini top, blurry
bare shoulders, camisole, bare arms, sleeveless, bare legs, arm support
bare shoulders, covered navel, thigh gap, bare arms, shiny clothes, arm support
bare shoulders, highleg swimsuit, covered navel, blurry, bare arms
pink bikini, blurry background, bare shoulders, blurry, bare arms, halterneck
covered navel, bare shoulders, white panties, blurry, long sleeves, sleeveless, blurry background, cloudy sky, string panties
:d, bare shoulders, water, bare arms, sunlight, halterneck
side-tie bikini bottom, pink bikini, bare shoulders, front-tie top, halterneck, sunlight, floral print, thigh gap, water, front-tie bikini top, bare arms, cloudy sky
wet clothes, bare shoulders, sleeveless, sleeveless shirt, :d, blurry background, wet shirt
white panties, sailor collar, white bra, long sleeves, bra visible through clothes, blurry background, wet clothes, blurry
bare shoulders, sleeveless, bare arms, water
bare shoulders, bare arms, sleeveless, blurry, arm support, blurry background
side-tie bikini bottom, palm tree, bare shoulders, pink bikini, halterneck, arm support, water, bare arms, sunlight, groin, sand
short sleeves, shirt tucked in, water, wet clothes, wet shirt
bare shoulders, sleeveless, bare arms
sleeveless, sleeveless shirt, bare shoulders, shirt tucked in, simple background, bare arms
white bikini, bare shoulders, bare arms, halterneck, front-tie top, heart, sunlight, water, arm support
long sleeves, bra visible through clothes, wet clothes, bed sheet, blurry background, wet shirt
bare shoulders, off shoulder, heart, long sleeves, bare legs, toes, wooden floor
long sleeves
blue bikini, bare shoulders, open shirt, off shoulder, sunlight, halterneck
blue bikini, bare shoulders, floral print, pillow, front-tie top, palm tree, bare arms, front-tie bikini top
shiny clothes, long sleeves, camisole, :d
side-tie bikini bottom, halterneck, bare shoulders, o-ring, pillow, bed sheet, o-ring bikini, bare arms, pink bikini
simple background, bare shoulders, sleeveless, bare arms
black bra, sleeveless, bare shoulders, sleeveless shirt, arm support, lace-trimmed bra, bare arms
covered navel, bare shoulders, sleeveless, bare arms
white bra, bare shoulders, white panties, bed sheet, pillow, short sleeves, arm support, blurry background, blurry, white bikini, underwear only, halterneck, string panties
sleeveless, :d, sleeveless shirt
bare shoulders, sleeveless, blurry, water, blurry background, sand, bare arms, sunlight, toes
short sleeves, pillow, bed sheet, shiny clothes, blurry
white panties, short sleeves, arm support, cleavage cutout, clothing cutout
open shirt, long sleeves, lace-trimmed bra, bed sheet, arm support
bare shoulders, toes, sleeveless, bare legs, water, bare arms, sand
pillow, side-tie bikini bottom, white bikini, sailor collar, short sleeves, front-tie top, :d, front-tie bikini top, bed sheet
side-tie bikini bottom, bare shoulders, halterneck, water, bare arms, sunlight
sailor collar, sleeveless, bare shoulders, toes, bare legs, blurry background, bare arms
short sleeves, simple background, white panties
bare shoulders, blurry background, bed sheet, blurry, bare arms
black bra, open shirt, lace-trimmed bra, long sleeves, string panties
palm tree, side-tie bikini bottom, bare shoulders, halterneck, bare arms, water, sunlight, blurry
bare shoulders, blurry background, blurry
short sleeves, bed sheet, cleavage cutout, clothing cutout
bare shoulders, off shoulder, long sleeves, blurry, wooden floor, blurry background, plant
clothing cutout, bare shoulders, pillow, sleeveless, arm support, cleavage cutout, blurry background, blurry, bare arms, bed sheet
underwear only, pillow, bare shoulders, floral print, bare arms, thigh gap, lace-trimmed bra
clothing cutout, long sleeves, cleavage cutout, covered navel, wooden floor, blurry background
side-tie bikini bottom, bare shoulders, halterneck, bare arms, water, sunlight, blurry
bare shoulders, simple background, bare arms
floral print, front-tie top, bare shoulders, front-tie bikini top, halterneck, bare arms, water, sunlight, groin, palm tree
bare shoulders, sleeveless, bare arms, halterneck
bare shoulders, halterneck, simple background, side-tie bikini bottom, floral print, arm support
shirt tucked in, short sleeves, pencil skirt, blurry background, white bra, blurry, bra visible through clothes
black bra, bare shoulders, sleeveless, lace-trimmed bra, bare arms
bare shoulders, water, wet clothes, camisole, arm support, bare legs
sleeveless, bare shoulders, bare arms
blue bikini, side-tie bikini bottom, sand, bare shoulders, water, halterneck, bare arms, blurry
white panties, short sleeves
wet clothes, white panties, pillow, long sleeves, bed sheet, wet shirt
water, covered navel, wet clothes, wet swimsuit, bare shoulders, shiny clothes, bare arms, blurry, blurry background, groin
white panties, plant, long sleeves, blurry background, blurry, white bra, arm support
side-tie bikini bottom, bare shoulders, halterneck, bare arms, :d, front-tie top, front-tie bikini top, water, sunlight
floral print, blue bikini, bare shoulders, o-ring, halterneck, o-ring bikini, arm support, bare arms, bed sheet
palm tree, halterneck, bare shoulders, side-tie bikini bottom, water, sand, :d, bare arms, sunlight, wet clothes
white bra, open shirt, sleeveless, bare shoulders, sleeveless shirt, pencil skirt, wooden floor, blurry
short sleeves, simple background, clothing cutout, cleavage cutout
pillow, white bra, white panties, off shoulder, bare shoulders, long sleeves, bed sheet, lace-trimmed bra
bare shoulders, bed sheet, bare arms
long sleeves, open shirt, cloudy sky, groin
floral print, bare shoulders, :d, blurry
bare shoulders, pink bikini, halterneck, bare arms, blue bikini, bare legs, side-tie bikini bottom, front-tie top, water, front-tie bikini top
bare shoulders, pink bikini, bare arms, :d, water, sand
bare shoulders, cleavage cutout, clothing cutout, sleeveless, bare arms, sleeveless shirt, blurry
covered navel, bare shoulders, :d, arm support, bare arms, bare legs, sleeveless, water
short sleeves, blurry
bare shoulders, underwear only, bed sheet, string panties, floral print, bare arms, thigh gap, groin, simple background
white bikini, side-tie bikini bottom, front-tie top, halterneck, bare shoulders, front-tie bikini top, water, bare arms, sunlight, o-ring, groin, o-ring bikini
camisole, bare shoulders, bare arms, sleeveless, sleeveless shirt
camisole, pillow, bare shoulders, bare arms, sleeveless, blurry, bed sheet
bare shoulders, off shoulder, blurry, blurry background, short sleeves, white bra
covered navel, bare shoulders, highleg swimsuit, shiny clothes, wet clothes, long sleeves, water, cloudy sky, groin, blurry
bare shoulders, white panties, covered navel, :d, string panties
black bra, open shirt, lace-trimmed bra, blurry background, blurry, wet clothes, long sleeves, bed sheet, wet shirt
bare shoulders, bare arms, o-ring, sunlight, groin, o-ring bikini, halterneck, blurry, blurry background
bare shoulders, wet swimsuit, water, wet clothes, highleg swimsuit, bare arms, sand
underwear only, bare shoulders, floral print, bare arms, blurry background, blurry, bed sheet, arm support, lace-trimmed bra
bare shoulders, bare arms, heart, pillow, underwear only, string panties, arm support, bed sheet, blurry
bare shoulders, :d, bed sheet, blurry background
pink bikini, side-tie bikini bottom, bare shoulders, water, front-tie top, halterneck, o-ring, front-tie bikini top, bare arms, sunlight, blurry background, blurry, arm support, o-ring bikini, palm tree
wet clothes, black bra, wet shirt, bra visible through clothes, short sleeves, lace-trimmed bra, pencil skirt
covered navel, bare shoulders, clothing cutout, cleavage cutout, sleeveless, groin, bare arms, blurry, floral print, thigh gap, arm support
pink bikini, side-tie bikini bottom, front-tie top, halterneck, bare shoulders, front-tie bikini top, water, sunlight, thigh gap, groin, bare arms, blurry, o-ring
bare shoulders, :d, bed sheet, blurry background, bare arms, blurry, underwear only, camisole
black bra, lace-trimmed bra, long sleeves, blurry
black bra, bare shoulders, underwear only, :d, lace-trimmed bra, toes, bare legs, bare arms
wet clothes, white panties, water, bare shoulders, long sleeves, off shoulder, cloudy sky, palm tree, sunlight, blurry
sleeveless, wooden floor, wet clothes, bare shoulders, bra visible through clothes, sleeveless shirt, sunlight
o-ring, bare shoulders, water, o-ring bikini, blurry background, blurry, bare arms
heart, bare shoulders, bed sheet, bare arms, blurry, blurry background, pillow
white bra, open shirt, sleeveless, bare shoulders, sleeveless shirt, pencil skirt, wooden floor, blurry
bare shoulders, wet clothes, sleeveless shirt, bare arms, sleeveless, :d, water, wet shirt, sunlight
bare shoulders, white panties, simple background, sleeveless, cleavage cutout, clothing cutout
bare shoulders, pillow, camisole, bed sheet, bare arms, blurry background, blurry
bare shoulders, underwear only, bed sheet, string panties, thigh gap, floral print
short sleeves, cleavage cutout, clothing cutout
bare shoulders, water, white bikini, halterneck, clothing cutout, bare arms, blurry, cleavage cutout, sand, blurry background
white panties, white bra, bare shoulders, off shoulder, short sleeves, white bikini, blurry background, blurry, open shirt, shirt tucked in, front-tie top, wooden floor
bare shoulders, sleeveless, sleeveless shirt, :d, bare arms, water, blurry, wet clothes, sunlight
bare shoulders, pillow, off shoulder, long sleeves, sleeveless, bed sheet
floral print, blue bikini, front-tie top, bare shoulders, water, halterneck, front-tie bikini top, bare arms, o-ring
wooden floor, bare legs, short sleeves, bra visible through clothes, toes
palm tree, side-tie bikini bottom, bare shoulders, halterneck, pink bikini, bare arms, arm support, water, sunlight, groin
bare shoulders, water, arm support, sunlight, halterneck, blurry
blue bikini, water, bare shoulders, bare arms, halterneck, o-ring, blurry, arm support, groin, o-ring bikini, blurry background
floral print, bare shoulders, water, halterneck, bare arms, front-tie top, o-ring, sand, blurry
white bra, bare shoulders, pencil skirt, blurry, blurry background, off shoulder, open shirt, plant, arm support
pink bikini, bare shoulders, halterneck, water, bare arms, blurry, o-ring, blurry background
covered navel, wet clothes, wet swimsuit, bare shoulders, shiny clothes, blurry, bare arms, blurry background
floral print, front-tie top, bare shoulders, front-tie bikini top, water, halterneck, bare arms, groin, sunlight
side-tie bikini bottom, pink bikini, bare shoulders, halterneck, water, sunlight, bare arms, blurry, palm tree
pillow, camisole, bare shoulders, bed sheet, bare arms, bare legs, sleeveless
bare shoulders, bed sheet, blurry background, bare arms, blurry, camisole
bare shoulders, white panties, blurry background, blurry, sleeveless
covered navel, water, wet clothes, wet swimsuit, bare shoulders, groin, arm support, bare arms, highleg swimsuit
white panties, camisole, bare shoulders, :d, bare arms, arm support, blurry background, bed sheet, blurry, underwear only
bare shoulders, :d, bare arms, camisole, bed sheet
white panties, long sleeves, bra visible through clothes, :d
bare shoulders, white panties, covered navel, :d, blurry background, blurry, string panties
short sleeves, bare legs, string panties, blurry, blurry background, toes, arm support
bare shoulders, water, underwear only, lace-trimmed bra, bare arms
off shoulder, bare shoulders, long sleeves, :d, white bra, shirt tucked in
off shoulder, bare shoulders, heart, wooden floor, long sleeves, bare legs, blurry
sleeveless, sailor collar, bare shoulders, water, toes, bare legs, wet clothes, bare arms, sunlight, cloudy sky
floral print, bare shoulders, arm support, front-tie top, bare arms, halterneck, sunlight, blurry, thigh gap, water, front-tie bikini top, cloudy sky, o-ring, o-ring bikini, blurry background, blue bikini
bare shoulders, blurry background, blue bikini, sand, :d, bare arms, blurry, water
side-tie bikini bottom, bare shoulders, front-tie top, halterneck, pink bikini, front-tie bikini top, blurry
white bikini, bare shoulders, halterneck, side-tie bikini bottom, water, bare arms, blurry, arm support, bare legs, sunlight, toes, cloudy sky
halterneck, side-tie bikini bottom, water, palm tree, floral print, front-tie top, blurry, open shirt, sand, white bikini, off shoulder, blurry background, front-tie bikini top, bare shoulders, short sleeves
bare shoulders, toes, water, pink bikini, sunlight, blurry, blurry background, bare arms, :d, bare legs, sand, cloudy sky
water, sunlight, wet clothes, shiny clothes, bare shoulders, wet swimsuit, blurry, bare arms, highleg swimsuit, blurry background, cloudy sky
covered navel, bare shoulders, pillow, blurry, blurry background, sleeveless, floral print, arm support, bed sheet
covered navel, cloudy sky, clothing cutout, cleavage cutout, long sleeves, floral print, groin, water, short sleeves, arm support, shiny clothes
bare shoulders, heart, bed sheet, :d, bare arms, blurry background, blurry, shiny clothes
short sleeves, shirt tucked in, wet clothes
bare shoulders, off shoulder, short sleeves, :d, thigh gap
pillow, sleeveless, sleeveless shirt, bare shoulders, bare arms, bed sheet, heart
off shoulder, short sleeves, bare shoulders
bare shoulders, bare legs, pillow, arm support, sleeveless, :d, bed sheet, bare arms
short sleeves, wet clothes, wet shirt, groin, lace-trimmed bra
pencil skirt, bare shoulders, bare arms, lace-trimmed bra
side-tie bikini bottom, halterneck, water, front-tie top, bare shoulders, blue bikini, bare arms, front-tie bikini top, arm support, o-ring, o-ring bikini
black bra, bare shoulders, lace-trimmed bra, blurry, blurry background, bare arms
side-tie bikini bottom, front-tie top, front-tie bikini top, halterneck, bare shoulders, bed sheet
side-tie bikini bottom, halterneck, bare shoulders, pink bikini, front-tie top, bare arms, front-tie bikini top
wet clothes, bare shoulders, sleeveless, sleeveless shirt, :d, blurry background, wet shirt, blurry
long sleeves, shiny clothes
long sleeves, :d, clothing cutout, cleavage cutout, plant
palm tree, pink bikini, bare shoulders, arm support, blurry, halterneck, water, bare arms, blurry background, sunlight, groin
off shoulder, bare shoulders, heart, long sleeves, bare legs, bed sheet, blurry
pink bikini, wet clothes, wet shirt, short sleeves, front-tie top, front-tie bikini top, water, arm support, blurry background, sand, blurry, shiny clothes
covered navel, highleg swimsuit, wet clothes, wet swimsuit, bare shoulders, shiny clothes, plant, arm support
short sleeves, wooden floor
short sleeves, wooden floor, plant
black bra, open shirt, off shoulder, pencil skirt, bare shoulders, long sleeves, pillow, lace-trimmed bra, bed sheet, arm support
long sleeves, :d, camisole
short sleeves, wooden floor, bare legs
bare shoulders, long sleeves, bed sheet
short sleeves, shirt tucked in, :d, cloudy sky
short sleeves, cloudy sky, shirt tucked in, bare legs, arm support, sunlight
wet clothes, long sleeves, water, wet shirt, halterneck, sand
bare shoulders, blue bikini, water, bare legs, bare arms, floral print, sunlight
black bra, open shirt, lace-trimmed bra, long sleeves, plant
open shirt, lace-trimmed bra, blurry background
pillow, sleeveless, bare shoulders, bed sheet
covered navel, bare shoulders, sunlight, bare arms, highleg swimsuit, :d, shiny clothes, bare legs
bare shoulders, off shoulder, camisole, long sleeves
sleeveless, sleeveless shirt, bare shoulders
floral print, long sleeves, sunlight
wet clothes, short sleeves, wet shirt
bare shoulders, sleeveless, arm support, bare arms
long sleeves, palm tree, water, sunlight, blurry, blurry background
long sleeves, white bra, bra visible through clothes
long sleeves, sunlight
short sleeves, shirt tucked in, blurry, blurry background, arm support
sleeveless, sleeveless shirt, bare shoulders, :d, wet clothes, bare arms, wet shirt, sunlight
pencil skirt, bare shoulders, sleeveless, bare arms, camisole
pencil skirt, long sleeves, shirt tucked in, bra visible through clothes
bare shoulders, camisole, sleeveless, bare arms
blue bikini, bare shoulders, side-tie bikini bottom, heart, halterneck
bare shoulders, :d, bare arms, shiny clothes, arm support
short sleeves, shirt tucked in
off shoulder, long sleeves, bare shoulders, bare legs, pillow, bed sheet, wooden floor
bare shoulders, sleeveless, sleeveless shirt, water, :d, bare arms, camisole, sunlight
camisole, bare shoulders, bare arms, sleeveless, sleeveless shirt, bed sheet
pillow, white panties, white bra, off shoulder, bare shoulders, bed sheet, long sleeves
cleavage cutout, clothing cutout, bare shoulders, underwear only, black bra, heart, string panties, simple background
underwear only, bare shoulders, bed sheet, pillow, bare arms
wet clothes, bra visible through clothes, wet shirt, water, short sleeves, blurry background, shirt tucked in, blurry, lace-trimmed bra
wet clothes, wet shirt, bra visible through clothes, short sleeves, :d, blurry background
short sleeves, wet clothes, bra visible through clothes, wooden floor, wet shirt, open shirt, pillow
short sleeves, wooden floor, pillow, blurry, bare legs, plant
white bra, off shoulder, bare shoulders, pillow, long sleeves, bed sheet, open shirt, white panties
cleavage cutout, clothing cutout, bare shoulders, sleeveless, blurry, blurry background
covered navel, bare shoulders, groin, blurry background, blurry, highleg swimsuit, thigh gap
white bikini, bare shoulders, water, o-ring, bare arms, o-ring bikini, halterneck
white bikini, bare shoulders, water, o-ring, bare arms, halterneck, o-ring bikini, wet clothes
white bikini, bare shoulders, water, o-ring, halterneck, o-ring bikini
white bikini, water, bare shoulders, bare arms, o-ring, sunlight, groin, o-ring bikini, wet clothes, wet swimsuit
covered navel, highleg swimsuit, wet clothes, long sleeves, wet swimsuit, groin
white panties, sleeveless, bare shoulders, blurry, cloudy sky, bare arms, string panties, thigh gap
covered navel, bare shoulders, groin, blurry background, blurry, bare arms, thigh gap, wet clothes, shiny clothes
bare shoulders, pillow, bed sheet, blurry, blurry background
white bikini, side-tie bikini bottom, halterneck, wet swimsuit, wet clothes, bare shoulders, water, bare arms
short sleeves, sailor collar, arm support
"""

# 全タグを抽出
all_tags = set()
for line in uncategorized_text.strip().split('\n'):
    if line.strip():
        tags = [tag.strip() for tag in line.split(',') if tag.strip()]
        all_tags.update(tags)

# ソートして出力
sorted_tags = sorted(all_tags)
print(f"Total unique tags: {len(sorted_tags)}\n")
for tag in sorted_tags:
    print(tag)
