const { test, expect } = require( '@playwright/test' );
const wcApi = require( '@woocommerce/woocommerce-rest-api' ).default;

const couponCode = `code-${ new Date().getTime().toString() }`;

test.describe( 'Add New Coupon Page', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	test.afterAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );

		await test.step( `Delete test coupons.`, async () => {
			await api.get( 'coupons' ).then( ( response ) => {
				for ( let i = 0; i < response.data.length; i++ ) {
					if ( response.data[ i ].code === couponCode ) {
						api.delete( `coupons/${ response.data[ i ].id }`, {
							force: true,
						} );
					}
				}
			} );
		} );
	} );

	test( 'can create new coupon', async ( { page } ) => {
		await test.step( `Go to Coupons page.`, async () => {
			await page.goto( 'wp-admin/post-new.php?post_type=shop_coupon' );
		} );

		await test.step( `Fill coupon code with value ${ couponCode }`, async () => {
			await page.locator( '#title' ).fill( couponCode );

			await test.step( `Blur then wait for the auto-save to finish.`, async () => {
				await page.locator( '#title' ).blur();

				// 'Move to trash' link indicates auto-save success.
				await expect(
					page.getByRole( 'link', { name: 'Move to Trash' } )
				).toBeVisible();
			} );
		} );

		await test.step( `Fill coupon description.`, async () => {
			await page
				.locator( '#woocommerce-coupon-description' )
				.fill( 'test coupon' );
		} );

		await test.step( `Fill coupon amount.`, async () => {
			await page.locator( '#coupon_amount' ).fill( '100' );
		} );

		await test.step( `Click 'Publish'.`, async () => {
			await page.locator( '#publish:not(.disabled)' ).click();
			await page.waitForLoadState( 'networkidle' );
		} );

		await test.step( `Expect 'Coupon updated' notice.`, async () => {
			await expect(
				page
					.locator( 'div.notice-success > p' )
					.filter( { hasText: 'Coupon updated.' } )
			).toBeVisible();
		} );
	} );
} );
