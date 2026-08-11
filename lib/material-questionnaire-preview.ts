import type { MaterialQuestion, MaterialQuestionnaireSnapshot } from "@/lib/material-questionnaires"

const CATEGORY_ID = "flooring-preview-category"

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
