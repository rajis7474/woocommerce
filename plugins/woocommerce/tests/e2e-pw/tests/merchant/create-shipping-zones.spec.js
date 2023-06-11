const { test, expect } = require( '@playwright/test' );
const wcApi = require( '@woocommerce/woocommerce-rest-api' ).default;

const maynePostal = 'V0N 2J0';
const shippingZoneNameUSRegion = 'USA Zone';
const shippingZoneNameFlatRate = 'Canada with Flat rate';
const shippingZoneNameFreeShip = 'BC with Free shipping';
const shippingZoneNameLocalPickup = 'Mayne Island with Local pickup';

test.describe( 'WooCommerce Shipping Settings - Add new shipping zone', () => {
	test.use( { storageState: process.env.ADMINSTATE } );

	test.beforeAll( async ( { baseURL } ) => {
		await test.step( `Set selling location to all countries.`, async () => {
			const api = new wcApi( {
				url: baseURL,
				consumerKey: process.env.CONSUMER_KEY,
				consumerSecret: process.env.CONSUMER_SECRET,
				version: 'wc/v3',
			} );
			await api.put( 'settings/general/woocommerce_allowed_countries', {
				value: 'all',
			} );
		} );
	} );

	test.afterAll( async ( { baseURL } ) => {
		await test.step( `Clean up test shipping zones.`, async () => {
			const api = new wcApi( {
				url: baseURL,
				consumerKey: process.env.CONSUMER_KEY,
				consumerSecret: process.env.CONSUMER_SECRET,
				version: 'wc/v3',
			} );
			await api.get( 'shipping/zones' ).then( async ( response ) => {
				for ( let i = 0; i < response.data.length; i++ ) {
					if (
						[
							shippingZoneNameUSRegion,
							shippingZoneNameFlatRate,
							shippingZoneNameFreeShip,
							shippingZoneNameLocalPickup,
						].includes( response.data[ i ].name )
					) {
						await api.delete(
							`shipping/zones/${ response.data[ i ].id }`,
							{
								force: true,
							}
						);
					}
				}
			} );
		} );
	} );

	test( 'add shipping zone for Mayne Island with free Local pickup', async ( {
		page,
	} ) => {
		await test.step( `Go to "Add shipping zone" page.`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-settings&tab=shipping&zone_id=new',
				{ waitUntil: 'networkidle' }
			);
		} );

		await test.step( `Fill zone name with value "${ shippingZoneNameLocalPickup }"`, async () => {
			await page
				.locator( '#zone_name' )
				.fill( shippingZoneNameLocalPickup );
		} );

		await test.step( `Select zone region "British Columbia, Canada"`, async () => {
			await page.locator( '.select2-search__field' ).click();
			await page
				.locator( '.select2-search__field' )
				.type( 'British Columbia, Canada' );
			await page
				.locator(
					'.select2-results__option.select2-results__option--highlighted'
				)
				.click();
		} );

		await test.step( `Click "Limit to specific ZIP/postcodes".`, async () => {
			await page.locator( '.wc-shipping-zone-postcodes-toggle' ).click();
		} );

		await test.step( `Fill postcode "${ maynePostal }"`, async () => {
			await page.locator( '#zone_postcodes' ).fill( maynePostal );
		} );

		await test.step( `Click 'Add shipping method' button.`, async () => {
			await page.locator( 'text=Add shipping method' ).click();
		} );

		await test.step( `Select "Local pickup" from the shipping method menu.`, async () => {
			await page
				.locator( 'select[name=add_method_id]' )
				.selectOption( 'local_pickup' );
		} );

		await test.step( `Click 'Add shipping method' button.`, async () => {
			await page.locator( '#btn-ok' ).click();
			await page.waitForLoadState( 'networkidle' );
		} );

		await test.step( `Expect shipping method 'Local pickup' to be saved.`, async () => {
			await expect(
				page
					.locator( '.wc-shipping-zone-method-title' )
					.filter( { hasText: 'Local pickup' } )
			).toBeVisible();
		} );

		await test.step( `Click 'Save changes' button.`, async () => {
			await page.click( '#submit' );
			await page.waitForFunction( () => {
				const button = document.querySelector( '#submit' );
				return button && button.disabled;
			} );
		} );

		await test.step( `Go to WooCommerce > Settings > Shipping.`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-settings&tab=shipping'
			);
		} );

		await test.step( `Reload page because Playwright runs so fast, the location shows up as 'Everywhere' at first.`, async () => {
			await page.reload();
		} );

		await test.step( `Expect shipping zone to have text "Mayne Island with Local pickup.".`, async () => {
			await expect( page.locator( '.wc-shipping-zones' ) ).toHaveText(
				/Mayne Island with Local pickup.*/
			);
		} );

		await test.step( `Expect shipping zone to have text "British Columbia, V0N 2J0.".`, async () => {
			await expect( page.locator( '.wc-shipping-zones' ) ).toHaveText(
				/British Columbia, V0N 2J0.*/
			);
		} );

		await test.step( `Expect shipping zone to have text "Local pickup.".`, async () => {
			await expect( page.locator( '.wc-shipping-zones' ) ).toHaveText(
				/Local pickup.*/
			);
		} );
	} );

	test( 'add shipping zone for British Columbia with Free shipping', async ( {
		page,
	} ) => {
		await test.step( `Go to "Add shipping zone" page.`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-settings&tab=shipping&zone_id=new',
				{ waitUntil: 'networkidle' }
			);
		} );

		await test.step( `Fill shipping zone name "${ shippingZoneNameFreeShip }".`, async () => {
			await page.locator( '#zone_name' ).fill( shippingZoneNameFreeShip );
		} );

		await test.step( `Select zone region "British Columbia, Canada".`, async () => {
			await page.locator( '.select2-search__field' ).click();
			await page
				.locator( '.select2-search__field' )
				.type( 'British Columbia, Canada' );
			await page
				.locator(
					'.select2-results__option.select2-results__option--highlighted'
				)
				.click();
		} );

		await test.step( `Click 'Add shipping method'.`, async () => {
			await page.locator( 'text=Add shipping method' ).click();
		} );

		await test.step( `Select 'Free shipping'.`, async () => {
			await page
				.locator( 'select[name=add_method_id]' )
				.selectOption( 'free_shipping' );
		} );

		await test.step( `Click 'Add shipping method'.`, async () => {
			await page.locator( '#btn-ok' ).click();
			await page.waitForLoadState( 'networkidle' );
		} );

		await test.step( `Expect 'Free shipping' to be saved.`, async () => {
			await expect(
				page
					.locator( '.wc-shipping-zone-method-title' )
					.filter( { hasText: 'Free shipping' } )
			).toBeVisible();
		} );

		await test.step( `Click 'Save changes'.`, async () => {
			await page.click( '#submit' );
			await page.waitForFunction( () => {
				const button = document.querySelector( '#submit' );
				return button && button.disabled;
			} );
		} );

		await test.step( `Go to WooCommerce > Settings > Shipping and reload.`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-settings&tab=shipping'
			);
			await page.reload(); // Playwright runs so fast, the location shows up as "Everywhere" at first
		} );

		await test.step( `Expect shipping zone to have text "BC with Free shipping".`, async () => {
			await expect( page.locator( '.wc-shipping-zones' ) ).toHaveText(
				/BC with Free shipping.*/
			);
		} );

		await test.step( `Expect shipping zone to have text "British Columbia".`, async () => {
			await expect( page.locator( '.wc-shipping-zones' ) ).toHaveText(
				/British Columbia.*/
			);
		} );

		await test.step( `Expect shipping zone to have text "Free shipping".`, async () => {
			await expect( page.locator( '.wc-shipping-zones' ) ).toHaveText(
				/Free shipping.*/
			);
		} );
	} );

	test( 'add shipping zone for Canada with Flat rate', async ( { page } ) => {
		await test.step( `Go to "Add shipping zone" page.`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-settings&tab=shipping&zone_id=new',
				{ waitUntil: 'networkidle' }
			);
		} );

		await test.step( `Fill shipping zone name "${ shippingZoneNameFlatRate }".`, async () => {
			await page.locator( '#zone_name' ).fill( shippingZoneNameFlatRate );
		} );

		await test.step( `Select zone region "Canada".`, async () => {
			await page.locator( '.select2-search__field' ).click();
			await page.locator( '.select2-search__field' ).type( 'Canada' );
			await page
				.locator(
					'.select2-results__option.select2-results__option--highlighted'
				)
				.click();
		} );

		await test.step( `Click 'Add shipping method'.`, async () => {
			await page.locator( 'text=Add shipping method' ).click();
		} );

		await test.step( `Select 'Flat rate'.`, async () => {
			await page
				.locator( 'select[name=add_method_id]' )
				.selectOption( 'flat_rate' );
		} );

		await test.step( `Click 'Save changes' button.`, async () => {
			await page.locator( '#btn-ok' ).click();
			await page.waitForLoadState( 'networkidle' );
		} );

		await test.step( `Expect 'Flat rate' to be saved.`, async () => {
			await expect(
				page
					.locator( '.wc-shipping-zone-method-title' )
					.filter( { hasText: 'Flat rate' } )
			).toBeVisible();
		} );

		await test.step( `Click 'Flat rate'.`, async () => {
			await page.getByRole( 'link', { name: 'Flat rate' } ).click();
		} );

		await test.step( `Fill flat rate cost "10".`, async () => {
			await page.locator( '#woocommerce_flat_rate_cost' ).fill( '10' );
		} );

		await test.step( `Click 'Save changes' button.`, async () => {
			await page.locator( '#btn-ok' ).click();
			await page.waitForLoadState( 'networkidle' );
		} );

		await test.step( `Go to WooCommerce > Settings > Shipping and reload.`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-settings&tab=shipping'
			);
			await page.reload(); // Playwright runs so fast, the location shows up as "Everywhere" at first
		} );

		await test.step( `Expect shipping zone to have text "Canada with Flat rate"`, async () => {
			await expect( page.locator( '.wc-shipping-zones' ) ).toHaveText(
				/Canada with Flat rate*/
			);
		} );

		await test.step( `Expect shipping zone to have text "Canada"`, async () => {
			await expect( page.locator( '.wc-shipping-zones' ) ).toHaveText(
				/Canada.*/
			);
		} );

		await test.step( `Expect shipping zone to have text "Flat rate"`, async () => {
			await expect( page.locator( '.wc-shipping-zones' ) ).toHaveText(
				/Flat rate.*/
			);
		} );
	} );

	test( 'add shipping zone with region and then delete the region', async ( {
		page,
	} ) => {
		await test.step( `Go to "Add shipping zone" page.`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-settings&tab=shipping&zone_id=new'
			);
		} );

		await test.step( `Fill shipping zone name "${ shippingZoneNameUSRegion }".`, async () => {
			await page.locator( '#zone_name' ).fill( shippingZoneNameUSRegion );
		} );

		await test.step( `Select "United States" as zone region.`, async () => {
			await page.locator( '.select2-search__field' ).click();
			await page
				.locator( '.select2-search__field' )
				.type( 'United States' );
			await page
				.locator(
					'.select2-results__option.select2-results__option--highlighted'
				)
				.click();
		} );

		await test.step( `Click 'Save changes' button.`, async () => {
			await page.locator( '#submit' ).click();
			await page.waitForFunction( () => {
				const button = document.querySelector( '#submit' );
				return button && button.disabled;
			} );
		} );

		await test.step( `Go to WooCommerce > Settings > Shipping and reload.`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-settings&tab=shipping'
			);
			await page.reload(); // Playwright runs so fast, the location shows up as "Everywhere" at first
		} );

		await test.step( `Expect shipping zone to have text "USA Zone".`, async () => {
			await expect( page.locator( '.wc-shipping-zones' ) ).toHaveText(
				/USA Zone.*/
			);
		} );

		await test.step( `Delete created shipping zone region after confirmation it exists`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-settings&tab=shipping'
			);
			await page.locator( 'a:has-text("USA Zone") >> nth=0' ).click();
			await page.locator( 'text=×' ).click();
		} );

		await test.step( `Click 'Save changes'.`, async () => {
			await page.locator( '#submit' ).click();
			await page.waitForFunction( () => {
				const button = document.querySelector( '#submit' );
				return button && button.disabled;
			} );
		} );

		await test.step( `Go to WooCommerce > Settings > Shipping`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-settings&tab=shipping'
			);
		} );

		await test.step( `Prove that the Region has been removed (Everywhere will display)`, async () => {
			await expect( page.locator( '.wc-shipping-zones' ) ).toHaveText(
				/Everywhere.*/
			);
		} );
	} );

	test( 'add and delete shipping method', async ( { page } ) => {
		await test.step( `Go to "Add shipping zone" page.`, async () => {
			await page.goto(
				'wp-admin/admin.php?page=wc-settings&tab=shipping&zone_id=new',
				{ waitUntil: 'networkidle' }
			);
		} );

		await test.step( `Fill shipping zone name "${ shippingZoneNameFlatRate }".`, async () => {
			await page.locator( '#zone_name' ).fill( shippingZoneNameFlatRate );
		} );

		await test.step( `Select zone region "Canada".`, async () => {
			await page.locator( '.select2-search__field' ).click();
			await page.locator( '.select2-search__field' ).fill( 'Canada' );
			await page
				.locator(
					'.select2-results__option.select2-results__option--highlighted'
				)
				.click();
		} );

		await test.step( `Add shipping method "Flat rate".`, async () => {
			await page.locator( 'text=Add shipping method' ).click();

			await page
				.locator( 'select[name=add_method_id]' )
				.selectOption( 'flat_rate' );
			await page.locator( '#btn-ok' ).click();
			await page.waitForLoadState( 'networkidle' );
			await expect(
				page
					.locator( '.wc-shipping-zone-method-title' )
					.filter( { hasText: 'Flat rate' } )
			).toBeVisible();
		} );

		await test.step( `Set flat rate to "10".`, async () => {
			await page.getByRole( 'link', { name: 'Flat rate' } ).click();
			await page.locator( '#woocommerce_flat_rate_cost' ).fill( '10' );
			await page.locator( '#btn-ok' ).click();
			await page.waitForLoadState( 'networkidle' );
		} );

		await test.step( `Delete shipping method.`, async () => {
			await page.getByRole( 'link', { name: 'Flat rate' } ).hover();
			page.on( 'dialog', ( dialog ) => dialog.accept() );
			await page.locator( 'text=Delete' ).click();
		} );

		await test.step( `Expect text "You can add multiple shipping methods within this zone..." to be visible.`, async () => {
			await expect(
				page.locator( '.wc-shipping-zone-method-blank-state' )
			).toHaveText(
				/You can add multiple shipping methods within this zone. Only customers within the zone will see them.*/
			);
		} );
	} );
} );

test.describe( 'Verifies shipping options from customer perspective', () => {
	// note: tests are being run in an unauthenticated state (not as admin)
	let productId, shippingFreeId, shippingFlatId, shippingLocalId;

	test.beforeAll( async ( { baseURL } ) => {
		const api = new wcApi( {
			url: baseURL,
			consumerKey: process.env.CONSUMER_KEY,
			consumerSecret: process.env.CONSUMER_SECRET,
			version: 'wc/v3',
		} );

		await test.step( `Add a product to the store so that we can order it and check shipping options`, async () => {
			await api
				.post( 'products', {
					name: 'Shipping options are the best',
					type: 'simple',
					regular_price: '25.99',
				} )
				.then( ( response ) => {
					productId = response.data.id;
				} );
		} );

		await test.step( `Create shipping zones`, async () => {
			await api
				.post( 'shipping/zones', {
					name: shippingZoneNameLocalPickup,
				} )
				.then( ( response ) => {
					shippingLocalId = response.data.id;
				} );
			await api
				.post( 'shipping/zones', {
					name: shippingZoneNameFreeShip,
				} )
				.then( ( response ) => {
					shippingFreeId = response.data.id;
				} );
			await api
				.post( 'shipping/zones', {
					name: shippingZoneNameFlatRate,
				} )
				.then( ( response ) => {
					shippingFlatId = response.data.id;
				} );
		} );

		await test.step( `Set shipping zone locations`, async () => {
			await api.put( `shipping/zones/${ shippingFlatId }/locations`, [
				{
					code: 'CA',
				},
			] );
			await api.put( `shipping/zones/${ shippingFreeId }/locations`, [
				{
					code: 'CA:BC',
					type: 'state',
				},
			] );
			await api.put( `shipping/zones/${ shippingLocalId }/locations`, [
				{
					code: 'V0N 2J0',
					type: 'postcode',
				},
			] );
		} );

		await test.step( `set shipping zone methods`, async () => {
			await api.post( `shipping/zones/${ shippingFlatId }/methods`, {
				method_id: 'flat_rate',
				settings: {
					cost: '10.00',
				},
			} );
			await api.post( `shipping/zones/${ shippingFreeId }/methods`, {
				method_id: 'free_shipping',
			} );
			await api.post( `shipping/zones/${ shippingLocalId }/methods`, {
				method_id: 'local_pickup',
			} );
		} );
	} );

	test.beforeEach( async ( { context, page } ) => {
		// Shopping cart is very sensitive to cookies, so be explicit
		await test.step( `Clear cookies`, async () => {
			await context.clearCookies();
		} );

		await test.step( `Add product to cart.`, async () => {
			await page.goto( `/shop/?add-to-cart=${ productId }` );
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

		await test.step( `Delete test product.`, async () => {
			await api.delete( `products/${ productId }`, { force: true } );
		} );

		await test.step( `Delete test shipping zones.`, async () => {
			await api.delete( `shipping/zones/${ shippingFlatId }`, {
				force: true,
			} );
			await api.delete( `shipping/zones/${ shippingFreeId }`, {
				force: true,
			} );
			await api.delete( `shipping/zones/${ shippingLocalId }`, {
				force: true,
			} );
		} );
	} );

	test( 'allows customer to benefit from a free Local pickup if on Mayne Island', async ( {
		page,
	} ) => {
		await test.step( `Go to cart.`, async () => {
			await page.goto( 'cart/' );
		} );

		await test.step( `Enter parameters for shipping calculation.`, async () => {
			await page.locator( 'a.shipping-calculator-button' ).click();
			await page.locator( '#calc_shipping_country' ).selectOption( 'CA' );
			await page.locator( '#calc_shipping_state' ).selectOption( 'BC' );
			await page.locator( '#calc_shipping_postcode' ).fill( maynePostal );
			await page.locator( 'button[name=calc_shipping]' ).click();
			await expect(
				page.locator( 'button[name=calc_shipping]' )
			).not.toBeVisible();
		} );

		await test.step( `Expect shipping method to be 'Local pickup'.`, async () => {
			await expect(
				page.locator( '.shipping ul#shipping_method > li > label' )
			).toContainText( 'Local pickup' );
		} );

		await test.step( `Expect cart total to be "25.99"`, async () => {
			await expect(
				page.locator(
					'td[data-title="Total"] > strong > .amount > bdi'
				)
			).toContainText( '25.99' );
		} );
	} );

	test( 'allows customer to benefit from a free Free shipping if in BC', async ( {
		page,
	} ) => {
		await test.step( `Go to cart.`, async () => {
			await page.goto( 'cart/' );
		} );

		await test.step( `Enter parameters for shipping calculation.`, async () => {
			await page.locator( 'a.shipping-calculator-button' ).click();
			await page.locator( '#calc_shipping_country' ).selectOption( 'CA' );
			await page.locator( '#calc_shipping_state' ).selectOption( 'BC' );
			await page.locator( 'button[name=calc_shipping]' ).click();
			await expect(
				page.locator( 'button[name=calc_shipping]' )
			).not.toBeVisible();
		} );

		await test.step( `Expect shipping method to be 'Free shipping'.`, async () => {
			await expect(
				page.locator( '.shipping ul#shipping_method > li > label' )
			).toContainText( 'Free shipping' );
		} );

		await test.step( `Expect cart total to be "25.99".`, async () => {
			await expect(
				page.locator(
					'td[data-title="Total"] > strong > .amount > bdi'
				)
			).toContainText( '25.99' );
		} );
	} );

	test( 'allows customer to pay for a Flat rate shipping method', async ( {
		page,
	} ) => {
		await test.step( `Go to cart.`, async () => {
			await page.goto( 'cart/' );
		} );

		await test.step( `Enter parameters for shipping calculation.`, async () => {
			await page.locator( 'a.shipping-calculator-button' ).click();
			await page.locator( '#calc_shipping_country' ).selectOption( 'CA' );
			await page.locator( '#calc_shipping_state' ).selectOption( 'AB' );
			await page.locator( '#calc_shipping_postcode' ).fill( 'T2T 1B3' );
			await page.locator( 'button[name=calc_shipping]' ).click();
			await expect(
				page.locator( 'button[name=calc_shipping]' )
			).not.toBeVisible();
		} );

		await test.step( `Expect shipping method to be 'Flat rate'.`, async () => {
			await expect(
				page.locator( '.shipping ul#shipping_method > li > label' )
			).toContainText( 'Flat rate:' );
		} );

		await test.step( `Expect flat rate to be "10.00".`, async () => {
			await expect(
				page.locator( '.shipping ul#shipping_method > li > label' )
			).toContainText( '10.00' );
		} );

		await test.step( `Expect cart total to be "35.99".`, async () => {
			await expect(
				page.locator(
					'td[data-title="Total"] > strong > .amount > bdi'
				)
			).toContainText( '35.99' );
		} );
	} );
} );
