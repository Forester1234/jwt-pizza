import { test, expect } from "playwright-test-coverage";
import { Page } from "@playwright/test";
import { Role, User } from "../src/service/pizzaService";

async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = {
    "d@jwt.com": {
      id: "3",
      name: "Kai Chen",
      email: "d@jwt.com",
      password: "a",
      roles: [{ role: Role.Diner }],
    },
    "a@jwt.com": {
      id: "1",
      name: "Admin User",
      email: "a@jwt.com",
      password: "admin",
      roles: [{ role: Role.Admin }],
    },
  };
  let users = [
    {
      id: "1",
      name: "Admin User",
      email: "admin@jwt.com",
      roles: [{ role: Role.Admin }],
    },
    {
      id: "3",
      name: "Kai Chen",
      email: "d@jwt.com",
      roles: [{ role: Role.Diner }],
    },
  ];

  let franchises = [
    {
      id: 2,
      name: "LotaPizza",
      admins: [
        {
          id: "1",
          name: "Admin User",
          email: "admin@jwt.com",
          roles: [{ role: Role.Admin }],
        },
      ],
      stores: [
        { id: 4, name: "Lehi" },
        { id: 5, name: "Springville" },
        { id: 6, name: "American Fork" },
      ],
    },
    {
      id: 3,
      name: "PizzaCorp",
      admins: [],
      stores: [{ id: 7, name: "Spanish Fork" }],
    },
    {
      id: 4,
      name: "topSpot",
      admins: [],
      stores: [],
    },
  ];

  await page.route("*/**/api/auth", async (route) => {
    const method = route.request().method();

    // Register
    if (method === "POST") {
      const registerReq = route.request().postDataJSON();

      const newUser = {
        id: "4",
        name: registerReq.name,
        email: registerReq.email,
        roles: [{ role: Role.Diner }],
      };

      loggedInUser = newUser;

      await route.fulfill({
        status: 200,
        json: {
          user: loggedInUser,
          token: "abcdef",
        },
      });

      return;
    }

    // Login
    if (method === "PUT") {
      const loginReq = route.request().postDataJSON();
      const user = validUsers[loginReq.email];

      if (!user || user.password !== loginReq.password) {
        await route.fulfill({
          status: 401,
          json: { error: "Unauthorized" },
        });
        return;
      }

      loggedInUser = user;

      await route.fulfill({
        json: {
          user: loggedInUser,
          token: "abcdef",
        },
      });
      
      console.log("Login request:", route.request().postDataJSON());
      return;
    }

    // Logout
    if (method === "DELETE") {
      loggedInUser = undefined;

      await route.fulfill({
        status: 200,
        json: {},
      });

      return;
    }

    // Catch unexpected auth requests
    await route.continue();
  });

  await page.route("*/**/api/user/me", async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: loggedInUser });
  });

  await page.route("*/**/api/order/menu", async (route) => {
    const menuRes = [
      {
        id: 1,
        title: "Veggie",
        image: "pizza1.png",
        price: 0.0038,
        description: "A garden of delight",
      },
      {
        id: 2,
        title: "Pepperoni",
        image: "pizza2.png",
        price: 0.0042,
        description: "Spicy treat",
      },
    ];
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ json: menuRes });
  });

  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    expect(route.request().method()).toBe("GET");

    await route.fulfill({
      json: {
        franchises,
        more: false,
      },
    });
  });

  await page.route("*/**/api/order", async (route) => {
    const method = route.request().method();

    if (method === "POST") {
      const orderReq = route.request().postDataJSON();

      const orderRes = {
        order: { ...orderReq, id: 23 },
        jwt: "eyJpYXQ",
      };

      await route.fulfill({ json: orderRes });
      return;
    }

    if (method === "GET") {
      await route.fulfill({
        json: {
          orders: [],
          more: false,
        },
      });
      return;
    }

    await route.continue();
  });

  await page.route(/\/api\/franchise\/\d+\/store\/\d+$/, async (route) => {
    expect(route.request().method()).toBe("DELETE");

    const url = new URL(route.request().url());
    const storeId = Number(url.pathname.split("/").pop());

    franchises = franchises.map((franchise) => ({
      ...franchise,
      stores: franchise.stores.filter((store) => store.id !== storeId),
    }));

    await route.fulfill({
      status: 200,
      json: {},
    });
  });

  await page.route(/\/api\/franchise\/\d+$/, async (route) => {
    const method = route.request().method();
    const url = new URL(route.request().url());
    const id = Number(url.pathname.split("/").pop());

    if (method === "GET") {
      await route.fulfill({
        json: franchises.filter((franchise) =>
          franchise.admins.some((admin) => admin.id === loggedInUser?.id),
        ),
      });
      return;
    }

    if (method === "DELETE") {
      franchises = franchises.filter((franchise) => franchise.id !== id);

      await route.fulfill({
        status: 200,
        json: {},
      });
      return;
    }

    await route.continue();
  });

  await page.route("*/**/api/franchise", async (route) => {
    if (route.request().method() === "POST") {
      const franchiseReq = route.request().postDataJSON();

      const newFranchise = {
        id: 10,
        name: franchiseReq.name,
        admins: [
          {
            id: "4",
            name: franchiseReq.adminEmail,
            email: franchiseReq.adminEmail,
            roles: [{ role: Role.Admin }],
          },
        ],
        stores: [],
      };

      franchises.push(newFranchise);

      await route.fulfill({
        status: 200,
        json: {
          franchise: newFranchise,
        },
      });

      return;
    }

    await route.continue();
  });

  await page.route(/\/api\/user(\?.*)?$/, async (route) => {
    const method = route.request().method();

    if (method === "GET") {
      const url = new URL(route.request().url());
      const pageNumber = Number(url.searchParams.get("page") || 1);
      const limit = Number(url.searchParams.get("limit") || 10);
      const nameFilter = (url.searchParams.get("name") || "*")
        .replace(/\*/g, "")
        .toLowerCase();

      const filteredUsers = users.filter((user) =>
        user.name.toLowerCase().includes(nameFilter),
      );

      const start = (pageNumber - 1) * limit;
      const pageUsers = filteredUsers.slice(start, start + limit);

      await route.fulfill({
        json: {
          users: pageUsers,
          more: start + limit < filteredUsers.length,
        },
      });
      return;
    }

    await route.continue();
  });

  await page.route(/\/api\/user\/\d+$/, async (route) => {
    if (route.request().method() === "DELETE") {
      const url = new URL(route.request().url());
      const userId = url.pathname.split("/").pop();

      users = users.filter((user) => user.id !== userId);

      await route.fulfill({
        status: 200,
        json: { message: "User deleted" },
      });
      return;
    }

    await route.continue();
  });

  await page.goto("/");
}

test("admin can list users", async ({ page }) => {
  await page.goto("/");

  // login and check
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("a@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("admin");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByRole("link", { name: "Logout" })).toBeVisible();

  // Navigate to the admin dashboard
  await page.getByRole("link", { name: "Admin" }).click();

  // Verify the user list
  const usersTable = page
    .locator("table")
    .filter({ has: page.getByRole("columnheader", { name: "Name" }) });
  await expect(
    usersTable.getByRole("columnheader", { name: "Name" }),
  ).toBeVisible();
  await expect(
    usersTable.getByRole("columnheader", { name: "Email" }),
  ).toBeVisible();
  await expect(
    usersTable.getByRole("columnheader", { name: "Role" }),
  ).toBeVisible();
  await expect(
    usersTable.getByRole("columnheader", { name: "Action" }),
  ).toBeVisible();

  await expect(usersTable.locator("tbody tr").first()).toBeVisible();
  await expect(usersTable.locator("tbody")).toContainText("@jwt.com");
});

test("admin can delete user", async ({ page }) => {
  await basicInit(page);

  // login and check
  await page.getByRole("link", { name: "Login" }).click();
  await page.getByRole("textbox", { name: "Email address" }).fill("a@jwt.com");
  await page.getByRole("textbox", { name: "Password" }).fill("admin");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByRole("main")).toBeVisible();
  console.log("URL after login:", page.url());

  await expect(page.getByRole("link", { name: "Logout" })).toBeVisible();

  // Navigate to the admin dashboard
  await page.getByRole("link", { name: "Admin" }).click();

  const usersTable = page.locator("table").filter({
    has: page.getByRole("columnheader", { name: "Name" }),
  });

  const userRow = usersTable
    .locator("tbody tr")
    .filter({ hasText: "d@jwt.com" });

  await expect(userRow).toBeVisible();

  await userRow.getByRole("button", { name: "Delete" }).click();

  await expect(userRow).toHaveCount(0);
});
