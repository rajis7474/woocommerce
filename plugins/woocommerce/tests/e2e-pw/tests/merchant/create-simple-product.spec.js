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
			await api.delete( `products/${ virtualProductId }`, {
				force: true,
			} );
			await api.delete( `products/${ nonVirtualProductId }`, {
				force: true,
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
			await page.goto( 'wp-admin/post-new.php?post_type=product', {
				waitUntil: 'networkidle',
			} );
		} );

		await test.step( `Fill product name "${ virtualProductName }".`, async () => {
			const textbox_productName = page.getByRole( 'textbox', {
				name: 'Product name',
			} );

			await textbox_productName.fill( virtualProductName );
			await textbox_productName.blur();
			await expect(
				page.getByRole( 'strong', { name: 'Permalink' } )
			).toBeVisible();
		} );

		await test.step( `Fill regular price "${ productPrice }".`, async () => {
			await page.locator( '#_regular_price' ).fill( productPrice );
		} );

		await test.step( `Check 'Virtual' checkbox.`, async () => {
			await page.locator( '#_virtual' ).check();
		} );

		await test.step( `Click 'Publish' button.`, async () => {
			await page.locator( '#publish' ).click();
			await page.waitForLoadState( 'networkidle' );
		} );

		await test.step( `Expect 'Product published' to be displayed.`, async () => {
			await expect(
				page
					.locator( 'div.notice-success > p' )
					.filter( { hasText: 'Product published.' } )
			).toBeVisible();
		} );

		await test.step( `Save product ID.`, async () => {
			virtualProductId = page.url().match( /(?<=post=)\d+/ );
			expect( virtualProductId ).toBeDefined();
		} );
	} );

	test( 'can have a shopper add the simple virtual product to the cart', async ( {
		page,
	} ) => {
		await page.goto( `/?post_type=product&p=${ virtualProductId }`, {
			waitUntil: 'networkidle',
		} );
		await expect( page.locator( '.product_title' ) ).toHaveText(
			virtualProductName
		);
		await expect(
			page.locator( '.summary .woocommerce-Price-amount' )
		).toContainText( productPrice );
		await page.getByRole( 'button', { name: 'Add to cart' } ).click();
		await page.getByRole( 'link', { name: 'View cart' } ).click();
		await expect( page.locator( 'td[data-title=Product]' ) ).toContainText(
			virtualProductName
		);
		await expect(
			page.locator( 'a.shipping-calculator-button' )
		).not.toBeVisible();
		await page
			.locator( `a.remove[data-product_id='${ virtualProductId }']` )
			.click();
		await page.waitForLoadState( 'networkidle' );
		await expect(
			page.locator( `a.remove[data-product_id='${ virtualProductId }']` )
		).not.toBeVisible();
	} );

	test( 'can create simple non-virtual product', async ( { page } ) => {
		await page.goto( 'wp-admin/post-new.php?post_type=product', {
			waitUntil: 'networkidle',
		} );
		await page.locator( '#title' ).fill( nonVirtualProductName );
		await page.locator( '#_regular_price' ).fill( productPrice );
		await expect( page.locator( '#publish:not(.disabled)' ) ).toBeVisible();
		await page.locator( '#publish' ).click();
		await page.waitForLoadState( 'networkidle' );

		// When running in parallel, clicking the publish button sometimes saves products as a draft
		if (
			(
				await page.locator( '#post-status-display' ).innerText()
			 ).includes( 'Draft' )
		) {
			await page.locator( '#publish' ).click();
			await page.waitForLoadState( 'networkidle' );
		}

		await expect(
			page
				.locator( 'div.notice-success > p' )
				.filter( { hasText: 'Product published.' } )
		).toBeVisible();

		// Save product ID
		nonVirtualProductId = page.url().match( /(?<=post=)\d+/ );
		expect( nonVirtualProductId ).toBeDefined();
	} );

	test( 'can have a shopper add the simple non-virtual product to the cart', async ( {
		page,
	} ) => {
		await page.goto( `/?post_type=product&p=${ nonVirtualProductId }`, {
			waitUntil: 'networkidle',
		} );
		await expect( page.locator( '.product_title' ) ).toHaveText(
			nonVirtualProductName
		);
		await expect(
			page.locator( '.summary .woocommerce-Price-amount' )
		).toContainText( productPrice );
		await page.getByRole( 'button', { name: 'Add to cart' } ).click();
		await page.getByRole( 'link', { name: 'View cart' } ).click();
		await expect( page.locator( 'td[data-title=Product]' ) ).toContainText(
			nonVirtualProductName
		);
		await expect(
			page.locator( 'a.shipping-calculator-button' )
		).toBeVisible();
		await page
			.locator( `a.remove[data-product_id='${ nonVirtualProductId }']` )
			.click();
		await page.waitForLoadState( 'networkidle' );
		await expect(
			page.locator(
				`a.remove[data-product_id='${ nonVirtualProductId }']`
			)
		).not.toBeVisible();
	} );
} );
