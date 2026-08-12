"use client"

import Link from "next/link"
import { useMemo, useRef, useState } from "react"
import { saveWorkflowManagerSettingsAction } from "@/app/preview-admin/workflow-actions"
import { DepartmentSymbolBadges, DEPARTMENT_SYMBOL_OPTIONS } from "@/components/buildflow/department-symbol-badges"
import { QuoCallButton } from "@/components/buildflow/quo-call-button"
import { SupplierQuoteRequestDialog } from "@/components/buildflow/supplier-quote-request-dialog"

import {
  buildManagerDepartmentOverride,
  buildManagerCategoryAddOn,
  buildManagerProductAddOn,
  departmentDisplayLabel,
  departmentOverrideFor,
  applyDepartmentAddOns,
  isDepartmentHidden,
  isManagerItemHidden,
  readManagerAddOns,
  writeManagerAddOns,
  type ManagerCatalogAddOns,
} from "@/lib/manager-add-ons"
import {
  DEFAULT_PLAN_UPLOAD_QUESTIONS,
  DEFAULT_SERVICE_QUESTIONS,
  DEFAULT_SUPPLIERS,
  SERVICE_ASSIGNMENT_TARGETS,
  defaultQualificationSettingForServiceTarget,
  readShopQualificationSettings,
  writeShopQualificationSettings,
  type ProductQualificationSetting,
  type QualifyingQuestion,
  type QualifyingQuestionType,
  type ServiceAssignmentTarget,
  type ShopQualificationSettings,
  type SupplierDeliveryMethod,
  type SupplierRoutingOption,
} from "@/lib/shop-qualification"
import type { ShopCatalogProduct } from "@/lib/shop-catalog"
import { filterProductsForShopTool, SHOP_TOOL_CATEGORIES, type DepartmentSymbolKey, type ShopToolSlug } from "@/lib/shop-tools"

type ManagerPanel = "services" | "departments" | "suppliers"
type DepartmentItemKind = "product" | "file-upload"
type SupplierRoutingManagerProps = {
  catalogProducts?: ShopCatalogProduct[]
  initialSettings?: ShopQualificationSettings | null
  initialAddOns?: ManagerCatalogAddOns | null
  initialPanel?: ManagerPanel
  supplierDirectoryOnly?: boolean
}

const questionTypes: QualifyingQuestionType[] = ["text", "textarea", "select"]
const deliveryMethods: SupplierDeliveryMethod[] = ["email", "phone", "whatsapp", "sms", "portal", "manual"]

function loadSettings(initial?: ShopQualificationSettings | null): ShopQualificationSettings {
  if (initial) return initial
  const stored = readShopQualificationSettings()
  return {
    suppliers: stored.suppliers.length > 0 ? stored.suppliers : DEFAULT_SUPPLIERS,
    products: stored.products,
  }
}

function loadAddOns(initial?: ManagerCatalogAddOns | null): ManagerCatalogAddOns {
  const addOns = initial ?? readManagerAddOns()
  return { ...addOns, hiddenItemIds: Array.isArray(addOns.hiddenItemIds) ? addOns.hiddenItemIds : [] }
}

function parseDepartmentItemList(value: string) {
  return [...new Set(value.split(/\r?\n/).map((line) => line.trim().replace(/^[-*]\s+/, "").replace(/^\d+[.)]\s+/, "")).filter(Boolean))].slice(0, 200)
}

function makeId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item"
}

function nextQuestionId(label: string, questions: QualifyingQuestion[]) {
  const base = makeId(label)
  const used = new Set(questions.map((question) => question.id))
  if (!used.has(base)) return base
  let suffix = 2
  while (used.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

function methodLabel(method: SupplierDeliveryMethod | undefined) {
  if (method === "email") return "Email"
  if (method === "whatsapp") return "WhatsApp"
  if (method === "phone") return "Phone"
  if (method === "sms") return "SMS"
  if (method === "portal") return "Portal"
  if (method === "manual") return "Manual"
  return "Manual"
}

function supplierReachLine(supplier: SupplierRoutingOption) {
  if (supplier.preferredDeliveryMethod === "whatsapp" && supplier.whatsapp) return supplier.whatsapp
  if (supplier.preferredDeliveryMethod === "phone" && supplier.phone) return supplier.phone
  if (supplier.preferredDeliveryMethod === "sms" && supplier.phone) return supplier.phone
  if (supplier.preferredDeliveryMethod === "portal" && supplier.portalUrl) return supplier.portalUrl
  if (supplier.email) return supplier.email
  if (supplier.phone) return supplier.phone
  if (supplier.whatsapp) return supplier.whatsapp
  return supplier.contactLabel || "Contact not set"
}

function selectedSettingFor(settings: ShopQualificationSettings, targetId: string, targets = SERVICE_ASSIGNMENT_TARGETS) {
  const target = targets.find((item) => item.id === targetId) ?? targets[0] ?? SERVICE_ASSIGNMENT_TARGETS[0]
  return settings.products[target.id] ?? defaultQualificationSettingForServiceTarget(target)
}

const departmentSlugByLabel = new Map<string, ShopToolSlug>(
  SHOP_TOOL_CATEGORIES.map((category) => [category.label, category.slug]),
)

function departmentRouteId(slug: string) {
  return `department-route-${slug}`
}

function productsForDepartment(products: ShopCatalogProduct[], departmentLabel: string) {
  const slug = departmentSlugByLabel.get(departmentLabel)
  if (slug) return filterProductsForShopTool(products, slug)
  return products.filter((product) => product.productType !== "service" && product.category === departmentLabel)
}

function departmentShopHref(departmentLabel: string) {
  const slug = departmentSlugByLabel.get(departmentLabel)
  if (slug) return `/shop/${slug}`
  return `/shop?category=${encodeURIComponent(departmentLabel)}`
}

export function SupplierRoutingManager({
  catalogProducts = [],
  initialSettings = null,
  initialAddOns = null,
  initialPanel = "departments",
  supplierDirectoryOnly = false,
}: SupplierRoutingManagerProps) {
  const [settings, setSettings] = useState<ShopQualificationSettings>(() => loadSettings(initialSettings))
  const [addOns, setAddOns] = useState<ManagerCatalogAddOns>(() => loadAddOns(initialAddOns))
  const [activePanel, setActivePanel] = useState<ManagerPanel>(initialPanel)
  const [selectedTargetId, setSelectedTargetId] = useState(SERVICE_ASSIGNMENT_TARGETS[0]?.id ?? "")
  const [selectedSupplierId, setSelectedSupplierId] = useState(settings.suppliers[0]?.id ?? DEFAULT_SUPPLIERS[0]?.id ?? "")
  const [selectedDepartmentLabel, setSelectedDepartmentLabel] = useState("Framing")
  const [categoryDraft, setCategoryDraft] = useState<{ label: string; description: string; imageUrl: string; symbols: DepartmentSymbolKey[] }>({ label: "", description: "", imageUrl: "", symbols: [] })
  const [departmentEditOpen, setDepartmentEditOpen] = useState(false)
  const [departmentEditDraft, setDepartmentEditDraft] = useState<{ label: string; description: string; imageUrl: string; symbols: DepartmentSymbolKey[]; hidden: boolean }>({ label: "", description: "", imageUrl: "", symbols: [], hidden: false })
  const [serviceDraft, setServiceDraft] = useState({ name: "", category: "Framing", description: "", supplierId: settings.suppliers[0]?.id ?? "" })
  const [departmentItemDraft, setDepartmentItemDraft] = useState({
    kind: "product" as DepartmentItemKind,
    name: "",
    description: "",
    unit: "Each",
    price: "",
    supplierId: settings.suppliers[0]?.id ?? DEFAULT_SUPPLIERS[0]?.id ?? "",
  })
  const [bulkItemText, setBulkItemText] = useState("")
  const [bulkItemStatus, setBulkItemStatus] = useState("")
  const [directorySaveState, setDirectorySaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [directorySaveError, setDirectorySaveError] = useState("")
  const pendingSaveRef = useRef<{ qualificationSettings: ShopQualificationSettings; addOns: ManagerCatalogAddOns } | null>(null)
  const saveRunningRef = useRef(false)
  const [supplierDraft, setSupplierDraft] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    whatsapp: "",
    portalUrl: "",
    preferredDeliveryMethod: "manual" as SupplierDeliveryMethod,
    deliveryNotes: "",
  })
  const [questionLabel, setQuestionLabel] = useState("")
  const [questionType, setQuestionType] = useState<QualifyingQuestionType>("text")
  const [questionRequired, setQuestionRequired] = useState(false)
  const [questionOptions, setQuestionOptions] = useState("")
  const [draftQuestions, setDraftQuestions] = useState<QualifyingQuestion[]>(DEFAULT_PLAN_UPLOAD_QUESTIONS)
  const [draftQuestionLabel, setDraftQuestionLabel] = useState("")
  const [draftQuestionType, setDraftQuestionType] = useState<QualifyingQuestionType>("text")
  const [draftQuestionRequired, setDraftQuestionRequired] = useState(false)
  const [draftQuestionOptions, setDraftQuestionOptions] = useState("")

  const assignmentTargets = useMemo<ServiceAssignmentTarget[]>(() => {
    const managerServices = addOns.services.map((service): ServiceAssignmentTarget => ({
      id: service.id,
      departmentSlug: departmentSlugByLabel.get(service.category) ?? "services",
      departmentLabel: service.category || "Sub-departments",
      serviceLabel: service.name,
      description: service.description,
      defaultSupplierId: service.supplierId || settings.suppliers[0]?.id || DEFAULT_SUPPLIERS[0]?.id || "",
      defaultQuestions: DEFAULT_SERVICE_QUESTIONS,
    }))

    return [...SERVICE_ASSIGNMENT_TARGETS, ...managerServices].filter((target) => !isManagerItemHidden(addOns, target.id))
  }, [addOns, settings.suppliers])
  const categoryOptions = useMemo(() => {
    const values = [
      ...SHOP_TOOL_CATEGORIES.map((category) => category.label),
      ...addOns.categories.map((category) => category.label),
    ]

    return values.filter((value, index) => value && values.indexOf(value) === index)
  }, [addOns])
  const selectedDepartment = categoryOptions.includes(selectedDepartmentLabel) ? selectedDepartmentLabel : categoryOptions[0] ?? "Framing"
  const selectedDepartmentDisplay = departmentDisplayLabel(addOns, selectedDepartment)
  const selectedDepartmentOverride = departmentOverrideFor(addOns, selectedDepartment)
  const selectedCategoryAddOn = addOns.categories.find((category) => category.label === selectedDepartment) ?? null
  const selectedDepartmentTargets = useMemo(
    () => assignmentTargets.filter((target) => target.departmentLabel === selectedDepartment),
    [assignmentTargets, selectedDepartment],
  )
  const selectedTarget =
    activePanel === "departments" && selectedDepartmentTargets.length > 0
      ? selectedDepartmentTargets.find((target) => target.id === selectedTargetId) ?? selectedDepartmentTargets[0]
      : assignmentTargets.find((target) => target.id === selectedTargetId) ?? assignmentTargets[0] ?? SERVICE_ASSIGNMENT_TARGETS[0]
  const selectedSetting = useMemo(() => selectedSettingFor(settings, selectedTarget.id, assignmentTargets), [assignmentTargets, selectedTarget.id, settings])
  const selectedSupplier = settings.suppliers.find((supplier) => supplier.id === selectedSupplierId) ?? settings.suppliers[0] ?? null
  const shopDepartments = useMemo(() => applyDepartmentAddOns(SHOP_TOOL_CATEGORIES, addOns), [addOns])
  const selectedSupplierDepartments = useMemo(() => shopDepartments.filter((department) => {
    const explicit = settings.products[departmentRouteId(department.slug)]
    if (explicit) return explicit.supplierId === selectedSupplier?.id
    const targets = assignmentTargets.filter((target) => target.departmentSlug === department.slug)
    return targets.length > 0 && targets.every((target) => selectedSettingFor(settings, target.id, assignmentTargets).supplierId === selectedSupplier?.id)
  }), [assignmentTargets, selectedSupplier?.id, settings, shopDepartments])
  const assignedSupplier = settings.suppliers.find((supplier) => supplier.id === selectedSetting.supplierId) ?? null
  const existingDepartmentProducts = useMemo(() => productsForDepartment(catalogProducts, selectedDepartment).filter((product) => !isManagerItemHidden(addOns, product.id)), [addOns, catalogProducts, selectedDepartment])
  const departmentProducts = useMemo(() => addOns.products.filter((product) => product.category === selectedDepartment), [addOns.products, selectedDepartment])
  const departmentFileUploads = useMemo(() => addOns.services.filter((service) => service.category === selectedDepartment), [addOns.services, selectedDepartment])
  const builtInDepartmentServices = useMemo(
    () => SERVICE_ASSIGNMENT_TARGETS.filter((target) => target.departmentLabel === selectedDepartment && !isManagerItemHidden(addOns, target.id)),
    [addOns, selectedDepartment],
  )
  const hiddenDepartmentItems = useMemo(() => {
    const catalogItems = productsForDepartment(catalogProducts, selectedDepartment).filter((product) => isManagerItemHidden(addOns, product.id)).map((product) => ({ id: product.id, label: product.name, type: "Product" }))
    const serviceItems = SERVICE_ASSIGNMENT_TARGETS.filter((target) => target.departmentLabel === selectedDepartment && isManagerItemHidden(addOns, target.id)).map((target) => ({ id: target.id, label: target.serviceLabel, type: "Sub-item" }))
    return [...catalogItems, ...serviceItems]
  }, [addOns, catalogProducts, selectedDepartment])
  const parsedBulkItems = useMemo(() => parseDepartmentItemList(bulkItemText), [bulkItemText])
  const selectedDepartmentShopHref = departmentShopHref(selectedDepartment)
  const departmentSummaries = useMemo(() => {
    return categoryOptions.map((label) => {
      const existingProducts = productsForDepartment(catalogProducts, label).filter((product) => !isManagerItemHidden(addOns, product.id)).length
      const managerProducts = addOns.products.filter((product) => product.category === label).length
      const managerFileUploads = addOns.services.filter((service) => service.category === label).length
      const builtInServices = SERVICE_ASSIGNMENT_TARGETS.filter((target) => target.departmentLabel === label && !isManagerItemHidden(addOns, target.id)).length
      return {
        label,
        displayLabel: departmentDisplayLabel(addOns, label),
        hidden: isDepartmentHidden(addOns, label),
        products: existingProducts + managerProducts,
        fileUploads: builtInServices + managerFileUploads,
        total: existingProducts + managerProducts + builtInServices + managerFileUploads,
      }
    })
  }, [addOns, catalogProducts, categoryOptions])
  const targetsByDepartment = useMemo(() => {
    return assignmentTargets.reduce<Record<string, ServiceAssignmentTarget[]>>((groups, target) => {
      groups[target.departmentLabel] = [...(groups[target.departmentLabel] ?? []), target]
      return groups
    }, {})
  }, [assignmentTargets])

  function queueManagerSave(qualificationSettings: ShopQualificationSettings, nextAddOns: ManagerCatalogAddOns) {
    pendingSaveRef.current = { qualificationSettings, addOns: nextAddOns }
    setDirectorySaveState("saving")
    setDirectorySaveError("")
    if (saveRunningRef.current) return

    saveRunningRef.current = true
    void (async () => {
      let lastError = ""
      while (pendingSaveRef.current) {
        const pending = pendingSaveRef.current
        pendingSaveRef.current = null
        const result = await saveWorkflowManagerSettingsAction(pending)
        lastError = result.ok ? "" : result.error
      }
      saveRunningRef.current = false
      setDirectorySaveError(lastError)
      setDirectorySaveState(lastError ? "error" : "saved")
    })()
  }

  function persist(next: ShopQualificationSettings) {
    setSettings(next)
    writeShopQualificationSettings(next)
    queueManagerSave(next, addOns)
  }

  function persistAddOns(next: ManagerCatalogAddOns) {
    setAddOns(next)
    writeManagerAddOns(next)
    queueManagerSave(settings, next)
  }

  function persistAll(nextSettings: ShopQualificationSettings, nextAddOns: ManagerCatalogAddOns) {
    setSettings(nextSettings)
    setAddOns(nextAddOns)
    writeShopQualificationSettings(nextSettings)
    writeManagerAddOns(nextAddOns)
    queueManagerSave(nextSettings, nextAddOns)
  }

  function updateSelectedSetting(patch: Partial<ProductQualificationSetting>) {
    persist({
      ...settings,
      products: {
        ...settings.products,
        [selectedTarget.id]: {
          ...selectedSetting,
          ...patch,
          productId: selectedTarget.id,
        },
      },
    })
  }

  function selectDepartment(label: string) {
    const firstTarget = assignmentTargets.find((target) => target.departmentLabel === label)
    setSelectedDepartmentLabel(label)
    setServiceDraft((draft) => ({ ...draft, category: label }))
    if (firstTarget) {
      setSelectedTargetId(firstTarget.id)
    }
  }

  function updateSupplier(supplierId: string, patch: Partial<SupplierRoutingOption>) {
    persist({
      ...settings,
      suppliers: settings.suppliers.map((supplier) => (supplier.id === supplierId ? { ...supplier, ...patch } : supplier)),
    })
  }

  function addSupplier() {
    const name = supplierDraft.name.trim()
    if (!name) return

    const supplier: SupplierRoutingOption = {
      id: makeId(name),
      name,
      contactLabel: supplierDraft.contactName.trim() || supplierDraft.email.trim() || supplierDraft.phone.trim() || supplierDraft.whatsapp.trim() || "Supplier contact",
      contactName: supplierDraft.contactName.trim(),
      email: supplierDraft.email.trim(),
      phone: supplierDraft.phone.trim(),
      whatsapp: supplierDraft.whatsapp.trim(),
      portalUrl: supplierDraft.portalUrl.trim(),
      preferredDeliveryMethod: supplierDraft.preferredDeliveryMethod,
      deliveryNotes: supplierDraft.deliveryNotes.trim(),
    }

    persist({ ...settings, suppliers: [...settings.suppliers.filter((entry) => entry.id !== supplier.id), supplier] })
    setSelectedSupplierId(supplier.id)
    setActivePanel("suppliers")
    setSupplierDraft({ name: "", contactName: "", email: "", phone: "", whatsapp: "", portalUrl: "", preferredDeliveryMethod: "manual", deliveryNotes: "" })
  }

  function removeSupplier(supplierId: string) {
    const nextSuppliers = settings.suppliers.filter((supplier) => supplier.id !== supplierId)
    if (nextSuppliers.length === 0) return
    const supplier = settings.suppliers.find((entry) => entry.id === supplierId)
    if (!window.confirm(`Remove ${supplier?.name || "this supplier"}? Its assignments will move to ${nextSuppliers[0].name}.`)) return

    persist({
      ...settings,
      suppliers: nextSuppliers,
      products: Object.fromEntries(
        Object.entries(settings.products).map(([targetId, setting]) => [
          targetId,
          setting.supplierId === supplierId ? { ...setting, supplierId: nextSuppliers[0].id } : setting,
        ]),
      ),
    })
    setSelectedSupplierId(nextSuppliers[0].id)
  }

  function toggleSupplierDepartment(departmentSlug: string, checked: boolean) {
    if (!selectedSupplier) return
    const fallbackSupplier = settings.suppliers.find((supplier) => supplier.id !== selectedSupplier.id)
    if (!checked && !fallbackSupplier) return
    const supplierId = checked ? selectedSupplier.id : fallbackSupplier!.id
    const routeId = departmentRouteId(departmentSlug)
    const nextProducts = {
      ...settings.products,
      [routeId]: {
        productId: routeId,
        enabled: true,
        supplierId,
        questions: settings.products[routeId]?.questions ?? [],
      },
    }

    for (const target of assignmentTargets.filter((entry) => entry.departmentSlug === departmentSlug)) {
      const current = selectedSettingFor(settings, target.id, assignmentTargets)
      nextProducts[target.id] = { ...current, productId: target.id, supplierId }
    }
    persist({ ...settings, products: nextProducts })
  }

  function addCategory() {
    const label = categoryDraft.label.trim()
    if (!label) return

    const category = buildManagerCategoryAddOn(categoryDraft)
    persistAddOns({
      ...addOns,
      categories: [...addOns.categories.filter((entry) => entry.id !== category.id), category],
    })
    setCategoryDraft({ label: "", description: "", imageUrl: "", symbols: [] })
    setSelectedDepartmentLabel(category.label)
    setServiceDraft((draft) => ({ ...draft, category: category.label }))
  }

  function openDepartmentEditor() {
    const builtInCategory = SHOP_TOOL_CATEGORIES.find((category) => category.label === selectedDepartment)
    setDepartmentEditDraft({
      label: selectedDepartmentDisplay,
      description: selectedDepartmentOverride?.description || selectedCategoryAddOn?.description || "",
      imageUrl: selectedDepartmentOverride?.imageUrl || selectedCategoryAddOn?.imageUrl || "",
      symbols: selectedDepartmentOverride?.symbols || selectedCategoryAddOn?.symbols || builtInCategory?.symbols || [],
      hidden: isDepartmentHidden(addOns, selectedDepartment),
    })
    setDepartmentEditOpen(true)
  }

  function saveDepartmentEdit() {
    const nextLabel = departmentEditDraft.label.trim()
    if (!nextLabel) return

    if (selectedCategoryAddOn) {
      const nextCategory = buildManagerCategoryAddOn({
        label: nextLabel,
        description: departmentEditDraft.description,
        imageUrl: departmentEditDraft.imageUrl,
        symbols: departmentEditDraft.symbols,
      })
      persistAddOns({
        ...addOns,
        categories: addOns.categories.map((category) => (category.id === selectedCategoryAddOn.id ? { ...nextCategory, createdAt: category.createdAt } : category)),
        products: addOns.products.map((product) => (product.category === selectedDepartment ? { ...product, category: nextCategory.label } : product)),
        services: addOns.services.map((service) => (service.category === selectedDepartment ? { ...service, category: nextCategory.label } : service)),
      })
      setSelectedDepartmentLabel(nextCategory.label)
      setServiceDraft((draft) => ({ ...draft, category: nextCategory.label }))
    } else {
      const override = buildManagerDepartmentOverride({
        sourceLabel: selectedDepartment,
        label: nextLabel,
        description: departmentEditDraft.description,
        imageUrl: departmentEditDraft.imageUrl,
        symbols: departmentEditDraft.symbols,
        hidden: departmentEditDraft.hidden,
        showQuickOrder: selectedDepartmentOverride?.showQuickOrder,
        showPlanUpload: selectedDepartmentOverride?.showPlanUpload,
        showChatToOrder: selectedDepartmentOverride?.showChatToOrder,
        showTakeoff: selectedDepartmentOverride?.showTakeoff,
      })
      persistAddOns({
        ...addOns,
        departmentOverrides: [...addOns.departmentOverrides.filter((entry) => entry.sourceLabel !== selectedDepartment), override],
      })
    }

    setDepartmentEditOpen(false)
  }

  function hideSelectedDepartment() {
    const confirmed = window.confirm(`Remove ${selectedDepartmentDisplay} from the customer department list?`)
    if (!confirmed) return

    if (selectedCategoryAddOn) {
      persistAddOns({
        ...addOns,
        categories: addOns.categories.filter((category) => category.id !== selectedCategoryAddOn.id),
        products: addOns.products.filter((product) => product.category !== selectedDepartment),
        services: addOns.services.filter((service) => service.category !== selectedDepartment),
      })
    } else {
      const override = buildManagerDepartmentOverride({
        sourceLabel: selectedDepartment,
        label: selectedDepartmentDisplay,
        description: selectedDepartmentOverride?.description || "",
        imageUrl: selectedDepartmentOverride?.imageUrl || "",
        symbols: selectedDepartmentOverride?.symbols || SHOP_TOOL_CATEGORIES.find((category) => category.label === selectedDepartment)?.symbols || [],
        hidden: true,
        showQuickOrder: selectedDepartmentOverride?.showQuickOrder,
        showPlanUpload: selectedDepartmentOverride?.showPlanUpload,
        showChatToOrder: selectedDepartmentOverride?.showChatToOrder,
        showTakeoff: selectedDepartmentOverride?.showTakeoff,
      })
      persistAddOns({
        ...addOns,
        departmentOverrides: [...addOns.departmentOverrides.filter((entry) => entry.sourceLabel !== selectedDepartment), override],
      })
    }

    const nextDepartment = categoryOptions.find((category) => category !== selectedDepartment && !isDepartmentHidden(addOns, category)) ?? "Framing"
    setSelectedDepartmentLabel(nextDepartment)
    setDepartmentEditOpen(false)
  }

  function toggleDraftSymbol(target: "category" | "department", symbol: DepartmentSymbolKey) {
    if (target === "category") {
      setCategoryDraft((draft) => ({
        ...draft,
        symbols: draft.symbols.includes(symbol) ? draft.symbols.filter((item) => item !== symbol) : [...draft.symbols, symbol],
      }))
      return
    }

    setDepartmentEditDraft((draft) => ({
      ...draft,
      symbols: draft.symbols.includes(symbol) ? draft.symbols.filter((item) => item !== symbol) : [...draft.symbols, symbol],
    }))
  }

  function addDepartmentItem() {
    const supplier = settings.suppliers.find((entry) => entry.id === departmentItemDraft.supplierId) ?? settings.suppliers[0]
    const name = departmentItemDraft.name.trim()
    if (!name) return

    if (departmentItemDraft.kind === "product") {
      const product = buildManagerProductAddOn({
        kind: "product",
        name,
        category: selectedDepartment,
        description: departmentItemDraft.description,
        unit: departmentItemDraft.unit,
        price: Number(departmentItemDraft.price || 0),
        supplierId: supplier?.id,
        supplierName: supplier?.name,
      })

      persistAddOns({
        ...addOns,
        products: [...addOns.products.filter((entry) => entry.id !== product.id), product],
      })
    } else {
      const service = buildManagerProductAddOn({
        kind: "service",
        name,
        category: selectedDepartment,
        description: departmentItemDraft.description || `${name} file upload request.`,
        unit: "Upload",
        price: 0,
        supplierId: supplier?.id,
        supplierName: supplier?.name,
      })

      const nextAddOns = {
        ...addOns,
        services: [...addOns.services.filter((entry) => entry.id !== service.id), service],
      }
      const nextSettings = {
        ...settings,
        products: {
          ...settings.products,
          [service.id]: {
            productId: service.id,
            enabled: true,
            supplierId: service.supplierId,
            questions: draftQuestions.length > 0 ? draftQuestions : DEFAULT_PLAN_UPLOAD_QUESTIONS,
          },
        },
      }
      persistAll(nextSettings, nextAddOns)
      setSelectedTargetId(service.id)
      setDraftQuestions(DEFAULT_PLAN_UPLOAD_QUESTIONS)
    }

    setDepartmentItemDraft((draft) => ({ ...draft, name: "", description: "", unit: "Each", price: "", supplierId: supplier?.id ?? "" }))
  }

  function removeProduct(productId: string) {
    persistAddOns({
      ...addOns,
      products: addOns.products.filter((product) => product.id !== productId),
    })
  }

  function hideBuiltInItem(itemId: string, itemLabel: string) {
    if (!window.confirm(`Remove ${itemLabel} from the customer shop? You can restore it later.`)) return
    persistAddOns({ ...addOns, hiddenItemIds: [...new Set([...addOns.hiddenItemIds, itemId])] })
  }

  function restoreBuiltInItem(itemId: string) {
    persistAddOns({ ...addOns, hiddenItemIds: addOns.hiddenItemIds.filter((id) => id !== itemId) })
  }

  function addBulkDepartmentItems() {
    if (parsedBulkItems.length === 0) return
    const supplier = settings.suppliers.find((entry) => entry.id === departmentItemDraft.supplierId) ?? settings.suppliers[0]
    const additions = parsedBulkItems.map((name) => buildManagerProductAddOn({
      kind: "product",
      name,
      category: selectedDepartment,
      description: `${name} commonly requested in ${selectedDepartmentDisplay}.`,
      unit: departmentItemDraft.unit || "Each",
      price: 0,
      supplierId: supplier?.id,
      supplierName: supplier?.name,
    }))
    const merged = new Map(addOns.products.map((product) => [product.id, product]))
    additions.forEach((product) => merged.set(product.id, product))
    persistAddOns({ ...addOns, products: [...merged.values()] })
    setBulkItemText("")
    setBulkItemStatus(`${additions.length} item${additions.length === 1 ? "" : "s"} added to ${selectedDepartmentDisplay}.`)
  }

  async function importBulkItemFile(file: File | null) {
    if (!file) return
    if (file.size > 1024 * 1024) {
      setBulkItemStatus("Choose a text file smaller than 1 MB.")
      return
    }
    const text = await file.text()
    setBulkItemText(text)
    setBulkItemStatus(`${parseDepartmentItemList(text).length} items loaded. Review the list before adding.`)
  }

  function addService() {
    const supplier = settings.suppliers.find((entry) => entry.id === serviceDraft.supplierId) ?? settings.suppliers[0]
    const category = activePanel === "departments" ? selectedDepartment : serviceDraft.category
    const service = buildManagerProductAddOn({
      kind: "service",
      name: serviceDraft.name,
      category,
      description: serviceDraft.description,
      unit: "Request",
      price: 0,
      supplierId: supplier?.id,
      supplierName: supplier?.name,
    })

    if (!service.name) return

    const nextAddOns = {
      ...addOns,
      services: [...addOns.services.filter((entry) => entry.id !== service.id), service],
    }
    const nextSettings = {
      ...settings,
      products: {
        ...settings.products,
        [service.id]: {
          productId: service.id,
          enabled: true,
          supplierId: service.supplierId,
          questions: DEFAULT_SERVICE_QUESTIONS,
        },
      },
    }
    persistAll(nextSettings, nextAddOns)
    setSelectedTargetId(service.id)
    setActivePanel("departments")
    setServiceDraft({ name: "", category: service.category, description: "", supplierId: supplier?.id ?? "" })
  }

  function removeService(serviceId: string) {
    const remainingProducts = { ...settings.products }
    delete remainingProducts[serviceId]
    const nextAddOns = {
      ...addOns,
      services: addOns.services.filter((service) => service.id !== serviceId),
    }
    persistAll({ ...settings, products: remainingProducts }, nextAddOns)
    if (selectedTargetId === serviceId) {
      setSelectedTargetId(SERVICE_ASSIGNMENT_TARGETS[0]?.id ?? "")
    }
  }

  function addQuestion() {
    const label = questionLabel.trim()
    if (!label) return

    const question: QualifyingQuestion = {
      id: nextQuestionId(label, selectedSetting.questions),
      label,
      type: questionType,
      required: questionRequired,
      options: questionType === "select" ? questionOptions.split(",").map((option) => option.trim()).filter(Boolean) : undefined,
    }

    updateSelectedSetting({ enabled: true, questions: [...selectedSetting.questions, question] })
    setQuestionLabel("")
    setQuestionType("text")
    setQuestionRequired(false)
    setQuestionOptions("")
  }

  function removeQuestion(questionId: string) {
    updateSelectedSetting({ questions: selectedSetting.questions.filter((question) => question.id !== questionId) })
  }

  function addDraftQuestion() {
    const label = draftQuestionLabel.trim()
    if (!label) return

    const question: QualifyingQuestion = {
      id: nextQuestionId(label, draftQuestions),
      label,
      type: draftQuestionType,
      required: draftQuestionRequired,
      options: draftQuestionType === "select" ? draftQuestionOptions.split(",").map((option) => option.trim()).filter(Boolean) : undefined,
    }

    setDraftQuestions((questions) => [...questions, question])
    setDraftQuestionLabel("")
    setDraftQuestionType("text")
    setDraftQuestionRequired(false)
    setDraftQuestionOptions("")
  }

  function removeDraftQuestion(questionId: string) {
    setDraftQuestions((questions) => questions.filter((question) => question.id !== questionId))
  }

  function navButton(panel: ManagerPanel, label: string, helper: string) {
    const active = activePanel === panel
    return (
      <button
        type="button"
        onClick={() => setActivePanel(panel)}
        className={`rounded-[18px] border px-4 py-3 text-left transition ${active ? "border-slate-950 bg-slate-950 text-white shadow-[0_18px_34px_rgba(15,23,42,0.22)]" : "border-slate-200 bg-white text-slate-900 hover:border-sky-200"}`}
      >
        <span className="block text-sm font-semibold">{label}</span>
        <span className={`mt-1 block text-xs leading-5 ${active ? "text-slate-300" : "text-slate-500"}`}>{helper}</span>
      </button>
    )
  }

  return (
    <main className="min-h-screen bg-[#eef3f7] text-slate-950">
      <div className={`mx-auto grid max-w-7xl gap-5 px-4 py-5 pb-28 sm:px-6 sm:py-8 ${supplierDirectoryOnly ? "" : "lg:grid-cols-[18rem_minmax(0,1fr)]"}`}>
        {!supplierDirectoryOnly ? <aside className="lg:sticky lg:top-5 lg:self-start">
          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.08)]">
            <div className="rounded-[22px] bg-slate-950 p-4 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200">Manager preview</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Manager controls</h1>
              <p className="mt-2 text-xs leading-5 text-slate-300">Departments, sub-departments, items, questions, and supplier routing.</p>
            </div>
            <nav className="mt-4 grid gap-2" aria-label="Manager navigation">
              {navButton("departments", "Departments", "Sub-departments, products, and upload items")}
              {navButton("suppliers", "Supplier directory", "Contacts and delivery methods")}
            </nav>
            <div className="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold leading-5 text-emerald-900">
              Preview-only manager access. The customer never sees supplier routing.
            </div>
          </section>
        </aside> : null}

        <section className="grid gap-5">
          {supplierDirectoryOnly ? (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5">
                <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0066cc]">Manager</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Suppliers</h1><p className="mt-2 text-sm text-slate-600">Manage supplier contacts and routed customer requests.</p></div>
                <span className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">{settings.suppliers.length} total suppliers</span>
              </header>
              <nav className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-white p-1" aria-label="Supplier directory and requests views">
                <Link href="/admin/vendors" className="flex min-h-11 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">Directory</Link>
                <Link href="/admin/supplier-approvals" className="flex min-h-11 items-center justify-center rounded-md px-2 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50">Routed requests</Link>
                <Link href="/admin/supplier-requests" className="flex min-h-11 items-center justify-center rounded-md px-2 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50">Sent requests</Link>
              </nav>
            </>
          ) : (
            <header className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Owner controls</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Departments and shop structure</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Manage customer departments, sub-departments, material products, questions, and private supplier routing from one owner-only screen.</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-2xl font-semibold">{assignmentTargets.length}</div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sub-depts</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-2xl font-semibold">{settings.suppliers.length}</div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Suppliers</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-2xl font-semibold">{catalogProducts.filter((product) => product.productType !== "service").length + addOns.products.length + addOns.services.length}</div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Department items</div>
                  </div>
                </div>
              </div>
            </header>
          )}

          {activePanel === "services" ? (
            <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_42px_rgba(15,23,42,0.07)]">
                <h3 className="text-lg font-semibold text-slate-950">Departments and sub-departments</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">Choose a sub-department workflow, then assign supplier routing and questions.</p>
                <div className="mt-4 grid max-h-[44rem] gap-4 overflow-y-auto pr-1">
                  {Object.entries(targetsByDepartment).map(([department, targets]) => (
                    <div key={department}>
                      <div className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{department}</div>
                      <div className="grid gap-2">
                        {targets.map((target) => {
                          const active = selectedTarget.id === target.id
                          const setting = selectedSettingFor(settings, target.id, assignmentTargets)
                          const supplier = settings.suppliers.find((item) => item.id === setting.supplierId)
                          return (
                            <button
                              key={target.id}
                              type="button"
                              onClick={() => setSelectedTargetId(target.id)}
                              className={`rounded-[18px] border px-4 py-3 text-left transition ${active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-950 hover:border-sky-200 hover:bg-white"}`}
                            >
                              <span className="block text-sm font-semibold">{target.serviceLabel}</span>
                              <span className={`mt-1 block text-xs leading-5 ${active ? "text-slate-300" : "text-slate-500"}`}>
                                {supplier?.name || "No supplier"} · {setting.questions.length} question(s)
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-5">
                <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">{selectedTarget.departmentLabel}</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{selectedTarget.serviceLabel}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{selectedTarget.description}</p>
                    </div>
                    <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                      <input type="checkbox" checked={selectedSetting.enabled} onChange={(event) => updateSelectedSetting({ enabled: event.target.checked })} />
                      Enable questions
                    </label>
                  </div>

                  <div className="mt-6 grid gap-4">
                    <label className="grid gap-2 text-sm font-semibold text-slate-900">
                      Assigned supplier
                      <select value={selectedSetting.supplierId} onChange={(event) => updateSelectedSetting({ supplierId: event.target.value })} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900">
                        {settings.suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                        ))}
                      </select>
                    </label>

                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Report delivery after approval</div>
                      <div className="mt-2 text-sm font-semibold text-slate-950">{assignedSupplier?.name || "No supplier selected"}</div>
                      <div className="mt-1 text-sm leading-6 text-slate-600">
                        {assignedSupplier ? `${methodLabel(assignedSupplier.preferredDeliveryMethod)} · ${supplierReachLine(assignedSupplier)}` : "Assign a supplier to create the routing rule."}
                      </div>
                      {assignedSupplier?.deliveryNotes ? <div className="mt-2 text-xs leading-5 text-slate-500">{assignedSupplier.deliveryNotes}</div> : null}
                    </div>
                  </div>
                </section>

                <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
                  <h3 className="text-lg font-semibold text-slate-950">Question set</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">These questions appear after the customer adds this sub-department or upload to a project.</p>
                  <div className="mt-4 grid gap-3">
                    {selectedSetting.questions.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">No questions added for this sub-department.</div>
                    ) : (
                      selectedSetting.questions.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-950">{item.label}</div>
                              <div className="mt-1 text-xs text-slate-500">{item.type}{item.required ? " · required" : ""}{item.options?.length ? ` · ${item.options.join(", ")}` : ""}</div>
                            </div>
                            <button type="button" onClick={() => removeQuestion(item.id)} className="text-sm font-semibold text-rose-700">Remove</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Add question</h4>
                    <div className="mt-3 grid gap-3">
                      <input value={questionLabel} onChange={(event) => setQuestionLabel(event.target.value)} placeholder="Question label" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <select value={questionType} onChange={(event) => setQuestionType(event.target.value as QualifyingQuestionType)} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium">
                          {questionTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                        <label className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-800">
                          <input type="checkbox" checked={questionRequired} onChange={(event) => setQuestionRequired(event.target.checked)} />
                          Required
                        </label>
                      </div>
                      {questionType === "select" ? (
                        <input value={questionOptions} onChange={(event) => setQuestionOptions(event.target.value)} placeholder="Options separated by commas" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      ) : null}
                      <button type="button" onClick={addQuestion} className="min-h-12 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white">Add question to sub-department</button>
                    </div>
                  </div>
                </section>

                <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">New sub-department workflow</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Add sub-department</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">Create a customer upload/request workflow, then assign its supplier and questions here.</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <input value={serviceDraft.name} onChange={(event) => setServiceDraft((draft) => ({ ...draft, name: event.target.value }))} placeholder="Sub-department name" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                    <select value={serviceDraft.category} onChange={(event) => setServiceDraft((draft) => ({ ...draft, category: event.target.value }))} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium">
                      {categoryOptions.map((category) => <option key={category} value={category}>{departmentDisplayLabel(addOns, category)}</option>)}
                    </select>
                    <select value={serviceDraft.supplierId} onChange={(event) => setServiceDraft((draft) => ({ ...draft, supplierId: event.target.value }))} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium sm:col-span-2">
                      {settings.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                    </select>
                    <textarea value={serviceDraft.description} onChange={(event) => setServiceDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="What should customers upload or request for this sub-department?" rows={4} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 sm:col-span-2" />
                    <button type="button" onClick={addService} className="min-h-12 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white sm:col-span-2">Add sub-department workflow</button>
                  </div>
                </section>
              </div>
            </section>
          ) : null}

          {activePanel === "suppliers" ? (
            <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_42px_rgba(15,23,42,0.07)]">
                <div className="grid gap-2">
                  {settings.suppliers.map((supplier) => (
                    <button
                      key={supplier.id}
                      type="button"
                      onClick={() => setSelectedSupplierId(supplier.id)}
                      className={`rounded-[18px] border px-4 py-3 text-left transition ${supplier.id === selectedSupplier?.id ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-950 hover:border-sky-200 hover:bg-white"}`}
                    >
                      <span className="block text-sm font-semibold">{supplier.name}</span>
                      <span className={`mt-1 block text-xs ${supplier.id === selectedSupplier?.id ? "text-slate-300" : "text-slate-500"}`}>{methodLabel(supplier.preferredDeliveryMethod)} · {supplierReachLine(supplier)}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
                {selectedSupplier ? (
                  <>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Supplier profile</p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{selectedSupplier.name}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-500">This is private manager data used for routing approved reports.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <QuoCallButton phone={selectedSupplier.phone || selectedSupplier.whatsapp || null} supplierName={selectedSupplier.name} />
                        <SupplierQuoteRequestDialog
                          supplierId={selectedSupplier.id}
                          supplierName={selectedSupplier.name}
                          supplierEmail={selectedSupplier.email || null}
                          directoryReady={directorySaveState !== "saving" && directorySaveState !== "error"}
                          directoryStatus={directorySaveState === "saving" ? "Saving the latest supplier changes..." : directorySaveError || undefined}
                        />
                        <button type="button" onClick={() => removeSupplier(selectedSupplier.id)} className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">Remove</button>
                      </div>
                    </div>
                    {directorySaveState !== "idle" ? (
                      <p className={`mt-3 text-xs font-semibold ${directorySaveState === "error" ? "text-rose-700" : directorySaveState === "saved" ? "text-emerald-700" : "text-slate-500"}`}>
                        {directorySaveState === "saving" ? "Saving supplier changes..." : directorySaveState === "saved" ? "Supplier changes saved." : directorySaveError}
                      </p>
                    ) : null}

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-2 text-sm font-semibold text-slate-900">
                        Supplier name
                        <input value={selectedSupplier.name} onChange={(event) => updateSupplier(selectedSupplier.id, { name: event.target.value })} className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-slate-900">
                        Contact name
                        <input value={selectedSupplier.contactName || ""} onChange={(event) => updateSupplier(selectedSupplier.id, { contactName: event.target.value, contactLabel: event.target.value || selectedSupplier.contactLabel })} className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-slate-900">
                        Email
                        <input value={selectedSupplier.email || ""} onChange={(event) => updateSupplier(selectedSupplier.id, { email: event.target.value })} className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-slate-900">
                        Phone
                        <input value={selectedSupplier.phone || ""} onChange={(event) => updateSupplier(selectedSupplier.id, { phone: event.target.value })} className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-slate-900">
                        WhatsApp
                        <input value={selectedSupplier.whatsapp || ""} onChange={(event) => updateSupplier(selectedSupplier.id, { whatsapp: event.target.value })} className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-slate-900">
                        Supplier portal URL
                        <input value={selectedSupplier.portalUrl || ""} onChange={(event) => updateSupplier(selectedSupplier.id, { portalUrl: event.target.value })} className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-slate-900">
                        Preferred delivery method
                        <select value={selectedSupplier.preferredDeliveryMethod || "manual"} onChange={(event) => updateSupplier(selectedSupplier.id, { preferredDeliveryMethod: event.target.value as SupplierDeliveryMethod })} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium">
                          {deliveryMethods.map((method) => <option key={method} value={method}>{methodLabel(method)}</option>)}
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm font-semibold text-slate-900 sm:col-span-2">
                        Delivery instructions
                        <textarea value={selectedSupplier.deliveryNotes || ""} onChange={(event) => updateSupplier(selectedSupplier.id, { deliveryNotes: event.target.value })} rows={4} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      </label>
                    </div>

                    <section className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <h4 className="text-base font-semibold text-slate-950">Department routing</h4>
                          <p className="mt-1 text-sm leading-6 text-slate-500">These are the same active departments customers see in Let&apos;s Work.</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">{selectedSupplierDepartments.length} assigned</span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {shopDepartments.map((department) => {
                          const explicit = settings.products[departmentRouteId(department.slug)]
                          const targets = assignmentTargets.filter((target) => target.departmentSlug === department.slug)
                          const checked = explicit ? explicit.supplierId === selectedSupplier.id : targets.length > 0 && targets.every((target) => selectedSettingFor(settings, target.id, assignmentTargets).supplierId === selectedSupplier.id)
                          return (
                            <label key={department.slug} className={`flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${checked ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white"}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => toggleSupplierDepartment(department.slug, event.target.checked)}
                              />
                              <span>
                                <span className="block font-semibold text-slate-950">{department.label}</span>
                                <span className="mt-1 block text-xs text-slate-500">Let&apos;s Work department</span>
                              </span>
                            </label>
                          )
                        })}
                      </div>
                    </section>
                  </>
                ) : null}

                <div className="mt-7 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Add supplier</h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input value={supplierDraft.name} onChange={(event) => setSupplierDraft((draft) => ({ ...draft, name: event.target.value }))} placeholder="Supplier name" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                    <input value={supplierDraft.contactName} onChange={(event) => setSupplierDraft((draft) => ({ ...draft, contactName: event.target.value }))} placeholder="Contact name" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                    <input value={supplierDraft.email} onChange={(event) => setSupplierDraft((draft) => ({ ...draft, email: event.target.value }))} placeholder="Email later, optional" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                    <input value={supplierDraft.phone} onChange={(event) => setSupplierDraft((draft) => ({ ...draft, phone: event.target.value }))} placeholder="Phone" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                    <input value={supplierDraft.whatsapp} onChange={(event) => setSupplierDraft((draft) => ({ ...draft, whatsapp: event.target.value }))} placeholder="WhatsApp" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                    <select value={supplierDraft.preferredDeliveryMethod} onChange={(event) => setSupplierDraft((draft) => ({ ...draft, preferredDeliveryMethod: event.target.value as SupplierDeliveryMethod }))} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium">
                      {deliveryMethods.map((method) => <option key={method} value={method}>{methodLabel(method)}</option>)}
                    </select>
                    <button type="button" onClick={addSupplier} className="min-h-12 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white">Add supplier</button>
                  </div>
                </div>
              </section>
            </section>
          ) : null}

          {activePanel === "departments" ? (
            <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_42px_rgba(15,23,42,0.07)]">
                <h3 className="text-lg font-semibold text-slate-950">Departments</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">Departments are the customer-facing shop sections. Open one department, then add material products or file-upload items inside it.</p>
                <div className="mt-4 grid max-h-[24rem] gap-2 overflow-y-auto pr-1">
                  {departmentSummaries.map((department) => {
                    const active = department.label === selectedDepartment
                    return (
                      <button
                        key={department.label}
                        type="button"
                        onClick={() => selectDepartment(department.label)}
                        className={`rounded-[18px] border px-4 py-3 text-left transition ${active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-950 hover:border-sky-200 hover:bg-white"}`}
                      >
                        <span className="block text-sm font-semibold">{department.displayLabel}</span>
                        <span className={`mt-1 block text-xs leading-5 ${active ? "text-slate-300" : "text-slate-500"}`}>
                          {department.hidden ? "Hidden from customers · " : ""}{department.products} product(s) · {department.fileUploads} upload item(s)
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Add department</h4>
                  <div className="mt-3 grid gap-3">
                    <input value={categoryDraft.label} onChange={(event) => setCategoryDraft((draft) => ({ ...draft, label: event.target.value }))} placeholder="Department name, e.g. Electrical" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                    <textarea value={categoryDraft.description} onChange={(event) => setCategoryDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Short description for this department" rows={4} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                    <input value={categoryDraft.imageUrl} onChange={(event) => setCategoryDraft((draft) => ({ ...draft, imageUrl: event.target.value }))} placeholder="Optional image URL" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                    <fieldset className="rounded-2xl border border-slate-200 bg-white p-3">
                      <legend className="px-1 text-xs font-semibold text-slate-700">Department symbols</legend>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {DEPARTMENT_SYMBOL_OPTIONS.map(({ key, label, Icon }) => (
                          <label key={key} className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700">
                            <input type="checkbox" checked={categoryDraft.symbols.includes(key)} onChange={() => toggleDraftSymbol("category", key)} />
                            <Icon aria-hidden="true" className="h-4 w-4" />
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <button type="button" onClick={addCategory} className="min-h-12 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white">Add department</button>
                  </div>
                </div>
              </section>

              <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Selected department</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{selectedDepartmentDisplay}</h3>
                    <div className="mt-3"><DepartmentSymbolBadges symbols={selectedDepartmentOverride?.symbols || selectedCategoryAddOn?.symbols || SHOP_TOOL_CATEGORIES.find((category) => category.label === selectedDepartment)?.symbols} /></div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Add sub-departments and the exact items customers can choose inside this department.</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Link href={selectedDepartmentShopHref} prefetch={false} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">
                      View in shop
                    </Link>
                    <button type="button" onClick={openDepartmentEditor} className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">Edit department</button>
                  </div>
                </div>

                {departmentEditOpen ? (
                  <div className="mt-5 rounded-[24px] border border-sky-100 bg-sky-50/60 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-slate-950">Edit department</h4>
                        <p className="mt-1 text-sm leading-6 text-slate-600">Control the customer-facing name, description, image, symbols, and visibility.</p>
                      </div>
                      <button type="button" onClick={() => setDepartmentEditOpen(false)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Close</button>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <input value={departmentEditDraft.label} onChange={(event) => setDepartmentEditDraft((draft) => ({ ...draft, label: event.target.value }))} placeholder="Department name" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      <input value={departmentEditDraft.imageUrl} onChange={(event) => setDepartmentEditDraft((draft) => ({ ...draft, imageUrl: event.target.value }))} placeholder="Optional image URL" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      <textarea value={departmentEditDraft.description} onChange={(event) => setDepartmentEditDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Department description" rows={4} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 sm:col-span-2" />
                      <fieldset className="rounded-2xl border border-slate-200 bg-white p-3 sm:col-span-2">
                        <legend className="px-1 text-sm font-semibold text-slate-800">Customer menu symbols</legend>
                        <div className="mt-2 grid gap-2 sm:grid-cols-3">
                          {DEPARTMENT_SYMBOL_OPTIONS.map(({ key, label, Icon }) => (
                            <label key={key} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700">
                              <input type="checkbox" checked={departmentEditDraft.symbols.includes(key)} onChange={() => toggleDraftSymbol("department", key)} />
                              <Icon aria-hidden="true" className="h-4 w-4" />
                              {label}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      {!selectedCategoryAddOn ? (
                        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 sm:col-span-2">
                          <input type="checkbox" checked={!departmentEditDraft.hidden} onChange={(event) => setDepartmentEditDraft((draft) => ({ ...draft, hidden: !event.target.checked }))} />
                          Show this department to customers
                        </label>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <button type="button" onClick={saveDepartmentEdit} className="min-h-12 flex-1 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white">Save department changes</button>
                      <button type="button" onClick={hideSelectedDepartment} className="min-h-12 rounded-2xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700">Remove department</button>
                    </div>
                  </div>
                ) : null}

                <section className="mt-6 rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-950">Sub-departments</h4>
                      <p className="mt-1 text-sm leading-6 text-slate-500">Use sub-departments for upload/request workflows, questions, and supplier routing inside {selectedDepartmentDisplay}.</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center">
                      <div className="text-xl font-semibold text-slate-950">{selectedDepartmentTargets.length}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Sub-depts</div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[0.84fr_1.16fr]">
                    <div className="grid gap-2">
                      {selectedDepartmentTargets.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">No sub-departments in this department yet.</div>
                      ) : (
                        selectedDepartmentTargets.map((target) => {
                          const active = selectedTarget.id === target.id
                          const setting = selectedSettingFor(settings, target.id, assignmentTargets)
                          const supplier = settings.suppliers.find((item) => item.id === setting.supplierId)
                          return (
                            <button
                              key={target.id}
                              type="button"
                              onClick={() => setSelectedTargetId(target.id)}
                              className={`rounded-[18px] border px-4 py-3 text-left transition ${active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-950 hover:border-sky-200"}`}
                            >
                              <span className="block text-sm font-semibold">{target.serviceLabel}</span>
                              <span className={`mt-1 block text-xs leading-5 ${active ? "text-slate-300" : "text-slate-500"}`}>
                                {supplier?.name || "No supplier"} · {setting.questions.length} question(s)
                              </span>
                            </button>
                          )
                        })
                      )}
                    </div>

                    {selectedDepartmentTargets.length > 0 ? (
                      <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">{selectedTarget.departmentLabel}</p>
                            <h5 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{selectedTarget.serviceLabel}</h5>
                            <p className="mt-1 text-sm leading-6 text-slate-500">{selectedTarget.description}</p>
                          </div>
                          <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                            <input type="checkbox" checked={selectedSetting.enabled} onChange={(event) => updateSelectedSetting({ enabled: event.target.checked })} />
                            Enable questions
                          </label>
                        </div>

                        <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-900">
                          Assigned supplier
                          <select value={selectedSetting.supplierId} onChange={(event) => updateSelectedSetting({ supplierId: event.target.value })} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900">
                            {settings.suppliers.map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                            ))}
                          </select>
                        </label>

                        <div className="mt-4 grid gap-3">
                          {selectedSetting.questions.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">No questions added for this sub-department.</div>
                          ) : (
                            selectedSetting.questions.map((item) => (
                              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-sm font-semibold text-slate-950">{item.label}</div>
                                    <div className="mt-1 text-xs text-slate-500">{item.type}{item.required ? " · required" : ""}{item.options?.length ? ` · ${item.options.join(", ")}` : ""}</div>
                                  </div>
                                  <button type="button" onClick={() => removeQuestion(item.id)} className="text-sm font-semibold text-rose-700">Remove</button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="mt-4 rounded-[22px] border border-slate-200 bg-white p-4">
                          <h6 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Add question</h6>
                          <div className="mt-3 grid gap-3">
                            <input value={questionLabel} onChange={(event) => setQuestionLabel(event.target.value)} placeholder="Question label" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                              <select value={questionType} onChange={(event) => setQuestionType(event.target.value as QualifyingQuestionType)} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium">
                                {questionTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                              </select>
                              <label className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-300 px-4 text-sm font-semibold text-slate-800">
                                <input type="checkbox" checked={questionRequired} onChange={(event) => setQuestionRequired(event.target.checked)} />
                                Required
                              </label>
                            </div>
                            {questionType === "select" ? (
                              <input value={questionOptions} onChange={(event) => setQuestionOptions(event.target.value)} placeholder="Options separated by commas" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                            ) : null}
                            <button type="button" onClick={addQuestion} className="min-h-12 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white">Add question to sub-department</button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">New sub-department</p>
                    <h5 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Add sub-department to {selectedDepartmentDisplay}</h5>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <input value={serviceDraft.name} onChange={(event) => setServiceDraft((draft) => ({ ...draft, name: event.target.value }))} placeholder="Sub-department name" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      <select value={serviceDraft.supplierId} onChange={(event) => setServiceDraft((draft) => ({ ...draft, supplierId: event.target.value }))} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium">
                        {settings.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                      </select>
                      <textarea value={serviceDraft.description} onChange={(event) => setServiceDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="What should customers upload or request here?" rows={4} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 sm:col-span-2" />
                      <button type="button" onClick={addService} className="min-h-12 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white sm:col-span-2">Add sub-department</button>
                    </div>
                  </div>
                </section>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-sm font-semibold text-slate-950">Products</h4>
                    <div className="mt-3 grid gap-3">
                      {[...existingDepartmentProducts, ...departmentProducts].length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">No manager products in this department yet.</div>
                      ) : (
                        <>
                          {existingDepartmentProducts.map((product) => (
                            <div key={`catalog-${product.id}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-slate-950">{product.name}</div>
                                  <div className="mt-1 text-xs leading-5 text-slate-500">{product.unit} · {product.price > 0 ? `$${product.price.toFixed(2)}` : "Get pricing"} · {product.supplierName || "Catalog"}</div>
                                  <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Existing catalog</div>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-2">
                                  <Link href={`/shop/${product.slug}`} prefetch={false} className="text-sm font-semibold text-sky-700">View</Link>
                                  <button type="button" onClick={() => hideBuiltInItem(product.id, product.name)} className="text-sm font-semibold text-rose-700">Remove</button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {departmentProducts.map((product) => (
                            <div key={product.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-slate-950">{product.name}</div>
                                  <div className="mt-1 text-xs leading-5 text-slate-500">{product.unit} · {product.price > 0 ? `$${product.price.toFixed(2)}` : "Get pricing"} · {product.supplierName}</div>
                                  <div className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Manager added</div>
                                </div>
                                <button type="button" onClick={() => removeProduct(product.id)} className="text-sm font-semibold text-rose-700">Remove</button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-sm font-semibold text-slate-950">File upload items</h4>
                    <div className="mt-3 grid gap-3">
                      {[...builtInDepartmentServices, ...departmentFileUploads].length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">No upload items in this department yet.</div>
                      ) : (
                        <>
                          {builtInDepartmentServices.map((service) => (
                            <div key={service.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div><div className="text-sm font-semibold text-slate-950">{service.serviceLabel}</div><div className="mt-1 text-xs leading-5 text-slate-500">Built-in upload workflow · managed as a sub-department</div></div>
                                <button type="button" onClick={() => hideBuiltInItem(service.id, service.serviceLabel)} className="shrink-0 text-sm font-semibold text-rose-700">Remove</button>
                              </div>
                            </div>
                          ))}
                          {departmentFileUploads.map((service) => (
                            <div key={service.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-slate-950">{service.name}</div>
                                  <div className="mt-1 text-xs leading-5 text-slate-500">File upload · {service.supplierName}</div>
                                </div>
                                <button type="button" onClick={() => removeService(service.id)} className="text-sm font-semibold text-rose-700">Remove</button>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {hiddenDepartmentItems.length > 0 ? (
                  <details className="mt-4 rounded-[22px] border border-slate-200 bg-white px-4 py-3">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-700">Removed items ({hiddenDepartmentItems.length})</summary>
                    <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3">
                      {hiddenDepartmentItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                          <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{item.label}</p><p className="text-xs text-slate-500">{item.type}</p></div>
                          <button type="button" onClick={() => restoreBuiltInItem(item.id)} className="shrink-0 text-sm font-semibold text-sky-700">Restore</button>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}

                <section className="mt-6 rounded-[26px] border border-sky-100 bg-sky-50/55 p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase text-sky-700">Common department items</p>
                  <h4 className="mt-1 text-lg font-semibold text-slate-950">Add an item list to {selectedDepartmentDisplay}</h4>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Write or paste one product name per line. You can also import a plain-text list, review it, and add every item together.</p>
                  <textarea
                    value={bulkItemText}
                    onChange={(event) => { setBulkItemText(event.target.value); setBulkItemStatus("") }}
                    rows={7}
                    placeholder={"2x4 studs\n3/4 plywood\nFraming nails"}
                    className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base leading-7 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  />
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-semibold text-slate-600">{parsedBulkItems.length} item{parsedBulkItems.length === 1 ? "" : "s"} ready</span>
                    <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-sky-200 bg-white px-4 text-sm font-semibold text-sky-800">
                      <input type="file" accept=".txt,text/plain" className="sr-only" onChange={(event) => { void importBulkItemFile(event.target.files?.[0] ?? null); event.currentTarget.value = "" }} />
                      Import .txt list
                    </label>
                  </div>
                  {bulkItemStatus ? <p className="mt-3 rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm text-slate-700" role="status">{bulkItemStatus}</p> : null}
                  <button type="button" disabled={parsedBulkItems.length === 0} onClick={addBulkDepartmentItems} className="mt-4 min-h-12 w-full rounded-2xl bg-[#0071e3] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">
                    Add {parsedBulkItems.length || "list"} item{parsedBulkItems.length === 1 ? "" : "s"} to department
                  </button>
                </section>

                <div className="mt-6 rounded-[26px] border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-950">Add item to {selectedDepartmentDisplay}</h4>
                      <p className="mt-1 text-sm leading-6 text-slate-500">Choose product for a normal project item, or file upload when the customer should upload plans and answer questions.</p>
                    </div>
                    <div className="grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                      {(["product", "file-upload"] as DepartmentItemKind[]).map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => setDepartmentItemDraft((draft) => ({ ...draft, kind }))}
                          className={`min-h-10 rounded-xl px-4 text-sm font-semibold transition ${departmentItemDraft.kind === kind ? "bg-slate-950 text-white shadow-sm" : "text-slate-600 hover:text-slate-950"}`}
                        >
                          {kind === "product" ? "Product" : "File upload"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <input value={departmentItemDraft.name} onChange={(event) => setDepartmentItemDraft((draft) => ({ ...draft, name: event.target.value }))} placeholder={departmentItemDraft.kind === "product" ? "Product name" : "Upload item name"} className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                    <select value={departmentItemDraft.supplierId} onChange={(event) => setDepartmentItemDraft((draft) => ({ ...draft, supplierId: event.target.value }))} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium">
                      {settings.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                    </select>
                    {departmentItemDraft.kind === "product" ? (
                      <>
                        <input value={departmentItemDraft.unit} onChange={(event) => setDepartmentItemDraft((draft) => ({ ...draft, unit: event.target.value }))} placeholder="Unit, e.g. Each, LF, SF" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                        <input value={departmentItemDraft.price} onChange={(event) => setDepartmentItemDraft((draft) => ({ ...draft, price: event.target.value }))} inputMode="decimal" placeholder="Unit price" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                      </>
                    ) : null}
                    <textarea value={departmentItemDraft.description} onChange={(event) => setDepartmentItemDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder={departmentItemDraft.kind === "product" ? "Product description" : "What should customers upload for this item?"} rows={4} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 sm:col-span-2" />
                  </div>

                  {departmentItemDraft.kind === "file-upload" ? (
                    <div className="mt-5 rounded-[24px] border border-sky-100 bg-sky-50/60 p-4">
                      <h5 className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Questions before add-on</h5>
                      <div className="mt-3 grid gap-3">
                        {draftQuestions.map((item) => (
                          <div key={item.id} className="rounded-2xl border border-sky-100 bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-slate-950">{item.label}</div>
                                <div className="mt-1 text-xs text-slate-500">{item.type}{item.required ? " · required" : ""}{item.options?.length ? ` · ${item.options.join(", ")}` : ""}</div>
                              </div>
                              <button type="button" onClick={() => removeDraftQuestion(item.id)} className="text-sm font-semibold text-rose-700">Remove</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 grid gap-3">
                        <input value={draftQuestionLabel} onChange={(event) => setDraftQuestionLabel(event.target.value)} placeholder="Question label" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                          <select value={draftQuestionType} onChange={(event) => setDraftQuestionType(event.target.value as QualifyingQuestionType)} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-medium">
                            {questionTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                          </select>
                          <label className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800">
                            <input type="checkbox" checked={draftQuestionRequired} onChange={(event) => setDraftQuestionRequired(event.target.checked)} />
                            Required
                          </label>
                        </div>
                        {draftQuestionType === "select" ? (
                          <input value={draftQuestionOptions} onChange={(event) => setDraftQuestionOptions(event.target.value)} placeholder="Options separated by commas" className="min-h-12 rounded-2xl border border-slate-300 px-4 text-sm font-medium outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100" />
                        ) : null}
                        <button type="button" onClick={addDraftQuestion} className="min-h-12 rounded-2xl border border-sky-200 bg-white px-4 text-sm font-semibold text-sky-800">Add question</button>
                      </div>
                    </div>
                  ) : null}

                  <button type="button" onClick={addDepartmentItem} className="mt-5 min-h-12 w-full rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white">
                    {departmentItemDraft.kind === "product" ? "Add product to department" : "Add file upload to department"}
                  </button>
                </div>
              </section>
            </section>
          ) : null}
        </section>
      </div>
    </main>
  )
}
