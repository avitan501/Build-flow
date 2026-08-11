import type { MaterialQuestion, MaterialQuestionnaireSnapshot } from "@/lib/material-questionnaires"

const CATEGORY_ID = "flooring-preview-category"
const DRYWALL_CATEGORY_ID = "drywall-preview-category"

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
