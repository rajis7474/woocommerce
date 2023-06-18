const { test, expect } = require( '@playwright/test' );
const wcApi = require( '@woocommerce/woocommerce-rest-api' ).default;

test.describe( 'WooCommerce General Settings', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	test.afterAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );

		await test.step( `Allow selling to all countries`, async () => {
			await api.put( 'settings/general/woocommerce_allowed_countries', {
				value: 'all',
			} );
		} );
	} );

	test( 'can update settings', async ( { page } ) => {
		await test.step( `Go to WooCommerce > Settings`, async () => {
			await page.goto( 'wp-admin/admin.php?page=wc-settings' );
		} );

		await test.step( `Make sure the general tab is active`, async () => {
			await expect( page.locator( 'a.nav-tab-active' ) ).toContainText(
				'General'
			);
		} );

		await test.step( `Set selling location to all countries first so we can choose California as base location.`, async () => {
			await page
				.locator( '#woocommerce_allowed_countries' )
				.selectOption( 'all' );
			await page.locator( 'text=Save changes' ).click();
		} );

		await test.step( `Confirm setting saved`, async () => {
			await expect( page.locator( 'div.updated.inline' ) ).toContainText(
				'Your settings have been saved.'
			);
			await expect(
				page.locator( '#woocommerce_allowed_countries' )
			).toHaveValue( 'all' );
		} );

		await test.step( `Set the base location with state CA.`, async () => {
			await page
				.locator( 'select[name="woocommerce_default_country"]' )
				.selectOption( 'US:CA' );
			await page.locator( 'text=Save changes' ).click();
		} );

		await test.step( `Verify the settings have been saved`, async () => {
			await expect( page.locator( 'div.updated.inline' ) ).toContainText(
				'Your settings have been saved.'
			);
			await expect(
				page.locator( 'select[name="woocommerce_default_country"]' )
			).toHaveValue( 'US:CA' );
		} );

		await test.step( `Set selling location to specific countries first, so we can choose U.S as base location (without state). This will makes specific countries option appears.`, async () => {
			await page
				.locator( '#woocommerce_allowed_countries' )
				.selectOption( 'specific' );
			await page
				.locator(
					'select[data-placeholder="Choose countries / regions…"] >> nth=1'
				)
				.selectOption( 'US' );
		} );

		await test.step( `Set currency options`, async () => {
			await page.locator( '#woocommerce_price_thousand_sep' ).fill( ',' );
			await page.locator( '#woocommerce_price_decimal_sep' ).fill( '.' );
			await page.locator( '#woocommerce_price_num_decimals' ).fill( '2' );
			await page.locator( 'text=Save changes' ).click();
		} );

		await test.step( `Verify that settings have been saved`, async () => {
			await expect( page.locator( 'div.updated.inline' ) ).toContainText(
				'Your settings have been saved.'
			);
			await expect(
				page.locator( '#woocommerce_price_thousand_sep' )
			).toHaveValue( ',' );
			await expect(
				page.locator( '#woocommerce_price_decimal_sep' )
			).toHaveValue( '.' );
			await expect(
				page.locator( '#woocommerce_price_num_decimals' )
			).toHaveValue( '2' );
		} );
	} );
} );
