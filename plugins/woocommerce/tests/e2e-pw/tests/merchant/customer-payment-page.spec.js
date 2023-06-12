const { test, expect } = require( '@playwright/test' );
const wcApi = require( '@woocommerce/woocommerce-rest-api' ).default;

let productId, orderId;
const productName = 'Simple Product Name';
const productPrice = '15.99';

test.describe( 'WooCommerce Merchant Flow: Orders > Customer Payment Page', () => {
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
					name: productName,
					type: 'simple',
					regular_price: productPrice,
				} )
				.then( ( response ) => {
					productId = response.data.id;
				} );
		} );

		await test.step( `Create an order`, async () => {
			await api
				.post( 'orders', {
					line_items: [
						{
							product_id: productId,
							quantity: 1,
						},
					],
				} )
				.then( ( response ) => {
					orderId = response.data.id;
				} );
		} );

		await test.step( `Enable bank transfer as a payment option`, async () => {
			await api.put( 'payment_gateways/bacs', {
				enabled: 'true',
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

		await test.step( `Delete test products, orders, and toggle BACS off.`, async () => {
			await api.delete( `products/${ productId }`, { force: true } );
			await api.delete( `orders/${ orderId }`, { force: true } );
		} );
	} );

	test( 'can pay order for customer', async ( { page } ) => {
		await test.step( `Go to "Edit order" page of order ID ${ orderId }.`, async () => {
			await page.goto(
				`wp-admin/post.php?post=${ orderId }&action=edit`
			);
		} );

		await test.step( `Verify that the order is pending payment`, async () => {
			await expect(
				page.locator( '#select2-order_status-container' )
			).toContainText( 'Pending payment' );
		} );

		await test.step( `Verify that the customer payment page link is displayed`, async () => {
			await expect(
				page.locator( 'label[for=order_status] > a' )
			).toContainText( 'Customer payment page →' );
		} );

		await test.step( `Click 'Customer payment page'.`, async () => {
			await page.locator( 'label[for=order_status] > a' ).click();
		} );

		await test.step( `Verify we landed on the customer payment page`, async () => {
			await expect( page.locator( 'h1.entry-title' ) ).toContainText(
				'Pay for order'
			);
		} );

		await test.step( `Expect product name to be correctly shown.`, async () => {
			await expect( page.locator( 'td.product-name' ) ).toContainText(
				productName
			);
		} );

		await test.step( `Expect product price to be correctly shown.`, async () => {
			await expect(
				page.locator( 'span.woocommerce-Price-amount.amount >> nth=0' )
			).toContainText( productPrice );
		} );

		await test.step( `Click 'Pay for order'.`, async () => {
			await page.locator( 'button#place_order' ).click();
		} );

		await test.step( `Verify we landed on the order received page`, async () => {
			await expect( page.locator( 'h1.entry-title' ) ).toContainText(
				'Order received'
			);
		} );

		await test.step( `Expect order ID to be shown.`, async () => {
			await expect(
				page.locator( 'li.woocommerce-order-overview__order.order' )
			).toContainText( orderId.toString() );
		} );

		await test.step( `Expect product price to be shown.`, async () => {
			await expect(
				page.locator( 'span.woocommerce-Price-amount.amount >> nth=0' )
			).toContainText( productPrice );
		} );
	} );
} );
