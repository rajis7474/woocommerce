const { test, expect } = require( '@playwright/test' );
const wcApi = require( '@woocommerce/woocommerce-rest-api' ).default;

test.describe( 'Payment setup task', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	test.beforeEach( async ( { page } ) => {
		await test.step( `Go to the onboarding setup wizard.`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-admin&path=/setup-wizard'
			);
		} );

		await test.step( `Click 'Skip setup store details'.`, async () => {
			await page.locator( 'text=Skip setup store details' ).click();
		} );

		await test.step( `Click 'No thanks'.`, async () => {
			await page.locator( 'button >> text=No thanks' ).click();
			await page.waitForLoadState( 'networkidle' );
		} );
	} );

	test.afterAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );

		await test.step( `Disable BACS.`, async () => {
			await api.put( 'payment_gateways/bacs', {
				enabled: false,
			} );
		} );

		await test.step( `Disable COD.`, async () => {
			await api.put( 'payment_gateways/cod', {
				enabled: false,
			} );
		} );
	} );

	test( 'Can visit the payment setup task from the homescreen if the setup wizard has been skipped', async ( {
		page,
	} ) => {
		await test.step( `Go to WooCommerce > Home.`, async () => {
			await page.goto( 'wp-admin/admin.php?page=wc-admin' );
		} );

		await test.step( `Click 'Set up payments'`, async () => {
			await page.locator( 'text=Set up payments' ).click();
		} );

		await test.step( `Expect heading to show 'Set up payments'`, async () => {
			await expect(
				page.locator( '.woocommerce-layout__header-wrapper > h1' )
			).toHaveText( 'Set up payments' );
		} );
	} );

	test( 'Saving valid bank account transfer details enables the payment method', async ( {
		page,
	} ) => {
		await test.step( `Load the bank transfer page`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-admin&task=payments&id=bacs'
			);

			// purposely no await -- close the help dialog if/when it appears
			page.locator( '.components-button.is-small.has-icon' )
				.click()
				.catch( () => {} );
		} );

		await test.step( `Fill in bank transfer form`, async () => {
			await page
				.locator( '//input[@placeholder="Account name"]' )
				.fill( 'Savings' );
			await page
				.locator( '//input[@placeholder="Account number"]' )
				.fill( '1234' );
			await page
				.locator( '//input[@placeholder="Bank name"]' )
				.fill( 'Test Bank' );
			await page
				.locator( '//input[@placeholder="Sort code"]' )
				.fill( '12' );
			await page
				.locator( '//input[@placeholder="IBAN"]' )
				.fill( '12 3456 7890' );
			await page
				.locator( '//input[@placeholder="BIC / Swift"]' )
				.fill( 'ABBA' );
			await page.locator( 'text=Save' ).click();
		} );

		await test.step( `Check that bank transfers were set up`, async () => {
			await expect(
				page.locator( 'div.components-snackbar__content' )
			).toContainText(
				'Direct bank transfer details added successfully'
			);
		} );

		await test.step( `Go to WooCommerce > Settings > Payments`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-settings&tab=checkout'
			);
		} );

		await test.step( `Expect BACS to be enabled.`, async () => {
			await expect(
				page.locator(
					'//tr[@data-gateway_id="bacs"]/td[@class="status"]/a'
				)
			).toHaveClass( 'wc-payment-gateway-method-toggle-enabled' );
		} );
	} );

	test( 'Enabling cash on delivery enables the payment method', async ( {
		page,
		baseURL,
	} ) => {
		// Payments page differs if located outside of a WCPay-supported country, so make sure we aren't.
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );

		await test.step( `Ensure store address is US`, async () => {
			await api.post( 'settings/general/batch', {
				update: [
					{
						id: 'woocommerce_store_address',
						value: 'addr 1',
					},
					{
						id: 'woocommerce_store_city',
						value: 'San Francisco',
					},
					{
						id: 'woocommerce_default_country',
						value: 'US:CA',
					},
					{
						id: 'woocommerce_store_postcode',
						value: '94107',
					},
				],
			} );
		} );

		await test.step( `Go to 'Set up payments' task page.`, async () => {
			await page.goto( 'wp-admin/admin.php?page=wc-admin&task=payments' );

			// purposely no await -- close the help dialog if/when it appears
			page.locator( '.components-button.is-small.has-icon' )
				.click()
				.catch( () => {} );
			await page.waitForLoadState( 'networkidle' );
		} );

		await test.step( `Enable COD payment option`, async () => {
			await page
				.locator(
					'div.woocommerce-task-payment-cod > div.woocommerce-task-payment__footer > button'
				)
				.click();
			await page.waitForLoadState( 'networkidle' );
		} );

		await test.step( `Go to WooCommerce > Settings > Payments`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-settings&tab=checkout'
			);
		} );

		await test.step( `Expect COD to be enabled.`, async () => {
			await expect(
				page.locator(
					'//tr[@data-gateway_id="cod"]/td[@class="status"]/a'
				)
			).toHaveClass( 'wc-payment-gateway-method-toggle-enabled' );
		} );
	} );
} );
