const { test, expect, Page } = require( '@playwright/test' );

// a representation of the menu structure for WC
const wcPages = [
	{
		name: 'WooCommerce',
		path: 'wp-admin/admin.php?page=wc-admin',
		subpages: [
			{ name: 'Home', heading: 'Home' },
			{ name: 'Orders', heading: 'Orders' },
			{ name: 'Customers', heading: 'Customers' },
			{ name: 'Coupons', heading: 'Coupons' },
			{ name: 'Reports', heading: 'Orders' },
			{ name: 'Settings', heading: 'General' },
			{ name: 'Status', heading: 'System status' },
			{ name: 'Extensions', heading: 'Extensions' },
		],
	},
	{
		name: 'Products',
		path: 'wp-admin/edit.php?post_type=product',
		subpages: [
			{ name: 'All Products', heading: 'Products' },
			{ name: 'Add New', heading: 'Add New' },
			{ name: 'Categories', heading: 'Product categories' },
			{ name: 'Tags', heading: 'Product tags' },
			{ name: 'Attributes', heading: 'Attributes' },
		],
	},
	// analytics is handled through a separate test
	{
		name: 'Marketing',
		path: 'wp-admin/admin.php?page=wc-admin&path=%2Fmarketing',
		subpages: [
			{ name: 'Overview', heading: 'Overview' },
			{ name: 'Coupons', heading: 'Coupons' },
		],
	},
];

/**
 * Convenience functions for complex steps.
 */
const steps = {
	/**
	 *
	 * @param {Page} page
	 * @param {string} subPageName
	 */
	skipOBW: async ( page, subPageName ) => {
		await test.step( `Skip onboarding wizard.`, async () => {
			if ( subPageName === 'Home' ) {
				await page.goto(
					'wp-admin/admin.php?page=wc-admin&path=/setup-wizard'
				);
				await page.locator( 'text=Skip setup store details' ).click();
				await page.locator( 'button >> text=No thanks' ).click();
				await page.waitForLoadState( 'networkidle' );
				await page.goto( 'wp-admin/admin.php?page=wc-admin' );
			}
		} );
	},
	/**
	 *
	 * @param {Page} page
	 * @param {string} subPageName
	 */
	skipLegacyCouponMenu: async ( page, subPageName ) => {
		await test.step( `Skip legacy Coupons menu if it's already removed.`, async () => {
			if ( subPageName === 'Coupons' ) {
				const couponsMenuVisible = await page
					.locator(
						`li.wp-menu-open > ul.wp-submenu > li:has-text("${ subPageName }")`
					)
					.isVisible();

				test.skip(
					! couponsMenuVisible,
					'Skipping this test because the legacy Coupons menu was not found and may have already been removed.'
				);
			}
		} );
	},
};

for ( const currentPage of wcPages ) {
	test.describe( `WooCommerce Page Load > Load ${ currentPage.name } sub pages`, () => {
		test.use( { storageState: process.env.ADMINSTATE } );

		test.beforeEach( async ( { page } ) => {
			await test.step( `Open "${ currentPage.name }" nav menu.`, async () => {
				await page.goto( currentPage.path );
			} );
		} );

		for ( let i = 0; i < currentPage.subpages.length; i++ ) {
			const subPageName = currentPage.subpages[ i ].name;

			test( `Can load ${ subPageName }`, async ( { page } ) => {
				await steps.skipOBW( page, subPageName );

				await steps.skipLegacyCouponMenu( page, subPageName );

				await test.step( `Click on ${ currentPage.name } > ${ subPageName }`, async () => {
					await page
						.locator(
							`li.wp-menu-open > ul.wp-submenu > li:has-text("${ currentPage.subpages[ i ].name }")`,
							{ waitForLoadState: 'networkidle' }
						)
						.click();
				} );

				await test.step( `Expect correct heading to be shown.`, async () => {
					await expect(
						page.locator( 'h1.components-text' )
					).toContainText( currentPage.subpages[ i ].heading );
				} );
			} );
		}
	} );
}
