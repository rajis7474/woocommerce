const { test, expect } = require( '@playwright/test' );
const wcApi = require( '@woocommerce/woocommerce-rest-api' ).default;
const path = require( 'path' );
const filePath = path.resolve( 'tests/e2e-pw/test-data/sample_products.csv' );
const filePathOverride = path.resolve(
	'tests/e2e-pw/test-data/sample_products_override.csv'
);

const productIds = [];
const categoryIds = [];
const attributeIds = [];

const productNames = [
	'Imported V-Neck T-Shirt',
	'Imported Hoodie',
	'Imported Hoodie with Logo',
	'Imported T-Shirt',
	'Imported Beanie',
	'Imported Belt',
	'Imported Cap',
	'Imported Sunglasses',
	'Imported Hoodie with Pocket',
	'Imported Hoodie with Zipper',
	'Imported Long Sleeve Tee',
	'Imported Polo',
	'Imported Album',
	'Imported Single',
	'Imported T-Shirt with Logo',
	'Imported Beanie with Logo',
	'Imported Logo Collection',
	'Imported WordPress Pennant',
];
const productNamesOverride = [
	'Imported V-Neck T-Shirt Override',
	'Imported Hoodie Override',
	'Imported Hoodie with Logo Override',
	'Imported T-Shirt Override',
	'Imported Beanie Override',
	'Imported Belt Override',
	'Imported Cap Override',
	'Imported Sunglasses Override',
	'Imported Hoodie with Pocket Override',
	'Imported Hoodie with Zipper Override',
	'Imported Long Sleeve Tee Override',
	'Imported Polo Override',
	'Imported Album Override',
	'Imported Single Override',
	'Imported T-Shirt with Logo Override',
	'Imported Beanie with Logo Override',
	'Imported Logo Collection Override',
	'Imported WordPress Pennant Override',
];
const productPricesOverride = [
	'$111.05',
	'$118.00',
	'$145.00',
	'$120.00',
	'$118.00',
	'$118.00',
	'$13.00',
	'$12.00',
	'$115.00',
	'$120.00',
	'$125.00',
	'$145.00',
	'$145.00',
	'$135.00',
	'$190.00',
	'$118.00',
	'$116.00',
	'$165.00',
	'$155.00',
	'$120.00',
	'$118.00',
	'$118.00',
	'$145.00',
	'$142.00',
	'$145.00',
	'$115.00',
	'$120.00',
];
const productCategories = [
	'Clothing',
	'Hoodies',
	'Tshirts',
	'Accessories',
	'Music',
	'Decor',
];
const productAttributes = [ 'Color', 'Size' ];

test.describe.serial( 'Import Products from a CSV file', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	test.beforeAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );

		await test.step( `Make sure the currency is USD`, async () => {
			await api.put( 'settings/general/woocommerce_currency', {
				value: 'USD',
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

		await test.step( `get a list of all products`, async () => {
			await api.get( 'products?per_page=50' ).then( ( response ) => {
				for ( let i = 0; i < response.data.length; i++ ) {
					// if the product is one we imported, add it to the array
					for ( let j = 0; j < productNamesOverride.length; j++ ) {
						if (
							response.data[ i ].name ===
							productNamesOverride[ j ]
						) {
							productIds.push( response.data[ i ].id );
						}
					}
				}
			} );
		} );

		await test.step( `Batch delete all test products`, async () => {
			await api.post( 'products/batch', { delete: [ ...productIds ] } );
		} );

		await test.step( `Get a list of all product categories`, async () => {
			await api.get( 'products/categories' ).then( ( response ) => {
				for ( let i = 0; i < response.data.length; i++ ) {
					// if the product category is one that was created, add it to the array
					for ( let j = 0; j < productCategories.length; j++ ) {
						if (
							response.data[ i ].name === productCategories[ j ]
						) {
							categoryIds.push( response.data[ i ].id );
						}
					}
				}
			} );
		} );

		await test.step( `Batch delete all categories in the array`, async () => {
			await api.post( 'products/categories/batch', {
				delete: [ ...categoryIds ],
			} );
		} );

		await test.step( `Get a list of all product attributes`, async () => {
			await api.get( 'products/attributes' ).then( ( response ) => {
				for ( let i = 0; i < response.data.length; i++ ) {
					// if the product attribute is one that was created, add it to the array
					for ( let j = 0; j < productAttributes.length; j++ ) {
						if (
							response.data[ i ].name === productAttributes[ j ]
						) {
							attributeIds.push( response.data[ i ].id );
						}
					}
				}
			} );
		} );

		await test.step( `Batch delete attributes in the array`, async () => {
			await api.post( 'products/attributes/batch', {
				delete: [ ...attributeIds ],
			} );
		} );
	} );

	test.beforeEach( async ( { page } ) => {
		await test.step( `Go to the product import page.`, async () => {
			await page.goto(
				'wp-admin/edit.php?post_type=product&page=product_importer'
			);
		} );
	} );

	test( 'should show error message if you go without providing CSV file', async ( {
		page,
	} ) => {
		await test.step( `Click 'Continue' without providing a CSV file.`, async () => {
			await page.locator( 'button[value="Continue"]' ).click();
		} );

		await test.step( `Verify the error message if you go without providing CSV file`, async () => {
			const errorMessage =
				'Invalid file type. The importer supports CSV and TXT file formats.';

			await expect( page.locator( 'div.error.inline' ) ).toContainText(
				errorMessage
			);
		} );
	} );

	test( 'can upload the CSV file and import products', async ( { page } ) => {
		await test.step( `Select the CSV file and upload it`, async () => {
			const [ fileChooser ] = await Promise.all( [
				page.waitForEvent( 'filechooser' ),
				page.locator( '#upload' ).click(),
			] );
			await fileChooser.setFiles( filePath );
			await page.locator( 'button[value="Continue"]' ).click();
		} );

		await test.step( `Click on run the importer`, async () => {
			await page.locator( 'button[value="Run the importer"]' ).click();
		} );

		await test.step( `Confirm that the import is done`, async () => {
			await expect(
				page.locator( '.woocommerce-importer-done' )
			).toContainText( 'Import complete!', { timeout: 120000 } );
		} );

		await test.step( `View the products`, async () => {
			await page.locator( 'text=View products' ).click();
		} );

		await test.step( `Search for "import" to narrow the results to just the products we imported`, async () => {
			await page.locator( '#post-search-input' ).fill( 'Imported' );
			await page.locator( '#search-submit' ).click();
		} );

		await test.step( `Compare imported products to what's expected`, async () => {
			await expect( page.locator( 'a.row-title' ) ).toHaveCount(
				productNames.length
			);
			const productTitles = await page
				.locator( 'a.row-title' )
				.allTextContents();

			expect( productTitles.sort() ).toEqual( productNames.sort() );
		} );
	} );

	test( 'can override the existing products via CSV import', async ( {
		page,
	} ) => {
		await test.step( `Put the CSV Override products file, set checkbox and proceed further`, async () => {
			const [ fileChooser ] = await Promise.all( [
				page.waitForEvent( 'filechooser' ),
				page.locator( '#upload' ).click(),
			] );
			await fileChooser.setFiles( filePathOverride );
			await page
				.locator( '#woocommerce-importer-update-existing' )
				.click();
			await page.locator( 'button[value="Continue"]' ).click();
		} );

		await test.step( `Click on run the importer`, async () => {
			await page.locator( 'button[value="Run the importer"]' ).click();
		} );

		await test.step( `Confirm that the import is done`, async () => {
			await expect(
				page.locator( '.woocommerce-importer-done' )
			).toContainText( 'Import complete!', { timeout: 120000 } ); // import can take a while
		} );

		await test.step( `View the products`, async () => {
			await page.locator( 'text=View products' ).click();
		} );

		await test.step( `Search for "import" to narrow the results to just the products we imported`, async () => {
			await page.locator( '#post-search-input' ).fill( 'Imported' );
			await page.locator( '#search-submit' ).click();
		} );

		await test.step( `Compare imported products to what's expected`, async () => {
			await expect( page.locator( 'a.row-title' ) ).toHaveCount(
				productNamesOverride.length
			);
			const productTitles = await page
				.locator( 'a.row-title' )
				.allInnerTexts();

			expect( productTitles.sort() ).toEqual(
				productNamesOverride.sort()
			);
		} );

		await test.step( `Compare product prices to what's expected`, async () => {
			await expect( page.locator( '.amount' ) ).toHaveCount(
				productPricesOverride.length
			);
			const productPrices = await page
				.locator( '.amount' )
				.allInnerTexts();

			expect( productPrices.sort() ).toStrictEqual(
				productPricesOverride.sort()
			);
		} );
	} );
} );
