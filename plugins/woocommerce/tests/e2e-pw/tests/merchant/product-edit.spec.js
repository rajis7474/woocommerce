const { test, expect } = require( '@playwright/test' );
const wcApi = require( '@woocommerce/woocommerce-rest-api' ).default;

test.describe( 'Products > Edit Product', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	let productId;

	test.beforeAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );

		await test.step( `Create test product.`, async () => {
			await api
				.post( 'products', {
					name: 'Product to edit',
					type: 'simple',
					regular_price: '12.99',
				} )
				.then( ( response ) => {
					productId = response.data.id;
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

		await test.step( `Delete test product.`, async () => {
			await api.delete( `products/${ productId }`, {
				force: true,
			} );
		} );
	} );

	test( 'can edit a product and save the changes', async ( { page } ) => {
		await test.step( `Open test product.`, async () => {
			await page.goto(
				`wp-admin/post.php?post=${ productId }&action=edit`
			);
		} );

		await test.step( `Change product title.`, async () => {
			await page.locator( '#title' ).fill( 'Awesome product' );
		} );

		await test.step( `Enter product description text mode to work around iframe.`, async () => {
			await page.locator( '#content-html' ).click();
		} );

		await test.step( `Change product description`, async () => {
			await page
				.locator( '.wp-editor-area >> nth=0' )
				.fill( 'This product is pretty awesome' );
		} );

		await test.step( `Change regular price.`, async () => {
			await page.locator( '#_regular_price' ).fill( '100.05' );
		} );

		await test.step( `Publish the edits`, async () => {
			await page.locator( '#publish' ).click();
		} );

		await test.step( `Verify changes saved.`, async () => {
			await test.step( `Verify product title.`, async () => {
				await expect( page.locator( '#title' ) ).toHaveValue(
					'Awesome product'
				);
			} );

			await test.step( `Verify product description.`, async () => {
				await expect(
					page.locator( '.wp-editor-area >> nth=0' )
				).toContainText( 'This product is pretty awesome' );
			} );

			await test.step( `Verify product price.`, async () => {
				await expect( page.locator( '#_regular_price' ) ).toHaveValue(
					'100.05'
				);
			} );
		} );
	} );
} );
