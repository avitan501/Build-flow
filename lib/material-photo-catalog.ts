export type MaterialCategoryPhoto = {
  imageUrl: string
  imageAlt: string
  imageSource: string
  imageLicense: string
  imageCredit: string
  imageCategory: string
}

const GENERATED_IMAGE_SOURCE = 'Generated with OpenAI imagegen for Avantia Build'
const GENERATED_IMAGE_LICENSE = 'Project-owned generated image'
const GENERATED_IMAGE_CREDIT = 'OpenAI imagegen'

export const MATERIAL_REAL_PHOTOS: Record<string, MaterialCategoryPhoto> = {
  Doors: {
    imageUrl: '/images/materials/photos/doors.jpg',
    imageAlt: 'Retail millwork aisle with doors, windows, and trim displays for contractors.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Doors',
  },
  Trim: {
    imageUrl: '/images/materials/photos/trim.jpg',
    imageAlt: 'Retail millwork aisle with doors, windows, and trim displays for contractors.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Trim',
  },
  Windows: {
    imageUrl: '/images/materials/photos/windows.jpg',
    imageAlt: 'Retail millwork aisle with doors, windows, and trim displays for contractors.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Windows',
  },
  Flooring: {
    imageUrl: '/images/materials/photos/flooring.jpg',
    imageAlt: 'Home improvement showroom aisle with tile, flooring, cabinets, and appliance displays.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Flooring',
  },
  Appliances: {
    imageUrl: '/images/materials/photos/appliances.jpg',
    imageAlt: 'Home improvement showroom aisle with tile, flooring, cabinets, and appliance displays.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Appliances',
  },
  Glass: {
    imageUrl: '/images/materials/photos/glass.jpg',
    imageAlt: 'Retail millwork aisle with doors, windows, and trim displays for contractors.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Glass',
  },
  Plumbing: {
    imageUrl: '/images/materials/photos/plumbing.jpg',
    imageAlt: 'Contractor supply aisle stocked with plumbing, electrical, lighting, hardware, and tools.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Plumbing',
  },
  Electrical: {
    imageUrl: '/images/materials/photos/electrical.jpg',
    imageAlt: 'Contractor supply aisle stocked with plumbing, electrical, lighting, hardware, and tools.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Electrical',
  },
  Lighting: {
    imageUrl: '/images/materials/photos/lighting.jpg',
    imageAlt: 'Contractor supply aisle stocked with plumbing, electrical, lighting, hardware, and tools.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Lighting',
  },
  Tile: {
    imageUrl: '/images/materials/photos/tile.jpg',
    imageAlt: 'Home improvement showroom aisle with tile, flooring, cabinets, and appliance displays.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Tile',
  },
  Cabinets: {
    imageUrl: '/images/materials/photos/kitchen.jpg',
    imageAlt: 'Home improvement showroom aisle with tile, flooring, cabinets, and appliance displays.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Cabinets',
  },
  Lumber: {
    imageUrl: '/images/materials/photos/lumber.jpg',
    imageAlt: 'Retail lumber aisle with organized studs, boards, and plywood for jobsite orders.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Lumber',
  },
  Plywood: {
    imageUrl: '/images/materials/photos/plywood.jpg',
    imageAlt: 'Retail lumber aisle with organized studs, boards, and plywood for jobsite orders.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Plywood',
  },
  Drywall: {
    imageUrl: '/images/materials/photos/drywall.jpg',
    imageAlt: 'Drywall supply aisle with gypsum panels, joint compound, and wall material accessories.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Drywall',
  },
  Concrete: {
    imageUrl: '/images/materials/photos/concrete.jpg',
    imageAlt: 'Exterior building material yard with pallets of roofing and concrete supplies.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Concrete',
  },
  Roofing: {
    imageUrl: '/images/materials/photos/roofing.jpg',
    imageAlt: 'Exterior building material yard with pallets of roofing and concrete supplies.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Roofing',
  },
  Insulation: {
    imageUrl: '/images/materials/photos/insulation.jpg',
    imageAlt: 'Drywall supply aisle with gypsum panels, insulation, and wall material accessories.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Insulation',
  },
  Hardware: {
    imageUrl: '/images/materials/photos/hardware.jpg',
    imageAlt: 'Contractor supply aisle stocked with plumbing, electrical, lighting, hardware, and tools.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Hardware',
  },
  Tools: {
    imageUrl: '/images/materials/photos/tools.jpg',
    imageAlt: 'Contractor supply aisle stocked with plumbing, electrical, lighting, hardware, and tools.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Tools',
  },
  Materials: {
    imageUrl: '/images/materials/photos/materials.jpg',
    imageAlt: 'Retail lumber aisle with organized studs, boards, and plywood for jobsite orders.',
    imageSource: GENERATED_IMAGE_SOURCE,
    imageLicense: GENERATED_IMAGE_LICENSE,
    imageCredit: GENERATED_IMAGE_CREDIT,
    imageCategory: 'Materials',
  },
}

export function realPhotoForMaterialCategory(category: string) {
  return MATERIAL_REAL_PHOTOS[category] ?? MATERIAL_REAL_PHOTOS.Materials
}
