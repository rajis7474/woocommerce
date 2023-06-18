const { test, expect } = require( '@playwright/test' );
const wcApi = require( '@woocommerce/woocommerce-rest-api' ).default;

let productId;
const productName = `Unique thing that we sell ${ new Date()
	.getTime()
	.toString() }`;
const productPrice = '9.99';

/**
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} searchString
 */
const searchFor = async ( page, searchString ) => {
	await page.locator( '#post-search-input' ).fill( searchString );
	await page.locator( '#search-submit' ).click();
};

test.describe( 'Products > Search and View a product', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

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
					name: productName,
					type: 'simple',
					regular_price: productPrice,
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

	test.beforeEach( async ( { page } ) => {
		await test.step( `Go to Products > All products page.`, async () => {
			await page.goto( 'wp-admin/edit.php?post_type=product' );
		} );
	} );

	test( 'can do a partial search for a product', async ( { page } ) => {
		await test.step( `Search with substring of product name.`, async () => {
			const searchString = productName.substring(
				0,
				productName.length / 2
			);

			await searchFor( page, searchString );
		} );

		await test.step( `Expect search result to show product name.`, async () => {
			await expect( page.locator( '.row-title' ) ).toContainText(
				productName
			);
		} );
	} );

	test( "can view a product's details after search", async ( { page } ) => {
		const productIdInURL = new RegExp( `post=${ productId }` );

		await test.step( `Search with product name.`, async () => {
			await searchFor( page, productName );
		} );

		await test.step( `Click on the matching result.`, async () => {
			await page.locator( '.row-title' ).click();
		} );

		await test.step( `Expect URL to show product ID.`, async () => {
			await expect( page ).toHaveURL( productIdInURL );
		} );

		await test.step( `Expect product name to be correct.`, async () => {
			await expect( page.locator( '#title' ) ).toHaveValue( productName );
		} );

		await test.step( `Expect product price to be correct.`, async () => {
			await expect( page.locator( '#_regular_price' ) ).toHaveValue(
				productPrice
			);
		} );
	} );

	test( 'returns no results for non-existent product search', async ( {
		page,
	} ) => {
		await test.step( `Search with random string yielding no matches.`, async () => {
			await searchFor( page, 'abcd1234' );
		} );

		await test.step( `Expect message saying there were no products found.`, async () => {
			await expect( page.locator( '.no-items' ) ).toContainText(
				'No products found'
			);
		} );
	} );
} );
