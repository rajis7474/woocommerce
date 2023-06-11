const { test, expect } = require( '@playwright/test' );

test.describe( 'Coupons page', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	test( 'A user can view the coupons overview without it crashing', async ( {
		page,
	} ) => {
		await test.step( `Go to Coupons page.`, async () => {
			await page.goto(
				'wp-admin/edit.php?post_type=shop_coupon&legacy_coupon_menu=1'
			);
		} );

		await test.step( `Expect heading to have text "Coupons".`, async () => {
			await expect( page.locator( 'h1.wp-heading-inline' ) ).toHaveText(
				'Coupons'
			);
		} );

		await test.step( `Expect 'Add coupon' button to be visible`, async () => {
			await expect( page.locator( 'a.page-title-action' ) ).toHaveText(
				'Add coupon'
			);
		} );
	} );
} );
