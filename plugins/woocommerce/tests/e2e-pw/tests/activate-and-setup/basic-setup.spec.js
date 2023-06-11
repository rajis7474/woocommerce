const { test, expect } = require( '@playwright/test' );

test.describe( 'Store owner can finish initial store setup', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	test( 'can enable tax rates and calculations', async ( { page } ) => {
		await test.step( 'Go to WooCommerce > Settings', async () => {
			await page.goto( 'wp-admin/admin.php?page=wc-settings' );
		} );

		await test.step( "Check the 'Enable taxes' checkbox and save.", async () => {
			await page.locator( '#woocommerce_calc_taxes' ).check();
			await page.locator( 'text=Save changes' ).click();
		} );

		await test.step( 'Verify changes have been saved', async () => {
			await expect(
				page.locator( '#woocommerce_calc_taxes' )
			).toBeChecked();
		} );
	} );

	test( 'can configure permalink settings', async ( { page } ) => {
		await test.step( 'Go to Settings > Permalinks', async () => {
			await page.goto( 'wp-admin/options-permalink.php' );
		} );

		await test.step( 'Select "Post name" option in common settings section', async () => {
			await page.locator( 'label >> text=Post name' ).check();
		} );

		await test.step( 'Select "Custom base" in product permalinks section', async () => {
			await page.locator( 'label >> text=Custom base' ).check();
		} );

		await test.step( 'Fill custom base slug to use', async () => {
			await page
				.locator( '#woocommerce_permalink_structure' )
				.fill( '/product/' );
			await page.locator( '#submit' ).click();
		} );

		await test.step( 'Verify that settings have been saved', async () => {
			await expect(
				page.locator( '#setting-error-settings_updated' )
			).toContainText( 'Permalink structure updated.' );
			await expect( page.locator( '#permalink_structure' ) ).toHaveValue(
				'/%postname%/'
			);
			await expect(
				page.locator( '#woocommerce_permalink_structure' )
			).toHaveValue( '/product/' );
		} );
	} );
} );
