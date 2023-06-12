const { test, expect } = require( '@playwright/test' );
const wcApi = require( '@woocommerce/woocommerce-rest-api' ).default;

const virtualProductName = 'Virtual Product Name';
const nonVirtualProductName = 'Non Virtual Product Name';
const productPrice = '9.99';
let shippingZoneId, virtualProductId, nonVirtualProductId;

test.describe.serial( 'Add New Simple Product Page', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	test.beforeAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );

		await test.step( `Add shipping zone with flat rate shipping method.`, async () => {
			await api
				.post( 'shipping/zones', {
					name: 'Somewhere',
				} )
				.then( async ( response ) => {
					shippingZoneId = response.data.id;
					await api.put(
						`shipping/zones/${ shippingZoneId }/locations`,
						[ { code: 'CN' } ]
					);
					await api.post(
						`shipping/zones/${ shippingZoneId }/methods`,
						{
							method_id: 'flat_rate',
						}
					);
				} );
		} );
	} );

	test.afterAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );

		await test.step( `Clean up all test products.`, async () => {
			await api.post( `products/batch`, {
				delete: [ virtualProductId, nonVirtualProductId ],
			} );
		} );

		await test.step( `Delete shipping zone.`, async () => {
			await api.delete( `shipping/zones/${ shippingZoneId }`, {
				force: true,
			} );
		} );
	} );

	test( 'can create simple virtual product', async ( { page } ) => {
		await test.step( `Go to "Add new product" page.`, async () => {
			await page.goto( '/wp-admin/post-new.php?post_type=product' );
		} );

		await test.step( `Fill product name "${ virtualProductName }".`, async () => {
			await page
				.getByRole( 'textbox', {
					name: 'Product name',
				} )
				.fill( virtualProductName );
		} );

		await test.step( `Save draft to prevent auto-save from interfering with succeeding steps.`, async () => {
			await page.getByRole( 'button', { name: 'Save Draft' } ).click();
		} );

		await test.step( `Fill regular price "${ productPrice }".`, async () => {
			await page.locator( '#_regular_price' ).fill( productPrice );
		} );

		await test.step( `Check 'Virtual' checkbox.`, async () => {
			await page.locator( '#_virtual' ).check();
		} );

		await test.step( `Click 'Publish' button.`, async () => {
			await page.locator( '#publish' ).click();
		} );

		await test.step( `Expect 'Product published' to be displayed.`, async () => {
			await expect(
				page
					.locator( 'div.notice-success > p' )
					.filter( { hasText: 'Product published.' } )
			).toBeVisible();
		} );

		await test.step( `Save product ID.`, async () => {
			virtualProductId = page
				.url()
				.match( /(?<=post=)\d+/ )
				.at( 0 );
			expect( virtualProductId ).toBeDefined();
		} );
	} );

	test( 'can have a shopper add the simple virtual product to the cart', async ( {
		page,
	} ) => {
		await test.step( `Clear cookies to assure cart items from other tests do not appear on this test.`, async () => {
			await page.context().clearCookies();
		} );

		await test.step( `Go to product page of "${ virtualProductName }".`, async () => {
			await page.goto( `/?post_type=product&p=${ virtualProductId }`, {
				waitUntil: 'networkidle',
			} );

			await expect( page.locator( '.product_title' ) ).toHaveText(
				virtualProductName
			);

			await expect(
				page.locator( '.summary .woocommerce-Price-amount' )
			).toContainText( productPrice );
		} );

		await test.step( `Click 'Add to cart' button.`, async () => {
			await page.getByRole( 'button', { name: 'Add to cart' } ).click();
		} );

		await test.step( `Click 'View cart'.`, async () => {
			await page.getByRole( 'link', { name: 'View cart' } ).click();
		} );

		await test.step( `Expect "${ virtualProductName }" to be added to cart.`, async () => {
			await expect(
				page.locator( 'td[data-title=Product]' )
			).toContainText( virtualProductName );
		} );

		await test.step( `Expect the shipping calculator button to not be visibile.`, async () => {
			await expect(
				page.locator( 'a.shipping-calculator-button' )
			).not.toBeVisible();
		} );

		await test.step( `Click 'Remove' link on "${ virtualProductName }"`, async () => {
			await page
				.locator( `a.remove[data-product_id='${ virtualProductId }']` )
				.click();
		} );

		await test.step( `Expect "${ virtualProductName }" to be removed from cart.`, async () => {
			await expect(
				page.locator(
					`a.remove[data-product_id='${ virtualProductId }']`
				)
			).not.toBeVisible();
		} );
	} );

	test( 'can create simple non-virtual product', async ( { page } ) => {
		await test.step( `Go to "Add new product" page.`, async () => {
			await page.goto( 'wp-admin/post-new.php?post_type=product' );
		} );

		await test.step( `Type "${ nonVirtualProductName }" into the "Product name" textbox.`, async () => {
			await page.locator( '#title' ).fill( nonVirtualProductName );
		} );

		await test.step( `Save draft to prevent auto-save from interfering with succeeding steps.`, async () => {
			await page.getByRole( 'button', { name: 'Save Draft' } ).click();
		} );

		await test.step( `Type "${ productPrice }" into the "Regular price" textbox.`, async () => {
			await page.locator( '#_regular_price' ).fill( productPrice );
		} );

		await test.step( `Click "Publish" button.`, async () => {
			await page.locator( '#publish' ).click();
		} );

		await test.step( `Expect 'Product published' to be displayed.`, async () => {
			await expect(
				page
					.locator( 'div.notice-success > p' )
					.filter( { hasText: 'Product published.' } )
			).toBeVisible();
		} );

		await test.step( `Save product ID.`, async () => {
			nonVirtualProductId = page
				.url()
				.match( /(?<=post=)\d+/ )
				.at( 0 );
			expect( nonVirtualProductId ).toBeDefined();
		} );
	} );

	test( 'can have a shopper add the simple non-virtual product to the cart', async ( {
		page,
	} ) => {
		await test.step( `Clear cookies to assure cart items from other tests do not appear on this test.`, async () => {
			await page.context().clearCookies();
		} );

		await test.step( `As a shopper, go to the product page of "${ nonVirtualProductName }".`, async () => {
			await page.goto( `/?post_type=product&p=${ nonVirtualProductId }` );
		} );

		await test.step( `Expect displayed product name to be correct.`, async () => {
			await expect( page.locator( '.product_title' ) ).toHaveText(
				nonVirtualProductName
			);
		} );

		await test.step( `Expect displayed price amount to be correct.`, async () => {
			await expect(
				page.locator( '.summary .woocommerce-Price-amount' )
			).toContainText( productPrice );
		} );

		await test.step( `Click 'Add to cart'.`, async () => {
			await page.getByRole( 'button', { name: 'Add to cart' } ).click();
		} );

		await test.step( `Click 'View cart'.`, async () => {
			await page.getByRole( 'link', { name: 'View cart' } ).click();
		} );

		await test.step( `Expect product "${ nonVirtualProductName }" to be added to the cart.`, async () => {
			await expect(
				page.locator( 'td[data-title=Product]' )
			).toContainText( nonVirtualProductName );
		} );

		await test.step( `Expect shipping calculator to not be visible.`, async () => {
			await expect(
				page.locator( 'a.shipping-calculator-button' )
			).toBeVisible();
		} );

		await test.step( `Click 'Remove'.`, async () => {
			await page
				.locator(
					`a.remove[data-product_id='${ nonVirtualProductId }']`
				)
				.click();
		} );

		await test.step( `Expect "${ nonVirtualProductName }" to be removed from the cart.`, async () => {
			await expect(
				page.locator(
					`a.remove[data-product_id='${ nonVirtualProductId }']`
				)
			).not.toBeVisible();
		} );
	} );
} );
