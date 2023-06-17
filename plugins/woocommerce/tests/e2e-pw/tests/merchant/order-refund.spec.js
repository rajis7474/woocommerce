const { test, expect } = require( '@playwright/test' );
const wcApi = require( '@woocommerce/woocommerce-rest-api' ).default;

test.describe.serial( 'WooCommerce Orders > Refund an order', () => {
	let productId, orderId, currencySymbol;

	test.use( { storageState: process.env.ADMINSTATE } );

	test.beforeAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );
		await test.step( `Create a simple product`, async () => {
			await api
				.post( 'products', {
					name: 'Simple Refund Product',
					type: 'simple',
					regular_price: '9.99',
				} )
				.then( ( response ) => {
					productId = response.data.id;
				} );
		} );

		await test.step( `Create order`, async () => {
			await api
				.post( 'orders', {
					line_items: [
						{
							product_id: productId,
							quantity: 1,
						},
					],
					status: 'completed',
				} )
				.then( ( response ) => {
					orderId = response.data.id;
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

		await test.step( `Delete test product`, async () => {
			await api.delete( `products/${ productId }`, { force: true } );
		} );

		await test.step( `Delete test order.`, async () => {
			await api.delete( `orders/${ orderId }`, { force: true } );
		} );
	} );

	test( 'can issue a refund by quantity', async ( { page } ) => {
		await test.step( `Open the test order.`, async () => {
			await page.goto(
				`wp-admin/post.php?post=${ orderId }&action=edit`
			);
		} );

		currencySymbol = await test.step( `Get currency symbol`, async () => {
			const symbol = await page
				.locator( '.woocommerce-Price-currencySymbol' )
				.first()
				.textContent();

			return symbol;
		} );

		await test.step( `Click the 'Refund' button.`, async () => {
			await page.locator( 'button.refund-items' ).click();
		} );

		await test.step( `Verify the refund section shows`, async () => {
			await expect(
				page.locator( 'div.wc-order-refund-items' )
			).toBeVisible();
		} );

		await test.step( `Expect 'Restock refunded items' to be checked.`, async () => {
			await expect(
				page.locator( '#restock_refunded_items' )
			).toBeChecked();
		} );

		await test.step( `Initiate a refund with the reason 'No longer wanted'.`, async () => {
			await page.locator( '.refund_order_item_qty' ).fill( '1' );
			await page.locator( '#refund_reason' ).fill( 'No longer wanted' );
		} );

		await test.step( `Expect refund line total to be correct.`, async () => {
			await expect( page.locator( '.refund_line_total' ) ).toHaveValue(
				'9.99'
			);
		} );

		await test.step( `Expect refund amount to be correct.`, async () => {
			await expect( page.locator( '#refund_amount' ) ).toHaveValue(
				'9.99'
			);
		} );

		await test.step( `Expect amount in 'Refund manually' button to be correct.`, async () => {
			await expect( page.locator( '.do-manual-refund' ) ).toContainText(
				`Refund ${ currencySymbol }9.99 manually`
			);
		} );

		await test.step( `Do the refund`, async () => {
			page.on( 'dialog', ( dialog ) => dialog.accept() );
			await page
				.locator( '.do-manual-refund', {
					waitForLoadState: 'networkidle',
				} )
				.click();
		} );

		await test.step( `Verify the product line item shows the refunded quantity and amount`, async () => {
			await expect(
				page.locator( 'small.refunded >> nth=0' )
			).toContainText( '-1' );
			await expect(
				page.locator( 'small.refunded >> nth=1' )
			).toContainText( `${ currencySymbol }9.99` );
		} );

		await test.step( `Verify the refund shows in the list with the amount`, async () => {
			await expect( page.locator( 'p.description' ) ).toContainText(
				'No longer wanted'
			);

			await expect(
				page.locator( 'td.refunded-total >> nth=1' )
			).toContainText( `-${ currencySymbol }9.99` );
		} );

		await test.step( `Verify system note was added`, async () => {
			await expect(
				page.locator( '.system-note >> nth=0' )
			).toContainText(
				'Order status changed from Completed to Refunded.'
			);
		} );
	} );

	// this test relies on the previous test, so should refactor
	test( 'can delete an issued refund', async ( { page } ) => {
		await test.step( `Open test order with an issued refund.`, async () => {
			await page.goto(
				`wp-admin/post.php?post=${ orderId }&action=edit`
			);
			await page.waitForLoadState( 'networkidle' );
		} );

		await test.step( `Delete the refund.`, async () => {
			page.on( 'dialog', ( dialog ) => dialog.accept() );
			await page.getByRole( 'row', { name: /Refund #\d+/ } ).hover();
			await page.locator( '.delete_refund' ).click();
		} );

		await test.step( `Verify the refunded row item is no longer showing`, async () => {
			await expect( page.locator( 'tr.refund' ) ).toHaveCount( 0 );
		} );

		await test.step( `Verify the product line item doesn't show the refunded quantity and amount`, async () => {
			await expect( page.locator( 'small.refunded' ) ).toHaveCount( 0 );
		} );

		await test.step( `Verify the refund no longer shows in the list`, async () => {
			await expect( page.locator( 'td.refunded-total' ) ).toHaveCount(
				0
			);
		} );
	} );
} );

test.describe( 'WooCommerce Orders > Refund and restock an order item', () => {
	let productWithStockId, productWithNoStockId, orderId;

	test.use( { storageState: process.env.ADMINSTATE } );

	test.beforeAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );

		await test.step( `Create test products.`, async () => {
			const payload_withStock = {
				name: 'Product with stock',
				type: 'simple',
				regular_price: '9.99',
				manage_stock: true,
				stock_quantity: 10,
			};

			const payload_noStock = {
				name: 'Product with NO stock',
				type: 'simple',
				regular_price: '5.99',
			};

			const response = await api.post( 'products/batch', {
				create: [ payload_withStock, payload_noStock ],
			} );

			const createdProducts = response.data.create;

			productWithStockId = createdProducts.find(
				( { name } ) => name === payload_withStock.name
			).id;

			productWithNoStockId = createdProducts.find(
				( { name } ) => name === payload_noStock.name
			).id;
		} );

		await test.step( `Create test order.`, async () => {
			await api
				.post( 'orders', {
					line_items: [
						{
							product_id: productWithNoStockId,
							quantity: 1,
						},
						{
							product_id: productWithStockId,
							quantity: 2,
						},
					],
					status: 'completed',
				} )
				.then( ( response ) => {
					orderId = response.data.id;
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

		await test.step( `Batch delete test orders.`, async () => {
			await api.post( 'products/batch', {
				delete: [ productWithStockId, productWithNoStockId ],
			} );
		} );

		await test.step( `Delete test order.`, async () => {
			await api.delete( `orders/${ orderId }`, { force: true } );
		} );
	} );

	test( 'can update order after refunding item without automatic stock adjustment', async ( {
		page,
	} ) => {
		await test.step( `Open test order.`, async () => {
			await page.goto(
				`wp-admin/post.php?post=${ orderId }&action=edit`
			);
		} );

		await test.step( `Verify stock reduction system note was added`, async () => {
			await expect(
				page.locator( '.system-note >> nth=1' )
			).toContainText(
				/Stock levels reduced: Product with stock \(#\d+\) 10→8/
			);
		} );

		await test.step( `Click the Refund button`, async () => {
			await page.locator( 'button.refund-items' ).click();
		} );

		await test.step( `Verify the refund section shows`, async () => {
			await expect(
				page.locator( 'div.wc-order-refund-items' )
			).toBeVisible();
			await expect(
				page.locator( '#restock_refunded_items' )
			).toBeChecked();
		} );

		await test.step( `Initiate a refund`, async () => {
			await page.locator( '.refund_order_item_qty >> nth=1' ).fill( '2' );
			await page.locator( '#refund_reason' ).fill( 'No longer wanted' );
			page.on( 'dialog', ( dialog ) => dialog.accept() );
			await page.locator( '.do-manual-refund' ).click();
		} );

		await test.step( `Verify restock system note was added`, async () => {
			await expect(
				page.locator( '.system-note >> nth=0' )
			).toContainText( /Item #\d+ stock increased from 8 to 10./ );
		} );
	} );
} );
