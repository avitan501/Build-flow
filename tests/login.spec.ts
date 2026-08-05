import { expect, test } from "@playwright/test"

test("login replaces technical PKCE errors with a useful restart message", async ({ page }) => {
  const technicalError = "PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser."

  await page.goto(`/login?error=${encodeURIComponent(technicalError)}`)

  await expect(page.getByText("That sign-in attempt expired. Start again on this page.")).toBeVisible()
  await expect(page.getByText(/PKCE code verifier/i)).toHaveCount(0)
})

test("the email login field accepts a phone-password account", async ({ page }) => {
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
  await page.getByPlaceholder("Enter your password").first().fill("test-password")
  await page.getByRole("button", { name: "Log in", exact: true }).click()

  await expect(page.getByText("Invalid login credentials")).toBeVisible()
  expect(submittedEmail).toBe("phone-13475675077@phone-login.buildflow.local")
  expect(pageErrors.filter((message) => message.includes("Hydration failed"))).toEqual([])
})
