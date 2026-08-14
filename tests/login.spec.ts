import { expect, test } from "@playwright/test"

async function configureTestAuth(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    window.__AVANTIA_SUPABASE__ = {
      url: "https://supabase.test",
      anonKey: "test-anon-key",
    }
  })
}

test("login replaces technical PKCE errors with a useful restart message", async ({ page }) => {
  const technicalError = "PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser."

  await page.goto(`/login?error=${encodeURIComponent(technicalError)}`)

  await expect(page.getByText("That sign-in attempt expired. Start again on this page.")).toBeVisible()
  await expect(page.getByText(/PKCE code verifier/i)).toHaveCount(0)
})

test("the email login field accepts a phone-password account", async ({ page }) => {
  await configureTestAuth(page)
  let submittedEmail = ""
  const pageErrors: string[] = []
  page.on("pageerror", (error) => pageErrors.push(error.message))
  await page.route("**/auth/v1/token?grant_type=password", async (route) => {
    const payload = route.request().postDataJSON() as { email?: string }
    submittedEmail = payload.email ?? ""
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ code: "invalid_credentials", msg: "Invalid login credentials" }),
    })
  })

  await page.goto("/login")
  await expect(page.getByTestId("login-form")).toHaveAttribute("data-hydrated", "true")
  await page.getByPlaceholder("Email or phone number").fill("3475675077")
  await page.getByPlaceholder("Password").fill("test-password")
  await page.getByRole("button", { name: "Sign in", exact: true }).click()

  await expect(page.getByText("Invalid login credentials")).toBeVisible()
  expect(submittedEmail).toBe("phone-13475675077@phone-login.buildflow.local")
  expect(pageErrors.filter((message) => message.includes("Hydration failed"))).toEqual([])
})

test("login hydrates cleanly when browser auth configuration becomes available", async ({ page }) => {
  await configureTestAuth(page)
  const pageErrors: string[] = []
  page.on("pageerror", (error) => pageErrors.push(error.message))

  await page.goto("/login")
  await expect(page.getByTestId("login-form")).toHaveAttribute("data-hydrated", "true")
  await expect(page.getByText("Auth is not connected on this preview yet.", { exact: false })).toHaveCount(0)

  expect(pageErrors.filter((message) => message.includes("Hydration failed"))).toEqual([])
})

test("login clearly shows Google Gmail authentication when enabled", async ({ page }) => {
  await configureTestAuth(page)
  await page.route("**/auth/v1/settings", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ external: { google: true } }),
    })
  })

  await page.goto("/login")

  const googleButton = page.getByRole("button", { name: "Continue with Google" })
  await expect(googleButton).toBeVisible()
  await expect(googleButton.locator("svg")).toBeVisible()
  await expect(page.getByText("Fastest way to log in")).toHaveCount(0)
  await expect(page.getByText("Use your existing Gmail account. No new password needed.")).toHaveCount(0)
  await expect(page.getByText("Your session stays active", { exact: false })).toHaveCount(0)
  await expect(page.getByText("347 567 5077")).toHaveCount(0)
})

test("phone-only signup sends a normalized number without exposing a personal example", async ({ page }) => {
  await configureTestAuth(page)
  let signupPayload: { fullName?: string; phone?: string; password?: string } = {}

  await page.route("**/api/auth/phone-password/signup", async (route) => {
    signupPayload = route.request().postDataJSON() as typeof signupPayload
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "Test signup response." }),
    })
  })

  await page.goto("/signup?mode=phone")
  await expect(page.getByTestId("signup-form")).toHaveAttribute("data-hydrated", "true")
  await expect(page.getByText("347 567 5077")).toHaveCount(0)
  await page.getByPlaceholder("Full name").fill("Test Builder")
  await page.getByPlaceholder("Phone number").fill("516-555-0123")
  await page.getByPlaceholder("Create a password").fill("test-password")
  const signupRequest = page.waitForRequest((request) =>
    request.url().includes("/api/auth/phone-password/signup") && request.method() === "POST",
  )
  await page.getByRole("button", { name: "Create account", exact: true }).click()
  await signupRequest

  expect(signupPayload).toEqual({
    fullName: "Test Builder",
    phone: "+15165550123",
    password: "test-password",
  })
})

test("authentication pages share the same compact centered design", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByRole("heading", { name: "Sign in to Avantia Build" })).toBeVisible()
  await expect(page.getByTestId("avantia-build-lockup")).toBeVisible()
  await expect(page.getByPlaceholder("Email or phone number")).toHaveCount(1)
  await expect(page.locator("footer")).toHaveCount(0)

  await page.goto("/signup")
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible()
  await expect(page.getByTestId("avantia-build-lockup")).toBeVisible()
  await expect(page.locator("footer")).toHaveCount(0)

  await page.goto("/reset-password")
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible()
  await expect(page.getByTestId("avantia-build-lockup")).toBeVisible()
  await expect(page.locator("footer")).toHaveCount(0)
})
