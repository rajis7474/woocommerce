const { test, expect } = require( '@playwright/test' );

test.describe( 'Marketing page', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	test( 'A user can view the Marketing > Overview page without it crashing', async ( {
		page,
	} ) => {
		await test.step( `Go to the Marketing page.`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-admin&path=%2Fmarketing'
			);
		} );

		await test.step( `Users should see the "Learn about marketing a store" card.`, async () => {
			await expect(
				page.locator( '"Learn about marketing a store"' )
			).toBeVisible();
		} );
	} );
} );
