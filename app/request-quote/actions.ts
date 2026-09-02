"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { sendQuoteIntakeEmail } from "@/lib/cart-submission-email";
import {
  normalizePhoneNumber,
  phoneLoginEmailForPhone,
} from "@/lib/auth-phone";
import { notifyManagersSafely } from "@/lib/manager-push-notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

export type QuoteRequestFormState = {
  status: "idle" | "success" | "error";
  message: string;
  referenceId?: string;
  requestId?: string;
};

const ALLOWED_FILES = new Map([
  ["pdf", "application/pdf"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
]);
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const MAX_STORED_FILE_SIZE = 25 * 1024 * 1024;
const MAX_ATTACHMENT_COUNT = 10;
const TEMP_UPLOAD_PREFIX = "public-intake/";

function field(formData: FormData, name: string, maxLength = 500) {
  return String(formData.get(name) || "")
    .trim()
    .slice(0, maxLength);
}

function error(message: string): QuoteRequestFormState {
  return { status: "error", message };
}

function safeFileName(value: string) {
  return (
    value.replace(/[^a-zA-Z0-9._ -]+/g, "-").slice(0, 100) || "project-file"
  );
}

type QuoteIntakeAttachmentPayload = {
  filename: string;
  content?: string;
  storagePath?: string;
  type: string;
  size?: number;
};

type QuoteIntakePayload = {
  requestKind: "quote_request" | "beat_quote";
  referenceId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  customerType: string;
  projectName: string;
  projectType: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  timeframe: string;
  departments: string[];
  contactMethods: string[];
  details: string;
  attachments?: QuoteIntakeAttachmentPayload[];
  /** Accepted by the Edge Function for older callers during rollout. */
  attachment?: QuoteIntakeAttachmentPayload;
};

type IntakeAttachment = {
  filename: string;
  content?: string;
  bytes?: Uint8Array<ArrayBuffer>;
  storagePath?: string;
  type: string;
  size: number;
};

async function saveWithSupabaseFunction(payload: QuoteIntakePayload) {
  let url = "";
  let key = "";
  try {
    const config = getSupabasePublicEnv();
    url = config.url;
    key = config.anonKey;
  } catch {
    return null;
  }
  const response = await fetch(`${url}/functions/v1/public-quote-intake`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json() as Promise<{
    ok: true;
    requestId: string;
    attachmentCount: number;
  }>;
}

async function findClientByContact(
  supabase: ReturnType<typeof createAdminClient>,
  email: string,
  phone: string,
) {
  if (email) {
    const { data } = await supabase
      .from("profiles")
      .select("id,email,full_name")
      .ilike("email", email)
      .limit(1)
      .maybeSingle<{ id: string; email: string; full_name: string | null }>();
    if (data) return data;
  }
  if (phone) {
    const { data } = await supabase
      .from("profiles")
      .select("id,email,full_name")
      .eq("phone", phone)
      .limit(1)
      .maybeSingle<{ id: string; email: string; full_name: string | null }>();
    if (data) return data;
  }
  return null;
}

function organizeMaterialListAfterResponse(requestId: string) {
  after(async () => {
    try {
      const { error: invokeError } = await createAdminClient().functions.invoke(
        "client-material-list-ai",
        {
          body: { requestId },
        },
      );
      if (invokeError)
        console.error("client_material_list_ai_failed", {
          requestId,
          reason: invokeError.message,
        });
    } catch (cause) {
      console.error("client_material_list_ai_failed", {
        requestId,
        reason: cause instanceof Error ? cause.message : "unknown",
      });
    }
  });
}

export async function submitQuoteRequestFormAction(
  _previousState: QuoteRequestFormState,
  formData: FormData,
): Promise<QuoteRequestFormState> {
  if (field(formData, "website"))
    return { status: "success", message: "Your request was received." };

  const fullNameInput =
    field(formData, "fullName", 160) ||
    `${field(formData, "firstName", 80)} ${field(formData, "lastName", 80)}`.trim();
  const nameParts = fullNameInput.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ");
  const email = field(formData, "email", 160).toLowerCase();
  const phoneInput = field(formData, "phone", 40);
  const phone = normalizePhoneNumber(phoneInput);
  const company = field(formData, "company", 120);
  const customerType = field(formData, "customerType", 80);
  const projectName = field(formData, "projectName", 140);
  const projectType = field(formData, "projectType", 80);
  const addressInput = field(formData, "address", 300);
  const street = addressInput || field(formData, "street", 180);
  const city = field(formData, "city", 100);
  const state = field(formData, "state", 40);
  const zip = field(formData, "zip", 10);
  const timeframe = field(formData, "timeframe", 80);
  const details = field(formData, "details", 5000);
  const requestKind =
    field(formData, "requestKind", 30) === "beat_quote"
      ? "beat_quote"
      : "quote_request";
  const departments = formData
    .getAll("departments")
    .map((value) => String(value).trim())
    .filter(Boolean)
    .slice(0, 12);
  const allowedContactMethods = new Set(["WhatsApp", "Text", "Call", "Email"]);
  const contactMethods = formData
    .getAll("contactMethods")
    .map((value) => String(value).trim())
    .filter((value) => allowedContactMethods.has(value))
    .slice(0, 4);

  if (!fullNameInput && (!email || !phone))
    return error("Enter a name, or enter both email and phone.");
  if (fullNameInput && !email && !phone)
    return error("Enter an email address or phone number.");
  if (email && !/^\S+@\S+\.\S+$/.test(email))
    return error("Enter a valid email address.");
  if (phone && phone.replace(/\D/g, "").length < 7)
    return error("Enter a valid phone number.");
  const accountEmail = email || phoneLoginEmailForPhone(phone);
  if (!accountEmail) return error("Enter an email address or phone number.");

  const uploadedFiles = formData
    .getAll("attachment")
    .filter((value): value is File => value instanceof File && value.size > 0);
  let storedUploads: Array<{
    storagePath: string;
    filename: string;
    type: string;
    size: number;
  }> = [];
  const storedUploadsJson = field(formData, "attachmentUploads", 10000);
  if (storedUploadsJson) {
    try {
      const parsed = JSON.parse(storedUploadsJson) as unknown;
      if (!Array.isArray(parsed))
        return error(
          "The uploaded files could not be verified. Please select them again.",
        );
      storedUploads = parsed as typeof storedUploads;
    } catch {
      return error(
        "The uploaded files could not be verified. Please select them again.",
      );
    }
  }
  if (uploadedFiles.length + storedUploads.length > MAX_ATTACHMENT_COUNT)
    return error(`Attach up to ${MAX_ATTACHMENT_COUNT} files.`);
  const attachments: IntakeAttachment[] = [];
  for (const uploaded of uploadedFiles) {
    if (uploaded.size > MAX_FILE_SIZE)
      return error("Direct attachments must total 4 MB or smaller.");
    const filename = safeFileName(uploaded.name);
    const extension = filename.split(".").pop()?.toLowerCase() || "";
    const expectedType = ALLOWED_FILES.get(extension);
    if (!expectedType) return error("Attach a PDF, JPG, PNG, or WebP file.");
    const bytes = new Uint8Array(await uploaded.arrayBuffer());
    attachments.push({
      filename,
      content: Buffer.from(bytes).toString("base64"),
      bytes,
      type: expectedType,
      size: bytes.byteLength,
    });
  }
  if (uploadedFiles.reduce((sum, file) => sum + file.size, 0) > MAX_FILE_SIZE)
    return error("Direct attachments must total 4 MB or smaller.");
  for (const stored of storedUploads) {
    if (!stored || typeof stored !== "object")
      return error(
        "The uploaded files could not be verified. Please select them again.",
      );
    const attachmentPath = String(stored.storagePath || "");
    const attachmentName = String(stored.filename || "");
    const attachmentType = String(stored.type || "");
    const attachmentSize = Number(stored.size);
    if (
      !attachmentPath.startsWith(TEMP_UPLOAD_PREFIX) ||
      attachmentPath.includes("..")
    )
      return error(
        "The uploaded files could not be verified. Please select them again.",
      );
    const filename = safeFileName(attachmentName);
    const extension = filename.split(".").pop()?.toLowerCase() || "";
    const expectedType = ALLOWED_FILES.get(extension);
    if (!expectedType || expectedType !== attachmentType)
      return error("Attach a PDF, JPG, PNG, or WebP file.");
    if (
      !Number.isFinite(attachmentSize) ||
      attachmentSize <= 0 ||
      attachmentSize > MAX_STORED_FILE_SIZE
    )
      return error("The attachment must be 25 MB or smaller.");
    attachments.push({
      filename,
      storagePath: attachmentPath,
      type: expectedType,
      size: attachmentSize,
    });
  }
  if (details.length < 3 && attachments.length === 0)
    return error("Tell us what you need or attach a plan or material list.");
  if (requestKind === "beat_quote" && attachments.length === 0)
    return error("Attach the store quote you want us to beat.");

  const referenceId = `AB-${randomUUID().slice(0, 8).toUpperCase()}`;
  const fullName =
    fullNameInput || company || email.split("@")[0] || phone || "Client";
  const address =
    addressInput || [street, city, state, zip].filter(Boolean).join(", ");
  const intakePayload: QuoteIntakePayload = {
    requestKind,
    referenceId,
    firstName,
    lastName,
    email,
    phone,
    company,
    customerType,
    projectName,
    projectType,
    street,
    city,
    state,
    zip,
    timeframe,
    departments,
    contactMethods: contactMethods.length ? contactMethods : ["WhatsApp"],
    details,
    attachments: attachments.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
      storagePath: attachment.storagePath,
      type: attachment.type,
      size: attachment.size,
    })),
  };
  let projectId = "";
  let requestId = "";
  let clientId = "";
  let createdClient = false;
  const storedFilePaths: string[] = [];

  try {
    const supabase = createAdminClient();
    const existingClient = await findClientByContact(supabase, email, phone);

    if (existingClient) {
      clientId = existingClient.id;
      const profileUpdates: Record<string, string> = {
        full_name: fullNameInput || existingClient.full_name || fullName,
      };
      if (phone) profileUpdates.phone = phone;
      if (company) profileUpdates.company_name = company;
      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", clientId);
      if (profileError) throw new Error("profile_update_failed");
    } else {
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: accountEmail,
          password: `${randomUUID()}Aa1!`,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            phone,
            company_name: company || null,
          },
        });
      if (authError || !authData.user) throw new Error("client_create_failed");
      clientId = authData.user.id;
      createdClient = true;
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: clientId,
          email: accountEmail,
          full_name: fullName,
          phone,
          company_name: company || null,
          role: "client",
          approval_status: "pending",
          is_active: true,
        },
        { onConflict: "id" },
      );
      if (profileError) throw new Error("profile_create_failed");
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        owner_id: clientId,
        name:
          projectName ||
          `${requestKind === "beat_quote" ? "Beat a quote" : "Quote request"} ${referenceId}`,
        address: address || null,
        status: "active",
      })
      .select("id")
      .single<{ id: string }>();
    if (projectError || !project) throw new Error("project_create_failed");
    projectId = project.id;

    const { data: request, error: requestError } = await supabase
      .from("quote_requests")
      .insert({
        project_id: projectId,
        owner_id: clientId,
        title: projectName
          ? `${projectName} ${requestKind === "beat_quote" ? "price comparison" : "quote request"}`
          : `${requestKind === "beat_quote" ? "Beat a quote" : "Construction quote"} ${referenceId}`,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      })
      .select("id")
      .single<{ id: string }>();
    if (requestError || !request) throw new Error("request_create_failed");
    requestId = request.id;

    const answers = [
      ...(customerType
        ? [
            {
              questionId: "customer_type",
              label: "Customer type",
              value: customerType,
            },
          ]
        : []),
      ...(projectType
        ? [
            {
              questionId: "project_type",
              label: "Project type",
              value: projectType,
            },
          ]
        : []),
      ...(timeframe
        ? [
            {
              questionId: "timeframe",
              label: "Materials needed",
              value: timeframe,
            },
          ]
        : []),
      ...(departments.length
        ? [
            {
              questionId: "departments",
              label: "Departments",
              value: departments.join(", "),
            },
          ]
        : []),
      {
        questionId: "preferred_contact",
        label: "Reply by",
        value: intakePayload.contactMethods.join(", "),
      },
      {
        questionId: "request_details",
        label: "Request details",
        value: details,
      },
    ];
    const { error: itemError } = await supabase
      .from("quote_request_items")
      .insert({
        request_id: requestId,
        project_id: projectId,
        owner_id: clientId,
        name:
          requestKind === "beat_quote"
            ? "Beat a store quote"
            : "Construction quote request",
        department: departments.join(", ") || "General request",
        item_type: "custom_priced",
        quantity: 1,
        unit: "request",
        unit_price: 0,
        qualification_status: "answered",
        answers,
        metadata: {
          reference_id: referenceId,
          source:
            requestKind === "beat_quote"
              ? "beat_a_quote_form"
              : "public_quote_form",
          request_details: details,
          contact_methods: intakePayload.contactMethods,
        },
      });
    if (itemError) throw new Error("request_item_create_failed");

    for (const attachment of attachments) {
      if (attachment.storagePath) {
        const { data: fileInfo, error: infoError } = await supabase.storage
          .from("project-uploads")
          .info(attachment.storagePath);
        if (
          infoError ||
          !fileInfo ||
          fileInfo.size !== attachment.size ||
          fileInfo.size > MAX_STORED_FILE_SIZE ||
          fileInfo.contentType !== attachment.type
        )
          throw new Error("attachment_verification_failed");
        const { data: emailFile, error: downloadError } = await supabase.storage
          .from("project-uploads")
          .download(attachment.storagePath);
        if (downloadError || !emailFile)
          throw new Error("attachment_download_failed");
        attachment.content = Buffer.from(
          await emailFile.arrayBuffer(),
        ).toString("base64");
        const storedFilePath = `${clientId}/${projectId}/${randomUUID()}-${attachment.filename}`;
        const { error: copyError } = await supabase.storage
          .from("project-uploads")
          .copy(attachment.storagePath, storedFilePath);
        if (copyError) throw new Error("attachment_copy_failed");
        storedFilePaths.push(storedFilePath);
        const { error: attachmentError } = await supabase
          .from("quote_request_attachments")
          .insert({
            request_id: requestId,
            project_id: projectId,
            owner_id: clientId,
            file_name: attachment.filename,
            file_path: storedFilePath,
            file_type: attachment.type,
            file_size: attachment.size,
          });
        if (attachmentError) throw new Error("attachment_record_failed");
      } else if (attachment.bytes) {
        const storedFilePath = `${clientId}/${projectId}/${randomUUID()}-${attachment.filename}`;
        const { error: uploadError } = await supabase.storage
          .from("project-uploads")
          .upload(storedFilePath, attachment.bytes, {
            contentType: attachment.type,
            upsert: false,
          });
        if (uploadError) throw new Error("attachment_upload_failed");
        storedFilePaths.push(storedFilePath);
        const { error: attachmentError } = await supabase
          .from("quote_request_attachments")
          .insert({
            request_id: requestId,
            project_id: projectId,
            owner_id: clientId,
            file_name: attachment.filename,
            file_path: storedFilePath,
            file_type: attachment.type,
            file_size: attachment.bytes.byteLength,
          });
        if (attachmentError) throw new Error("attachment_record_failed");
      }
    }
    const emailDelivery = await sendQuoteIntakeEmail({
      ...intakePayload,
      requestId,
      attachment: attachments[0]
        ? { filename: attachments[0].filename, content: attachments[0].content }
        : undefined,
    });
    await supabase
      .from("quote_request_items")
      .update({
        metadata: {
          reference_id: referenceId,
          source:
            requestKind === "beat_quote"
              ? "beat_a_quote_form"
              : "public_quote_form",
          request_details: details,
          contact_methods: intakePayload.contactMethods,
          email_delivery: {
            owner: emailDelivery.owner.status,
            client: emailDelivery.client.status,
            checked_at: new Date().toISOString(),
          },
        },
      })
      .eq("request_id", requestId);

    if (requestKind === "quote_request")
      organizeMaterialListAfterResponse(requestId);
    after(() =>
      notifyManagersSafely({
        eventType: "new_order",
        title:
          requestKind === "beat_quote"
            ? "New quote to beat"
            : "New material request",
        body: `${fullName}${company ? ` · ${company}` : ""} · ${departments.join(", ") || "General materials"}`,
        href: `/owner/materials/requests/${requestId}`,
        tag: `avantia-request-${requestId}`,
      }),
    );

    revalidatePath("/admin/users");
    revalidatePath("/owner/materials/requests");
    const temporaryFilePaths = attachments.flatMap((attachment) =>
      attachment.storagePath ? [attachment.storagePath] : [],
    );
    if (temporaryFilePaths.length) {
      const { error: temporaryCleanupError } = await supabase.storage
        .from("project-uploads")
        .remove(temporaryFilePaths);
      if (temporaryCleanupError)
        console.error("Public quote temporary upload cleanup failed", {
          requestId,
          count: temporaryFilePaths.length,
        });
    }
    return {
      status: "success",
      message:
        "Your request was received. Someone from Avantia Build will be with you shortly and will call you back within the next 24 hours.",
      referenceId,
      requestId,
    };
  } catch {
    try {
      const supabase = createAdminClient();
      if (storedFilePaths.length)
        await supabase.storage.from("project-uploads").remove(storedFilePaths);
      if (projectId)
        await supabase.from("projects").delete().eq("id", projectId);
      if (createdClient && clientId)
        await supabase.auth.admin.deleteUser(clientId);
    } catch {
      // Preserve the original submission error; cleanup is best effort.
    }
    try {
      const saved = await saveWithSupabaseFunction(intakePayload);
      if (saved?.ok && saved.attachmentCount === attachments.length) {
        after(() =>
          notifyManagersSafely({
            eventType: "new_order",
            title:
              requestKind === "beat_quote"
                ? "New quote to beat"
                : "New material request",
            body: `${fullName}${company ? ` · ${company}` : ""} · ${departments.join(", ") || "General materials"}`,
            href: `/owner/materials/requests/${saved.requestId}`,
            tag: `avantia-request-${saved.requestId}`,
          }),
        );
        revalidatePath("/admin/users");
        revalidatePath("/owner/materials/requests");
        return {
          status: "success",
          message:
            "Your request was received. Someone from Avantia Build will be with you shortly and will call you back within the next 24 hours.",
          referenceId,
          requestId: saved.requestId,
        };
      }
    } catch {
      // Return the customer-facing save error below.
    }
    return error(
      "We could not save your request. Please try again or call (516) 908-8319.",
    );
  }
}
