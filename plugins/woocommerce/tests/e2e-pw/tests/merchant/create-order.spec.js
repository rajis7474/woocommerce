const { test, expect } = require( '@playwright/test' );
const wcApi = require( '@woocommerce/woocommerce-rest-api' ).default;

const simpleProductName = 'Add new order simple product';
const variableProductName = 'Add new order variable product';
const externalProductName = 'Add new order external product';
const groupedProductName = 'Add new order grouped product';
const productNames = [
	simpleProductName,
	variableProductName,
	externalProductName,
	groupedProductName,
];
const taxClasses = [
	{
		name: 'Tax Class Simple',
		slug: 'tax-class-simple',
	},
	{
		name: 'Tax Class Variable',
		slug: 'tax-class-variable',
	},
	{
		name: 'Tax Class External',
		slug: 'tax-class-external',
	},
];
const taxRates = [
	{
		name: 'Tax Rate Simple',
		rate: '10.0000',
		class: 'tax-class-simple',
	},
	{
		name: 'Tax Rate Variable',
		rate: '20.0000',
		class: 'tax-class-variable',
	},
	{
		name: 'Tax Rate External',
		rate: '30.0000',
		class: 'tax-class-external',
	},
];
const taxTotals = [ '10.00', '20.00', '240.00' ];
let simpleProductId,
	variableProductId,
	externalProductId,
	subProductAId,
	subProductBId,
	groupedProductId,
	orderId;

test.describe( 'WooCommerce Orders > Add new order', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	test.beforeAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );

		await test.step( `Enable taxes on the account`, async () => {
			await api.put( 'settings/general/woocommerce_calc_taxes', {
				value: 'yes',
			} );
		} );

		await test.step( `Add tax classes.`, async () => {
			for ( const taxClass of taxClasses ) {
				await api.post( 'taxes/classes', taxClass );
			}
		} );

		await test.step( `Attach rates to the classes`, async () => {
			for ( let i = 0; i < taxRates.length; i++ ) {
				await api.post( 'taxes', taxRates[ i ] );
			}
		} );

		await test.step( `Create simple product`, async () => {
			await api
				.post( 'products', {
					name: simpleProductName,
					type: 'simple',
					regular_price: '100',
					tax_class: 'Tax Class Simple',
				} )
				.then( ( resp ) => {
					simpleProductId = resp.data.id;
				} );
		} );

		await test.step( `Create variable product`, async () => {
			const variations = [
				{
					regular_price: '100',
					attributes: [
						{
							name: 'Size',
							option: 'Small',
						},
						{
							name: 'Colour',
							option: 'Yellow',
						},
					],
					tax_class: 'Tax Class Variable',
				},
				{
					regular_price: '100',
					attributes: [
						{
							name: 'Size',
							option: 'Medium',
						},
						{
							name: 'Colour',
							option: 'Magenta',
						},
					],
					tax_class: 'Tax Class Variable',
				},
			];
			await api
				.post( 'products', {
					name: variableProductName,
					type: 'variable',
					tax_class: 'Tax Class Variable',
				} )
				.then( async ( response ) => {
					variableProductId = response.data.id;
					for ( const key in variations ) {
						await api.post(
							`products/${ variableProductId }/variations`,
							variations[ key ]
						);
					}
				} );
		} );

		await test.step( `Create external product`, async () => {
			await api
				.post( 'products', {
					name: externalProductName,
					regular_price: '800',
					tax_class: 'Tax Class External',
					external_url: 'https://wordpress.org/plugins/woocommerce',
					type: 'external',
					button_text: 'Buy now',
				} )
				.then( ( response ) => {
					externalProductId = response.data.id;
				} );
		} );

		await test.step( `Create grouped product`, async () => {
			await api
				.post( 'products', {
					name: 'Add-on A',
					regular_price: '11.95',
				} )
				.then( ( response ) => {
					subProductAId = response.data.id;
				} );
			await api
				.post( 'products', {
					name: 'Add-on B',
					regular_price: '18.97',
				} )
				.then( ( response ) => {
					subProductBId = response.data.id;
				} );
			await api
				.post( 'products', {
					name: groupedProductName,
					regular_price: '29.99',
					grouped_products: [ subProductAId, subProductBId ],
					type: 'grouped',
				} )
				.then( ( response ) => {
					groupedProductId = response.data.id;
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

		await test.step( `Cleans up all products after run`, async () => {
			await api.post( 'products/batch', {
				delete: [
					simpleProductId,
					variableProductId,
					externalProductId,
					subProductAId,
					subProductBId,
					groupedProductId,
				],
			} );
		} );

		await test.step( `Clean up tax classes and rates`, async () => {
			for ( const { slug } of taxClasses ) {
				await api
					.delete( `taxes/classes/${ slug }`, {
						force: true,
					} )
					.catch( ( error ) => {
						if (
							error.response.data.code ===
							'woocommerce_rest_invalid_tax_class'
						) {
							// do nothing, probably the tax class was not created due to a failing test
						} else {
							// Something else went wrong.
							throw new Error( error.response.data );
						}
					} );
			}
		} );

		await test.step( `Turn off taxes`, async () => {
			await api.put( 'settings/general/woocommerce_calc_taxes', {
				value: 'no',
			} );
		} );

		await test.step( `Delete test order if created.`, async () => {
			if ( orderId ) {
				await api.delete( `orders/${ orderId }`, { force: true } );
			}
		} );
	} );

	test( 'can create new order', async ( { page } ) => {
		await test.step( `Go to 'Add new order' page.`, async () => {
			await page.goto( 'wp-admin/post-new.php?post_type=shop_order' );
			await page.waitForLoadState( 'networkidle' );
		} );

		await test.step( `Expect heading to be 'Add new order'`, async () => {
			await expect(
				page.locator( 'h1.wp-heading-inline' )
			).toContainText( 'Add new order' );
		} );

		orderId = await test.step( `Get order ID from the page`, async () => {
			const orderText = await page
				.locator( 'h2.woocommerce-order-data__heading' )
				.textContent();

			const id = orderText
				.match( /([0-9])\w+/ )
				.at( 0 )
				.toString();

			return id;
		} );

		await test.step( `Select 'Processing' from the status menu`, async () => {
			await page
				.locator( '#order_status' )
				.selectOption( 'wc-processing' );
		} );

		await test.step( `Fill in 'Date created' inputs.`, async () => {
			await page.locator( 'input[name=order_date]' ).fill( '2018-12-13' );
			await page.locator( 'input[name=order_date_hour]' ).fill( '18' );
			await page.locator( 'input[name=order_date_minute]' ).fill( '55' );
		} );

		await test.step( `Click 'Create'.`, async () => {
			await page.locator( 'button.save_order' ).click();
		} );

		await test.step( `Expect 'Order updated' notice to appear.`, async () => {
			await expect(
				page.locator(
					'div.updated.notice.notice-success.is-dismissible',
					{
						has: page.locator( 'p' ),
					}
				)
			).toContainText( 'Order updated.' );
		} );

		await test.step( `Expect Status menu to have value 'Processing'.`, async () => {
			await expect( page.locator( '#order_status' ) ).toHaveValue(
				'wc-processing'
			);
		} );

		await test.step( `Expect order note to be created.`, async () => {
			await expect( page.locator( 'div.note_content' ) ).toContainText(
				'Order status changed from Pending payment to Processing.'
			);
		} );
	} );

	test( 'can create new complex order with multiple product types & tax classes', async ( {
		page,
	} ) => {
		await test.step( `Go to 'Add new order' page.`, async () => {
			await page.goto( 'wp-admin/post-new.php?post_type=shop_order' );
		} );

		await test.step( `Open modal for adding line items`, async () => {
			await page.locator( 'button.add-line-item' ).click();
			await page.locator( 'button.add-order-item' ).click();
		} );

		for ( const pName of productNames ) {
			await test.step( `Add "${ pName }" to order`, async () => {
				await test.step( `Click 'Search for a product…'`, async () => {
					await page.locator( 'text=Search for a product…' ).click();
				} );

				await test.step( `Search and select "${ pName }"`, async () => {
					await page
						.locator( '.select2-search--dropdown' )
						.getByRole( 'combobox' )
						.type( pName );
					await page
						.locator(
							'li.select2-results__option.select2-results__option--highlighted'
						)
						.click();
				} );
			} );
		}

		await test.step( `Click on the 'Add' button.`, async () => {
			await page.locator( 'button#btn-ok' ).click();
		} );

		await test.step( `Assert that products were added.`, async () => {
			for ( const pName of productNames ) {
				await expect(
					page.getByRole( 'link', { name: pName } )
				).toBeVisible();
			}
		} );

		await test.step( `Recalculate taxes`, async () => {
			page.on( 'dialog', ( dialog ) => dialog.accept() );
			await page.locator( 'text=Recalculate' ).click();
		} );

		await test.step( `Verify tax names`, async () => {
			let i = 0;
			for ( const taxRate of taxRates ) {
				await expect(
					page.locator( `th.line_tax >> nth=${ i }` )
				).toHaveText( taxRate.name );
				i++;
			}
		} );

		await test.step( `Verify tax amounts.`, async () => {
			let i = 1; // subtotal line is 0 here
			for ( const taxAmount of taxTotals ) {
				await expect(
					page.locator( `.wc-order-totals td.total >> nth=${ i }` )
				).toContainText( taxAmount );
				i++;
			}
		} );
	} );
} );
