const { test, expect } = require( '@playwright/test' );

test.describe( 'A basic set of tests to ensure WP, wp-admin and my-account load', () => {
	test( 'Load the home page', async ( { page } ) => {
		await test.step( 'Go to home page', async () => {
			await page.goto( '/' );
		} );

		await test.step( "Expect site title to have text 'WooCommerce Core E2E Test Suite'", async () => {
			const title = page.locator( 'h1.site-title' );
			await expect( title ).toHaveText(
				'WooCommerce Core E2E Test Suite'
			);
		} );
	} );

	test.describe( 'Sign in as admin', () => {
		test.use( {
			storageState: process.env.ADMINSTATE,
		} );

		test( 'Load wp-admin', async ( { page } ) => {
			await test.step( 'Go to /wp-admin page', async () => {
				await page.goto( '/wp-admin' );
			} );

			await test.step( 'Expect header to have text "Dashboard"', async () => {
				const title = page.locator( 'div.wrap > h1' );
				await expect( title ).toHaveText( 'Dashboard' );
			} );
		} );
	} );

	test.describe( 'Sign in as customer', () => {
		test.use( {
			storageState: process.env.CUSTOMERSTATE,
		} );
		test( 'Load customer my account page', async ( { page } ) => {
			await test.step( 'Go to "My account" page', async () => {
				await page.goto( '/my-account' );
			} );

			await test.step( 'Expect header to have text "My account"', async () => {
				const title = page.locator( 'h1.entry-title' );
				await expect( title ).toHaveText( 'My account' );
			} );
		} );
	} );
} );
