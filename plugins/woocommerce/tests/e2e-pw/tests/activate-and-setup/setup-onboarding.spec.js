const { test, expect } = require( '@playwright/test' );

test.describe(
	'Store owner can login and make sure WooCommerce is activated',
	() => {
		test.use( { storageState: process.env.ADMINSTATE } );

		test( 'can make sure WooCommerce is activated.', async ( { page } ) => {
			await test.step( `Go to Plugins > Installed plugins`, async () => {
				await page.goto( '/wp-admin/plugins.php' );
			} );

			await test.step( `Expect the woo plugin to be displayed -- if there's an update available, it has the same data-slug attribute`, async () => {
				await expect(
					page.locator( "//tr[@data-slug='woocommerce'][1]" )
				).toBeVisible();
			} );

			await test.step( `Expect it to have an active class`, async () => {
				await expect(
					page.locator( "//tr[@data-slug='woocommerce'][1]" )
				).toHaveClass( /active/ );
			} );
		} );
	}
);
