const { test, expect } = require( '@playwright/test' );
const { admin } = require( '../../test-data/data' );
const wcApi = require( '@woocommerce/woocommerce-rest-api' ).default;

test.describe( 'Merchant > Order Action emails received', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	const customerBilling = {
		email: 'john.doe.merchant.test@example.com',
	};

	const storeName = 'WooCommerce Core E2E Test Suite';
	let orderId, newOrderId;

	test.beforeAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );
		await api
			.post( 'orders', {
				status: 'processing',
				billing: customerBilling,
			} )
			.then( ( response ) => {
				orderId = response.data.id;
			} );
	} );

	test.beforeEach( async ( { page } ) => {
		await test.step( `Go to WP Mail Logging > Email Log`, async () => {
			await page.goto(
				`wp-admin/tools.php?page=wpml_plugin_log&s=${ encodeURIComponent(
					customerBilling.email
				) }`
			);
		} );

		await test.step( `Clear out the email logs before each test`, async () => {
			while (
				await page.locator( '#bulk-action-selector-top' ).isVisible()
			) {
				await page.locator( '#cb-select-all-1' ).check();
				await page
					.locator( '#bulk-action-selector-top' )
					.selectOption( 'delete' );
				await page.locator( '#doaction' ).click();
			}
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
			await api.post( 'orders/batch', {
				delete: [ orderId, newOrderId ],
			} );
		} );
	} );

	test( 'can receive new order email', async ( { page, baseURL } ) => {
		// New order emails are sent automatically when we create a simple order. Verify that we get these.
		// Need to create a new order for this test because we clear logs before each run.
		await test.step( `Create new order.`, async () => {
			const api = new wcApi( {
				url: baseURL,
				consumerKey: process.env.CONSUMER_KEY,
				consumerSecret: process.env.CONSUMER_SECRET,
				version: 'wc/v3',
			} );
			await api
				.post( 'orders', {
					status: 'processing',
					billing: customerBilling,
				} )
				.then( ( response ) => {
					newOrderId = response.data.id;
				} );
		} );

		await test.step( `Search to narrow it down to just the messages we want`, async () => {
			await page.goto(
				`wp-admin/tools.php?page=wpml_plugin_log&s=${ encodeURIComponent(
					customerBilling.email
				) }`
			);
		} );

		await test.step( `Expect recipient to be the admin email.`, async () => {
			await expect(
				page.locator( 'td.column-receiver >> nth=1' )
			).toContainText( admin.email );
		} );

		await test.step( `Expect subject to be correct.`, async () => {
			await expect(
				page.locator( 'td.column-subject >> nth=1' )
			).toContainText( `[${ storeName }]: New order #${ newOrderId }` );
		} );
	} );

	test( 'can resend new order notification', async ( { page } ) => {
		await test.step( `Open the order we created.`, async () => {
			await page.goto(
				`wp-admin/post.php?post=${ orderId }&action=edit`
			);
		} );

		await test.step( `Resend the new order notification`, async () => {
			await page
				.locator( 'li#actions > select' )
				.selectOption( 'send_order_details_admin' );
			await page.locator( 'button.wc-reload' ).click();
			await page.waitForLoadState( 'networkidle' );
		} );

		await test.step( `Go to the WP Mail logs`, async () => {
			await page.goto(
				`wp-admin/tools.php?page=wpml_plugin_log&s=${ encodeURIComponent(
					customerBilling.email
				) }`
			);
		} );

		await test.step( `Search to narrow it down to just the messages we want`, async () => {
			await expect( page.locator( 'td.column-receiver' ) ).toContainText(
				admin.email
			);
		} );

		await test.step( `Expect subject to be correct`, async () => {
			await expect( page.locator( 'td.column-subject' ) ).toContainText(
				`[${ storeName }]: New order #${ orderId }`
			);
		} );
	} );

	test( 'can email invoice/order details to customer', async ( { page } ) => {
		await test.step( `Open the test order.`, async () => {
			await page.goto(
				`wp-admin/post.php?post=${ orderId }&action=edit`
			);
		} );

		await test.step( `Send the customer order details`, async () => {
			await page
				.locator( 'li#actions > select' )
				.selectOption( 'send_order_details' );
			await page.locator( 'button.wc-reload' ).click();
			await page.waitForLoadState( 'networkidle' );
		} );

		await test.step( `Confirm the message was delivered in the logs`, async () => {
			await test.step( `Open the WP Mail logs`, async () => {
				await page.goto(
					`wp-admin/tools.php?page=wpml_plugin_log&s=${ encodeURIComponent(
						customerBilling.email
					) }`
				);
			} );

			await test.step( `Expect recipient to be the customer email.`, async () => {
				await expect(
					page.locator( 'td.column-receiver' )
				).toContainText( customerBilling.email );
			} );

			await test.step( `Expect subject to be correct.`, async () => {
				await expect(
					page.locator( 'td.column-subject' )
				).toContainText(
					`Invoice for order #${ orderId } on ${ storeName }`
				);
			} );
		} );
	} );
} );
