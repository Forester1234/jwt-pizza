import { test, expect } from "playwright-test-coverage";

test("admin can list users", async ({ page }) => {
  page.on("pageerror", (error) => {
    console.log("BROWSER ERROR:", error.message);
  });
  await page.goto("/");
  console.log("URL:", page.url());
  console.log("Body:", await page.locator("body").innerText());


  await page.getByRole("link", { name: "Login" }).click();
  await page
    .getByRole("textbox", { name: "Email address" })
    .fill("admin@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("admin");
  await page.getByRole("button", { name: "Login" }).click();

  await page.goto("/admin-dashboard");

  await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
});
