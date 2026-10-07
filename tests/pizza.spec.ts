import { test, expect } from 'playwright-test-coverage';

test('home page', async ({ page }) => {
  await page.goto('/');
  expect(await page.title()).toBe('JWT Pizza');
});

test('purchase with login', async ({ page }) => {
  // Mock the backend
  // Mock authentication
  await page.route('*/**/api/auth', async (route) => {
    const loginReq = { email: 'd@jwt.com', password: 'a' };
    const loginRes = {
        user: {
        id: 3,
        name: 'Kai Chen',
        email: 'd@jwt.com',
        roles: [{ role: 'diner' }],
        },
        token: 'abcdef',
    };
    expect(route.request().method()).toBe('PUT');
    expect(route.request().postDataJSON()).toMatchObject(loginReq);
    await route.fulfill({ json: loginRes });
  });
  // Mock the menu
  await page.route('*/**/api/order/menu', async (route) => {
    expect(route.request().method()).toBe('GET');
    const menuRes = [
      {
        id: 1,
        name: 'Veggie',
        description: 'Delicious veggie pizza',
        price: 0.0014,
        image: 'veggie.jpg',
      },
      {
        id: 2,
        name: 'Pepperoni',
        description: 'Spicy pepperoni pizza',
        price: 0.0024,
        image: 'pepperoni.jpg',
      },
      {
        id: 3,
        name: 'Margarita',
        description: 'Essential classic',
        price: 0.0014,
        image: 'pizza3.png',
      },
      {
        id: 4,
        name: 'Crusty',
        description: 'A dry mouthed favorite',
        price: 0.0024,
        image: 'pizza4.png',
      },
    ];
  });
  // Mock franchises
  await page.route('*/**/api/order/franchise', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({
      json: [
        {
          id: 1,
          name: 'PizzaCorp',
          stores: [],
        },
        {
          id: 2,
          name: 'LotaPizza',
          stores: [],
        },
        {
          id: 3,
          name: 'PizzaHut',
          stores: [],
        },
        {
          id: 4,
          name: 'topSpot',
          stores: [],
        },
      ],
    });
  });
  // Mock order
  await page.route('*/**/api/order', async (route) => {
    expect(route.request().method()).toBe('POST');
    const orderReq = {
      userId: 3,
      items: [
        { pizzaId: 1, quantity: 1 },
        { pizzaId: 2, quantity: 1 },
      ],
    };
    expect(route.request().postDataJSON()).toMatchObject(orderReq);
    await route.fulfill({ json: { success: true } });
  });

  // Test
  await page.goto('/');
  await page.getByRole('button', { name: 'Order now' }).click();
  await expect(page.locator('h2')).toContainText('Awesome is a click away');
  await page.getByRole('combobox').selectOption('1');
  await page.getByRole('link', { name: 'Image Description Veggie A' }).click();
  await page.getByRole('link', { name: 'Image Description Pepperoni' }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByPlaceholder('Email address').click();
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Email address').press('Tab');
  await page.getByPlaceholder('Password').fill('diner');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await expect(page.locator('tbody')).toContainText('Veggie');
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByRole('main')).toContainText('0.008 ₿');
});
