import type { MaterialQuestion, MaterialQuestionnaireSnapshot } from "@/lib/material-questionnaires"

const CATEGORY_ID = "flooring-preview-category"
const DRYWALL_CATEGORY_ID = "drywall-preview-category"
const TILE_CATEGORY_ID = "tile-preview-category"
const DOOR_CATEGORY_ID = "door-molding-preview-category"
const FRAMING_CATEGORY_ID = "framing-preview-category"

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
      options: options("flooring-product", [["Unfinished solid hardwood", "unfinished-solid"]]),
    }),
    question({
      id: "wood-type",
      question_key: "wood_type",
      label: "What wood species do you need?",
      question_type: "single_select",
      is_required: true,
      sort_order: 20,
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
    }),
    question({
      id: "flooring-accessories",
      question_key: "flooring_accessories",
      label: "What else should we include?",
      help_text: "Select every item that applies, then press Review.",
      question_type: "multi_select",
      sort_order: 80,
      options: options("flooring-accessories", [
        ["Flooring underlayment", "underlayment"],
        ["Wood floor glue", "wood-floor-glue"],
        ["Floor covering paper", "floor-covering-paper"],
        ["Call me for stair nosing and transition-strip measurements", "call-for-measurements"],
      ]),
    }),
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
    drywallQuestion({
      id: "drywall-product",
      question_key: "drywall_product",
      label: "What material do you need?",
      question_type: "single_select",
      is_required: true,
      sort_order: 10,
      options: options("drywall-product", [["Drywall / Sheetrock", "drywall-sheetrock"]]),
    }),
    drywallQuestion({ id: "sheet-count", question_key: "sheet_count", label: "How many sheets do you need?", question_type: "number", unit: "sheets", placeholder: "Enter quantity", is_required: true, sort_order: 20 }),
    drywallQuestion({ id: "sheet-size", question_key: "sheet_size", label: "What sheet size do you need?", question_type: "single_select", is_required: true, sort_order: 30, options: options("sheet-size", [["4′ × 8′", "4x8"], ["4′ × 10′", "4x10"], ["4′ × 12′", "4x12"]]) }),
    drywallQuestion({ id: "drywall-type", question_key: "drywall_type", label: "What type of drywall do you need?", question_type: "single_select", is_required: true, sort_order: 40, options: options("drywall-type", [["Regular", "regular"], ["Green / Moisture Resistant", "moisture-resistant"], ["Fire Resistant / Type X", "type-x"]]) }),
    drywallQuestion({ id: "thickness", question_key: "thickness", label: "What thickness do you need?", question_type: "single_select", is_required: true, sort_order: 50, options: options("thickness", [["3/8″", "3-8"], ["1/2″", "1-2"], ["5/8″", "5-8"]]) }),
    drywallQuestion({ id: "needs-screws", question_key: "needs_screws", label: "Do you need drywall screws?", question_type: "yes_no", sort_order: 120 }),
    drywallQuestion({ id: "screw-length", question_key: "screw_length", label: "What screw length do you need?", question_type: "single_select", sort_order: 130, conditional_parent_question_id: "needs-screws", conditional_operator: "equals", conditional_value: "yes", options: options("screw-length", [["1\"", "1"], ["1 1/4\"", "1-1-4"], ["1 5/8\"", "1-5-8"], ["2\"", "2"], ["2 1/2\"", "2-1-2"], ["3\"", "3"], ["Not Sure", "not-sure"]]) }),
    drywallQuestion({ id: "screw-quantity", question_key: "screw_quantity", label: "How many screws or boxes do you need?", question_type: "quantity", sort_order: 140, conditional_parent_question_id: "needs-screws", conditional_operator: "equals", conditional_value: "yes", configuration: { units: ["screws", "boxes", "buckets"], allowNotes: true } }),
    drywallQuestion({ id: "needs-compound", question_key: "needs_compound", label: "Do you need joint compound / spackle?", question_type: "yes_no", sort_order: 150 }),
    drywallQuestion({ id: "compound-type", question_key: "compound_type", label: "What type of joint compound do you need?", question_type: "single_select", sort_order: 160, conditional_parent_question_id: "needs-compound", conditional_operator: "equals", conditional_value: "yes", options: options("compound-type", [["All Purpose", "all-purpose"], ["Lightweight", "lightweight"], ["Topping", "topping"], ["Setting-Type / Hot Mud", "hot-mud"], ["Premixed", "premixed"], ["Not Sure", "not-sure"]]) }),
    drywallQuestion({ id: "compound-quantity", question_key: "compound_quantity", label: "How much joint compound do you need?", question_type: "quantity", sort_order: 170, conditional_parent_question_id: "needs-compound", conditional_operator: "equals", conditional_value: "yes", configuration: { units: ["gallons", "buckets", "bags", "boxes"], allowNotes: true } }),
    drywallQuestion({ id: "needs-corner-bead", question_key: "needs_corner_bead", label: "Do you need corner bead?", question_type: "yes_no", sort_order: 180 }),
    drywallQuestion({ id: "corner-bead-type", question_key: "corner_bead_type", label: "What type of corner bead do you need?", question_type: "single_select", sort_order: 190, conditional_parent_question_id: "needs-corner-bead", conditional_operator: "equals", conditional_value: "yes", options: options("corner-bead-type", [["Metal", "metal"], ["Vinyl", "vinyl"], ["Paper-Faced", "paper-faced"], ["Bullnose", "bullnose"], ["Not Sure", "not-sure"]]) }),
    drywallQuestion({ id: "corner-bead-length", question_key: "corner_bead_length", label: "What length of corner bead do you need?", question_type: "linear_feet", unit: "linear ft.", sort_order: 200, conditional_parent_question_id: "needs-corner-bead", conditional_operator: "equals", conditional_value: "yes" }),
    drywallQuestion({ id: "corner-bead-pieces", question_key: "corner_bead_pieces", label: "How many pieces do you need?", question_type: "number", unit: "pieces", sort_order: 210, conditional_parent_question_id: "needs-corner-bead", conditional_operator: "equals", conditional_value: "yes" }),
    drywallQuestion({ id: "drywall-notes", question_key: "drywall_notes", label: "Do you have any specific requirements or notes?", question_type: "long_text", placeholder: "Add delivery, matching, or packaging details.", sort_order: 220 }),
  ],
}

function tileQuestion(input: Partial<MaterialQuestion> & Pick<MaterialQuestion, "id" | "question_key" | "label" | "question_type" | "sort_order">) {
  return question({ category_id: TILE_CATEGORY_ID, ...input })
}

export const TILE_QUESTIONNAIRE_PREVIEW: MaterialQuestionnaireSnapshot = {
  category: { id: TILE_CATEGORY_ID, name: "Tile Quick Order", slug: "tile-quick-order-preview", department_key: "Tile work", description: "Configure tile-setting materials and jobsite accessories.", current_version: 1 },
  questions: [
    tileQuestion({ id: "thinset-type", question_key: "thinset_type", label: "What thinset do you need?", question_type: "single_select", is_required: true, sort_order: 10, options: options("thinset-type", [["MAPEI Ultraflex", "mapei-ultraflex"]]) }),
    tileQuestion({ id: "thinset-quantity", question_key: "thinset_quantity", label: "How many bags of thinset do you need?", question_type: "number", unit: "50 lb. bags", placeholder: "Enter bags", is_required: true, sort_order: 20 }),
    tileQuestion({ id: "fine-sand", question_key: "fine_sand_yards", label: "How much fine sand do you need?", question_type: "number", unit: "cu. yd.", placeholder: "Enter yards", sort_order: 30 }),
    tileQuestion({ id: "portland-cement", question_key: "portland_cement_quantity", label: "How many bags of Portland cement do you need?", question_type: "number", unit: "50 lb. bags", placeholder: "Enter bags", sort_order: 40 }),
    tileQuestion({ id: "wire-mesh", question_key: "wire_mesh_area", label: "How much tile wire mesh do you need?", question_type: "square_feet", unit: "sq. ft.", placeholder: "Enter square footage", sort_order: 50 }),
    tileQuestion({ id: "tile-underlayment", question_key: "tile_underlayment", label: "What tile underlayment should we include?", question_type: "multi_select", sort_order: 60, options: options("tile-underlayment", [["Cement backer board", "cement-backer-board"], ["Uncoupling membrane", "uncoupling-membrane"], ["Waterproofing membrane", "waterproofing-membrane"], ["Self-leveling underlayment", "self-leveling-underlayment"], ["Not sure", "not-sure"]]) }),
    tileQuestion({ id: "tile-accessories", question_key: "tile_accessories", label: "What other setting materials should we include?", help_text: "Select every item that applies.", question_type: "multi_select", sort_order: 70, options: options("tile-accessories", [["Grout", "grout"], ["Tile spacers", "tile-spacers"], ["Leveling clips", "leveling-clips"], ["Waterproofing", "waterproofing"], ["Primer", "primer"], ["Matching silicone / caulk", "matching-sealant"]]) }),
    tileQuestion({ id: "tile-notes", question_key: "tile_notes", label: "Any tile, grout color, or delivery notes?", question_type: "long_text", placeholder: "Add tile size, grout color, floor condition, or delivery details.", sort_order: 80 }),
  ],
}

function doorQuestion(input: Partial<MaterialQuestion> & Pick<MaterialQuestion, "id" | "question_key" | "label" | "question_type" | "sort_order">) {
  return question({ category_id: DOOR_CATEGORY_ID, ...input })
}

export const DOOR_MOLDING_QUESTIONNAIRE_PREVIEW: MaterialQuestionnaireSnapshot = {
  category: { id: DOOR_CATEGORY_ID, name: "Door & Molding Quick Order", slug: "door-molding-quick-order-preview", department_key: "Door and molding", description: "Configure molding profiles and door requirements.", current_version: 1 },
  questions: [
    doorQuestion({ id: "door-request-type", question_key: "request_type", label: "What are you ordering?", question_type: "multi_select", is_required: true, sort_order: 10, options: options("door-request-type", [["Molding", "molding"], ["Door", "door"]]) }),
    doorQuestion({ id: "molding-type", question_key: "molding_type", label: "What type of molding do you need?", question_type: "single_select", sort_order: 20, allow_other: true, conditional_parent_question_id: "door-request-type", conditional_operator: "includes_any", conditional_value: ["molding"], options: options("molding-type", [["Crown molding", "crown"], ["Baseboard", "baseboard"], ["Casing", "casing"], ["Chair rail", "chair-rail"], ["Panel molding", "panel-molding"], ["Shoe / quarter round", "shoe-quarter-round"], ["Other", "other"]]) }),
    doorQuestion({ id: "molding-quantity", question_key: "molding_quantity", label: "How many pieces of molding do you need?", question_type: "number", unit: "pieces", placeholder: "Enter pieces", sort_order: 30, conditional_parent_question_id: "door-request-type", conditional_operator: "includes_any", conditional_value: ["molding"] }),
    doorQuestion({ id: "molding-length", question_key: "molding_length", label: "What molding length do you need?", question_type: "single_select", sort_order: 40, conditional_parent_question_id: "door-request-type", conditional_operator: "includes_any", conditional_value: ["molding"], options: options("molding-length", [["8 ft.", "8-ft"], ["10 ft.", "10-ft"], ["12 ft.", "12-ft"], ["14 ft.", "14-ft"], ["16 ft.", "16-ft"], ["Random lengths", "random-lengths"], ["Not sure", "not-sure"]]) }),
    doorQuestion({ id: "molding-catalog-reference", question_key: "molding_catalog_reference", label: "Garden State profile code or catalog link", help_text: "Enter the profile number or paste the molding page link.", question_type: "short_text", placeholder: "Example: WM 366 or catalog link", sort_order: 50, conditional_parent_question_id: "door-request-type", conditional_operator: "includes_any", conditional_value: ["molding"] }),
    doorQuestion({ id: "door-type", question_key: "door_type", label: "What type of door do you need?", question_type: "single_select", sort_order: 60, allow_other: true, conditional_parent_question_id: "door-request-type", conditional_operator: "includes_any", conditional_value: ["door"], options: options("door-type", [["Interior prehung", "interior-prehung"], ["Interior slab", "interior-slab"], ["Exterior prehung", "exterior-prehung"], ["Exterior slab", "exterior-slab"], ["Other", "other"], ["Not sure", "not-sure"]]) }),
    doorQuestion({ id: "door-quantity", question_key: "door_quantity", label: "How many doors do you need?", question_type: "number", unit: "doors", placeholder: "Enter quantity", sort_order: 70, conditional_parent_question_id: "door-request-type", conditional_operator: "includes_any", conditional_value: ["door"] }),
    doorQuestion({ id: "door-measurement-method", question_key: "door_measurement_method", label: "How should we confirm the door measurements?", question_type: "single_select", sort_order: 80, conditional_parent_question_id: "door-request-type", conditional_operator: "includes_any", conditional_value: ["door"], options: options("door-measurement-method", [["I have the measurements", "have-measurements"], ["Call me to arrange a jobsite measurement", "jobsite-measurement"]]) }),
    doorQuestion({ id: "door-measurements", question_key: "door_measurements", label: "Enter the door measurements", help_text: "Include width, height, jamb depth, swing, and handing if known.", question_type: "long_text", placeholder: "Example: 36 in. x 80 in., 4 9/16 in. jamb, left-hand inswing", sort_order: 90, conditional_parent_question_id: "door-measurement-method", conditional_operator: "equals", conditional_value: "have-measurements" }),
    doorQuestion({ id: "door-molding-notes", question_key: "order_notes", label: "Any matching, finish, or delivery notes?", question_type: "long_text", placeholder: "Add species, paint grade, finish, matching, or delivery details.", sort_order: 100 }),
  ],
}

function framingQuestion(input: Partial<MaterialQuestion> & Pick<MaterialQuestion, "id" | "question_key" | "label" | "question_type" | "sort_order">) {
  return question({ category_id: FRAMING_CATEGORY_ID, ...input })
}

export const FRAMING_QUESTIONNAIRE_PREVIEW: MaterialQuestionnaireSnapshot = {
  category: { id: FRAMING_CATEGORY_ID, name: "Framing Lumber Quick Order", slug: "framing-lumber-quick-order-preview", department_key: "Framing", description: "Build a repeatable lumber list with common sizes and lengths.", current_version: 1 },
  questions: [
    framingQuestion({ id: "lumber-items", question_key: "lumber_items", label: "Add the lumber you need", help_text: "Use one row for each size and length. Add as many rows as needed.", question_type: "item_list", is_required: true, sort_order: 10, configuration: { itemSizes: ["1x2", "1x3", "1x4", "1x6", "1x8", "1x10", "1x12", "2x3", "2x4", "2x6", "2x8", "2x10", "2x12", "3x4", "4x4", "4x6", "6x6"], itemLengths: ["8 ft.", "10 ft.", "12 ft.", "14 ft.", "16 ft.", "18 ft.", "20 ft.", "24 ft."] } }),
    framingQuestion({ id: "lumber-grade", question_key: "lumber_grade", label: "What lumber grade or treatment do you need?", question_type: "single_select", sort_order: 20, allow_other: true, options: options("lumber-grade", [["Standard framing lumber", "standard-framing"], ["Pressure treated", "pressure-treated"], ["Douglas Fir", "douglas-fir"], ["Select Structural", "select-structural"], ["Other", "other"], ["Not sure", "not-sure"]]) }),
    framingQuestion({ id: "framing-notes", question_key: "framing_notes", label: "Any plywood, hardware, grade, or delivery notes?", question_type: "long_text", placeholder: "Add plywood, LVL, hangers, fasteners, treatment, or delivery details.", sort_order: 30 }),
  ],
}
