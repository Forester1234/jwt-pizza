import { Page } from '@playwright/test';
import { test, expect } from './testSetup';
import { Role, User } from '../src/service/pizzaService';

async function basicInit(page: Page) {
  let loggedInUser: User | undefined;
  const validUsers: Record<string, User> = {
    'd@jwt.com': { id: '3', name: 'Kai Chen', email: 'd@jwt.com', password: 'a', roles: [{ role: Role.Diner }] },
    'admin@jwt.com': { id: '1', name: 'Admin User', email: 'admin@jwt.com', password: 'admin', roles: [{ role: Role.Admin }] }
  };
  let franchises = [
    {
      id: 2,
      name: 'LotaPizza',
      admins: [
        {
          id: '1',
          name: 'Admin User',
          email: 'admin@jwt.com',
          roles: [{ role: Role.Admin }],
        },
      ],
      stores: [
        { id: 4, name: 'Lehi' },
        { id: 5, name: 'Springville' },
        { id: 6, name: 'American Fork' },
      ],
    },
    {
      id: 3,
      name: 'PizzaCorp',
      admins: [],
      stores: [{ id: 7, name: 'Spanish Fork' }],
    },
    {
      id: 4,
      name: 'topSpot',
      admins: [],
      stores: [],
    },
  ];

  await page.route('*/**/api/auth', async (route) => {
    const method = route.request().method();

    // Register
    if (method === 'POST') {
      const registerReq = route.request().postDataJSON();

      const newUser = {
        id: '4',
        name: registerReq.name,
        email: registerReq.email,
        roles: [{ role: Role.Diner }],
      };

      loggedInUser = newUser;

      await route.fulfill({
        status: 200,
        json: {
          user: loggedInUser,
          token: 'abcdef',
        },
      });

      return;
    }

    // Login
    if (method === 'PUT') {
      const loginReq = route.request().postDataJSON();
      const user = validUsers[loginReq.email];

      if (!user || user.password !== loginReq.password) {
        await route.fulfill({
          status: 401,
          json: { error: 'Unauthorized' },
        });
        return;
      }

      loggedInUser = user;

      await route.fulfill({
        json: {
          user: loggedInUser,
          token: 'abcdef',
        },
      });

      return;
    }

    // Logout
    if (method === 'DELETE') {
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

  await page.route('*/**/api/user/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: loggedInUser });
  });

  await page.route('*/**/api/order/menu', async (route) => {
    const menuRes = [
      { id: 1, title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
      { id: 2, title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
    ];
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: menuRes });
  });

  await page.route(/\/api\/franchise(\?.*)?$/, async (route) => {
    expect(route.request().method()).toBe('GET');

    await route.fulfill({
      json: {
        franchises,
        more: false,
      },
    });
  });

  await page.route('*/**/api/order', async (route) => {
    const method = route.request().method();

    if (method === 'POST') {
      const orderReq = route.request().postDataJSON();

      const orderRes = {
        order: { ...orderReq, id: 23 },
        jwt: 'eyJpYXQ',
      };

      await route.fulfill({ json: orderRes });
      return;
    }

    if (method === 'GET') {
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
    expect(route.request().method()).toBe('DELETE');

    const url = new URL(route.request().url());
    const storeId = Number(url.pathname.split('/').pop());

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
    const id = Number(url.pathname.split('/').pop());

    if (method === 'GET') {
      await route.fulfill({
        json: franchises.filter((franchise) =>
          franchise.admins.some((admin) => admin.id === loggedInUser?.id)
        ),
      });
      return;
    }

    if (method === 'DELETE') {
      franchises = franchises.filter((franchise) => franchise.id !== id);

      await route.fulfill({
        status: 200,
        json: {},
      });
      return;
    }

    await route.continue();
  });

  await page.route('*/**/api/franchise', async (route) => {
    if (route.request().method() === 'POST') {
      const franchiseReq = route.request().postDataJSON();

      const newFranchise = {
        id: 10,
        name: franchiseReq.name,
        admins: [
          {
            id: '4',
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

  await page.goto('/');
}

test('login', async ({ page }) => {
  await basicInit(page);
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();
});

test('purchase with login', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('button', { name: 'Order now' }).click();

  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();

  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await expect(page.locator('tbody')).toContainText('Veggie');
  await expect(page.locator('tbody')).toContainText('Pepperoni');
  await expect(page.locator('tfoot')).toContainText('0.008 ₿');
  await page.getByRole('button', { name: 'Pay now' }).click();

  await expect(page.getByText('0.008')).toBeVisible();
});

test('logout', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();

  await page.getByRole('link', { name: 'Logout' }).click();

  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
});

test('about', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'About' }).click();
  await expect(page.getByRole('main')).toContainText('The secret sauce');
  await expect(page.getByRole('main')).toContainText('Our employees');
  await page.getByRole('img', { name: 'Employee stock photo' }).first().click();
  await page.getByRole('img', { name: 'Employee stock photo' }).nth(1).click();
  await page.getByRole('img', { name: 'Employee stock photo' }).nth(2).click();
  await page.getByRole('img', { name: 'Employee stock photo' }).nth(3).click();
  await page.getByRole('img', { name: 'Employee stock photo' }).nth(3).click();
});

test('history', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.getByRole('heading')).toContainText('Mama Rucci, my my');
  await page.getByRole('main').getByRole('img').click();
});

test('register', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Register' }).click();
  await page.getByRole('textbox', { name: 'Full name' }).fill('Tester Dave');
  await page.getByRole('textbox', { name: 'Email address' }).fill('Testing@too.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('t');
  await page.getByRole('button', { name: 'Register' }).click();

  await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();
});

test('diner dashboard', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('d@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('a');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('link', { name: 'KC' })).toBeVisible();

  await page.getByRole('link', { name: 'KC' }).click();
  await expect(page.getByRole('list')).toContainText('diner-dashboard');
  await expect(page.getByRole('heading')).toContainText('Your pizza kitchen');
});

test('admin login & dashboard', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('admin@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();

  await page.getByRole('link', { name: 'Admin' }).click();

  await expect(page.locator('h2')).toContainText('Mama Ricci\'s kitchen');
  await expect(page.locator('h3')).toContainText('Franchises');

  await page.getByRole('row', { name: 'Lehi ₿ Close' }).getByRole('button').click();
  await expect(page.getByRole('heading')).toContainText('Sorry to see you go');
  await page.getByRole('button', { name: 'Close' }).click();

  await expect(page.locator('h2')).toContainText('Mama Ricci\'s kitchen');
  await expect(page.getByRole('table')).toContainText('LotaPizza');
  await expect(page.getByRole('table')).toContainText('Springville');
  await expect(page.getByRole('table')).toContainText('American Fork');
  await expect(page.getByRole('table')).not.toContainText('Lehi');

  await page.getByRole('row', { name: 'PizzaCorp Close' }).getByRole('button').click();
  await expect(page.getByRole('heading')).toContainText('Sorry to see you go');
  await page.getByRole('button', { name: 'Close' }).click();

  await expect(page.locator('h2')).toContainText('Mama Ricci\'s kitchen');
  await expect(page.getByRole('table')).toContainText('LotaPizza');
  await expect(page.getByRole('table')).not.toContainText('PizzaCorp');

  await page.getByRole('textbox', { name: 'Filter franchises' }).fill('LotaPizza');
  await page.getByRole('button', { name: 'Submit' }).click();

  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await page.getByRole('textbox', { name: 'franchise name' }).fill('Tomato');
  await page.getByRole('textbox', { name: 'franchisee admin email' }).fill('tom@ato.com');
  await page.getByRole('button', { name: 'Create' }).click();

  // Finish properly testing filter and franchise creation
});

test('franchise dashboard', async ({ page }) => {
  await basicInit(page);

  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('admin@jwt.com');
  await page.getByRole('textbox', { name: 'Password' }).fill('admin');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible();
  
  await page.getByRole('link', { name: 'Franchise' }).click();
  
  await expect(page.getByRole('heading', { name: 'LotaPizza' })).toBeVisible();
  await page.getByRole('row', { name: 'Lehi ₿ Close' }).getByRole('button').click();
  await page.getByRole('button', { name: 'Close' }).click();

  // Finish test to ensure franchise is deleted
});
