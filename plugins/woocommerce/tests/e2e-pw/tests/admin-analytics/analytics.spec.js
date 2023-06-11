const { test, expect } = require( '@playwright/test' );

test.describe( 'Analytics pages', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	for ( const aPages of [
		'Overview',
		'Products',
		'Revenue',
		'Orders',
		'Variations',
		'Categories',
		'Coupons',
		'Taxes',
		'Downloads',
		'Stock',
		'Settings',
	] ) {
		test( `A user can view the ${ aPages } page without it crashing`, async ( {
			page,
		} ) => {
			await test.step( `Go to Analytics > ${ aPages }`, async () => {
				const urlTitle = aPages.toLowerCase();
				await page.goto(
					`/wp-admin/admin.php?page=wc-admin&path=%2Fanalytics%2F${ urlTitle }`
				);
			} );

			await test.step( `Expect header text to contain "${ aPages }"`, async () => {
				const pageTitle = page.locator(
					'.woocommerce-layout__header-wrapper > h1'
				);
				await expect( pageTitle ).toContainText( aPages );
			} );

			await test.step( `Expect page content to be visible.`, async () => {
				await expect(
					page.locator( '#woocommerce-layout__primary' )
				).toBeVisible();
			} );
		} );
	}
} );
