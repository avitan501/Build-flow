export type MaterialCategoryPhoto = {
  imageUrl: string
  imageAlt: string
  imageSource: string
  imageLicense: string
  imageCredit: string
  imageCategory: string
}

export const MATERIAL_REAL_PHOTOS: Record<string, MaterialCategoryPhoto> = {
  Doors: {
    imageUrl: '/images/materials/photos/doors.jpg',
    imageAlt: 'Interior lobby door with paneled wood detailing and glass inset.',
    imageSource: 'Wikimedia Commons – https://commons.wikimedia.org/w/index.php?curid=30470170',
    imageLicense: 'CC BY-SA',
    imageCredit: 'Agustin Bartolome',
    imageCategory: 'Doors',
  },
  Trim: {
    imageUrl: '/images/materials/photos/trim.jpg',
    imageAlt: 'Wood trim and moulding profile display for interior finish work.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/23141008@N06/5518263755',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'The Finishing Company Richmond Va',
    imageCategory: 'Trim',
  },
  Windows: {
    imageUrl: '/images/materials/photos/windows.jpg',
    imageAlt: 'Finished exterior window frames installed on a residential wall.',
    imageSource: 'Wikimedia Commons – https://commons.wikimedia.org/w/index.php?curid=14071740',
    imageLicense: 'CC BY-SA',
    imageCredit: 'Khaosaming',
    imageCategory: 'Windows',
  },
  Flooring: {
    imageUrl: '/images/materials/photos/flooring.jpg',
    imageAlt: 'Hardwood flooring in a finished room with visible wood grain planks.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/71401718@N00/5024671423',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'Wonderlane',
    imageCategory: 'Flooring',
  },
  Appliances: {
    imageUrl: '/images/materials/photos/appliances.jpg',
    imageAlt: 'Modern kitchen with stainless appliances and clean cabinetry.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/24240024@N03/5328898227',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'mkroepfl77',
    imageCategory: 'Appliances',
  },
  Glass: {
    imageUrl: '/images/materials/photos/glass.jpg',
    imageAlt: 'Frameless curved glass shower door with polished hardware.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/15553894@N00/19100028372',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'Prayitno / Thank you for (12 millions +) view',
    imageCategory: 'Glass',
  },
  Plumbing: {
    imageUrl: '/images/materials/photos/plumbing.jpg',
    imageAlt: 'Bathroom faucet fixture group in polished metal finish.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/29018979@N04/5575748050',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'Phil Roeder',
    imageCategory: 'Plumbing',
  },
  Electrical: {
    imageUrl: '/images/materials/photos/electrical.jpg',
    imageAlt: 'Wall-mounted electrical switch plate in a finished interior.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/63343826@N02/9296951538',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'lamdogjunkie',
    imageCategory: 'Electrical',
  },
  Lighting: {
    imageUrl: '/images/materials/photos/lighting.jpg',
    imageAlt: 'Pendant light fixture hanging over an interior space.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/33227787@N05/16230403023',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'r.nial.bradshaw',
    imageCategory: 'Lighting',
  },
  Tile: {
    imageUrl: '/images/materials/photos/tile.jpg',
    imageAlt: 'Ceramic wall tile surface with polished stone-like finish.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/89019705@N04/8313697940',
    imageLicense: 'CC BY-SA 2.0',
    imageCredit: 'Colorbuilding B.M. Ltd.',
    imageCategory: 'Tile',
  },
  Cabinets: {
    imageUrl: '/images/materials/photos/cabinets.jpg',
    imageAlt: 'Kitchen cabinetry installation with upper and lower cabinet runs.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/26331793@N04/5492580941',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'feserc',
    imageCategory: 'Cabinets',
  },
  Lumber: {
    imageUrl: '/images/materials/photos/lumber.jpg',
    imageAlt: 'Stacked lumber boards stored at a building materials yard.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/202846129@N03/54552184752',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'nenadstojkovicart',
    imageCategory: 'Lumber',
  },
  Plywood: {
    imageUrl: '/images/materials/photos/plywood.jpg',
    imageAlt: 'Sheets of plywood being used on a carpentry project.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/71401718@N00/8742600843',
    imageLicense: 'CC0 1.0',
    imageCredit: 'Wonderlane',
    imageCategory: 'Plywood',
  },
  Drywall: {
    imageUrl: '/images/materials/photos/drywall.jpg',
    imageAlt: 'Drywall and gypsum board seams being finished before paint.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/59595815@N03/47645209441',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'MTA C&D - EAST SIDE ACCESS',
    imageCategory: 'Drywall',
  },
  Concrete: {
    imageUrl: '/images/materials/photos/concrete.jpg',
    imageAlt: 'Finished concrete slab surface at a residential build site.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/71646105@N03/6551785215',
    imageLicense: 'CC BY-ND 2.0',
    imageCredit: 'Red Moon Sanctuary',
    imageCategory: 'Concrete',
  },
  Roofing: {
    imageUrl: '/images/materials/photos/roofing.jpg',
    imageAlt: 'Roof shingles being installed on a sloped residential roof.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/40478280@N00/362936240',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'pointnshoot',
    imageCategory: 'Roofing',
  },
  Insulation: {
    imageUrl: '/images/materials/photos/insulation.jpg',
    imageAlt: 'Roll insulation material staged for installation.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/8641421@N07/2237031938',
    imageLicense: 'CC BY-ND 2.0',
    imageCredit: 'chimothy27',
    imageCategory: 'Insulation',
  },
  Hardware: {
    imageUrl: '/images/materials/photos/hardware.jpg',
    imageAlt: 'Metal door hinge hardware close-up with brushed finish.',
    imageSource: 'Flickr via Openverse – http://www.flickr.com/photos/64607715@N05/16634048560',
    imageLicense: 'CC BY-SA 2.0',
    imageCredit: 'Rod Waddington',
    imageCategory: 'Hardware',
  },
  Tools: {
    imageUrl: '/images/materials/photos/tools.jpg',
    imageAlt: 'Circular saw cutting wood on a jobsite work surface.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/26344495@N05/33801256998',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'Ivan Radic',
    imageCategory: 'Tools',
  },
  Materials: {
    imageUrl: '/images/materials/photos/materials.jpg',
    imageAlt: 'Construction materials stacked and ready for use on site.',
    imageSource: 'Flickr via Openverse – https://www.flickr.com/photos/202846129@N03/54564831099',
    imageLicense: 'CC BY 2.0',
    imageCredit: 'nenadstojkovicart',
    imageCategory: 'Materials',
  },
}

export function realPhotoForMaterialCategory(category: string) {
  return MATERIAL_REAL_PHOTOS[category] ?? MATERIAL_REAL_PHOTOS.Materials
}
