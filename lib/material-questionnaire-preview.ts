import type { MaterialQuestion, MaterialQuestionnaireSnapshot } from "@/lib/material-questionnaires"

const CATEGORY_ID = "flooring-preview-category"
const DRYWALL_CATEGORY_ID = "drywall-preview-category"
const TILE_CATEGORY_ID = "tile-preview-category"
const DOOR_CATEGORY_ID = "door-molding-preview-category"
const FRAMING_CATEGORY_ID = "framing-preview-category"
const ELECTRICAL_CATEGORY_ID = "electrical-preview-category"

function options(questionId: string, entries: Array<[string, string]>) {
  return entries.map(([label, value], index) => ({
    id: `${questionId}-${value}`,
    question_id: questionId,
    label,
    value,
    is_active: true,
    sort_order: (index + 1) * 10,
  }))
}

function question(input: Partial<MaterialQuestion> & Pick<MaterialQuestion, "id" | "question_key" | "label" | "question_type" | "sort_order">): MaterialQuestion {
  return {
    category_id: CATEGORY_ID,
    help_text: "",
    placeholder: "",
    unit: null,
    is_required: false,
    is_active: true,
    allow_other: false,
    conditional_parent_question_id: null,
    conditional_operator: null,
    conditional_value: null,
    configuration: {},
    options: [],
    ...input,
  }
}

export const FLOORING_QUESTIONNAIRE_PREVIEW: MaterialQuestionnaireSnapshot = {
  category: {
    id: CATEGORY_ID,
    name: "Flooring Quick Order",
    slug: "hardwood-flooring-preview",
    department_key: "Wood Floor",
    description: "Configure unfinished solid hardwood flooring.",
    current_version: 1,
  },
  questions: [
    question({
      id: "flooring-product",
      question_key: "flooring_product",
      label: "What material do you need?",
      question_type: "single_select",
      is_required: true,
      sort_order: 10,
      configuration: { imageUrl: "/images/department-essentials/flooring-grid.webp", imagePosition: "0% 0%", imageSprite: true },
      options: options("flooring-product", [["Unfinished solid hardwood", "unfinished-solid"]]),
    }),
    question({
      id: "wood-type",
      question_key: "wood_type",
      label: "What wood species do you need?",
      question_type: "single_select",
      is_required: true,
      sort_order: 20,
      configuration: { imageUrl: "/images/department-essentials/flooring-grid.webp", imagePosition: "33.333% 0%", imageSprite: true },
      options: options("wood-type", [["Red Oak", "red-oak"], ["White Oak", "white-oak"]]),
    }),
    question({
      id: "flooring-thickness",
      question_key: "flooring_thickness",
      label: "What thickness do you need?",
      question_type: "single_select",
      is_required: true,
      sort_order: 30,
      options: options("flooring-thickness", [["3/4″", "3-4"]]),
    }),
    question({
      id: "milling-cut",
      question_key: "milling_cut",
      label: "What cut do you need?",
      help_text: "Choose the grain appearance for the flooring.",
      question_type: "single_select",
      sort_order: 40,
      options: options("milling-cut", [
        ["Plain Sawn / Standard", "plain-sawn-standard"],
        ["Rift & Quartered", "rift-and-quartered"],
        ["Rift Only", "rift-only"],
        ["Quartered Only", "quartered-only"],
      ]),
    }),
    question({
      id: "board-width",
      question_key: "board_width",
      label: "What board width do you need?",
      question_type: "single_select",
      is_required: true,
      sort_order: 50,
      options: options("board-width", [
        ["1-1/2″", "1-1-2"], ["2-1/4″", "2-1-4"], ["3-1/4″", "3-1-4"], ["4″", "4"], ["5″", "5"],
        ["6″", "6"], ["7″", "7"], ["8″", "8"], ["9″", "9"], ["10″", "10"],
      ]),
    }),
    question({
      id: "board-length",
      question_key: "board_length",
      label: "What available length do you need?",
      question_type: "single_select",
      sort_order: 60,
      options: options("board-length", [["Standard 1′–7′", "standard-1-7"]]),
    }),
    question({
      id: "flooring-area",
      question_key: "flooring_area",
      label: "How much flooring do you need?",
      question_type: "square_feet",
      unit: "sq. ft.",
      placeholder: "Enter square footage",
      is_required: true,
      sort_order: 70,
      configuration: { imageUrl: "/images/department-essentials/flooring-grid.webp", imagePosition: "0% 0%", imageSprite: true },
    }),
    question({ id: "waste-allowance", question_key: "waste_allowance", label: "Add waste?", help_text: "Optional", question_type: "single_select", sort_order: 75, options: options("waste-allowance", [["Add 10%", "10-percent"], ["Add 15%", "15-percent"]]) }),
    question({ id: "needs-flooring-underlayment", question_key: "needs_flooring_underlayment", label: "Add flooring underlayment?", question_type: "yes_no", sort_order: 80, configuration: { imageUrl: "/images/department-essentials/flooring-grid.webp", imagePosition: "100% 0%", imageSprite: true } }),
    question({ id: "flooring-underlayment-area", question_key: "flooring_underlayment_area", label: "How many square feet of underlayment?", question_type: "square_feet", unit: "sq. ft.", placeholder: "Enter square footage", sort_order: 81, conditional_parent_question_id: "needs-flooring-underlayment", conditional_operator: "equals", conditional_value: "yes" }),
    question({ id: "needs-flooring-glue", question_key: "needs_flooring_glue", label: "Add wood floor glue?", question_type: "yes_no", sort_order: 90, configuration: { imageUrl: "/images/department-essentials/flooring-grid.webp", imagePosition: "66.667% 100%", imageSprite: true } }),
    question({ id: "flooring-glue-gallons", question_key: "flooring_glue_gallons", label: "How many gallons of glue?", question_type: "gallons", unit: "gallons", placeholder: "Enter gallons", sort_order: 91, conditional_parent_question_id: "needs-flooring-glue", conditional_operator: "equals", conditional_value: "yes" }),
    question({ id: "needs-floor-covering-paper", question_key: "needs_floor_covering_paper", label: "Add floor covering paper?", question_type: "yes_no", sort_order: 100, configuration: { imageUrl: "/images/department-essentials/flooring-grid.webp", imagePosition: "100% 0%", imageSprite: true } }),
    question({ id: "floor-covering-paper-area", question_key: "floor_covering_paper_area", label: "How many square feet of covering paper?", question_type: "square_feet", unit: "sq. ft.", placeholder: "Enter square footage", sort_order: 101, conditional_parent_question_id: "needs-floor-covering-paper", conditional_operator: "equals", conditional_value: "yes" }),
    question({ id: "needs-stair-measurement", question_key: "needs_stair_nosing_measurement", label: "Call you for stair nosing or transition measurements?", question_type: "yes_no", sort_order: 110, configuration: { imageUrl: "/images/department-essentials/flooring-grid.webp", imagePosition: "33.333% 100%", imageSprite: true } }),
    question({ id: "choose-transition-finish", question_key: "choose_transition_finish", label: "Choose a transition-strip finish?", question_type: "yes_no", sort_order: 120, configuration: { imageUrl: "/images/department-essentials/flooring-grid.webp", imagePosition: "0% 100%", imageSprite: true } }),
    question({ id: "transition-finish", question_key: "transition_finish", label: "Which finish?", question_type: "single_select", sort_order: 121, conditional_parent_question_id: "choose-transition-finish", conditional_operator: "equals", conditional_value: "yes", options: options("transition-finish", [["Black", "black"], ["Satin Nickel", "satin-nickel"], ["Gold", "gold"], ["Silver", "silver"], ["Standard", "standard"]]) }),
    question({ id: "flooring-notes", question_key: "flooring_notes", label: "Any specific requirements or notes?", question_type: "long_text", placeholder: "Optional brand, finish, matching, or delivery details.", sort_order: 130 }),
  ],
}

function drywallQuestion(input: Partial<MaterialQuestion> & Pick<MaterialQuestion, "id" | "question_key" | "label" | "question_type" | "sort_order">) {
  return question({ category_id: DRYWALL_CATEGORY_ID, ...input })
}

export const DRYWALL_QUESTIONNAIRE_PREVIEW: MaterialQuestionnaireSnapshot = {
  category: {
    id: DRYWALL_CATEGORY_ID,
    name: "Sheetrock / Drywall Quick Order",
    slug: "sheetrock-drywall-preview",
    department_key: "Sheet rock",
    description: "Configure drywall sheets and jobsite accessories.",
    current_version: 1,
  },
  questions: [
    drywallQuestion({ id: "sheet-count", question_key: "sheet_count", label: "How many sheets do you need?", question_type: "number", unit: "sheets", placeholder: "Enter quantity", is_required: true, sort_order: 20, configuration: { imageUrl: "/images/department-essentials/drywall-grid.webp", imagePosition: "0% 0%", imageSprite: true } }),
    drywallQuestion({ id: "sheet-size", question_key: "sheet_size", label: "What sheet size do you need?", question_type: "single_select", is_required: true, sort_order: 30, options: options("sheet-size", [["4′ × 8′", "4x8"], ["4′ × 10′", "4x10"], ["4′ × 12′", "4x12"]]) }),
    drywallQuestion({ id: "thickness", question_key: "thickness", label: "What thickness do you need?", question_type: "single_select", is_required: true, sort_order: 35, options: options("thickness", [["3/8″", "3-8"], ["1/2″", "1-2"], ["5/8″", "5-8"]]) }),
    drywallQuestion({ id: "drywall-type", question_key: "drywall_type", label: "What type of drywall do you need?", question_type: "single_select", is_required: true, sort_order: 40, configuration: { imageUrl: "/images/department-essentials/drywall-grid.webp", imagePosition: "33.333% 0%", imageSprite: true }, options: options("drywall-type", [["Regular", "regular"], ["Green / Moisture Resistant", "moisture-resistant"], ["Fire Resistant / Type X", "type-x"]]) }),
    drywallQuestion({ id: "needs-screws", question_key: "needs_screws", label: "Do you need drywall screws?", question_type: "yes_no", sort_order: 120, configuration: { imageUrl: "/images/department-essentials/drywall-grid.webp", imagePosition: "33.333% 100%", imageSprite: true } }),
    drywallQuestion({ id: "screw-length", question_key: "screw_length", label: "What screw length do you need?", question_type: "single_select", sort_order: 130, conditional_parent_question_id: "needs-screws", conditional_operator: "equals", conditional_value: "yes", options: options("screw-length", [["1\"", "1"], ["1 1/4\"", "1-1-4"], ["1 5/8\"", "1-5-8"], ["2\"", "2"], ["2 1/2\"", "2-1-2"], ["3\"", "3"], ["Not Sure", "not-sure"]]) }),
    drywallQuestion({ id: "screw-quantity", question_key: "screw_quantity", label: "How many screws or boxes do you need?", question_type: "quantity", sort_order: 140, conditional_parent_question_id: "needs-screws", conditional_operator: "equals", conditional_value: "yes", configuration: { units: ["screws", "boxes", "buckets"], allowNotes: true } }),
    drywallQuestion({ id: "needs-compound", question_key: "needs_compound", label: "Do you need joint compound / spackle?", question_type: "yes_no", sort_order: 150, configuration: { imageUrl: "/images/materials/products-real/usg-all-purpose-joint-compound.webp" } }),
    drywallQuestion({ id: "compound-type", question_key: "compound_type", label: "What type of joint compound do you need?", question_type: "single_select", sort_order: 160, conditional_parent_question_id: "needs-compound", conditional_operator: "equals", conditional_value: "yes", options: options("compound-type", [["All Purpose", "all-purpose"], ["Lightweight", "lightweight"], ["Topping", "topping"], ["Setting-Type / Hot Mud", "hot-mud"], ["Premixed", "premixed"], ["Not Sure", "not-sure"]]) }),
    drywallQuestion({ id: "compound-quantity", question_key: "compound_quantity", label: "How much joint compound do you need?", question_type: "quantity", sort_order: 170, conditional_parent_question_id: "needs-compound", conditional_operator: "equals", conditional_value: "yes", configuration: { units: ["gallons", "buckets", "bags", "boxes"], allowNotes: true } }),
    drywallQuestion({ id: "needs-corner-bead", question_key: "needs_corner_bead", label: "Do you need corner bead?", question_type: "yes_no", sort_order: 180, configuration: { imageUrl: "/images/department-essentials/drywall-grid.webp", imagePosition: "0% 100%", imageSprite: true } }),
    drywallQuestion({ id: "corner-bead-type", question_key: "corner_bead_type", label: "What type of corner bead do you need?", question_type: "single_select", sort_order: 190, conditional_parent_question_id: "needs-corner-bead", conditional_operator: "equals", conditional_value: "yes", options: options("corner-bead-type", [["Metal", "metal"], ["Vinyl", "vinyl"], ["Paper-Faced", "paper-faced"], ["Bullnose", "bullnose"], ["Not Sure", "not-sure"]]) }),
    drywallQuestion({ id: "corner-bead-length", question_key: "corner_bead_length", label: "What length of corner bead do you need?", question_type: "linear_feet", unit: "linear ft.", sort_order: 200, conditional_parent_question_id: "needs-corner-bead", conditional_operator: "equals", conditional_value: "yes" }),
    drywallQuestion({ id: "corner-bead-pieces", question_key: "corner_bead_pieces", label: "How many pieces do you need?", question_type: "number", unit: "pieces", sort_order: 210, conditional_parent_question_id: "needs-corner-bead", conditional_operator: "equals", conditional_value: "yes" }),
    drywallQuestion({ id: "needs-tape", question_key: "needs_tape", label: "Do you need drywall tape?", question_type: "yes_no", sort_order: 220, configuration: { imageUrl: "/images/materials/products-real/usg-paper-joint-tape.webp" } }),
    drywallQuestion({ id: "tape-quantity", question_key: "tape_quantity", label: "How many rolls of drywall tape do you need?", question_type: "number", unit: "rolls", sort_order: 230, conditional_parent_question_id: "needs-tape", conditional_operator: "equals", conditional_value: "yes" }),
    drywallQuestion({ id: "needs-metal-studs", question_key: "needs_metal_studs", label: "Do you need metal studs?", question_type: "yes_no", sort_order: 240, configuration: { imageUrl: "/images/department-essentials/drywall-grid.webp", imagePosition: "66.667% 100%", imageSprite: true } }),
    drywallQuestion({ id: "metal-stud-quantity", question_key: "metal_stud_quantity", label: "How many metal studs do you need?", question_type: "number", unit: "pieces", sort_order: 250, conditional_parent_question_id: "needs-metal-studs", conditional_operator: "equals", conditional_value: "yes" }),
    drywallQuestion({ id: "drywall-notes", question_key: "drywall_notes", label: "Do you have any specific requirements or notes?", question_type: "long_text", placeholder: "Add delivery, matching, or packaging details.", sort_order: 260 }),
  ],
}

function tileQuestion(input: Partial<MaterialQuestion> & Pick<MaterialQuestion, "id" | "question_key" | "label" | "question_type" | "sort_order">) {
  return question({ category_id: TILE_CATEGORY_ID, ...input })
}

export const TILE_QUESTIONNAIRE_PREVIEW: MaterialQuestionnaireSnapshot = {
  category: { id: TILE_CATEGORY_ID, name: "Tile Quick Order", slug: "tile-quick-order-preview", department_key: "Tile work", description: "Configure tile-setting materials and jobsite accessories.", current_version: 1 },
  questions: [
    tileQuestion({ id: "thinset-quantity", question_key: "thinset_quantity", label: "How many bags of MAPEI Ultraflex thinset do you need?", question_type: "number", unit: "50 lb. bags", placeholder: "Enter bags", is_required: true, sort_order: 20, configuration: { imageUrl: "/images/materials/products-real/mapei-ultraflex-thinset.jpg" } }),
    tileQuestion({ id: "fine-sand", question_key: "fine_sand_yards", label: "How many yards of fine sand do you need?", question_type: "number", unit: "cu. yd.", placeholder: "Enter yards", sort_order: 30, configuration: { imageUrl: "/images/materials/products-real/yardas-fine-sand.jpg" } }),
    tileQuestion({ id: "portland-cement", question_key: "portland_cement_quantity", label: "How many bags of Portland cement do you need?", question_type: "number", unit: "50 lb. bags", placeholder: "Enter bags", sort_order: 40, configuration: { imageUrl: "/images/materials/products-real/lehigh-portland-cement-type-i-ii.jpg" } }),
    tileQuestion({ id: "wire-mesh", question_key: "wire_mesh_area", label: "How many square feet of tile wire mesh do you need?", question_type: "square_feet", unit: "sq. ft.", placeholder: "Enter square footage", sort_order: 50, configuration: { imageUrl: "/images/materials/products-real/tile-wire-mesh-v2.jpg" } }),
    tileQuestion({ id: "needs-waterproofing", question_key: "needs_waterproofing", label: "Do you need liquid waterproofing membrane?", question_type: "yes_no", sort_order: 60, configuration: { imageUrl: "/images/department-essentials/tile-grid.webp", imagePosition: "0% 100%", imageSprite: true } }),
    tileQuestion({ id: "waterproofing-gallons", question_key: "waterproofing_gallons", label: "How many gallons of waterproofing do you need?", question_type: "gallons", unit: "gallons", sort_order: 70, conditional_parent_question_id: "needs-waterproofing", conditional_operator: "equals", conditional_value: "yes" }),
    tileQuestion({ id: "tile-notes", question_key: "tile_notes", label: "Any tile or delivery notes?", question_type: "long_text", placeholder: "Add tile size, floor condition, or delivery details.", sort_order: 80 }),
  ],
}

function doorQuestion(input: Partial<MaterialQuestion> & Pick<MaterialQuestion, "id" | "question_key" | "label" | "question_type" | "sort_order">) {
  return question({ category_id: DOOR_CATEGORY_ID, ...input })
}

export const DOOR_MOLDING_QUESTIONNAIRE_PREVIEW: MaterialQuestionnaireSnapshot = {
  category: { id: DOOR_CATEGORY_ID, name: "Door & Molding Quick Order", slug: "door-molding-quick-order-preview", department_key: "Door and molding", description: "Configure molding profiles and door requirements.", current_version: 1 },
  questions: [
    doorQuestion({ id: "door-request-type", question_key: "request_type", label: "What are you ordering?", question_type: "single_select", is_required: true, sort_order: 10, configuration: { imageUrl: "/images/buildflow-retail/door-molding-department.webp" }, options: options("door-request-type", [["Doors", "door"], ["Molding", "molding"]]) }),
    doorQuestion({ id: "molding-items", question_key: "molding_items", label: "Add the molding you need", help_text: "Use one box for each molding profile.", question_type: "item_list", sort_order: 20, conditional_parent_question_id: "door-request-type", conditional_operator: "includes_any", conditional_value: ["molding"], configuration: { itemMode: "molding", itemLengths: ["8 ft.", "16 ft."], imageUrl: "/images/department-essentials/moldings-grid.webp", imagePosition: "0% 0%", imageSprite: true } }),
    doorQuestion({ id: "door-type", question_key: "door_type", label: "What door style do you need?", question_type: "single_select", sort_order: 60, conditional_parent_question_id: "door-request-type", conditional_operator: "includes_any", conditional_value: ["door"], configuration: { imageUrl: "/images/materials/photos/doors.jpg" }, options: options("door-type", [["Flat / flush", "flat"], ["1-panel Shaker", "one-shaker"], ["2-panel Shaker", "two-shaker"], ["3-panel Shaker", "three-shaker"]]) }),
    doorQuestion({ id: "door-thickness", question_key: "door_thickness", label: "What door thickness do you need?", question_type: "single_select", sort_order: 65, conditional_parent_question_id: "door-request-type", conditional_operator: "includes_any", conditional_value: ["door"], options: options("door-thickness", [["1 3/8 in.", "1-3-8"], ["1 3/4 in.", "1-3-4"]]) }),
    doorQuestion({ id: "door-quantity", question_key: "door_quantity", label: "How many doors do you need?", question_type: "number", unit: "doors", placeholder: "Enter quantity", sort_order: 70, conditional_parent_question_id: "door-request-type", conditional_operator: "includes_any", conditional_value: ["door"] }),
    doorQuestion({ id: "door-measurement-method", question_key: "door_measurement_method", label: "How should we confirm the door measurements?", question_type: "single_select", sort_order: 80, conditional_parent_question_id: "door-request-type", conditional_operator: "includes_any", conditional_value: ["door"], options: options("door-measurement-method", [["I have the measurements", "have-measurements"], ["Call me to arrange a jobsite measurement", "jobsite-measurement"]]) }),
    doorQuestion({ id: "door-measurements", question_key: "door_measurements", label: "Enter the door measurements", help_text: "Include width, height, jamb depth, swing, and handing if known.", question_type: "long_text", placeholder: "Example: 36 in. x 80 in., 4 9/16 in. jamb, left-hand inswing", sort_order: 90, conditional_parent_question_id: "door-measurement-method", conditional_operator: "equals", conditional_value: "have-measurements" }),
    doorQuestion({ id: "door-molding-notes", question_key: "order_notes", label: "Any matching, finish, or delivery notes?", question_type: "long_text", placeholder: "Add species, paint grade, finish, matching, or delivery details.", sort_order: 100, conditional_parent_question_id: "door-request-type", conditional_operator: "is_answered" }),
  ],
}

function framingQuestion(input: Partial<MaterialQuestion> & Pick<MaterialQuestion, "id" | "question_key" | "label" | "question_type" | "sort_order">) {
  return question({ category_id: FRAMING_CATEGORY_ID, ...input })
}

export const FRAMING_QUESTIONNAIRE_PREVIEW: MaterialQuestionnaireSnapshot = {
  category: { id: FRAMING_CATEGORY_ID, name: "Framing Lumber Quick Order", slug: "framing-lumber-quick-order-preview", department_key: "Framing", description: "Build a repeatable lumber list with common sizes and lengths.", current_version: 1 },
  questions: [
    framingQuestion({ id: "lumber-items", question_key: "lumber_items", label: "Add the lumber you need", help_text: "Use one row for each size and length. Add as many rows as needed.", question_type: "item_list", is_required: true, sort_order: 10, configuration: { itemMode: "lumber", itemSizes: ["2x3", "2x4", "2x6", "2x8", "2x10", "2x12"], itemLengths: ["8 ft.", "10 ft.", "12 ft.", "16 ft."], imageUrl: "/images/materials/products-real/2x4-premium-lumber.jpg" } }),
    framingQuestion({ id: "framing-notes", question_key: "framing_notes", label: "Any plywood, hardware, grade, or delivery notes?", question_type: "long_text", placeholder: "Add plywood, LVL, hangers, fasteners, treatment, or delivery details.", sort_order: 30 }),
  ],
}

function electricalQuestion(input: Partial<MaterialQuestion> & Pick<MaterialQuestion, "id" | "question_key" | "label" | "question_type" | "sort_order">) {
  return question({ category_id: ELECTRICAL_CATEGORY_ID, ...input })
}

export const ELECTRICAL_QUESTIONNAIRE_PREVIEW: MaterialQuestionnaireSnapshot = {
  category: { id: ELECTRICAL_CATEGORY_ID, name: "Electrical Cable Quick Order", slug: "electrical-cable-preview", department_key: "Electrical", description: "Build a repeatable Romex or BX cable list.", current_version: 1 },
  questions: [
    electricalQuestion({ id: "cable-items", question_key: "cable_items", label: "Add the cable you need", help_text: "Use one row for each cable type and size.", question_type: "item_list", is_required: true, sort_order: 10, configuration: { itemMode: "cable", itemSizes: ["Romex", "BX"], cableNumbers: ["14/2", "14/3", "12/2", "12/3", "10/2", "10/3", "8/3", "6/3"], itemLengths: ["25 ft.", "50 ft.", "100 ft.", "250 ft.", "500 ft.", "1000 ft."], imageUrl: "/images/buildflow-retail/electrical-bx-cutout.jpg" } }),
    electricalQuestion({ id: "electrical-notes", question_key: "electrical_notes", label: "Any wire color, conductor, or delivery notes?", question_type: "long_text", placeholder: "Add copper or aluminum, color, voltage, packaging, or delivery details.", sort_order: 20 }),
  ],
}

const RETIRED_STOREFRONT_QUESTIONS: Partial<Record<string, Set<string>>> = {
  "Wood Floor": new Set([
    "flooring_accessories",
    "flooring_type",
    "finish_type",
    "prefinished_details",
    "installation_method",
    "needs_bullnose",
    "bullnose_length",
    "needs_adhesive",
    "adhesive_gallons",
    "needs_underlayment",
    "underlayment_area",
  ]),
  "Sheet rock": new Set(["custom_width", "custom_length"]),
}

function storefrontQuestionId(department: string, questionKey: string) {
  return `storefront:${department.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${questionKey}`
}

export function applyStorefrontQuestionnaireDefaults(
  databaseSnapshot: MaterialQuestionnaireSnapshot | null,
  defaults: MaterialQuestionnaireSnapshot,
): MaterialQuestionnaireSnapshot {
  if (!databaseSnapshot) return defaults

  const consumedDatabaseIds = new Set<string>()
  const resolved = defaults.questions.map((defaultQuestion) => {
    const exact = databaseSnapshot.questions.find((question) => question.question_key === defaultQuestion.question_key)
    const noteAlias = defaultQuestion.question_type === "long_text"
      ? databaseSnapshot.questions.find((question) => !consumedDatabaseIds.has(question.id) && question.question_type === "long_text" && /note|requirement/.test(question.question_key))
      : null
    const databaseQuestion = exact ?? noteAlias
    if (databaseQuestion) consumedDatabaseIds.add(databaseQuestion.id)

    return {
      ...defaultQuestion,
      id: databaseQuestion?.id ?? storefrontQuestionId(databaseSnapshot.category.department_key, defaultQuestion.question_key),
      category_id: databaseSnapshot.category.id,
      options: defaultQuestion.options.map((option) => ({
        ...option,
        id: databaseQuestion?.options.find((candidate) => candidate.value === option.value)?.id
          ?? storefrontQuestionId(databaseSnapshot.category.department_key, `${defaultQuestion.question_key}:${option.value}`),
        question_id: databaseQuestion?.id ?? storefrontQuestionId(databaseSnapshot.category.department_key, defaultQuestion.question_key),
      })),
    }
  })

  const resolvedByDefaultId = new Map(defaults.questions.map((question, index) => [question.id, resolved[index].id]))
  const defaultsWithParents = resolved.map((question, index) => ({
    ...question,
    conditional_parent_question_id: defaults.questions[index].conditional_parent_question_id
      ? resolvedByDefaultId.get(defaults.questions[index].conditional_parent_question_id!) ?? null
      : null,
  }))
  const retired = RETIRED_STOREFRONT_QUESTIONS[databaseSnapshot.category.department_key] ?? new Set<string>()
  const customQuestions = databaseSnapshot.questions
    .filter((question) => !consumedDatabaseIds.has(question.id) && !retired.has(question.question_key))
    .map((question, index) => ({
      ...question,
      sort_order: 10_000 + index,
    }))

  return {
    category: databaseSnapshot.category,
    questions: [...defaultsWithParents, ...customQuestions],
  }
}

export function storefrontQuestionnaireDefaultsForDepartment(department: string) {
  if (department === "Wood Floor") return FLOORING_QUESTIONNAIRE_PREVIEW
  if (department === "Sheet rock") return DRYWALL_QUESTIONNAIRE_PREVIEW
  if (department === "Tile work") return TILE_QUESTIONNAIRE_PREVIEW
  if (department === "Door and molding") return DOOR_MOLDING_QUESTIONNAIRE_PREVIEW
  if (department === "Framing") return FRAMING_QUESTIONNAIRE_PREVIEW
  if (department === "Electrical") return ELECTRICAL_QUESTIONNAIRE_PREVIEW
  return null
}
