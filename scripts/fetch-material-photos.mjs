import { mkdir, writeFile } from 'node:fs/promises'

const PUBLIC_DIR = new URL('../public/images/materials/photos/', import.meta.url)
const OUTPUT_TS = new URL('../lib/material-photo-catalog.ts', import.meta.url)

const photos = [
  {
    category: 'Doors',
    fileName: 'doors.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/65/Lobby_interior_door.jpg',
    imageAlt: 'Interior lobby door with paneled wood detailing and glass inset.',
    imageSource: 'Wikimedia Commons – https://commons.wikimedia.org/w/index.php?curid=30470170',
    imageLicense: 'CC BY-SA',
    imageCredit: 'Agustin Bartolome',
  },
  {
    category: 'Trim',
    fileName: 'trim.jpg',
    imageUrl: 'https://live.staticflickr.com/5172/5518263755_495f43d1af_b.jpg',
    imageAlt: 'Wood trim and moulding profile display for interior finish work.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/23141008@N06/5518263755',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'The Finishing Company Richmond Va',
  },
  {
    category: 'Windows',
    fileName: 'windows.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/2d/Thai_House_Window_Frames_Prepainted.JPG',
    imageAlt: 'Finished exterior window frames installed on a residential wall.',
    imageSource: 'Wikimedia Commons – https://commons.wikimedia.org/w/index.php?curid=14071740',
    imageLicense: 'CC BY-SA',
    imageCredit: 'Khaosaming',
  },
  {
    category: 'Flooring',
    fileName: 'flooring.jpg',
    imageUrl: 'https://live.staticflickr.com/4132/5024671423_019085ce6e_b.jpg',
    imageAlt: 'Hardwood flooring in a finished room with visible wood grain planks.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/71401718@N00/5024671423',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'Wonderlane',
  },
  {
    category: 'Appliances',
    fileName: 'appliances.jpg',
    imageUrl: 'https://live.staticflickr.com/5242/5328898227_631912e510_b.jpg',
    imageAlt: 'Modern kitchen with stainless appliances and clean cabinetry.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/24240024@N03/5328898227',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'mkroepfl77',
  },
  {
    category: 'Glass',
    fileName: 'glass.jpg',
    imageUrl: 'https://live.staticflickr.com/418/19100028372_be0cbf36de_b.jpg',
    imageAlt: 'Frameless curved glass shower door with polished hardware.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/15553894@N00/19100028372',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'Prayitno / Thank you for (12 millions +) view',
  },
  {
    category: 'Plumbing',
    fileName: 'plumbing.jpg',
    imageUrl: 'https://live.staticflickr.com/5059/5575748050_0511202ac4_b.jpg',
    imageAlt: 'Bathroom faucet fixture group in polished metal finish.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/29018979@N04/5575748050',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'Phil Roeder',
  },
  {
    category: 'Electrical',
    fileName: 'electrical.jpg',
    imageUrl: 'https://live.staticflickr.com/7368/9296951538_3b487f332f_b.jpg',
    imageAlt: 'Wall-mounted electrical switch plate in a finished interior.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/63343826@N02/9296951538',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'lamdogjunkie',
  },
  {
    category: 'Lighting',
    fileName: 'lighting.jpg',
    imageUrl: 'https://live.staticflickr.com/7652/16230403023_da4a04d5dd_b.jpg',
    imageAlt: 'Pendant light fixture hanging over an interior space.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/33227787@N05/16230403023',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'r.nial.bradshaw',
  },
  {
    category: 'Tile',
    fileName: 'tile.jpg',
    imageUrl: 'https://live.staticflickr.com/8354/8313697940_209a016258.jpg',
    imageAlt: 'Ceramic wall tile surface with polished stone-like finish.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/89019705@N04/8313697940',
    imageLicense: 'CC BY-SA 2.0',
    imageCredit: 'Colorbuilding B.M. Ltd.',
  },
  {
    category: 'Cabinets',
    fileName: 'cabinets.jpg',
    imageUrl: 'https://live.staticflickr.com/5176/5492580941_e2b41e8d6c_b.jpg',
    imageAlt: 'Kitchen cabinetry installation with upper and lower cabinet runs.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/26331793@N04/5492580941',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'feserc',
  },
  {
    category: 'Lumber',
    fileName: 'lumber.jpg',
    imageUrl: 'https://live.staticflickr.com/65535/54552184752_bef1c0f100_b.jpg',
    imageAlt: 'Stacked lumber boards stored at a building materials yard.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/202846129@N03/54552184752',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'nenadstojkovicart',
  },
  {
    category: 'Plywood',
    fileName: 'plywood.jpg',
    imageUrl: 'https://live.staticflickr.com/7293/8742600843_4c8aefe8d0_b.jpg',
    imageAlt: 'Sheets of plywood being used on a carpentry project.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/71401718@N00/8742600843',
    imageLicense: 'CC0 1.0',
    imageCredit: 'Wonderlane',
  },
  {
    category: 'Drywall',
    fileName: 'drywall.jpg',
    imageUrl: 'https://live.staticflickr.com/65535/47645209441_f85d3d2782_b.jpg',
    imageAlt: 'Drywall and gypsum board seams being finished before paint.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/59595815@N03/47645209441',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'MTA C&D - EAST SIDE ACCESS',
  },
  {
    category: 'Concrete',
    fileName: 'concrete.jpg',
    imageUrl: 'https://live.staticflickr.com/7159/6551785215_8073a05329_b.jpg',
    imageAlt: 'Finished concrete slab surface at a residential build site.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/71646105@N03/6551785215',
    imageLicense: 'CC BY-ND 2.0',
    imageCredit: 'Red Moon Sanctuary',
  },
  {
    category: 'Roofing',
    fileName: 'roofing.jpg',
    imageUrl: 'https://live.staticflickr.com/148/362936240_a19cbb6c77_b.jpg',
    imageAlt: 'Roof shingles being installed on a sloped residential roof.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/40478280@N00/362936240',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'pointnshoot',
  },
  {
    category: 'Insulation',
    fileName: 'insulation.jpg',
    imageUrl: 'https://live.staticflickr.com/2119/2237031938_308389436c_b.jpg',
    imageAlt: 'Roll insulation material staged for installation.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/8641421@N07/2237031938',
    imageLicense: 'CC BY-ND 2.0',
    imageCredit: 'chimothy27',
  },
  {
    category: 'Hardware',
    fileName: 'hardware.jpg',
    imageUrl: 'https://live.staticflickr.com/8686/16634048560_2b3b58309a_b.jpg',
    imageAlt: 'Metal door hinge hardware close-up with brushed finish.',
    imageSource: 'Flickr via Openverse – http://www.flickr.com/photos/64607715@N05/16634048560',
    imageLicense: 'CC BY-SA 2.0',
    imageCredit: 'Rod Waddington',
  },
  {
    category: 'Tools',
    fileName: 'tools.jpg',
    imageUrl: 'https://live.staticflickr.com/65535/33801256998_54c4646791_b.jpg',
    imageAlt: 'Circular saw cutting wood on a jobsite work surface.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/26344495@N05/33801256998',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'Ivan Radic',
  },
  {
    category: 'Materials',
    fileName: 'materials.jpg',
    imageUrl: 'https://live.staticflickr.com/65535/54564831099_797eaca2fc_b.jpg',
    imageAlt: 'Construction materials stacked and ready for use on site.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/202846129@N03/54564831099',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'nenadstojkovicart',
  },
]

function escape(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

async function download(photo) {
  const res = await fetch(photo.imageUrl)
  if (!res.ok) throw new Error(`Failed ${photo.category}: ${res.status} ${res.statusText}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(new URL(photo.fileName, PUBLIC_DIR), buf)
}

async function writeCatalog() {
  const lines = []
  lines.push('export type MaterialCategoryPhoto = {')
  lines.push('  imageUrl: string')
  lines.push('  imageAlt: string')
  lines.push('  imageSource: string')
  lines.push('  imageLicense: string')
  lines.push('  imageCredit: string')
  lines.push('  imageCategory: string')
  lines.push('}')
  lines.push('')
  lines.push('export const MATERIAL_REAL_PHOTOS: Record<string, MaterialCategoryPhoto> = {')
  for (const photo of photos) {
    lines.push(`  ${photo.category}: {`)
    lines.push(`    imageUrl: '/images/materials/photos/${photo.fileName}',`)
    lines.push(`    imageAlt: '${escape(photo.imageAlt)}',`)
    lines.push(`    imageSource: '${escape(photo.imageSource)}',`)
    lines.push(`    imageLicense: '${escape(photo.imageLicense)}',`)
    lines.push(`    imageCredit: '${escape(photo.imageCredit)}',`)
    lines.push(`    imageCategory: '${escape(photo.category)}',`)
    lines.push('  },')
  }
  lines.push('}')
  lines.push('')
  lines.push('export function realPhotoForMaterialCategory(category: string) {')
  lines.push("  return MATERIAL_REAL_PHOTOS[category] ?? MATERIAL_REAL_PHOTOS.Materials")
  lines.push('}')
  await writeFile(OUTPUT_TS, `${lines.join('\n')}\n`)
}

await mkdir(PUBLIC_DIR, { recursive: true })
for (const photo of photos) {
  await download(photo)
}
await writeCatalog()
console.log(`Downloaded ${photos.length} material photos and wrote material-photo-catalog.ts`)
